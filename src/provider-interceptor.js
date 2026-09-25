/* SPDX-License-Identifier: MPL-2.0 */

"use strict";

(function initProviderInterceptor() {
  const providerId = PageContextProviders.fromUrl(location.href).id;
  if (providerId === "generic") {
    return;
  }

  const EDITOR_SELECTORS = [
    "#prompt-textarea",
    "textarea:not([disabled])",
    '[contenteditable="true"][role="textbox"]',
    '[contenteditable="true"]',
    '[role="textbox"]',
  ];

  const SEND_BUTTON_SELECTORS = [
    'button[data-testid="send-button"]',
    'button[data-testid="send-message-button"]',
    'button[aria-label="Send prompt"]',
    'button[aria-label="Send message"]',
    'button[aria-label="送信"]',
  ];
  const SEND_LABEL_PATTERN =
    /^(?:send(?:\s+(?:prompt|message))?|送信|送る|发送|傳送|envoyer|senden|enviar|invia|보내기)$/i;
  const NON_SEND_LABEL_PATTERN =
    /feedback|share|stop|cancel|delete|remove|edit|regenerate|retry|new|clear|reset|discard|フィードバック|共有|停止|中止|削除|編集|再生成|やり直|新規|クリア/i;
  const FEEDBACK_COLORS = Object.freeze({
    success: Object.freeze({
      dark: "#004800",
      light: "#e1ffe1",
    }),
    warning: Object.freeze({
      dark: "#592b00",
      light: "#fff4d0",
    }),
  });
  const TEXT_COLORS = Object.freeze({
    dark: "#fbfbfe",
    light: "#15141a",
  });
  const TOAST_DURATION_MS = Object.freeze({
    success: 2400,
    validation: 4200,
    warning: 5200,
  });
  const SEND_BUTTON_TIMEOUT_MS = 1200;
  const REPLAY_GUARD_MS = 250;
  const EDITOR_UPDATE_DELAY_MS = 40;

  let busy = false;
  let replaying = false;
  let toastTimer = null;

  function isVisible(element) {
    if (!element?.isConnected) {
      return false;
    }
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function isEditable(element) {
    return Boolean(
      element?.matches?.('textarea, [contenteditable="true"], [role="textbox"]')
    );
  }

  function findEditor(scope = document) {
    for (const selector of EDITOR_SELECTORS) {
      const candidates = scope.querySelectorAll?.(selector) || [];
      for (const candidate of candidates) {
        if (isVisible(candidate) && !candidate.disabled) {
          return candidate;
        }
      }
    }
    return null;
  }

  function getEditorText(editor) {
    if (!editor) {
      return "";
    }
    if ("value" in editor) {
      return String(editor.value || "").trim();
    }
    return String(editor.innerText || editor.textContent || "").trim();
  }

  function setEditorText(editor, text) {
    editor.focus();

    if ("value" in editor) {
      const prototype =
        editor instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      if (setter) {
        setter.call(editor, text);
      } else {
        editor.value = text;
      }
    } else {
      // Follows Firefox GenAIChild autoSubmitClick:
      // update textContent and emit a bubbling InputEvent.
      editor.textContent = text;
    }

    editor.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        composed: true,
        inputType: "insertText",
        data: text,
      })
    );
  }

  function getButtonLabel(button) {
    return [
      button?.getAttribute?.("aria-label"),
      button?.getAttribute?.("title"),
      button?.value,
      button?.textContent,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  function isExplicitSendButton(button) {
    if (!button || button.disabled || !isVisible(button)) {
      return false;
    }

    const label = getButtonLabel(button);
    if (NON_SEND_LABEL_PATTERN.test(label)) {
      return false;
    }
    return (
      SEND_BUTTON_SELECTORS.some(selector => button.matches(selector)) ||
      SEND_LABEL_PATTERN.test(label)
    );
  }

  function findSoleFormSubmitButton(editor) {
    const form = editor?.closest("form");
    if (!form) {
      return null;
    }
    const candidates = [
      ...form.querySelectorAll('button[type="submit"], input[type="submit"]'),
    ].filter(button => {
      return (
        !button.disabled &&
        isVisible(button) &&
        !NON_SEND_LABEL_PATTERN.test(getButtonLabel(button))
      );
    });
    return candidates.length === 1 ? candidates[0] : null;
  }

  function findSendButton(editor, preferredButton = null) {
    if (isExplicitSendButton(preferredButton)) {
      return preferredButton;
    }

    const form = editor?.closest("form");
    const scopes = [];
    if (form) {
      scopes.push(form);
    }
    for (
      let scope = editor?.parentElement, depth = 0;
      scope && depth < 6;
      scope = scope.parentElement, depth += 1
    ) {
      if (scope === document.body || scope === document.documentElement) {
        break;
      }
      if (!scopes.includes(scope)) {
        scopes.push(scope);
      }
    }

    for (const scope of scopes) {
      for (const button of scope.querySelectorAll(
        "button, [role='button'], input[type='submit']"
      )) {
        if (isExplicitSendButton(button)) {
          return button;
        }
      }
    }
    return findSoleFormSubmitButton(editor);
  }

  function findEditorNear(control) {
    const form = control?.form || control?.closest?.("form");
    const formEditor = form ? findEditor(form) : null;
    if (formEditor) {
      return formEditor;
    }

    for (
      let scope = control?.parentElement, depth = 0;
      scope && depth < 6;
      scope = scope.parentElement, depth += 1
    ) {
      if (scope === document.body || scope === document.documentElement) {
        break;
      }
      const editor = findEditor(scope);
      if (editor) {
        return editor;
      }
    }
    return null;
  }

  async function waitForSendButton(editor, preferredButton) {
    const started = performance.now();
    while (performance.now() - started < SEND_BUTTON_TIMEOUT_MS) {
      const button = findSendButton(editor, preferredButton);
      if (button && !button.disabled) {
        return button;
      }
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    return null;
  }

  function positionToast(toast, editor) {
    const margin = 12;
    const gap = 8;
    if (!editor?.isConnected) {
      toast.style.left = "50%";
      toast.style.top = "auto";
      toast.style.bottom = `${margin}px`;
      toast.style.transform = "translateX(-50%)";
      return;
    }

    toast.style.left = "0";
    toast.style.top = "0";
    toast.style.bottom = "auto";
    toast.style.transform = "none";

    const editorRect = editor.getBoundingClientRect();
    const toastRect = toast.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const halfWidth = toastRect.width / 2;
    const center = Math.min(
      viewportWidth - margin - halfWidth,
      Math.max(margin + halfWidth, editorRect.left + editorRect.width / 2)
    );
    let top = editorRect.top - toastRect.height - gap;

    if (top < margin) {
      top = editorRect.bottom + gap;
    }
    top = Math.min(
      viewportHeight - margin - toastRect.height,
      Math.max(margin, top)
    );

    toast.style.left = `${Math.round(center)}px`;
    toast.style.top = `${Math.round(top)}px`;
    toast.style.transform = "translateX(-50%)";
  }

  function showToast(message, kind, duration, editor) {
    let toast = document.getElementById("ai-page-context-status");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "ai-page-context-status";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      Object.assign(toast.style, {
        position: "fixed",
        zIndex: "2147483647",
        maxWidth: "min(320px, calc(100vw - 24px))",
        padding: "9px 12px",
        borderRadius: "9px",
        font: "500 12px/1.45 system-ui, sans-serif",
        boxShadow: "0 8px 24px rgba(0, 0, 0, .28)",
        pointerEvents: "none",
        transition: "opacity 120ms ease",
      });
      document.documentElement.appendChild(toast);
    }

    const forcedColors = globalThis.matchMedia?.(
      "(forced-colors: active)"
    ).matches;
    const darkMode = globalThis.matchMedia?.(
      "(prefers-color-scheme: dark)"
    ).matches;

    if (forcedColors) {
      toast.style.backgroundColor = "Canvas";
      toast.style.color = "CanvasText";
      toast.style.border = "1px solid CanvasText";
    } else {
      const colors = FEEDBACK_COLORS[kind] || FEEDBACK_COLORS.success;
      toast.style.backgroundColor = darkMode ? colors.dark : colors.light;
      toast.style.color = darkMode ? TEXT_COLORS.dark : TEXT_COLORS.light;
      toast.style.border = "1px solid transparent";
    }
    toast.textContent = message;
    positionToast(toast, editor);
    toast.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.opacity = "0";
    }, duration);
  }

  function suppress(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  async function replaySend(editor, trigger) {
    replaying = true;
    try {
      if (trigger.kind === "click") {
        const button = await waitForSendButton(editor, trigger.button);
        if (button && !button.disabled) {
          button.click();
          return true;
        }
      }

      if (trigger.kind === "submit" && trigger.form?.requestSubmit) {
        const submitter = trigger.button;
        if (
          submitter?.isConnected &&
          submitter.form === trigger.form &&
          !submitter.disabled
        ) {
          trigger.form.requestSubmit(submitter);
        } else {
          trigger.form.requestSubmit();
        }
        return true;
      }

      const button = await waitForSendButton(editor, null);
      if (button && !button.disabled) {
        button.click();
        return true;
      }
      if (trigger.form?.requestSubmit) {
        trigger.form.requestSubmit();
        return true;
      }

      // Try Enter when the provider has no usable send button.
      editor.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          bubbles: true,
          cancelable: true,
        })
      );
      editor.dispatchEvent(
        new KeyboardEvent("keyup", {
          key: "Enter",
          code: "Enter",
          bubbles: true,
          cancelable: true,
        })
      );
      return true;
    } finally {
      setTimeout(() => {
        replaying = false;
      }, REPLAY_GUARD_MS);
    }
  }

  async function prepareAndSend(event, editor, trigger) {
    if (replaying) {
      return;
    }
    if (busy) {
      suppress(event);
      return;
    }

    const editorText = getEditorText(editor);
    if (!editorText || PageContextDirective.isExpanded(editorText)) {
      return;
    }

    const directive = PageContextDirective.parse(editorText);
    if (!directive) {
      // Leave ordinary questions to the provider.
      return;
    }

    suppress(event);

    if (!directive.question) {
      showToast(
        "Please enter a question.",
        "warning",
        TOAST_DURATION_MS.validation,
        editor
      );
      return;
    }

    busy = true;
    const question = directive.question;
    const extractionMode = directive.extractionMode;

    try {
      let response;
      try {
        response = await browser.runtime.sendMessage({
          type: PageContextMessages.BUILD_PROMPT,
          extractionMode,
          providerId,
          question,
        });
      } catch {
        response = { ok: false };
      }

      if (!response?.ok) {
        showToast(
          "Could not read page content.",
          "warning",
          TOAST_DURATION_MS.warning,
          editor
        );
        return;
      }

      try {
        setEditorText(editor, response.prompt);
      } catch {
        try {
          setEditorText(editor, editorText);
        } catch {
          // Keep the current editor content when restoration also fails.
        }
        showToast(
          "Could not add page content.",
          "warning",
          TOAST_DURATION_MS.warning,
          editor
        );
        return;
      }

      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, EDITOR_UPDATE_DELAY_MS));

      let sent = false;
      try {
        sent = await replaySend(editor, trigger);
      } catch {
        sent = false;
      }

      if (sent) {
        showToast(
          response.truncated
            ? "Added page content up to the limit and sent."
            : "Added page content and sent.",
          "success",
          TOAST_DURATION_MS.success,
          editor
        );
      } else {
        showToast(
          "Could not send. Page content was added to the input field.",
          "warning",
          TOAST_DURATION_MS.warning,
          editor
        );
      }
    } finally {
      busy = false;
    }
  }

  function onKeyDown(event) {
    if (
      replaying ||
      event.key !== "Enter" ||
      event.shiftKey ||
      event.altKey ||
      event.isComposing
    ) {
      return;
    }

    const editor = event.target.closest?.(
      'textarea, [contenteditable="true"], [role="textbox"]'
    );
    if (!isEditable(editor)) {
      return;
    }

    void prepareAndSend(event, editor, {
      form: editor.closest("form"),
      kind: "keyboard",
    });
  }

  function onClick(event) {
    if (replaying) {
      return;
    }
    const button = event.target.closest?.(
      "button, [role='button'], input[type='submit']"
    );
    if (!isExplicitSendButton(button)) {
      return;
    }
    const form = button.form || button.closest("form");
    const editor = findEditorNear(button);
    if (editor) {
      void prepareAndSend(event, editor, {
        button,
        form,
        kind: "click",
      });
    }
  }

  function onSubmit(event) {
    if (replaying) {
      return;
    }
    const form = event.target;
    const editor = findEditor(form);
    if (editor) {
      void prepareAndSend(event, editor, {
        button: event.submitter || null,
        form,
        kind: "submit",
      });
    }
  }

  void browser.runtime
    .sendMessage({
      type: PageContextMessages.PROVIDER_READY,
    })
    .then(status => {
      if (!status?.enabled) {
        return;
      }
      document.addEventListener("keydown", onKeyDown, true);
      document.addEventListener("click", onClick, true);
      document.addEventListener("submit", onSubmit, true);
    })
    .catch(() => {
      // Do not change the provider when the extension background is unavailable.
    });
})();
