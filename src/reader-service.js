/* SPDX-License-Identifier: MPL-2.0 */

(function initFirefoxReaderService(global) {
  "use strict";

  const READER_TIMEOUT_MS = 15000;
  let readerWorker = null;
  let nextRequestId = 0;
  const pendingRequests = new Map();

  function rejectAll(error) {
    for (const request of pendingRequests.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    pendingRequests.clear();
  }

  function disposeWorker(error = null) {
    readerWorker?.terminate();
    readerWorker = null;
    if (error) {
      rejectAll(error);
    }
  }

  function getWorker() {
    if (readerWorker) {
      return readerWorker;
    }

    // Create the Worker from the extension origin so it can load bundled files.
    readerWorker = new Worker(
      browser.runtime.getURL("src/firefox-reader-worker.js")
    );
    readerWorker.addEventListener("message", event => {
      const request = pendingRequests.get(event.data?.id);
      if (!request) {
        return;
      }
      pendingRequests.delete(event.data.id);
      clearTimeout(request.timer);
      request.resolve(event.data);
    });
    readerWorker.addEventListener("error", event => {
      disposeWorker(new Error(event.message || "Firefox Reader Worker error"));
    });
    return readerWorker;
  }

  function parse(serializedDocument, url) {
    if (typeof serializedDocument !== "string" || !serializedDocument) {
      return Promise.resolve({ ok: false });
    }

    const id = ++nextRequestId;
    const worker = getWorker();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        disposeWorker(new Error("Firefox Reader Worker timed out"));
      }, READER_TIMEOUT_MS);

      pendingRequests.set(id, { resolve, reject, timer });
      worker.postMessage({
        id,
        serializedDocument,
        url: String(url || ""),
      });
    });
  }

  global.FirefoxReaderService = Object.freeze({
    parse,
  });
})(globalThis);
