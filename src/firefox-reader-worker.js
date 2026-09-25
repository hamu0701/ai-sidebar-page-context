/* SPDX-License-Identifier: MPL-2.0 */

"use strict";

// Uses the same parser and article extractor as Firefox Reader Mode.
importScripts(
  "../third_party/readability/JSDOMParser.js",
  "../third_party/readability/Readability.js"
);

// Matches CLASSES_TO_PRESERVE in toolkit/components/reader/ReaderMode.sys.mjs.
const CLASSES_TO_PRESERVE = [
  "caption",
  "emoji",
  "hidden",
  "invisible",
  "sr-only",
  "visually-hidden",
  "visuallyhidden",
  "wp-caption",
  "wp-caption-text",
  "wp-smiley",
];

self.addEventListener("message", event => {
  const { id, serializedDocument, url } = event.data || {};
  if (!id || typeof serializedDocument !== "string") {
    return;
  }

  try {
    // Matches Reader.worker.js:
    // JSDOMParser(serialized document) -> Readability.parse().
    const document = new JSDOMParser().parse(serializedDocument, url || "");
    const article = new Readability(document, {
      classesToPreserve: CLASSES_TO_PRESERVE,
      debug: false,
    }).parse();

    self.postMessage({
      id,
      ok: true,
      article: article
        ? {
            title: article.title || "",
            textContent: article.textContent || "",
          }
        : null,
    });
  } catch {
    self.postMessage({
      id,
      ok: false,
    });
  }
});
