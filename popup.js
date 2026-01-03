document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE = "http://localhost:8000";

  const tabs = document.querySelectorAll(".tab-btn");
  const views = document.querySelectorAll(".view");
  const journalContainer = document.getElementById("journal");
  const alertsContainer = document.getElementById("alerts");
  const chatInput = document.getElementById("ask-nev");
  const chatView = document.getElementById("chat-suggestions");

  /* ============================
     LOAD REAL TRADES (JOURNAL)
     ============================ */

  async function loadJournal() {
    journalContainer.innerHTML = "<p class='empty'>Loading trades...</p>";

    try {
      const res = await fetch("http://localhost:8000/trades");
      const data = await res.json();

      journalContainer.innerHTML = "";

      if (!data.trades || data.trades.length === 0) {
        journalContainer.innerHTML =
          "<p class='empty'>No trades recorded yet</p>";
        return;
      }

      data.trades
        .slice()
        .reverse()
        .forEach((trade) => {
          // 🔒 SAFE SYMBOL EXTRACTION
          const rawSymbol =
            trade.symbol || trade.pair || trade.ticker || "UNKNOWN";

          const symbol = String(rawSymbol);

          const base = symbol.includes("USDT")
            ? symbol.replace("USDT", "")
            : symbol;

          const quote = symbol.includes("USDT") ? "USDT" : "";

          const dateObj = trade.timestamp
            ? new Date(trade.timestamp)
            : new Date();

          const date = dateObj.toLocaleDateString();
          const time = dateObj.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          const card = document.createElement("div");
          card.className = "journal-card";

          card.innerHTML = `
          <div class="card-header">
            <div class="pair-info">
              <i class="fa-solid fa-coins pair-icon"></i>
              ${quote} / ${base}
            </div>
            <button class="open-trade-btn ${trade.action || "UNKNOWN"}">
              ${trade.action || "?"}
            </button>
          </div>

          <div class="card-meta">
            <div class="timestamp">
              <span>${date}</span>
              <span>${time}</span>
            </div>

            <div class="tags">
              <span class="tag neutral">Qty: ${trade.qty ?? "-"}</span>
              <span class="tag neutral">@ ${trade.price ?? "-"}</span>
            </div>
          </div>
        `;

          journalContainer.appendChild(card);
        });
    } catch (err) {
      console.error("Trade load failed:", err);
      journalContainer.innerHTML =
        "<p class='empty error'>Backend reachable but data invalid</p>";
    }
  }

  await loadJournal();

  /* ============================
     ALERTS (STILL MOCK — OK)
     ============================ */

  const alertsData = [
    {
      id: 1,
      title: "Overtrading Alert",
      type: "Behavior",
      desc: "You've made multiple trades recently. Consider a break.",
    },
    {
      id: 2,
      title: "Position Sizing Warning",
      type: "Risk",
      desc: "This trade exceeds your typical risk size.",
    },
    {
      id: 3,
      title: "FOMO Detection",
      type: "Emotion",
      desc: "Rapid price movement detected. Avoid emotional entry.",
    },
  ];

  alertsData.forEach((item) => {
    const card = document.createElement("div");
    card.className = `alert-card ${item.type.toLowerCase()}`;

    card.innerHTML = `
      <div class="alert-header">
        <div class="alert-title-group">
          <span class="alert-num">${item.id}</span>
          <span class="alert-title">${item.title}</span>
        </div>
        <span class="alert-badge">${item.type}</span>
      </div>
      <div class="alert-body">${item.desc}</div>
    `;

    alertsContainer.appendChild(card);
  });

  /* ============================
     TAB SWITCHING
     ============================ */

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      views.forEach((v) => v.classList.add("hidden"));

      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.remove("hidden");
    });
  });

  /* ============================
     CHAT FOCUS
     ============================ */

  if (chatInput) {
    chatInput.addEventListener("focus", () => {
      views.forEach((v) => v.classList.add("hidden"));
      chatView.classList.remove("hidden");
      tabs.forEach((t) => t.classList.remove("active"));
    });
  }

  /* ============================
     CLOSE BUTTON
     ============================ */

  const closeBtn = document.querySelector(".close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => window.close());
  }
});
