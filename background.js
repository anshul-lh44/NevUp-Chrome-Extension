const API_BASE = "https://github.com/VedanshN/NevUp-Backend.git";

let authToken = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_NUDGE") {
    getNudge(request.tradeContext)
      .then(nudge => sendResponse({ ok: true, nudge }))
      .catch(err => sendResponse({ ok: false, error: err.toString() }));
    return true;
  }
  if (request.type === "FOLLOWED_NUDGE") {
    awardPointsForNudge()
      .then(points => sendResponse({ ok: true, points }))
      .catch(err => sendResponse({ ok: false, error: err.toString() }));
    return true;
  }
  if (request.type === "GET_POINTS") {
    getMyPoints()
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.toString() }));
    return true;
  }
});

async function getNudge(tradeContext) {
  const res = await fetch(`${API_BASE}/ml/get_nudge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    body: JSON.stringify(tradeContext)
  });
  if (!res.ok) throw new Error("Failed to get nudge");
  return res.json();
}

async function awardPointsForNudge() {
  const res = await fetch(`${API_BASE}/gamification/events/followed_nudge`, {
    method: "POST",
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    }
  });
  if (!res.ok) throw new Error("Failed to award points");
  return res.json();
}

async function getMyPoints() {
  const res = await fetch(`${API_BASE}/gamification/me/points`, {
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    }
  });
  if (!res.ok) throw new Error("Failed to get points");
  return res.json();
}
