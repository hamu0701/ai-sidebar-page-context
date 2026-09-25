/* SPDX-License-Identifier: MPL-2.0 */

(function initBackground() {
  "use strict";

  const CONTENT_SCRIPT_RETRY_MS = 250;

  function isProviderUrl(url) {
    return PageContextProviders.fromUrl(url).id !== "generic";
  }

  function isBuiltinSidebar(sender) {
    if (!sender.tab) {
      return true;
    }

    const senderUrl = sender.url || "";
    const tabUrl = sender.tab.url || "";

    // An embedded provider may be associated with the active tab.
    return Boolean(
      tabUrl && isProviderUrl(senderUrl) && !isProviderUrl(tabUrl)
    );
  }

  async function getActiveTab(windowId) {
    const query = Number.isInteger(windowId)
      ? { active: true, windowId }
      : { active: true, currentWindow: true };
    const [tab] = await browser.tabs.query(query);
    return tab || null;
  }

  async function extractPageContext(tab, maxChars, extractionMode) {
    if (!tab) {
      throw new Error("Could not find the active tab.");
    }

    const request = {
      type: PageContextMessages.EXTRACT_PAGE,
      extractionMode,
      maxChars,
    };

    let response;
    try {
      response = await browser.tabs.sendMessage(tab.id, request);
    } catch {
      // Give a newly loaded document time to reach document_idle.
      await new Promise(resolve =>
        setTimeout(resolve, CONTENT_SCRIPT_RETRY_MS)
      );
      response = await browser.tabs.sendMessage(tab.id, request);
    }

    if (!response?.ok || !response.content) {
      throw new Error("Could not read page content.");
    }

    return {
      content: response.content,
      title: response.title || "",
      truncated: Boolean(response.truncated),
    };
  }

  // Keep this async: runtime.onMessage requires a Promise for async responses.
  async function handleProviderReady(sender) {
    return {
      enabled: isBuiltinSidebar(sender),
    };
  }

  async function handleBuildPrompt(message, sender) {
    if (!isBuiltinSidebar(sender)) {
      return { ok: false };
    }

    const provider = PageContextProviders.get(message.providerId);
    const extractionMode =
      message.extractionMode === "innerText" ? "innerText" : "reader";
    const sourceTab = await getActiveTab(sender.tab?.windowId);

    try {
      const context = await extractPageContext(
        sourceTab,
        provider.selectionLimit,
        extractionMode
      );
      const prompt = PageContextPrompt.buildPrompt({
        title: context.title,
        content: context.content,
        question: message.question,
      });

      return {
        ok: true,
        prompt,
        truncated: context.truncated,
      };
    } catch {
      return { ok: false };
    }
  }

  browser.runtime.onMessage.addListener((message, sender) => {
    switch (message?.type) {
      case PageContextMessages.PARSE_READER:
        return FirefoxReaderService.parse(
          message.serializedDocument,
          message.url
        ).catch(() => ({ ok: false }));
      case PageContextMessages.PROVIDER_READY:
        return handleProviderReady(sender);
      case PageContextMessages.BUILD_PROMPT:
        return handleBuildPrompt(message, sender);
      default:
        return undefined;
    }
  });
})();
