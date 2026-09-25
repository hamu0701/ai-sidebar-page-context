/* SPDX-License-Identifier: MPL-2.0 */

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = vm.createContext({ URL });
for (const file of [
  "messages.js",
  "provider-catalog.js",
  "text.js",
  "prompt.js",
  "directive.js",
]) {
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "src", file), "utf8"),
    context
  );
}
const messages = context.PageContextMessages;
const providers = context.PageContextProviders;
const text = context.PageContextText;
const helpers = context.PageContextPrompt;
const directive = context.PageContextDirective;

assert.deepEqual(Object.keys(messages).sort(), [
  "BUILD_PROMPT",
  "EXTRACT_PAGE",
  "PARSE_READER",
  "PROVIDER_READY",
]);
assert.equal(
  new Set(Object.values(messages)).size,
  Object.keys(messages).length
);
assert.deepEqual(Object.keys(providers).sort(), ["fromUrl", "get"]);
assert.deepEqual(Object.keys(text).sort(), [
  "escapeXml",
  "normalizeAndLimit",
  "normalizeWhitespace",
]);
assert.deepEqual(Object.keys(helpers), ["buildPrompt"]);
assert.deepEqual(Object.keys(directive).sort(), ["isExpanded", "parse"]);

assert.equal(
  text.normalizeWhitespace("  one   two \n\n three  "),
  "one two\nthree"
);

for (const [url, providerId, selectionLimit] of [
  ["https://claude.ai/new", "claude", 11528],
  ["https://chatgpt.com/c/123", "chatgpt", 7448],
  ["https://gemini.google.com/app", "gemini", 37750],
  ["https://chat.mistral.ai/chat", "lechat", 10848],
  ["https://copilot.microsoft.com/", "copilot", 2271],
  ["https://huggingface.co/chat/", "huggingchat", 6463],
]) {
  assert.equal(providers.fromUrl(url).id, providerId);
  assert.equal(providers.get(providerId).selectionLimit, selectionLimit);
}
assert.equal(providers.fromUrl("https://example.com/").id, "generic");
assert.equal(providers.get("__proto__").id, "generic");

const built = helpers.buildPrompt({
  title: 'A <title> & "quote"',
  content: "alpha <script>ignore</script> omega",
  question: "What matters?",
});
assert.match(
  built,
  /^I'm on page “<tabTitle>A &lt;title&gt; &amp; &quot;quote&quot;<\/tabTitle>”/
);
assert.ok(!built.includes("<script>"));
assert.ok(built.endsWith("\n\nWhat matters?"));

assert.deepEqual(
  JSON.parse(JSON.stringify(text.normalizeAndLimit("  123  456  ", 5))),
  {
    content: "123 4",
    truncated: true,
  }
);
assert.deepEqual(
  JSON.parse(JSON.stringify(text.normalizeAndLimit("  123  ", 10))),
  {
    content: "123",
    truncated: false,
  }
);

assert.throws(
  () =>
    helpers.buildPrompt({
      title: "Page",
      content: "",
      question: "Q",
    }),
  /Could not read page content/
);

assert.equal(directive.parse("ordinary question"), null);
assert.equal(directive.parse("@Page\nquestion"), null);
assert.deepEqual(
  JSON.parse(JSON.stringify(directive.parse("\n  \n @page \n question\n"))),
  {
    extractionMode: "reader",
    question: "question",
  }
);
assert.deepEqual(
  JSON.parse(JSON.stringify(directive.parse("@page\nline one\nline two"))),
  {
    extractionMode: "reader",
    question: "line one\nline two",
  }
);
assert.deepEqual(
  JSON.parse(JSON.stringify(directive.parse("@page+\nfull page"))),
  {
    extractionMode: "innerText",
    question: "full page",
  }
);
assert.equal(directive.parse("@page\n").question, "");
assert.equal(directive.parse("@page+\n").question, "");
assert.equal(directive.parse("@page +\nquestion"), null);
assert.equal(directive.parse("question\n@page\nlater"), null);
assert.equal(
  directive.isExpanded(
    "I'm on page “<tabTitle>Page</tabTitle>” with “<selection>Text</selection>” selected."
  ),
  true
);

