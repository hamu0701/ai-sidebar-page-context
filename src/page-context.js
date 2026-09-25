/* SPDX-License-Identifier: MPL-2.0 */

(function initPageContext() {
  "use strict";

  function parseWithFirefoxReader(serializedDocument) {
    return browser.runtime.sendMessage({
      type: PageContextMessages.PARSE_READER,
      serializedDocument,
      url: location.href,
    });
  }

  async function extractReadablePage(maxChars, extractionMode) {
    let article = null;

    if (extractionMode !== "innerText") {
      try {
        const serializedDocument = new XMLSerializer().serializeToString(
          document
        );
        const response = await parseWithFirefoxReader(serializedDocument);
        if (response?.ok) {
          article = response.article;
        }
      } catch {
        // Matches Firefox's body.innerText fallback when Reader Mode finds no article.
      }
    }

    const readerText = article?.textContent?.trim() || "";
    const fallbackText = document.body?.innerText || "";
    const { content, truncated } = PageContextText.normalizeAndLimit(
      readerText || fallbackText,
      maxChars
    );

    return {
      ok: Boolean(content),
      title: document.title || article?.title || "",
      content,
      truncated,
    };
  }

  browser.runtime.onMessage.addListener(message => {
    if (message?.type !== PageContextMessages.EXTRACT_PAGE) {
      return undefined;
    }
    return extractReadablePage(
      Number(message.maxChars),
      message.extractionMode
    );
  });
})();
