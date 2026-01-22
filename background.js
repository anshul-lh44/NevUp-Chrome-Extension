// background.js — proxy protected endpoints and maintain WS
const API_BASE = "http://localhost:8000"; // your backend
const WS_PATH = "/alpaca/ws/updates";

let authToken = null;
let ws = null;
let wsReconnectBackoff = 1000;
const wsMaxBackoff = 30000;
let wsShouldReconnect = true;

// load auth token at startup
chrome.storage.local.get(["authToken"], (items) => {
  if (items && items.authToken) authToken = items.authToken;
  initBackground();
});

async function initBackground() {
  try {
    if (authToken && isTokenValid(authToken)) {
      await callStartEndpoint();
      connectWebsocket();
    } else {
      console.info("No valid token at startup — WS will not start until logged in.");
    }
  } catch (e) {
    console.warn("initBackground error:", e);
  }
}

// --- JWT helpers (same as before) ---
function safeBase64UrlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  try { return atob(str); } catch (e) { return null; }
}
function parseJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = safeBase64UrlDecode(parts[1]);
    if (!payload) return null;
    return JSON.parse(payload);
  } catch (e) { return null; }
}
function isTokenValid(token) {
  if (!token) return false;
  const payload = parseJwt(token);
  if (!payload) return false;
  if (!payload.exp) return true;
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp > nowSec + 10;
}

// --- Auth header helper ---
function authHeader() {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

// --- start endpoint call ---
async function callStartEndpoint() {
  const url = `${API_BASE}/alpaca/start`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader()
    }
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=>"");
    throw new Error(`POST ${url} failed: ${res.status} ${txt}`);
  }
  return res.json();
}

// --- fetch token helper (same robust approach) ---
async function fetchTokenWithPassword(username, password) {
  const url = `${API_BASE}/auth/token`;
  // try JSON
  try {
    let res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    if (res.ok) {
      const j = await res.json();
      const t = j.access_token || j.token || j.accessToken || j.access;
      if (t) return t;
    }
  } catch (e) {}
  // try form-encoded
  try {
    const params = new URLSearchParams();
    params.append("username", username);
    params.append("password", password);
    const res2 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });
    if (res2.ok) {
      const j2 = await res2.json();
      const t2 = j2.access_token || j2.token || j2.accessToken || j2.access;
      if (t2) return t2;
      throw new Error("token not found in response");
    } else {
      const txt = await res2.text().catch(()=>"");
      throw new Error(`token endpoint returned ${res2.status} ${txt}`);
    }
  } catch (e) {
    throw new Error("Failed to fetch token: " + e.toString());
  }
}

// --- WebSocket logic (unchanged, but requires authToken to connect) ---
function buildWsUrl() {
  if (!authToken) throw new Error("Cannot build WS URL without authToken");
  let base = API_BASE.replace(/\/+$/, "");
  const wsProto = base.startsWith("https://") ? "wss" : "ws";
  base = base.replace(/^https?:\/\//, "");
  return `${wsProto}://${base}${WS_PATH}?token=${encodeURIComponent(authToken)}`;
}
function connectWebsocket() {
  if (ws) return;
  if (!authToken) {
    console.warn("Skipping WS connect: authToken missing");
    return;
  }
  let url;
  try { url = buildWsUrl(); } catch (e) { console.error(e); return; }
  console.info("Connecting WS ->", url);
  try {
    ws = new WebSocket(url);
    ws.onopen = () => { console.info("WebSocket connected."); wsReconnectBackoff = 1000; };
    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        chrome.runtime.sendMessage({ type: "WS_NUDGE", payload });
        if (payload && payload.type === "nudge") chrome.storage.local.set({ lastNudge: payload });
      } catch (err) { console.warn("Invalid WS message:", ev.data); }
    };
    ws.onclose = (ev) => { console.warn("WS closed:", ev.code, ev.reason); ws = null; if (wsShouldReconnect) scheduleReconnect(); };
    ws.onerror = (err) => { console.error("WS error:", err); try{ws.close();}catch(e){} ws=null; if (wsShouldReconnect) scheduleReconnect(); };
  } catch (e) { console.error("Failed to create WebSocket:", e); ws=null; if (wsShouldReconnect) scheduleReconnect(); }
}
function scheduleReconnect() {
  const delay = wsReconnectBackoff;
  console.info(`Reconnecting WS in ${delay} ms`);
  setTimeout(() => { wsReconnectBackoff = Math.min(wsReconnectBackoff * 2, wsMaxBackoff); connectWebsocket(); }, delay);
}
function reconnectWebsocket(force = false) {
  wsShouldReconnect = true;
  if (ws) try { ws.close(); } catch (e) {}
  ws = null;
  if (force) wsReconnectBackoff = 1000;
  connectWebsocket();
}
function stopWebsocket() { wsShouldReconnect = false; if (ws) try { ws.close(); } catch (e) {} ws = null; }

