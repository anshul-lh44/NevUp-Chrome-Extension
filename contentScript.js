function getTradeContextFromPage() {
  const symbol = document.querySelector("#symbol")?.value || null;
  const price = parseFloat(document.querySelector("#price")?.value || 0);
  const amount = parseFloat(document.querySelector("#amount")?.value || 0);
  const side = document.querySelector("#side")?.value || "buy";

  const trade = {
    symbol,
    price,
    amount,
    cost: price * amount,
    side,
    timestamp: Date.now()
  };

  return [trade]; // matches your TradeData list schema
}

function showNudgeOverlay(text, title = "Nudge") {
  console.log("NevUp: showNudgeOverlay called", { text, title });

  // 1. Remove existing overlay host if any
  const existingHost = document.getElementById("nevup-nudge-host");
  if (existingHost) {
    console.log("NevUp: Removing existing host");
    existingHost.remove();
  }

  // 2. Request notification permission (optional enhancement)
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(`NevUp: ${title}`, {
        body: text,
        icon: chrome.runtime.getURL("icon.png").catch(() => ""),
        tag: "nevup-nudge",
        requireInteraction: false
      });
    } catch (e) {
      console.warn("NevUp: Native notification failed", e);
    }
  }

  // 3. Create the Host Element
  const host = document.createElement("div");
  host.id = "nevup-nudge-host";

  // Important: Style the host to be merely a container that doesn't affect layout
  // We prefer document.body to avoid some documentElement quirks, but style it robustly
  host.style.all = "initial"; // Resets everything (display becomes inline)
  host.style.display = "block"; // Force block
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.left = "0";
  host.style.width = "100vw"; // Full width
  host.style.height = "100vh"; // Full height (to ensure centering works if relative)
  host.style.zIndex = "2147483647"; // Max int32
  host.style.pointerEvents = "none"; // Let clicks pass through everything except our popup
  host.style.overflow = "hidden"; // Prevent scrollbars if something goes wrong 

  // 4. Attach Shadow DOM
  const shadow = host.attachShadow({ mode: "open" });

  // 5. Define CSS content
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial; 
      display: block;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483647;
    }
    
    .nevup-overlay {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      
      background: linear-gradient(135deg, #1a1d24 0%, #23272f 100%);
      color: #fff;
      padding: 20px 24px;
      border-radius: 16px;
      
      /* High visibility shadow and border */
      box-shadow: 0 12px 40px rgba(0,0,0,0.6), 
                  0 0 0 3px #5e81f4, 
                  0 0 20px rgba(94, 129, 244, 0.4);
      border: 2px solid #5e81f4;
      
      min-width: 400px;
      max-width: 600px;
      
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 16px;
      line-height: normal;
      box-sizing: border-box;
      
      animation: slideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), pulse 2s ease-in-out infinite;
      cursor: auto;
      z-index: 2147483647;
      
      /* KEY: Re-enable pointer events for the popup itself */
      pointer-events: auto;
      
      /* Ensure text is readable */
      text-align: left;
      text-shadow: none;
    }

    .container {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .icon-box {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #5e81f4 0%, #4a6cf7 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(94, 129, 244, 0.4);
      color: white;
    }

    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .title {
      font-weight: 700;
      font-size: 18px;
      color: #5e81f4;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
    }

    .close-btn {
      background: rgba(255,255,255,0.1);
      border: none;
      color: #8b929a;
      cursor: pointer;
      font-size: 20px;
      padding: 0;
      border-radius: 6px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: rgba(255,255,255,0.2);
      color: #fff;
    }

    .message {
      font-size: 15px;
      line-height: 1.6;
      color: #e0e0e0;
      margin: 0;
    }

    @keyframes slideIn {
      from {
        transform: translateX(-50%) translateY(-100px);
        opacity: 0;
      }
      to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
      to {
        transform: translateX(-50%) translateY(-100px);
        opacity: 0;
      }
    }

    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 3px #5e81f4, 0 0 20px rgba(94, 129, 244, 0.4);
      }
      50% {
        box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 3px #5e81f4, 0 0 30px rgba(94, 129, 244, 0.6);
      }
    }
    
    .anim-out {
      animation: slideOut 0.3s ease-out forwards;
    }
  `;
  shadow.appendChild(style);

  // 6. Build the DOM structure
  const wrapper = document.createElement("div");
  wrapper.className = "nevup-overlay";
  wrapper.innerHTML = `
    <div class="container">
      <div class="icon-box">⚠</div>
      <div class="content">
        <div class="header">
          <h3 class="title">${title}</h3>
          <button class="close-btn">&times;</button>
        </div>
        <p class="message">${text}</p>
      </div>
    </div>
  `;

  // 7. Add event listeners
  const closeBtn = wrapper.querySelector(".close-btn");
  const close = (e) => {
    if (e) e.stopPropagation();
    wrapper.classList.remove("pulse");
    wrapper.classList.add("anim-out");
    setTimeout(() => {
      if (host.parentNode) host.remove();
    }, 300);
  };

  closeBtn.onclick = close;

  // Let them close by clicking the banner body too if they want? 
  // Maybe not, might be annoying if they tried to copy text. 
  // But let's keep the user's previous UX or improve it?
  // Let's only close on the close button to be safe against accidental dismissals.

  shadow.appendChild(wrapper);

  // 8. Attach to the page
  const attachTarget = document.body || document.documentElement;

  if (attachTarget) {
    attachTarget.appendChild(host);
    console.log("✓ NevUp Shadow DOM Host attached to", attachTarget.tagName);
  } else {
    console.warn("NevUp: document.body missing? Waiting...");
    const obs = new MutationObserver(() => {
      const target = document.body || document.documentElement;
      if (target) {
        target.appendChild(host);
        console.log("✓ NevUp Shadow DOM Host attached after wait to", target.tagName);
        obs.disconnect();
      }
    });
    obs.observe(document, { childList: true, subtree: true });
  }

  // 9. Auto-remove
  setTimeout(() => {
    if (host.parentNode) close();
  }, 15000);
}

function requestNudge() {
  const tradeHistory = getTradeContextFromPage();
  chrome.runtime.sendMessage(
    { type: "GET_NUDGE", tradeContext: tradeHistory },
    response => {
      if (!response?.ok) return;
      const nudge = response.nudge?.nudge || response.nudge;
      showNudgeOverlay(nudge);
    }
  );
}

// Initialize message listener immediately (works even if script is injected dynamically)
(function () {
  'use strict';

  // Listen for WS nudges from background script
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === "WS_NUDGE") {
      try {
        console.log("Content script received WS_NUDGE:", msg);
        const payload = msg.payload;

        // Handle different payload structures
        let title = "Nudge";
        let message = "";

        if (payload.title && payload.message) {
          // New format from background script
          title = payload.title;
          message = payload.message;
        } else if (payload.nudge) {
          // Nested structure: { nudge: { nudge: 'calm_down', message: '...' } }
          const n = payload.nudge;
          title = n.nudge || "Nudge";
          message = n.message || JSON.stringify(n).slice(0, 200);
        } else {
          // Fallback
          title = payload.nudge || "Nudge";
          message = payload.message || JSON.stringify(payload).slice(0, 200);
        }

        console.log("Displaying nudge:", { title, message });
        showNudgeOverlay(message, title);

        // Send response to acknowledge receipt
        sendResponse({ received: true });
      } catch (e) {
        console.error("Failed to display WS nudge:", e, msg);
        sendResponse({ received: false, error: e.message });
      }
      return true; // Keep channel open for async response
    }
  });

  // Wait for DOM to be ready before doing anything else
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      requestNudge();
    });
  } else {
    requestNudge();
  }
})();
