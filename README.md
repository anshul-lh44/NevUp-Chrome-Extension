# 🧠 NevUp AI — Chrome Extension

> **AI-powered trading psychology analyzer** that helps traders make smarter decisions through real-time nudges, behavioral alerts, and gamified learning.

<div align="center">

![Manifest Version](https://img.shields.io/badge/Manifest-v3-blue?style=flat-square)
![Version](https://img.shields.io/badge/Version-1.0-green?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Chrome-yellow?style=flat-square)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 **Trade Journal** | Automatically logs and displays your trading history with detailed timestamps and metadata |
| 🔔 **Smart Alerts** | Behavioral, risk, and emotional alerts to help you avoid common trading mistakes |
| 🤖 **AI Nudges** | Machine learning-powered nudges that analyze your trading patterns and provide personalized guidance |
| 🎮 **Gamification** | Earn points for following healthy trading practices and building good habits |
| 💬 **AI Chat** | Ask Nev AI for trading advice and get explanations for nudges |

---

## 🚀 Getting Started

### Prerequisites

- **Google Chrome** (or Chromium-based browser)
- **NevUp Backend** running on `http://localhost:8000`

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/anshul-lh44/NevUp-Chrome-Extension.git
   cd NevUp-Chrome-Extension
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Update .env with your backend URL if different from localhost
   ```

3. **Load the extension in Chrome**
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right)
   - Click **Load unpacked**
   - Select the `NevUp-Chrome-Extension` folder

4. **Start the backend**
   - Ensure the NevUp backend server is running on port 8000

---

## 📁 Project Structure

```
NevUp-Chrome-Extension/
├── manifest.json       # Extension configuration (Manifest V3)
├── background.js       # Service worker for API communication
├── contentScript.js    # Injects into trading platforms
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic and trade display
├── options.html        # Extension settings page
├── options.js          # Settings management
└── styles/             # CSS stylesheets
```

---

## 🔗 API Endpoints

The extension communicates with the following backend endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/trades` | GET | Fetch trading history |
| `/ml/get_nudge` | POST | Get AI-powered trading nudge |
| `/gamification/events/followed_nudge` | POST | Award points for following nudges |
| `/gamification/me/points` | GET | Get user's gamification points |

---

## 🛡️ Permissions

| Permission | Purpose |
|------------|---------|
| `storage` | Persist user preferences and settings |
| `activeTab` | Interact with the current tab for content injection |
| `scripting` | Execute content scripts on trading platforms |

---

## 🎯 Supported Platforms

- **Binance** (`*.binance.com`)
- *More platforms coming soon...*

---

## 🔧 Development

### Local Development

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the **refresh** icon on the NevUp AI extension
4. Test your changes

### Backend Setup

This extension requires the [NevUp Backend](https://github.com/anshul-lh44/NevUp-Backend) to be running. Follow the backend repository's setup instructions.

---

## 📝 Configuration

The extension can be configured through the **Options** page:

1. Right-click the extension icon
2. Select **Options**
3. Configure your preferences

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Anshul** — [@anshul-lh44](https://github.com/anshul-lh44)

---

<div align="center">

**Made with ❤️ for smarter trading**

</div>
