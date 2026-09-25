/* SPDX-License-Identifier: MPL-2.0 */

(function initTextHelpers(global) {
  "use strict";

  function normalizeWhitespace(value) {
    return String(value || "")
      .trim()
      .replace(/(\s*\n\s*)|\s{2,}/g, (_match, newline) =>
        newline ? "\n" : " "
      );
  }

  function normalizeAndLimit(value, maxChars) {
    const normalized = normalizeWhitespace(value);
    const limit =
      Number.isFinite(maxChars) && maxChars > 0
        ? Math.floor(maxChars)
        : normalized.length;
    const content = normalized.slice(0, limit);
    return {
      content,
      truncated: content.length < normalized.length,
    };
  }

  function escapeXml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  global.PageContextText = Object.freeze({
    escapeXml,
    normalizeAndLimit,
    normalizeWhitespace,
  });
})(globalThis);
