/* SPDX-License-Identifier: MPL-2.0 */

(function initProviderCatalog(global) {
  "use strict";

  // selectionLimit matches Firefox estimateSelectionLimit(maxLength):
  // Math.round(maxLength * 0.85) - 500.
  const PROVIDERS = Object.freeze({
    claude: Object.freeze({
      id: "claude",
      host: "claude.ai",
      selectionLimit: 11528,
    }),
    chatgpt: Object.freeze({
      id: "chatgpt",
      host: "chatgpt.com",
      selectionLimit: 7448,
    }),
    gemini: Object.freeze({
      id: "gemini",
      host: "gemini.google.com",
      selectionLimit: 37750,
    }),
    lechat: Object.freeze({
      id: "lechat",
      host: "chat.mistral.ai",
      selectionLimit: 10848,
    }),
    copilot: Object.freeze({
      id: "copilot",
      host: "copilot.microsoft.com",
      selectionLimit: 2271,
    }),
    huggingchat: Object.freeze({
      id: "huggingchat",
      host: "huggingface.co",
      selectionLimit: 6463,
    }),
    generic: Object.freeze({
      id: "generic",
      host: null,
      selectionLimit: 6463,
    }),
  });

  function fromUrl(url) {
    let hostname;
    try {
      hostname = new URL(url).hostname;
    } catch {
      return PROVIDERS.generic;
    }

    return (
      Object.values(PROVIDERS).find(provider =>
        provider.host
          ? hostname === provider.host || hostname.endsWith(`.${provider.host}`)
          : false
      ) || PROVIDERS.generic
    );
  }

  function get(providerId) {
    return Object.hasOwn(PROVIDERS, providerId)
      ? PROVIDERS[providerId]
      : PROVIDERS.generic;
  }

  global.PageContextProviders = Object.freeze({
    fromUrl,
    get,
  });
})(globalThis);
