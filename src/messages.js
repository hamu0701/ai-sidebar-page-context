/* SPDX-License-Identifier: MPL-2.0 */

(function initMessageTypes(global) {
  "use strict";

  global.PageContextMessages = Object.freeze({
    BUILD_PROMPT: "BUILD_PAGE_CONTEXT_PROMPT",
    EXTRACT_PAGE: "PAGE_CONTEXT_EXTRACT",
    PARSE_READER: "PARSE_WITH_FIREFOX_READER",
    PROVIDER_READY: "PROVIDER_SURFACE_READY",
  });
})(globalThis);
