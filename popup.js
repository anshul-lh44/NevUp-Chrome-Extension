// popup.js - uses background proxy for protected endpoints
document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE = "http://localhost:8000"; // for other direct calls; journal proxied via background
  const journalContainer = document.getElementById("journal");
  const alertsContainer = document.getElementById("alerts");
  const loginContainer = document.getElementById("login-container");
  const chatInput = document.getElementById("ask-nev");
  const chatView = document.getElementById("chat-suggestions");

  // Check if user is already logged in
  let isLoggedIn = false;

  // Initialize login UI first
  updateLoginUI();

  // Tab switching function - defined early so it can be used by other functions
  function switchTab(tabName) {
    const tabs = document.querySelectorAll(".tab-btn");
    const views = document.querySelectorAll(".view");

    // Remove active from all tabs
    tabs.forEach((t) => {
      t.classList.remove("active");
    });

    // Hide all views
    views.forEach((v) => {
      v.classList.add("hidden");
      v.classList.remove("active");
    });

    // Activate clicked tab
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) {
      activeTab.classList.add("active");
    }

    // Show corresponding view
    const targetView = document.getElementById(tabName);
    if (targetView) {
      targetView.classList.remove("hidden");
      targetView.classList.add("active");
    }
  }

  // Then check auth status and load journal
  chrome.storage.local.get(["authToken"], async (items) => {
    if (items && items.authToken) {
      // Verify token is still valid by checking with background
      try {
        const resp = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: "CHECK_AUTH" }, (r) => resolve(r));
        });
        isLoggedIn = resp && resp.ok && resp.authenticated;
        updateLoginUI();
        // Always try to load journal - it will handle auth errors
        await loadJournal();
      } catch (e) {
        isLoggedIn = false;
        updateLoginUI();
        // Still try to load journal to show proper error
        await loadJournal();
      }
    } else {
      updateLoginUI();
      // Try to load journal even if not logged in (will show error)
      await loadJournal();
    }
  });

  function updateLoginUI() {
    if (!loginContainer) return;

    if (isLoggedIn) {
      loginContainer.innerHTML = `
        <div style="padding: 16px; text-align: center;">
          <div style="font-size: 14px; color: var(--accent-green); margin-bottom: 12px;">
            <i class="fa-solid fa-check-circle" style="margin-right: 8px;"></i>
            You are logged in
          </div>
          <button id="nev-logout" style="width: 100%; padding: 10px; background-color: var(--accent-red); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; margin-bottom: 12px;">
            Logout
          </button>
        </div>
      `;
      document.getElementById("nev-logout").addEventListener("click", async () => {
        chrome.runtime.sendMessage({ type: "SET_AUTH_TOKEN", token: null }, (r) => { });
        chrome.storage.local.remove(["authToken", "lastNudge"], () => {
          isLoggedIn = false;
          updateLoginUI();
        });
      });
      setupWebSocketControls();
    } else {
      loginContainer.innerHTML = `
        <div style="padding: 16px;">
          <div style="font-weight: 600; margin-bottom: 12px; font-size: 14px;">Login (required for live nudges)</div>
          <input id="nev-username" placeholder="username" style="width: 100%; box-sizing: border-box; margin-bottom: 8px; padding: 10px; background-color: var(--card-bg); color: var(--text-primary); border: 1px solid #2c313a; border-radius: 8px; font-size: 13px;" />
          <input id="nev-password" type="password" placeholder="password" style="width: 100%; box-sizing: border-box; margin-bottom: 12px; padding: 10px; background-color: var(--card-bg); color: var(--text-primary); border: 1px solid #2c313a; border-radius: 8px; font-size: 13px;" />
          <button id="nev-login" style="width: 100%; padding: 10px; background-color: var(--accent-blue); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; margin-bottom: 8px;">
            Sign in
          </button>
          <div id="nev-login-msg" style="font-size: 12px; color: var(--text-secondary); margin-top: 8px; text-align: center;"></div>
        </div>
      `;

      document.getElementById("nev-login").addEventListener("click", async () => {
        const u = document.getElementById("nev-username").value.trim();
        const p = document.getElementById("nev-password").value;
        const msg = document.getElementById("nev-login-msg");
        msg.textContent = "Signing in...";
        msg.style.color = "#8b929a";
        try {
          const resp = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "LOGIN_WITH_CREDS", payload: { username: u, password: p } }, (r) => resolve(r));
          });
          if (!resp || !resp.ok) {
            msg.textContent = "Login failed: " + (resp && resp.error ? resp.error : "unknown");
            msg.style.color = "#e74c3c";
          } else {
            msg.textContent = "Login successful!";
            msg.style.color = "#2ecc71";
            isLoggedIn = true;
            updateLoginUI();
            await loadJournal(); // fetch protected journal now that we have token
          }
        } catch (e) {
          msg.textContent = "Login error: " + e.toString();
          msg.style.color = "#e74c3c";
        }
      });
    }

    // Setup WebSocket controls if logged in
    if (isLoggedIn) {
      setTimeout(setupWebSocketControls, 100);
    }
  }

  // Setup WebSocket status controls
  function setupWebSocketControls() {
    const checkBtn = document.getElementById("check-ws-status");
    const reconnectBtn = document.getElementById("reconnect-ws");
    const statusDisplay = document.getElementById("ws-status-display");

    if (checkBtn) {
      checkBtn.addEventListener("click", async () => {
        try {
          const resp = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "WS_STATUS" }, (r) => resolve(r));
          });
          if (resp && resp.ok && resp.status) {
            const s = resp.status;
            const statusHtml = `
              <div style="background: var(--card-bg); padding: 12px; border-radius: 8px; font-family: monospace; font-size: 10px;">
                <div><strong>Connection:</strong> ${s.connected ? '✓ Connected' : '✗ Not Connected'}</div>
                <div><strong>State:</strong> ${s.readyStateText || 'N/A'}</div>
                <div><strong>Has Token:</strong> ${s.hasToken ? 'Yes' : 'No'}</div>
                <div><strong>Token Valid:</strong> ${s.tokenValid ? 'Yes' : 'No'}</div>
                <div><strong>URL:</strong> ${s.url || 'N/A'}</div>
                <div><strong>Auto-Reconnect:</strong> ${s.shouldReconnect ? 'Yes' : 'No'}</div>
              </div>
            `;
            statusDisplay.innerHTML = statusHtml;
          }
        } catch (e) {
          statusDisplay.innerHTML = `<div style="color: #e74c3c;">Error: ${e.message}</div>`;
        }
      });
    }

    if (reconnectBtn) {
      reconnectBtn.addEventListener("click", async () => {
        try {
          const resp = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "WS_RECONNECT" }, (r) => resolve(r));
          });
          if (resp && resp.ok) {
            statusDisplay.innerHTML = `<div style="color: #2ecc71;">Reconnection initiated. Check status in a few seconds.</div>`;
            setTimeout(() => {
              if (checkBtn) checkBtn.click();
            }, 2000);
          }
        } catch (e) {
          statusDisplay.innerHTML = `<div style="color: #e74c3c;">Error: ${e.message}</div>`;
        }
      });
    }
  }

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
          isLoggedIn = false;
          updateLoginUI();
          // Switch to login tab
          switchTab("login");
          return;
        }
        journalContainer.innerHTML = "<p class='empty error'>Failed to load trades</p>";
        console.warn("FETCH_JOURNAL failed:", resp);
        return;
      }

      const data = resp.body;
      journalContainer.innerHTML = "";

      // backend may return { trades: [...] } or array
      let trades = null;
      if (Array.isArray(data)) {
        trades = data;
      } else if (data && typeof data === 'object') {
        trades = data.trades || data.data || (Array.isArray(data) ? data : null);
      }

      if (!trades || !Array.isArray(trades) || trades.length === 0) {
        journalContainer.innerHTML = "<p class='empty'>No trades recorded yet</p>";
        console.log("No trades found. Response data:", data);
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

  // initial load - will be called after auth check if logged in

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

  // Listen for WS nudges as fallback (if content script isn't available)
  chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg && msg.type === "WS_NUDGE") {
      try {
        console.log("Popup received WS_NUDGE:", msg);
        const payload = msg.payload;
        const title = payload.title || "Nudge";
        const message = payload.message || JSON.stringify(payload).slice(0, 200);

        // Show in alerts tab
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
        if (alertsContainer) {
          alertsContainer.insertBefore(card, alertsContainer.firstChild);
          // Switch to alerts tab to show the nudge
          switchTab("alerts");
        }
      } catch (e) {
        console.error("Failed to render WS nudge in popup:", e);
      }
    }
  });

  // Set up tab click handlers
  const tabs = document.querySelectorAll(".tab-btn");
  if (tabs) {
    tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetTab = tab.dataset.tab;
        if (targetTab) {
          switchTab(targetTab);
          // Setup WebSocket controls when login tab is shown
          if (targetTab === "login") {
            setTimeout(setupWebSocketControls, 100);
          }
        }
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

  /* ============================
     CHAT FUNCTIONALITY
     ============================ */
  const chatMessagesContainer = document.getElementById("chat-messages");
  const chatInputField = document.getElementById("chat-input");
  const sendButton = document.getElementById("send-btn");

  // Display a message in the chat
  function displayMessage(content, sender, suggestedActions = []) {
    if (!chatMessagesContainer) return;

    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message ${sender}`;

    let html = `<div class="message-content">${content}</div>`;

    // Add suggested actions for AI messages
    if (sender === "ai" && suggestedActions && suggestedActions.length > 0) {
      html += `<div class="suggested-actions">`;
      suggestedActions.forEach(action => {
        html += `<button class="action-btn">${action}</button>`;
      });
      html += `</div>`;
    }

    messageDiv.innerHTML = html;
    chatMessagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

    // Add click handlers for action buttons
    if (sender === "ai") {
      messageDiv.querySelectorAll(".action-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const action = btn.textContent;
          if (action === "Check Leaderboard") {
            switchTab("journal");
          } else if (action === "Review Recent Trades") {
            switchTab("journal");
          } else if (action.includes("break") || action.includes("Log out")) {
            // Award points for following nudge
            chrome.runtime.sendMessage({ type: "FOLLOWED_NUDGE" }, (r) => {
              if (r && r.ok) {
                displayMessage("Great choice! You've earned points for following healthy trading habits. 🎉", "ai");
              }
            });
          }
        });
      });
    }
  }

  // Send a message to the chat API
  async function sendChatMessage() {
    if (!chatInputField) return;

    const message = chatInputField.value.trim();
    if (!message) return;

    // Display user message
    displayMessage(message, "user");
    chatInputField.value = "";

    // Show loading indicator
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "chat-message ai loading";
    loadingDiv.innerHTML = `<div class="message-content"><span class="loading-dots">Thinking<span>.</span><span>.</span><span>.</span></span></div>`;
    chatMessagesContainer.appendChild(loadingDiv);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

    try {
      const response = await fetch(`${API_BASE}/extension/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      // Remove loading indicator
      loadingDiv.remove();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      displayMessage(data.response, "ai", data.suggested_actions);

    } catch (error) {
      // Remove loading indicator
      loadingDiv.remove();
      console.error("Chat error:", error);
      displayMessage("Sorry, I'm having trouble connecting right now. Please try again in a moment.", "ai");
    }
  }

  // Event listeners for chat
  if (sendButton) {
    sendButton.addEventListener("click", sendChatMessage);
  }

  if (chatInputField) {
    chatInputField.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendChatMessage();
      }
    });

    // Switch to chat tab when input is focused
    chatInputField.addEventListener("focus", () => {
      switchTab("chat");
    });
  }
});