// --- NEW: fetch journal from backend with Authorization header (proxy) ---
async function fetchJournalFromBackend(options = { include_accepted: true }) {
  // backend path that returned 401 for you
  const url = `${API_BASE}/markets/journal/live`;
  // If your server expects query params like include_accepted, add them:
  // const q = new URLSearchParams({ include_accepted: options.include_accepted ? "true" : "false" });
  // const fullUrl = `${url}?${q.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeader()
    }
  });
  const status = res.status;
  const text = await res.text().catch(()=>"");
  // try to parse JSON if possible
  let json = null;
  try { json = JSON.parse(text); } catch (e) { json = null; }
  return { ok: res.ok, status, body: json ?? text };
}

// --- runtime message handler (expanded with FETCH_JOURNAL) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (!request || !request.type) { sendResponse({ ok: false, error: "invalid_request" }); return; }

      if (request.type === "LOGIN_WITH_CREDS") {
        const { username, password } = request.payload || {};
        if (!username || !password) throw new Error("missing username/password");
        const token = await fetchTokenWithPassword(username, password);
        if (!isTokenValid(token)) throw new Error("received token invalid or expired");
        authToken = token;
        chrome.storage.local.set({ authToken: token }, () => {});
        await callStartEndpoint();
        reconnectWebsocket(true);
        sendResponse({ ok: true, token });
        return;
      }

      if (request.type === "SET_AUTH_TOKEN") {
        const token = request.token;
        if (!token) {
          // clear token
          authToken = null;
          chrome.storage.local.remove(["authToken", "lastNudge"], () => {});
          stopWebsocket();
          sendResponse({ ok: true, cleared: true });
          return;
        }
        if (!isTokenValid(token)) console.warn("SET_AUTH_TOKEN: token appears invalid/expired");
        authToken = token;
        chrome.storage.local.set({ authToken: token }, () => {});
        try { await callStartEndpoint(); } catch (e) { console.warn("callStartEndpoint failed:", e); }
        reconnectWebsocket(true);
        sendResponse({ ok: true });
        return;
      }

      // NEW: popup asks background to fetch the journal (so Authorization header is attached)
      if (request.type === "FETCH_JOURNAL") {
        // optional: allow passing options: include_accepted etc
        const opts = request.options || {};
        const r = await fetchJournalFromBackend(opts);
        if (!r.ok) {
          // if 401, forward that so popup can prompt login
          sendResponse({ ok: false, status: r.status, body: r.body, error: "fetch_failed" });
          return;
        }
        sendResponse({ ok: true, status: r.status, body: r.body });
        return;
      }

      if (request.type === "GET_NUDGE") {
        const tradeContext = request.tradeContext || {};
        const url = `${API_BASE}/ml/get_nudge`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify(tradeContext)
        });
        if (!res.ok) throw new Error("get_nudge failed: " + res.status);
        const j = await res.json();
        sendResponse({ ok: true, nudge: j });
        return;
      }

      if (request.type === "FOLLOWED_NUDGE") {
        const url = `${API_BASE}/gamification/events/followed_nudge`;
        const res = await fetch(url, {
          method: "POST",
          headers: { ...authHeader() }
        });
        if (!res.ok) throw new Error("followed_nudge failed: " + res.status);
        const j = await res.json();
        sendResponse({ ok: true, points: j });
        return;
      }

      if (request.type === "GET_POINTS") {
        const url = `${API_BASE}/gamification/me/points`;
        const res = await fetch(url, { headers: { ...authHeader() } });
        if (!res.ok) throw new Error("get points failed: " + res.status);
        const j = await res.json();
        sendResponse({ ok: true, data: j });
        return;
      }

      sendResponse({ ok: false, error: "unknown_request_type" });
    } catch (err) {
      sendResponse({ ok: false, error: err.message || String(err) });
    }
  })();
  return true;
});

// cleanup
chrome.runtime.onSuspend?.addListener(() => { stopWebsocket(); });
