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

  const div = document.createElement("div");
  div.id = "nevup-nudge-overlay";
  div.style.position = "fixed";
  div.style.bottom = "20px";
  div.style.right = "20px";
  div.style.zIndex = 999999;
  div.style.background = "#1a1d24";
  div.style.color = "#fff";
  div.style.padding = "16px 20px";
  div.style.borderRadius = "12px";
  div.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
  div.style.border = "2px solid #5e81f4";
  div.style.maxWidth = "350px";
  div.style.fontFamily = "system-ui, -apple-system, sans-serif";
  div.style.animation = "slideIn 0.3s ease-out";
  
  div.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 8px;">
      <div style="width: 8px; height: 8px; background-color: #5e81f4; border-radius: 50%; margin-right: 10px;"></div>
      <div style="font-weight: 600; font-size: 14px; color: #5e81f4;">${title}</div>
      <button id="nevup-close-nudge" style="margin-left: auto; background: none; border: none; color: #8b929a; cursor: pointer; font-size: 18px; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">&times;</button>
    </div>
    <div style="font-size: 13px; line-height: 1.5; color: #e0e0e0;">${text}</div>
  `;
  
  document.body.appendChild(div);

  // Add close button functionality
  const closeBtn = div.querySelector("#nevup-close-nudge");
  closeBtn.addEventListener("click", () => {
    div.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => div.remove(), 300);
  });

  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (div.parentNode) {
      div.style.animation = "slideOut 0.3s ease-out";
      setTimeout(() => div.remove(), 300);
    }
  }, 10000);

  // Add CSS animations if not already added
  if (!document.getElementById("nevup-nudge-styles")) {
    const style = document.createElement("style");
    style.id = "nevup-nudge-styles";
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
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

// Example trigger: whenever user focuses the order form
document.addEventListener("DOMContentLoaded", () => {
  requestNudge();
});
