/* SPDX-License-Identifier: MPL-2.0 */

(function initPromptHelpers(global) {
  "use strict";

  function buildPrompt({ title, content, question }) {
    const normalizedQuestion = String(question || "").trim();
    const normalizedContent = PageContextText.normalizeWhitespace(content);

    if (!normalizedQuestion) {
      throw new Error("A question is required.");
    }
    if (!normalizedContent) {
      throw new Error("Could not read page content.");
    }

    // The Firefox prompt prefix localizes with %tabTitle|50%.
    const safeTitle = PageContextText.escapeXml(
      PageContextText.normalizeWhitespace(title).slice(0, 50)
    );
    const safeContent = PageContextText.escapeXml(normalizedContent);
    const prefix =
      `I'm on page “<tabTitle>${safeTitle}</tabTitle>” with ` +
      `“<selection>${safeContent}</selection>” selected.`;

    return `${prefix}\n\n${normalizedQuestion}`;
  }

  global.PageContextPrompt = Object.freeze({
    buildPrompt,
  });
})(globalThis);
