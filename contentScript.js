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

function showNudgeOverlay(text) {
  let div = document.getElementById("nevup-nudge-overlay");
  if (!div) {
    div = document.createElement("div");
    div.id = "nevup-nudge-overlay";
    div.style.position = "fixed";
    div.style.bottom = "20px";
    div.style.right = "20px";
    div.style.zIndex = 999999;
    div.style.background = "#111";
    div.style.color = "#fff";
    div.style.padding = "12px 16px";
    div.style.borderRadius = "8px";
    div.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
    document.body.appendChild(div);
  }
  div.textContent = text;
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

// Example trigger: whenever user focuses the order form
document.addEventListener("DOMContentLoaded", () => {
  requestNudge();
});
