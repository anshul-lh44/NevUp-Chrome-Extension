// popup.js - uses background proxy for protected endpoints
document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE = "http://localhost:8000"; // for other direct calls; journal proxied via background
  const journalContainer = document.getElementById("journal");
  const alertsContainer = document.getElementById("alerts");
  const chatInput = document.getElementById("ask-nev");
  const chatView = document.getElementById("chat-suggestions");
  const loginContainerId = "login-container";

  function ensureLoginUI() {
    let el = document.getElementById(loginContainerId);
    if (el) return el;
    el = document.createElement("div");
    el.id = loginContainerId;
    el.style.padding = "8px";
    el.style.borderTop = "1px solid #eee";
    el.innerHTML = `
      <div style="font-weight:600;margin-bottom:6px">Login (required for live nudges)</div>
      <input id="nev-username" placeholder="username" style="width:100%;box-sizing:border-box;margin-bottom:6px" />
      <input id="nev-password" type="password" placeholder="password" style="width:100%;box-sizing:border-box;margin-bottom:6px" />
      <div style="display:flex;gap:8px;">
        <button id="nev-login" style="flex:1">Sign in</button>
        <button id="nev-clear" style="flex:1">Clear token</button>
      </div>
      <div id="nev-login-msg" style="font-size:12px;color:#666;margin-top:6px"></div>
    `;
    const parent = alertsContainer || document.body;
    parent.appendChild(el);

    document.getElementById("nev-login").addEventListener("click", async () => {
      const u = document.getElementById("nev-username").value.trim();
      const p = document.getElementById("nev-password").value;
      const msg = document.getElementById("nev-login-msg");
      msg.textContent = "Signing in...";
      try {
        const resp = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: "LOGIN_WITH_CREDS", payload: { username: u, password: p } }, (r) => resolve(r));
        });
        if (!resp || !resp.ok) {
          msg.textContent = "Login failed: " + (resp && resp.error ? resp.error : "unknown");
        } else {
          msg.textContent = "Login OK.";
          await loadJournal(); // fetch protected journal now that we have token
        }
      } catch (e) {
        msg.textContent = "Login error: " + e.toString();
      }
    });

    document.getElementById("nev-clear").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "SET_AUTH_TOKEN", token: null }, (r) => {});
      chrome.storage.local.remove(["authToken", "lastNudge"], () => {
        document.getElementById("nev-login-msg").textContent = "Token cleared.";
      });
    });

    return el;
  }

  ensureLoginUI();

  // ------------------- loadJournal via background proxy -------------------
  async function loadJournal() {
    if (!journalContainer) return;
    journalContainer.innerHTML = "<p class='empty'>Loading trades...</p>";

    try {
      const resp = await new Promise((resolve) => {
        // options could be passed; here default
        chrome.runtime.sendMessage({ type: "FETCH_JOURNAL", options: {} }, (r) => resolve(r));
      });

      if (!resp) throw new Error("No response from background");
      if (!resp.ok) {
        // handle auth failure explicitly
        if (resp.status === 401) {
          journalContainer.innerHTML = "<p class='empty error'>Unauthorized — please sign in to view trades.</p>";
          const loginMsg = document.getElementById("nev-login-msg");
          if (loginMsg) loginMsg.textContent = "Unauthorized: please sign in.";
          return;
        }
        journalContainer.innerHTML = "<p class='empty error'>Failed to load trades</p>";
        console.warn("FETCH_JOURNAL failed:", resp);
        return;
      }

      const data = resp.body;
      journalContainer.innerHTML = "";

      // backend may return { trades: [...] } or array
      const trades = Array.isArray(data) ? data : (data.trades || data);

      if (!trades || trades.length === 0) {
        journalContainer.innerHTML = "<p class='empty'>No trades recorded yet</p>";
        return;
      }

      trades.slice().reverse().forEach((trade) => {
        const rawSymbol = trade.symbol || trade.pair || trade.ticker || trade.asset_name || "UNKNOWN";
        const symbol = String(rawSymbol);
        const base = symbol.includes("USDT") ? symbol.replace("USDT", "") : symbol;
        const quote = symbol.includes("USDT") ? "USDT" : "";
        const ts = trade.opened_at || trade.timestamp || trade.created_at || Date.now();
        const dateObj = ts ? new Date(ts) : new Date();
        const date = dateObj.toLocaleDateString();
        const time = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        const card = document.createElement("div");
        card.className = "journal-card";
        const qty = trade.quantity ?? trade.qty ?? "-";
        const price = trade.current ?? trade.market_value ?? trade.entry ?? "-";
        const action = trade.action ?? trade.side ?? "?";

        card.innerHTML = `
          <div class="card-header">
            <div class="pair-info">
              <i class="fa-solid fa-coins pair-icon"></i>
              ${quote} / ${base}
            </div>
            <button class="open-trade-btn ${action}">
              ${action}
            </button>
          </div>

          <div class="card-meta">
            <div class="timestamp">
              <span>${date}</span>
              <span>${time}</span>
            </div>

            <div class="tags">
              <span class="tag neutral">Qty: ${qty}</span>
              <span class="tag neutral">@ ${price}</span>
            </div>
          </div>
        `;
        journalContainer.appendChild(card);
      });

    } catch (err) {
      console.error("Trade load failed:", err);
      journalContainer.innerHTML = "<p class='empty error'>Backend unreachable or returned invalid data</p>";
    }
  }

  // initial load
  await loadJournal();

  // show stored last nudge
  chrome.storage.local.get(["lastNudge"], (items) => {
    if (items && items.lastNudge) {
      const payload = items.lastNudge;
      const n = payload.nudge || payload;
      const title = n.nudge || "Nudge";
      const message = n.message || JSON.stringify(n).slice(0, 200);
      const card = document.createElement("div");
      card.className = "alert-card nudge";
      card.innerHTML = `
        <div class="alert-header">
          <div class="alert-title-group">
            <span class="alert-num">!</span>
            <span class="alert-title">${title}</span>
          </div>
          <span class="alert-badge">Nudge</span>
        </div>
        <div class="alert-body">${message}</div>
      `;
      alertsContainer.insertBefore(card, alertsContainer.firstChild);
    }
  });

  // listen for WS nudges forwarded from background
  chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg && msg.type === "WS_NUDGE") {
      try {
        const payload = msg.payload;
        const n = payload.nudge || payload;
        const title = n.nudge || "Nudge";
        const message = n.message || JSON.stringify(n).slice(0, 200);
        const card = document.createElement("div");
        card.className = "alert-card nudge";
        card.innerHTML = `
          <div class="alert-header">
            <div class="alert-title-group">
              <span class="alert-num">!</span>
              <span class="alert-title">${title}</span>
            </div>
            <span class="alert-badge">Nudge</span>
          </div>
          <div class="alert-body">${message}</div>
        `;
        alertsContainer.insertBefore(card, alertsContainer.firstChild);
      } catch (e) {
        console.error("Failed to render WS nudge:", e);
      }
    }
  });

  // rest of your popup wiring (tabs/chat/close)
  const tabs = document.querySelectorAll(".tab-btn");
  const views = document.querySelectorAll(".view");
  if (tabs && views) {
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        views.forEach((v) => v.classList.add("hidden"));
        tab.classList.add("active");
        document.getElementById(tab.dataset.tab).classList.remove("hidden");
      });
    });
  }

  if (chatInput) {
    chatInput.addEventListener("focus", () => {
      views.forEach((v) => v.classList.add("hidden"));
      chatView.classList.remove("hidden");
      tabs.forEach((t) => t.classList.remove("active"));
    });
  }

  const closeBtn = document.querySelector(".close-btn");
  if (closeBtn) closeBtn.addEventListener("click", () => window.close());
});
