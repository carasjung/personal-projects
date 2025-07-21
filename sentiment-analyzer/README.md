<p align="center">
  <img src="./dashboard/src/agent-scraper-logo.svg" alt="Agent Scraper Logo" width="180"/>
</p>

---

Agent Scraper is a comprehensive, AI-powered platform for real-time brand sentiment analysis across major social media platforms. Designed for marketing teams, brand managers, and analysts, it automates the collection, analysis, and reporting of public sentiment, providing actionable insights to inform brand strategy and reputation management.

## What is Agent Scraper?
Agent Scraper leverages advanced AI agents to gather and analyze data from YouTube, Reddit, Twitter, and Quora. It delivers:
- **Live sentiment and emotion analysis** using multiple AI/ML models (Hugging Face, Groq, Ollama)
- **Platform-specific summaries** and strategic recommendations
- **Professional, exportable reports** (PDF, CSV, JSON)
- **Real-time dashboard** for monitoring scraping and analysis progress
- **Authenticated scraping** for platforms requiring login (via Chrome automation)

## Key Use Cases
- **Brand Health Monitoring:** Track public perception and sentiment trends for your brand or competitors.
- **Campaign Impact Analysis:** Measure the effectiveness of marketing campaigns across platforms.
- **Crisis Detection:** Identify and respond to negative sentiment spikes in real time.
- **Market Research:** Gather qualitative insights from user-generated content and discussions.

## Features
- **Multi-Platform Data Collection:** Aggregates posts, comments, and discussions from YouTube, Reddit, Twitter, and Quora.
- **AI-Powered Sentiment & Emotion Analysis:** Supports multiple models for robust, nuanced analysis.
- **Real-Time Dashboard:** WebSocket-powered UI for live updates and progress tracking.
- **Platform-Specific Summaries:** Detailed breakdowns and actionable insights for each platform.
- **Export Capabilities:** Download reports in PDF, CSV, or JSON formats for sharing and further analysis.
- **Chrome-Based Scraping:** Handles authenticated sessions for platforms that require login.
- **Brand Health Assessment:** Automated recommendations based on sentiment and trend analysis.

## Architecture Overview
- **Frontend:** React dashboard with real-time updates via WebSocket
- **Backend:** Node.js/Express server orchestrating scraping, analysis, and reporting
- **AI/ML:** Integrates Hugging Face, Groq, and Ollama models for sentiment and emotion detection
- **Scrapers:** Modular agents for each supported platform

## Quick Start
1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/agent-scraper.git
   ```
2. **Install dependencies:**
   ```bash
   cd sentiment-analyzer
   npm install
   cd dashboard
   npm install
   ```
3. **Run the backend:**
   ```bash
   cd ..
   node server.js
   ```
4. **Run the frontend:**
   ```bash
   cd dashboard
   npm start
   ```

## Demo
- **Frontend:** [https://agent-scraper.vercel.app](https://agent-scraper.vercel.app)
- **Backend:** [https://agent-scraper-backend.onrender.com](https://agent-scraper-backend.onrender.com) 