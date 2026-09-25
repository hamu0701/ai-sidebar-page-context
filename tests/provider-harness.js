/* SPDX-License-Identifier: MPL-2.0 */

"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/local/bin/chromium",
    headless: true,
  });
  const page = await browser.newPage();
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`file://${path.join(__dirname, "provider-harness.html")}`);
  await page.waitForTimeout(50);

  async function reset(mode) {
    await page.waitForTimeout(300);
    await page.evaluate(nextMode => {
      window.harness.mode = nextMode;
      window.harness.sent = [];
      window.harness.buildCalls = 0;
      window.harness.lastBuildMessage = null;
      window.harness.otherSubmits = 0;
      document.getElementById("prompt-textarea").value = "";
      document.getElementById("ai-page-context-status")?.remove();
    }, mode);
  }

  await reset("success");
  await page.fill("#prompt-textarea", "ordinary question");
  await page.click('[data-testid="send-button"]');
  assert.deepEqual(await page.evaluate(() => window.harness.sent), [
    "ordinary question",
  ]);
  assert.equal(await page.evaluate(() => window.harness.buildCalls), 0);

  await reset("success");
  await page.fill("#prompt-textarea", "@page\nshould stay in the editor");
  for (const selector of [
    "#message-control",
    "#prompt-control",
    "#delete-control",
  ]) {
    await page.click(selector);
  }
  await page.click("#other-submit");
  await page.waitForTimeout(50);
  assert.equal(await page.evaluate(() => window.harness.buildCalls), 0);
  assert.deepEqual(await page.evaluate(() => window.harness.sent), []);
  assert.equal(await page.evaluate(() => window.harness.otherSubmits), 1);
  assert.equal(
    await page.inputValue("#prompt-textarea"),
    "@page\nshould stay in the editor"
  );

  await reset("failure");
  await page.fill("#prompt-textarea", "@page\nplain fallback question");
  await page.click('[data-testid="send-button"]');
  await page.waitForFunction(() => window.harness.buildCalls === 1);
  assert.deepEqual(await page.evaluate(() => window.harness.sent), []);
  assert.equal(await page.evaluate(() => window.harness.buildCalls), 1);
  assert.equal(
    await page.inputValue("#prompt-textarea"),
    "@page\nplain fallback question"
  );
  await page.waitForFunction(
    () =>
      document.getElementById("ai-page-context-status")?.textContent ===
      "Could not read page content."
  );
  const placement = await page.evaluate(() => {
    const editorRect = document
      .getElementById("prompt-textarea")
      .getBoundingClientRect();
    const toastRect = document
      .getElementById("ai-page-context-status")
      .getBoundingClientRect();
    return {
      centerDifference: Math.abs(
        editorRect.left +
          editorRect.width / 2 -
          (toastRect.left + toastRect.width / 2)
      ),
      gap: editorRect.top - toastRect.bottom,
    };
  });
  assert.ok(placement.centerDifference <= 1);
  assert.ok(placement.gap >= 7 && placement.gap <= 9);
  const lightWarningColors = await page.evaluate(() => {
    const style = getComputedStyle(
      document.getElementById("ai-page-context-status")
    );
    return {
      background: style.backgroundColor,
      text: style.color,
    };
  });
  assert.deepEqual(lightWarningColors, {
    background: "rgb(255, 244, 208)",
    text: "rgb(21, 20, 26)",
  });

  await page.emulateMedia({ colorScheme: "dark" });
  await reset("failure");
  await page.fill("#prompt-textarea", "@page\ndark mode failure");
  await page.click('[data-testid="send-button"]');
  await page.waitForFunction(
    () =>
      document.getElementById("ai-page-context-status")?.textContent ===
      "Could not read page content."
  );
  const darkWarningColors = await page.evaluate(() => {
    const style = getComputedStyle(
      document.getElementById("ai-page-context-status")
    );
    return {
      background: style.backgroundColor,
      text: style.color,
    };
  });
  assert.deepEqual(darkWarningColors, {
    background: "rgb(89, 43, 0)",
    text: "rgb(251, 251, 254)",
  });
  await page.emulateMedia({ colorScheme: "light" });

  await reset("success");
  await page.fill("#prompt-textarea", "@page\ncontext question");
  await page.click('[data-testid="send-button"]');
  await page.waitForFunction(() => window.harness.sent.length === 1);
  const expanded = await page.evaluate(() => window.harness.sent[0]);
  assert.match(expanded, /^I'm on page “<tabTitle>/);
  assert.ok(expanded.endsWith("\n\ncontext question"));
  assert.equal(
    await page.evaluate(() => window.harness.lastBuildMessage.extractionMode),
    "reader"
  );
  await page.waitForFunction(
    () =>
      document.getElementById("ai-page-context-status")?.textContent ===
      "Added page content and sent."
  );
  const lightSuccessColors = await page.evaluate(() => {
    const style = getComputedStyle(
      document.getElementById("ai-page-context-status")
    );
    return {
      background: style.backgroundColor,
      text: style.color,
    };
  });
  assert.deepEqual(lightSuccessColors, {
    background: "rgb(225, 255, 225)",
    text: "rgb(21, 20, 26)",
  });

  await reset("success");
  await page.fill("#prompt-textarea", "@page+\nall visible text question");
  await page.click('[data-testid="send-button"]');
  await page.waitForFunction(() => window.harness.sent.length === 1);
  const expandedInnerText = await page.evaluate(() => window.harness.sent[0]);
  assert.match(expandedInnerText, /^I'm on page “<tabTitle>/);
  assert.ok(expandedInnerText.endsWith("\n\nall visible text question"));
  assert.equal(
    await page.evaluate(() => window.harness.lastBuildMessage.extractionMode),
    "innerText"
  );

  await reset("slow");
  await page.fill("#prompt-textarea", "@page\nbusy question");
  await page.press("#prompt-textarea", "Enter");
  await page.waitForFunction(() => window.harness.buildCalls === 1);
  await page.press("#prompt-textarea", "Enter");
  await page.waitForFunction(() => window.harness.sent.length === 1);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => window.harness.buildCalls), 1);
  const busySends = await page.evaluate(() => window.harness.sent);
  assert.equal(busySends.length, 1);
  assert.match(busySends[0], /^I'm on page “<tabTitle>/);
  assert.ok(busySends[0].endsWith("\n\nbusy question"));

  await reset("success");
  await page.fill("#prompt-textarea", "@page\n");
  await page.click('[data-testid="send-button"]');
  await page.waitForTimeout(100);
  assert.deepEqual(await page.evaluate(() => window.harness.sent), []);
  assert.equal(await page.evaluate(() => window.harness.buildCalls), 0);

  await browser.close();
  console.log(
    "Provider interception, failure-stop, and notification tests passed."
  );
})().catch(error => {
  console.error(error);
  process.exit(1);
});
