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
  // Remove existing overlay if any
  const existing = document.getElementById("nevup-nudge-overlay");
  if (existing) {
    existing.remove();
  }

  // Request notification permission and show browser notification
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(`NevUp: ${title}`, {
      body: text,
      icon: chrome.runtime.getURL("icon.png").catch(() => ""),
      tag: "nevup-nudge",
      requireInteraction: false
    });
  } else if ("Notification" in window && Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification(`NevUp: ${title}`, {
          body: text,
          tag: "nevup-nudge"
        });
      }
    });
  }

  // Create a more noticeable popup - larger, centered at top
  const div = document.createElement("div");
  div.id = "nevup-nudge-overlay";
  div.style.position = "fixed";
  div.style.top = "20px";
  div.style.left = "50%";
  div.style.transform = "translateX(-50%)";
  div.style.zIndex = 2147483647; // Maximum z-index
  div.style.background = "linear-gradient(135deg, #1a1d24 0%, #23272f 100%)";
  div.style.color = "#fff";
  div.style.padding = "20px 24px";
  div.style.borderRadius = "16px";
  div.style.boxShadow = "0 12px 40px rgba(0,0,0,0.6), 0 0 0 3px #5e81f4, 0 0 20px rgba(94, 129, 244, 0.4)";
  div.style.border = "2px solid #5e81f4";
  div.style.minWidth = "400px";
  div.style.maxWidth = "600px";
  div.style.fontFamily = "system-ui, -apple-system, sans-serif";
  div.style.animation = "nevupSlideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), nevupPulse 2s ease-in-out infinite";
  div.style.cursor = "pointer";
  
  div.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <div style="flex-shrink: 0; width: 40px; height: 40px; background: linear-gradient(135deg, #5e81f4 0%, #4a6cf7 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; box-shadow: 0 4px 12px rgba(94, 129, 244, 0.4);">
        ⚠
      </div>
      <div style="flex: 1;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="font-weight: 700; font-size: 18px; color: #5e81f4; text-transform: uppercase; letter-spacing: 0.5px;">${title}</div>
          <button id="nevup-close-nudge" style="background: rgba(255,255,255,0.1); border: none; color: #8b929a; cursor: pointer; font-size: 20px; padding: 4px 8px; border-radius: 6px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">&times;</button>
        </div>
        <div style="font-size: 15px; line-height: 1.6; color: #e0e0e0;">${text}</div>
      </div>
    </div>
  `;
  
  // Ensure body exists before appending
  if (document.body) {
    document.body.appendChild(div);
  } else {
    // Wait for body to be ready
    const observer = new MutationObserver(() => {
      if (document.body) {
        document.body.appendChild(div);
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true });
  }

  // Add click to dismiss
  div.addEventListener("click", (e) => {
    if (e.target.id !== "nevup-close-nudge" && !e.target.closest("#nevup-close-nudge")) {
      // Don't dismiss on main click, only on close button
      return;
    }
    div.style.animation = "nevupSlideOut 0.3s ease-out";
    setTimeout(() => div.remove(), 300);
  });

  // Add close button functionality
  const closeBtn = div.querySelector("#nevup-close-nudge");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      div.style.animation = "nevupSlideOut 0.3s ease-out";
      setTimeout(() => div.remove(), 300);
    });
    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.background = "rgba(255,255,255,0.2)";
      closeBtn.style.color = "#fff";
    });
    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.background = "rgba(255,255,255,0.1)";
      closeBtn.style.color = "#8b929a";
    });
  }

  // Auto-remove after 15 seconds (longer for better visibility)
  setTimeout(() => {
    if (div.parentNode) {
      div.style.animation = "nevupSlideOut 0.3s ease-out";
      setTimeout(() => div.remove(), 300);
    }
  }, 15000);

  // Add CSS animations if not already added
  if (!document.getElementById("nevup-nudge-styles")) {
    const style = document.createElement("style");
    style.id = "nevup-nudge-styles";
    style.textContent = `
      @keyframes nevupSlideIn {
        from {
          transform: translateX(-50%) translateY(-100px);
          opacity: 0;
          scale: 0.8;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
          scale: 1;
        }
      }
      @keyframes nevupSlideOut {
        from {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
          scale: 1;
        }
        to {
          transform: translateX(-50%) translateY(-100px);
          opacity: 0;
          scale: 0.8;
        }
      }
      @keyframes nevupPulse {
        0%, 100% {
          box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 3px #5e81f4, 0 0 20px rgba(94, 129, 244, 0.4);
        }
        50% {
          box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 3px #5e81f4, 0 0 30px rgba(94, 129, 244, 0.6);
        }
      }
      #nevup-nudge-overlay:hover {
        transform: translateX(-50%) scale(1.02) !important;
        transition: transform 0.2s ease-out;
      }
    `;
    if (document.head) {
      document.head.appendChild(style);
    } else {
      // Wait for head to be ready
      const observer = new MutationObserver(() => {
        if (document.head) {
          document.head.appendChild(style);
          observer.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true });
    }
  }
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
(function() {
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
      } catch (e) {
        console.error("Failed to display WS nudge:", e, msg);
      }
    }
    return true; // Keep channel open for async response
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
