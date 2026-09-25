/* SPDX-License-Identifier: MPL-2.0 */

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

let onMessage;
let lastTabMessage;
let lastTabQuery;
const browser = {
  runtime: {
    onMessage: {
      addListener(listener) {
        onMessage = listener;
      },
    },
  },
  tabs: {
    async query(query) {
      lastTabQuery = query;
      return [{ id: 7 }];
    },
    async sendMessage(tabId, message) {
      assert.equal(tabId, 7);
      lastTabMessage = message;
      return {
        ok: true,
        title: "Source",
        content: "Page content",
        truncated: false,
      };
    },
  },
};

const context = vm.createContext({
  URL,
  browser,
  clearTimeout,
  setTimeout,
});

for (const file of [
  "messages.js",
  "provider-catalog.js",
  "text.js",
  "prompt.js",
  "background.js",
]) {
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "src", file), "utf8"),
    context
  );
}

(async () => {
  assert.equal(typeof onMessage, "function");

  const sidebarResponse = onMessage(
    { type: context.PageContextMessages.PROVIDER_READY },
    { url: "https://chatgpt.com/", tab: null }
  );
  assert.equal(typeof sidebarResponse?.then, "function");
  assert.deepEqual(JSON.parse(JSON.stringify(await sidebarResponse)), {
    enabled: true,
  });

  const tabResponse = onMessage(
    { type: context.PageContextMessages.PROVIDER_READY },
    {
      url: "https://chatgpt.com/",
      tab: {
        url: "https://chatgpt.com/",
        windowId: 1,
      },
    }
  );
  assert.equal(typeof tabResponse?.then, "function");
  assert.deepEqual(JSON.parse(JSON.stringify(await tabResponse)), {
    enabled: false,
  });

  const buildResponse = onMessage(
    {
      type: context.PageContextMessages.BUILD_PROMPT,
      providerId: "chatgpt",
      extractionMode: "reader",
      question: "Question",
    },
    { url: "https://chatgpt.com/", tab: null }
  );
  assert.equal(typeof buildResponse?.then, "function");
  const built = JSON.parse(JSON.stringify(await buildResponse));
  assert.equal(built.ok, true);
  assert.equal(built.truncated, false);
  assert.ok(built.prompt.endsWith("\n\nQuestion"));
  assert.deepEqual(JSON.parse(JSON.stringify(lastTabQuery)), {
    active: true,
    currentWindow: true,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(lastTabMessage)), {
    type: context.PageContextMessages.EXTRACT_PAGE,
    extractionMode: "reader",
    maxChars: 7448,
  });

  console.log("Background message contract tests passed.");
})().catch(error => {
  console.error(error);
  process.exit(1);
});
