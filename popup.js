document.addEventListener("DOMContentLoaded", () => {
  const pointsSpan = document.getElementById("points");
  const rankSpan = document.getElementById("rank");

  chrome.runtime.sendMessage({ type: "GET_POINTS" }, response => {
    if (!response?.ok) return;
    const data = response.data;
    pointsSpan.textContent = data.score ?? 0;
    rankSpan.textContent = data.rank ?? "-";
  });
});
