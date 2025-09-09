/* chat.js
   Robust send-handler for Chrome + Android WebView / TWA
   - safe event binding (click/pointer/touch)
   - inline onclick fallback via window.onSendFallback
   - visualViewport keyboard reposition helper
   - debug logs + global error hooks
   - minimal message rendering + optional send-to-server stub
*/

(function () {
  "use strict";

  // ---------- Utility: safeCall ----------
  function safeCall(fn) {
    try {
      return fn && fn();
    } catch (err) {
      console.error("safeCall caught:", err, err && err.stack);
    }
  }

  // ---------- Elements ----------
  let inputEl = null;
  let sendBtn = null;
  let messagesEl = null;

  // ---------- Minimal message renderer ----------
  function appendLocalMessage(text) {
    if (!messagesEl) return;
    const msg = document.createElement("div");
    msg.className = "message message--local";
    msg.textContent = text;
    // simple timestamp
    const ts = document.createElement("div");
    ts.className = "message__time";
    ts.textContent = new Date().toLocaleTimeString();
    msg.appendChild(ts);
    messagesEl.appendChild(msg);
    // scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ---------- Optional: send to server (replace URL and payload) ----------
  async function sendMessageToServer(text) {
    // Example: uncomment and adapt if you have an API endpoint
    // return fetch('/api/send', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ message: text })
    // }).then(r => r.json());

    // Simulated network latency for demo/testing
    return new Promise((res) => setTimeout(() => res({ ok: true }), 250));
  }

  // ---------- Actual onSend logic ----------
  async function onSend(e) {
    // Basic guard + read input
    const text = inputEl && inputEl.value && inputEl.value.trim();
    if (!text) {
      // optionally add a small vibration on Android when empty (uncomment)
      // if (navigator.vibrate) navigator.vibrate(20);
      return;
    }

    // render locally immediately
    appendLocalMessage(text);

    // clear composer and keep focus
    inputEl.value = "";
    try { inputEl.focus(); } catch (e) {}

    // send to server (safe)
    try {
      const res = await sendMessageToServer(text);
      if (!res || !res.ok) {
        console.warn("[chat] server reported failure:", res);
        // handle retry / UI update if you want
      }
    } catch (err) {
      console.error("[chat] sendMessageToServer error:", err);
    }
  }

  // ---------- Robust wrapper + exposure for inline onclick ----------
  let _sendingNow = false;
  async function safeOnSend(e) {
    if (e && typeof e.preventDefault === "function") {
      try { e.preventDefault(); } catch (_) {}
    }
    if (_sendingNow) return;
    _sendingNow = true;
    try {
      console.log("[chat] safeOnSend triggered", e && e.type);
      await safeCall(() => onSend(e));
    } finally {
      setTimeout(() => { _sendingNow = false; }, 120);
    }
  }
  // inline fallback used by <button onclick="(window.onSendFallback && window.onSendFallback())">
  window.onSendFallback = safeOnSend;

  // ---------- DOM ready init ----------
  function init() {
    console.log("[chat.js] init — userAgent:", navigator.userAgent);

    inputEl = document.getElementById("composer-input") || document.querySelector(".composer input");
    sendBtn = document.getElementById("send-btn") || document.querySelector(".composer button");
    messagesEl = document.getElementById("messages") || document.querySelector(".messages");

    if (!inputEl || !sendBtn || !messagesEl) {
      console.warn("[chat.js] Missing core elements. inputEl:", !!inputEl, "sendBtn:", !!sendBtn, "messagesEl:", !!messagesEl);
    }

    // Attach multiple event types for better WebView compatibility
    if (sendBtn) {
      // Defensive removal if old listeners exist (safe)
      try { sendBtn.removeEventListener("click", onSend); } catch (_) {}

      sendBtn.addEventListener("click", safeOnSend, { passive: false });
      sendBtn.addEventListener("pointerup", safeOnSend, { passive: true });
      sendBtn.addEventListener("touchend", safeOnSend, { passive: true });

      // Prevent ghost click on touchstart (some OEM browsers)
      sendBtn.addEventListener("touchstart", function (ev) {
        try { ev.preventDefault && ev.preventDefault(); } catch (_) {}
      }, { passive: false });
    }

    if (inputEl) {
      inputEl.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          safeOnSend(ev);
        }
      });
    }

    // visualViewport handling: reposition composer when keyboard opens (Android WebView fixes)
    const composerEl = document.querySelector(".composer");
    if (window.visualViewport && composerEl) {
      const baseBottom = parseInt(window.getComputedStyle(composerEl).bottom || "12", 10) || 12;
      window.visualViewport.addEventListener("resize", () => {
        try {
          const cv = window.visualViewport;
          const kbOverlap = Math.max(0, window.innerHeight - cv.height - cv.offsetTop);
          composerEl.style.bottom = `${Math.max(baseBottom, kbOverlap + baseBottom)}px`;
        } catch (err) {
          console.error("[chat] visualViewport resize err:", err);
        }
      });
    }

    // helpful debug outlines — remove on production
    (function addDebugOutlines() {
      try {
        const styleId = "chat-debug-outlines";
        if (!document.getElementById(styleId)) {
          const s = document.createElement("style");
          s.id = styleId;
          s.textContent = `
            /* debug outlines — remove when done */
            .composer { outline: 1px dashed rgba(0,0,0,0.06) !important; }
            #send-btn, .composer button { outline: 2px dashed rgba(255,0,0,0.45) !important; }
          `;
          document.head.appendChild(s);
        }
      } catch (e) { /* ignore */ }
    })();

    // initial focus where appropriate
    try { inputEl && inputEl.focus(); } catch (e) {}

    console.log("[chat.js] ready");
  }

  // ---------- Global error / promise hooks to avoid silent failures in WebView ----------
  window.addEventListener("error", function (ev) {
    console.error("[window.error] message:", ev.message, "source:", ev.filename, "line:", ev.lineno, ev.error && ev.error.stack);
  });
  window.addEventListener("unhandledrejection", function (ev) {
    console.error("[unhandledrejection] reason:", ev.reason);
  });

  // ---------- Wait for DOMContentLoaded but init early if already loaded ----------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    // already ready
    setTimeout(init, 0);
  }

  // ---------- Expose some helpers for debugging in runtime console ----------
  window.__chat_debug = {
    appendLocalMessage,
    onSend: safeOnSend,
    rawOnSend: onSend,
    elements: () => ({ inputEl, sendBtn, messagesEl })
  };

})();
