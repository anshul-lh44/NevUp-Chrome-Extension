document.addEventListener("DOMContentLoaded", () => {
const apiBaseInput = document.getElementById("apiBase");
const apiTokenInput = document.getElementById("apiToken");
const saveBtn = document.getElementById("save");
const statusDiv = document.getElementById("status");

// Load existing
chrome.storage.sync.get(["nevupApiBase", "nevupApiToken"], (result) => {
if (result.nevupApiBase) apiBaseInput.value = result.nevupApiBase;
if (result.nevupApiToken) apiTokenInput.value = result.nevupApiToken;
});

saveBtn.addEventListener("click", () => {
const apiBase = apiBaseInput.value.trim();
const apiToken = apiTokenInput.value.trim();

text
chrome.runtime.sendMessage(
  {
    type: "SAVE_SETTINGS",
    apiBase,
    apiToken
  },
  (response) => {
    if (!response || !response.ok) {
      statusDiv.textContent = "Failed to save settings.";
      statusDiv.className = "error";
      return;
    }
    statusDiv.textContent = "Settings saved.";
    statusDiv.className = "success";
    setTimeout(() => {
      statusDiv.textContent = "";
      statusDiv.className = "";
    }, 1500);
  }
);
});
});
