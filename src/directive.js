/* SPDX-License-Identifier: MPL-2.0 */

(function initPageDirective(global) {
  "use strict";

  const DIRECTIVES = Object.freeze({
    "@page": "reader",
    "@page+": "innerText",
  });
  const EXPANDED_PREFIX = "I'm on page “<tabTitle>";

  /**
   * Parse an explicit page-context directive.
   *
   * The first non-empty line must be exactly "@page" or "@page+" after trimming.
   * Discard empty lines before the directive. Never send the directive itself to the provider.
   *
   * @param {string} value editor text
   * @returns {{
   *   question: string,
   *   extractionMode: "reader" | "innerText"
   * } | null}
   */
  function parse(value) {
    const lines = String(value || "")
      .replace(/\r\n?/g, "\n")
      .split("\n");
    const directiveLine = lines.findIndex(line => line.trim() !== "");

    const directive = directiveLine < 0 ? "" : lines[directiveLine].trim();
    const extractionMode = DIRECTIVES[directive];
    if (!extractionMode) {
      return null;
    }

    return {
      extractionMode,
      question: lines
        .slice(directiveLine + 1)
        .join("\n")
        .trim(),
    };
  }

  function isExpanded(value) {
    return String(value || "").includes(EXPANDED_PREFIX);
  }

  global.PageContextDirective = Object.freeze({
    isExpanded,
    parse,
  });
})(globalThis);
