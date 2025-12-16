document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-btn");
  const views = document.querySelectorAll(".view");
  const journalContainer = document.getElementById("journal");
  const alertsContainer = document.getElementById("alerts");
  const chatInput = document.getElementById("ask-nev");
  const chatView = document.getElementById("chat-suggestions");

  // Mock Data for Journal
  const journalData = [
    { pair: ["USDT", "BTCB"], date: "June 12, 2025", time: "10:40 AM", tags: ["Confident", "Fearful", "Cautious"] },
    { pair: ["USDT", "BTCB"], date: "June 12, 2025", time: "10:40 AM", tags: ["Confident", "Fearful", "Cautious"] },
    { pair: ["USDT", "BTCB"], date: "June 12, 2025", time: "10:40 AM", tags: ["Confident", "Fearful", "Cautious"] },
    { pair: ["USDT", "BTCB"], date: "June 12, 2025", time: "10:40 AM", tags: ["Confident", "Fearful", "Cautious"] },
  ];

  // Mock Data for Alerts
  const alertsData = [
    { id: 1, title: "Overtrading Alert", type: "Behavior", desc: "You've made 5 trades in the last hour. Take a 15-minute break." },
    { id: 2, title: "Position Sizing Warning", type: "Risk", desc: "This position exceeds your usual risk threshold by 35%." },
    { id: 3, title: "FOMO Detection", type: "Emotion", desc: "Market is up 5% rapidly. You're at risk of emotional entry." },
    { id: 4, title: "Trade Plan Reminder", type: "Strategy", desc: "Is this entry consistent with your setup conditions?" },
    { id: 5, title: "Risk Management Check", type: "Risk", desc: "This position risks more than 2% of your account." },
  ];

  // Render Journal
  journalData.forEach(item => {
    const card = document.createElement("div");
    card.className = "journal-card";
    card.innerHTML = `
      <div class="card-header">
        <div class="pair-info">
          <i class="fa-solid fa-t pair-icon"></i> USDT , 
          <i class="fa-brands fa-bitcoin pair-icon secondary"></i> BTCB
        </div>
        <button class="open-trade-btn">Open Trade</button>
      </div>
      <div class="card-meta">
        <div class="timestamp">
          <span>${item.date}</span>
          <span>${item.time}</span>
        </div>
        <div class="tags">
          <span class="tag confident">Confident</span>
          <span class="tag fearful">Fearful</span>
          <span class="tag cautious">Cautious</span>
        </div>
      </div>
    `;
    journalContainer.appendChild(card);
  });

  // Render Alerts
  alertsData.forEach(item => {
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
      <div class="alert-body">
        ${item.desc}
      </div>
    `;
    alertsContainer.appendChild(card);
  });

  // Tab Switching Logic
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      // 1. Remove active class from all tabs
      tabs.forEach(t => t.classList.remove("active"));
      // 2. Add active class to clicked tab
      tab.classList.add("active");

      // 3. Hide all views
      views.forEach(v => v.classList.add("hidden"));
      
      // 4. Show target view
      const targetId = tab.getAttribute("data-tab");
      document.getElementById(targetId).classList.remove("hidden");
    });
  });

  // Optional: Show Chat suggestions when focusing input
  chatInput.addEventListener("focus", () => {
    // Hide current content, show chat view
    views.forEach(v => v.classList.add("hidden"));
    chatView.classList.remove("hidden");
    
    // Deselect tabs visually
    tabs.forEach(t => t.classList.remove("active"));
  });

  // Basic close button functionality
  document.querySelector(".close-btn").addEventListener("click", () => {
    window.close(); // Only works for popup, not injected content scripts
  });
});
