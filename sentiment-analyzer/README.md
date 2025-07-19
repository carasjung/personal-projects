# Agent Scraper - Brand Sentiment Analysis with AI Agents

A powerful, multi-platform sentiment analysis platform that uses AI agents to analyze brand sentiment across social media platforms. Built with Node.js, React, and multiple AI models including Hugging Face, Groq, and Ollama.

## 🌐 Live Demo

**Frontend (Vercel):** [https://agent-scraper.vercel.app](https://agent-scraper.vercel.app)  
**Backend (Render):** [https://agent-scraper-backend.onrender.com](https://agent-scraper-backend.onrender.com)

<div align="center">
  <img src="dashboard/public/logo.png" alt="Agent Scraper Logo" width="200" height="100">
</div>

## 🌟 Features

### **Multi-Platform Data Collection**
- **YouTube**: Video comments and engagement analysis
- **Reddit**: Community discussions and sentiment tracking
- **Twitter**: Real-time tweet sentiment analysis
- **Quora**: Q&A platform sentiment monitoring
- **Chrome-based scraping** for authenticated platforms

### **Advanced AI Analysis**
- **Multiple AI Models**: Hugging Face, Groq, and Ollama integration
- **Sentiment Analysis**: Positive, negative, and neutral classification
- **Emotion Detection**: Joy, sadness, anger, fear, surprise, disgust
- **Platform Summaries**: Detailed insights per platform
- **Strategic Insights**: Actionable recommendations
- **Deep Analysis**: Comprehensive brand health assessment

### **Real-Time Dashboard**
- **Live Progress Tracking**: WebSocket-powered real-time updates
- **Interactive Visualizations**: Sentiment distribution charts
- **Export Capabilities**: PDF, CSV, and JSON exports
- **Session History**: Track and compare analysis sessions
- **Modern UI**: Clean, responsive design with SF Pro fonts

### **Export Features**
- **PDF Reports**: Professional reports with pagination
- **CSV Data**: Raw data export for further analysis
- **JSON Format**: Structured data for API integration

## 🚀 Quick Start

### Prerequisites
- Node.js >= 16.0.0
- npm >= 8.0.0
- Chrome browser (for Quora scraping)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sentiment-analyzer.git
   cd sentiment-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your API keys:
   ```env
   HUGGINGFACE_API_KEY=your_huggingface_key
   GROQ_API_KEY=your_groq_key
   YOUTUBE_API_KEY=your_youtube_api_key
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Dashboard: http://localhost:3000
   - Backend API: http://localhost:3001

## 📋 Available Scripts

### Development
```bash
npm run dev              # Start both frontend and backend
npm run server:dev       # Start backend with nodemon
npm run client:dev       # Start React dashboard
```

### Production
```bash
npm run build           # Build React dashboard
npm run prod           # Start production server
npm start              # Start backend server
```

### Testing
```bash
npm test               # Run AI integration tests
npm run test-enhanced  # Run enhanced tests
```

## 🔧 Configuration

### Brand Configuration
Create brand configurations in `src/config/BrandConfig.js`:

```javascript
{
  id: 'brand_name',
  name: 'Brand Name',
  category: 'tech|beauty|entertainment',
  keywords: ['keyword1', 'keyword2'],
  sentimentTargets: ['quality', 'service', 'price']
}
```

### Platform Selection
The dashboard allows you to select which platforms to analyze:
- ✅ YouTube (API-based)
- ✅ Reddit (API-based)
- ✅ Twitter (API-based)
- ✅ Quora (Chrome-based scraping)

## 🤖 AI Models

### Sentiment Analysis
- **Primary**: `cardiffnlp/twitter-roberta-base-sentiment-latest`
- **Fallback**: `distilbert-base-uncased-finetuned-sst-2-english`
- **Enhanced Basic**: Rule-based sentiment scoring

### Emotion Analysis
- **Model**: `j-hartmann/emotion-english-distilroberta-base`
- **Emotions**: Joy, Sadness, Anger, Fear, Surprise, Disgust

### Summarization
- **Model**: `google/flan-t5-small`
- **Purpose**: Platform-specific summaries and insights

### Strategic Analysis
- **Groq Integration**: Advanced reasoning and recommendations
- **Ollama Integration**: Local model analysis (optional)

## 📊 Analysis Output

### Sentiment Metrics
- **Overall Sentiment**: Aggregated across all platforms
- **Platform Breakdown**: Per-platform sentiment analysis
- **Confidence Scores**: AI model confidence levels
- **Engagement Metrics**: Likes, shares, comments analysis

### Platform Summaries
- **Key Topics**: Most discussed themes
- **Sentiment Distribution**: Positive/negative/neutral breakdown
- **Top Contributors**: Most engaged users
- **Content Analysis**: Theme and emotion analysis

### Strategic Insights
- **Risk Assessment**: Brand reputation risk levels
- **Recommendations**: Actionable improvement suggestions
- **Trend Analysis**: Temporal pattern recognition
- **Competitive Insights**: Market positioning analysis

## 🔌 API Endpoints

### Analysis
- `POST /api/analyze` - Start brand sentiment analysis
- `GET /api/sessions` - Get all analysis sessions
- `GET /api/sessions/:id` - Get specific session results

### Export
- `GET /api/export/:sessionId/pdf` - Export PDF report
- `GET /api/export/:sessionId/csv` - Export CSV data
- `GET /api/export/:sessionId/json` - Export JSON data

### WebSocket Events
- `session_update` - Real-time analysis progress
- `analysis_complete` - Analysis completion notification

## 🚀 Deployment

### Architecture
- **Frontend**: Deployed on Vercel for fast global CDN and React optimization
- **Backend**: Deployed on Render for Node.js/Express server support
- **WebSocket**: Real-time communication between frontend and backend
- **Database**: In-memory session storage (can be extended to persistent storage)

### Environment Variables
Set these in your deployment platforms:

**Vercel (Frontend):**
- `REACT_APP_API_URL`: Your Render backend URL

**Render (Backend):**
- `NODE_ENV`: production
- `HUGGINGFACE_API_KEY`: Your Hugging Face API key
- `GROQ_API_KEY`: Your Groq API key
- Other API keys as needed

## 🛠️ Architecture

### Backend Structure
```
src/
├── agents/           # AI analysis agents
├── scrapers/         # Platform data collectors
├── config/           # Brand configurations
└── utils/            # Helper utilities
```

### Frontend Structure
```
dashboard/
├── src/
│   ├── components/   # React components
│   ├── fonts/        # SF Pro font files
│   └── App.js        # Main application
└── public/           # Static assets
```

## 🔒 Security & Rate Limiting

- **API Quota Management**: Automatic fallback when quotas exceeded
- **Request Throttling**: Respectful scraping with delays
- **Error Handling**: Graceful degradation when services fail
- **CORS Configuration**: Secure cross-origin requests

## 🚨 Troubleshooting

### Common Issues

1. **Chrome Connection Failed**
   ```bash
   node persistent-chrome-setup.js
   ```

2. **API Quota Exceeded**
   - The system automatically falls back to mock data
   - Check your API key limits

3. **Analysis Timeout**
   - Large datasets may take longer
   - Check network connectivity

### Debug Mode
```bash
DEBUG=* npm run dev
```

## 📈 Performance

- **Concurrent Analysis**: Multiple platforms analyzed simultaneously
- **Caching**: Session data cached for faster retrieval
- **Optimized Scraping**: Efficient data collection with rate limiting
- **Memory Management**: Automatic cleanup of completed sessions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Hugging Face** for sentiment analysis models
- **Groq** for fast AI inference
- **Ollama** for local model support
- **React** for the beautiful dashboard
- **Express** for the robust backend

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ for comprehensive brand sentiment analysis** 