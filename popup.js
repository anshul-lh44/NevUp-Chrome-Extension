document.addEventListener("DOMContentLoaded", () => {
const pointsSpan = document.getElementById("points");
const rankSpan = document.getElementById("rank");
const refreshBtn = document.getElementById("refresh");
const optionsLink = document.getElementById("open-options");

function loadPoints() {
chrome.runtime.sendMessage({ type: "GET_POINTS" }, (response) => {
if (!response || !response.ok) {
pointsSpan.textContent = "0";
rankSpan.textContent = "-";
return;
}
const data = response.data || {};
pointsSpan.textContent = data.score ?? 0;
rankSpan.textContent = data.rank ?? "-";
});
}

refreshBtn.addEventListener("click", () => {
loadPoints();
});

optionsLink.addEventListener("click", (e) => {
e.preventDefault();
if (chrome.runtime.openOptionsPage) {
chrome.runtime.openOptionsPage();
} else {
window.open(chrome.runtime.getURL("options.html"));
}
});

loadPoints();
});