const manifestPath = path.join(__dirname, "..", "manifest.json");
const manifestSource = fs.readFileSync(manifestPath, "utf8");
const manifest = JSON.parse(manifestSource);

assert.equal("permissions" in manifest, false);
assert.equal(
  manifest.homepage_url,
  "https://github.com/hamu0701/ai-sidebar-page-context"
);
assert.equal(
  manifest.browser_specific_settings.gecko.id,
  "{00238259-2ea6-4eed-83c6-6b5815a3f207}"
);
assert.equal("host_permissions" in manifest, false);
assert.equal("action" in manifest, false);
assert.equal("commands" in manifest, false);
assert.equal("options_ui" in manifest, false);
assert.deepEqual(manifest.background.scripts, [
  "src/messages.js",
  "src/provider-catalog.js",
  "src/text.js",
  "src/prompt.js",
  "src/reader-service.js",
  "src/background.js",
]);
assert.equal(manifest.content_scripts.length, 1);
assert.deepEqual(manifest.content_scripts[0].matches, ["<all_urls>"]);
assert.deepEqual(manifest.content_scripts[0].js, [
  "src/messages.js",
  "src/provider-catalog.js",
  "src/text.js",
  "src/directive.js",
  "src/page-context.js",
  "src/provider-interceptor.js",
]);
for (const domain of ["claude.ai", "chatgpt.com", "gemini.google.com"]) {
  assert.equal(manifestSource.includes(`https://${domain}/*`), false);
}
assert.equal(fs.existsSync(path.join(__dirname, "..", "options")), false);

const thirdPartyNotice = fs.readFileSync(
  path.join(__dirname, "..", "THIRD_PARTY_NOTICES.md"),
  "utf8"
);
assert.match(
  thirdPartyNotice,
  /JSDOMParser\.js[\s\S]*Mozilla Public License 2\.0/
);
assert.match(thirdPartyNotice, /Readability\.js[\s\S]*Apache License 2\.0/);
assert.equal(
  fs.existsSync(
    path.join(__dirname, "..", "third_party", "readability", "APACHE-2.0.txt")
  ),
  true
);

const runtimeFiles = [
  "src/messages.js",
  "src/provider-catalog.js",
  "src/text.js",
  "src/prompt.js",
  "src/directive.js",
  "src/reader-service.js",
  "src/background.js",
  "src/page-context.js",
  "src/firefox-reader-worker.js",
  "src/provider-interceptor.js",
];
const runtimeSource = runtimeFiles
  .map(file => fs.readFileSync(path.join(__dirname, "..", file), "utf8"))
  .join("\n");
for (const prohibited of [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bsendBeacon\b/,
  /\bindexedDB\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bbrowser\.cookies\b/,
  /\bbrowser\.history\b/,
  /\bbrowser\.storage\b/,
  /\bnavigator\.clipboard\b/,
]) {
  assert.equal(prohibited.test(runtimeSource), false);
}

const backgroundSource = fs.readFileSync(
  path.join(__dirname, "..", "src", "background.js"),
  "utf8"
);
const interceptorSource = fs.readFileSync(
  path.join(__dirname, "..", "src", "provider-interceptor.js"),
  "utf8"
);
assert.equal(backgroundSource.includes("sourceUrl"), false);
assert.equal(backgroundSource.includes("sourceTitle"), false);
for (const acornColor of [
  "#e1ffe1",
  "#004800",
  "#fff4d0",
  "#592b00",
  "#15141a",
  "#fbfbfe",
]) {
  assert.equal(interceptorSource.includes(acornColor), true);
}

console.log("Prompt, directive, provider, manifest, and privacy tests passed.");
