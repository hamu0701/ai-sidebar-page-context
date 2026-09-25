# Third-party notices

## Mozilla JSDOMParser

- File: `third_party/readability/JSDOMParser.js`
- Upstream: `toolkit/components/reader/readability/` in the Firefox source tree
- Source: https://github.com/mozilla-firefox/firefox
- Revision: recorded in `third_party/readability/UPSTREAM_REVISION`
- SHA-256: recorded in `third_party/readability/UPSTREAM_SHA256SUMS`
- License: Mozilla Public License 2.0
- Complete license: `LICENSE`

## Readability

- File: `third_party/readability/Readability.js`
- Copyright: Arc90 Inc
- Upstream: `toolkit/components/reader/readability/` in the Firefox source tree
- Source: https://github.com/mozilla-firefox/firefox
- Revision: recorded in `third_party/readability/UPSTREAM_REVISION`
- SHA-256: recorded in `third_party/readability/UPSTREAM_SHA256SUMS`
- License: Apache License 2.0
- Upstream license notice: `third_party/readability/LICENSE.md`
- Complete license: `third_party/readability/APACHE-2.0.txt`

Run `npm run verify:firefox-reader` to download the recorded Firefox revision and compare all three files byte for byte.

The worker pipeline is based on `toolkit/components/reader/Reader.worker.js` and `toolkit/components/reader/ReaderMode.sys.mjs`. Provider limits and whitespace normalization follow `browser/components/genai/GenAI.sys.mjs` and `browser/components/genai/GenAIChild.sys.mjs`. These upstream source files are licensed under MPL-2.0.