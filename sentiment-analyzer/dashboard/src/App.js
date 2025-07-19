// dashboard/src/App.js - React Frontend for Sentiment Dashboard
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import './App.css';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Components
const SentimentCard = ({ title, value, change, color, explanation, showExplanations }) => (
  <div className={`sentiment-card ${color}`} title={explanation}>
    <h3>{title}</h3>
    <div className="value">{value}</div>
    {change && <div className="change">{change}</div>}
    {explanation && showExplanations && (
      <div className="explanation">
        <small>{explanation}</small>
      </div>
    )}
  </div>
);

const ProgressBar = ({ progress, status }) => (
  <div className="progress-container">
    <div className="progress-bar">
      <div 
        className="progress-fill" 
        style={{ width: `${progress}%` }}
      />
    </div>
    <div className="progress-text">{progress}% - {status}</div>
  </div>
);

// Enhanced PlatformSummary component with quotes
const PlatformSummary = ({ platform, summary }) => (
  <div className="platform-summary">
    <h4>{platform.toUpperCase()}</h4>
    <p>{summary.summary}</p>
    {/* User Quotes Section */}
    {summary.user_quotes && summary.user_quotes.length > 0 && (
      <div className="user-quotes">
        <h5>User Quotes:</h5>
        {summary.user_quotes.slice(0, 2).map((quote, index) => (
          <div key={index} className="quote-item">
            <blockquote>{quote.text}</blockquote>
            <cite>
              - @{quote.author}
              {quote.engagement && <span className="engagement"> ({quote.engagement})</span>}
              {quote.sentiment && <span className={`sentiment-tag ${quote.sentiment}`}>{quote.sentiment}</span>}
            </cite>
          </div>
        ))}
      </div>
    )}
    <div className="platform-stats">
      <span>{summary.total_mentions} mentions</span>
      <span>{summary.overall_sentiment}</span>
      {summary.key_topics && summary.key_topics.length > 0 && (
        <span>{summary.key_topics.slice(0, 3).map(topic =>
          typeof topic === 'object' ? topic.word || topic : topic
        ).join(', ')}</span>
      )}
      {summary.top_contributor && (
        <span>Top Contributor: @{summary.top_contributor}</span>
      )}
    </div>
  </div>
);

// Risk Level Legend Component - Commented out as unused
// const RiskLevelLegend = ({ show, onToggle }) => (
//   <div className="risk-legend-container">
//     <button 
//       onClick={onToggle}
//       className="legend-toggle"
//     >
//       {show ? 'Hide Risk Level Guide' : 'Show Risk Level Guide'}
//     </button>
//     {show && (
//       <div className="risk-legend">
//         <h4>Risk Level Guide</h4>
//         <div className="risk-levels">
//           <div className="risk-item very-low">
//             <div className="risk-color"></div>
//             <div className="risk-content">
//               <strong>Very Low Risk</strong>
//               <p>Excellent brand health (9-10/10). Overwhelming positive sentiment with minimal negative feedback. Brand is thriving with strong community support.</p>
//             </div>
//           </div>
//           <div className="risk-item low">
//             <div className="risk-color"></div>
//             <div className="risk-content">
//               <strong>Low Risk</strong>
//               <p>Strong brand health (7-8/10). Mostly positive sentiment with manageable negative feedback. Continue current strategies and monitor trends.</p>
//             </div>
//           </div>
//           <div className="risk-item medium">
//             <div className="risk-color"></div>
//             <div className="risk-content">
//               <strong>Medium Risk</strong>
//               <p>Moderate brand health (5-6/10). Mixed sentiment requires attention. Consider addressing common concerns and improving engagement strategies.</p>
//             </div>
//           </div>
//           <div className="risk-item high">
//             <div className="risk-color"></div>
//             <div className="risk-content">
//               <strong>High Risk</strong>
//               <p>Concerning brand health (3-4/10). Significant negative sentiment trends. Immediate action needed to address issues and improve perception.</p>
//             </div>
//           </div>
//           <div className="risk-item very-high">
//             <div className="risk-color"></div>
//             <div className="risk-content">
//               <strong>Very High Risk</strong>
//               <p>Critical brand health (1-2/10). Predominantly negative sentiment. Crisis management protocols should be activated immediately.</p>
//             </div>
//           </div>
//         </div>
//         <div className="legend-footer">
//           <p><strong>Note:</strong> Risk levels are calculated based on sentiment distribution, engagement patterns, and overall brand health score. Regular monitoring is recommended for all levels.</p>
//         </div>
//       </div>
//     )}
//   </div>
// );

// Helper functions
const getSentimentLabel = (sentiment) => {
  if (typeof sentiment === 'string') {
    return sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
  }
  return 'Neutral';
};

const getSentimentColor = (sentiment) => {
  const sentimentStr = typeof sentiment === 'string' ? sentiment.toLowerCase() : 'neutral';
  if (sentimentStr.includes('positive')) return 'positive';
  if (sentimentStr.includes('negative')) return 'negative';
  return 'neutral';
};

// Export Buttons Component
const ExportButtons = ({ session }) => {
  // const analysisRef = React.useRef();
  // const platformSummariesRef = React.useRef();
  // const strategicInsightsRef = React.useRef();
  // const deepAnalysisRef = React.useRef();

  if (!session || !session.data) return null;
  
  const exportToCSV = (session) => {
    const allMentions = [];
    
    // Collect all mentions from all platforms
    Object.entries(session.data || {}).forEach(([platform, mentions]) => {
      mentions.forEach(mention => {
        allMentions.push({
          platform: platform,
          id: mention.id,
          content: mention.content,
          author: mention.author,
          created_at: mention.created_at,
          engagement_score: mention.engagement_score || 0,
          url: mention.url,
          sentiment: mention.sentiment || 'unknown',
          confidence: mention.confidence || 0,
          type: mention.type || 'post'
        });
      });
    });
    
    if (allMentions.length === 0) {
      alert('No data available for download');
      return;
    }
    
    // Convert to CSV
    const headers = ['Platform', 'ID', 'Content', 'Author', 'Created At', 'Engagement', 'URL', 'Sentiment', 'Confidence', 'Type'];
    const csvContent = [
      headers.join(','),
      ...allMentions.map(mention => [
        mention.platform,
        `"${mention.id}"`,
        `"${mention.content.replace(/"/g, '""')}"`,
        `"${mention.author}"`,
        mention.created_at,
        mention.engagement_score,
        `"${mention.url}"`,
        mention.sentiment,
        mention.confidence,
        mention.type
      ].join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${session.brand.name}_sentiment_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = (session) => {
    const exportData = {
      brand: session.brand,
      analysis_date: session.startTime,
      summary: {
        total_mentions: Object.values(session.data || {}).reduce((sum, mentions) => sum + mentions.length, 0),
        platforms_analyzed: Object.keys(session.data || {}),
        overall_sentiment: session.results?.key_metrics?.overall_sentiment || 'unknown'
      },
      platform_data: session.data,
      analysis_results: session.results,
      platform_summaries: session.results?.platform_summaries,
      strategic_insights: session.results?.strategic_insights
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    
    // Download file
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${session.brand.name}_analysis_report_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async (session) => {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    // const pageHeight = pdf.internal.pageSize.getHeight();

    async function addSectionToPDF(node, addNewPage = false) {
      if (!node) return;
      try {
        const canvas = await html2canvas(node, { 
          scale: 2, 
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });
        const imgData = canvas.toDataURL('image/png');
        const imgProps = { width: pageWidth, height: (canvas.height * pageWidth) / canvas.width };
        if (addNewPage) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, imgProps.width, imgProps.height);
      } catch (error) {
        console.error('Error capturing section:', error);
      }
    }

    // Page 1: Analysis Results (includes first row of platform summaries)
    const analysisResultsNode = document.querySelector('.analysis-results');
    if (analysisResultsNode) {
      const tempAnalysisDiv = document.createElement('div');
      tempAnalysisDiv.style.background = '#ffffff';
      tempAnalysisDiv.style.padding = '20px';
      tempAnalysisDiv.style.fontFamily = 'SF Pro, -apple-system, BlinkMacSystemFont, sans-serif';
      tempAnalysisDiv.appendChild(analysisResultsNode.cloneNode(true));
      document.body.appendChild(tempAnalysisDiv);
      await addSectionToPDF(tempAnalysisDiv);
      document.body.removeChild(tempAnalysisDiv);
    }

    // Page 2: Remaining platform summaries (if any), then Strategic Insights and Deep Analysis
    const platformSummariesNode = document.querySelector('.platform-summaries');
    const strategicInsightsNode = document.querySelector('.strategic-insights');
    const deepAnalysisNode = document.querySelector('.deep-analysis');

    let hasSecondPageContent = false;
    const tempDiv = document.createElement('div');
    tempDiv.style.background = '#ffffff';
    tempDiv.style.padding = '20px';
    tempDiv.style.fontFamily = 'SF Pro, -apple-system, BlinkMacSystemFont, sans-serif';

    // Only add remaining platform summaries (not the ones already shown in the first row)
    if (platformSummariesNode) {
      const summaries = platformSummariesNode.querySelectorAll('.platform-summary');
      // Find the number of platform summaries shown in the first row (as in the dashboard)
      // We'll assume the first row is the number of columns in the .summaries-grid (usually 3)
      const grid = platformSummariesNode.querySelector('.summaries-grid');
      let firstRowCount = 3;
      if (grid) {
        const style = window.getComputedStyle(grid);
        const columns = style.gridTemplateColumns.split(' ').length;
        firstRowCount = columns;
      }
      // Add only the remaining summaries
      if (summaries.length > firstRowCount) {
        hasSecondPageContent = true;
        const titleDiv = document.createElement('h3');
        titleDiv.textContent = 'Platform Summaries (continued)';
        titleDiv.style.marginBottom = '20px';
        tempDiv.appendChild(titleDiv);
        for (let i = firstRowCount; i < summaries.length; i++) {
          tempDiv.appendChild(summaries[i].cloneNode(true));
        }
      }
    }

    // Add Strategic Insights and Deep Analysis
    if (strategicInsightsNode) {
      hasSecondPageContent = true;
      tempDiv.appendChild(strategicInsightsNode.cloneNode(true));
    }
    if (deepAnalysisNode) {
      hasSecondPageContent = true;
      // Add some spacing if both are present
      if (strategicInsightsNode) {
        const spacer = document.createElement('div');
        spacer.style.height = '40px';
        tempDiv.appendChild(spacer);
      }
      tempDiv.appendChild(deepAnalysisNode.cloneNode(true));
    }

    if (hasSecondPageContent) {
      pdf.addPage();
      document.body.appendChild(tempDiv);
      await addSectionToPDF(tempDiv);
      document.body.removeChild(tempDiv);
    }

    pdf.save(`${session.brand.name}_sentiment_report.pdf`);
  };
  
  return (
    <div className="export-section">
      <h4>Export Data</h4>
      <div className="export-buttons">
        <button 
          onClick={() => exportToCSV(session)}
          className="export-button csv"
        >
          Download CSV
        </button>
        <button 
          onClick={() => exportToJSON(session)}
          className="export-button json"
        >
          Download JSON
        </button>
        <button 
          onClick={() => exportToPDF(session)}
          className="export-button pdf"
        >
          Export PDF Report
        </button>
      </div>
      <p className="export-note">
        CSV: Raw data for analysis • JSON: Complete results • PDF: Summary report
      </p>
    </div>
  );
};

function App() {
  // State management
  const [activeSession, setActiveSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [ws, setWs] = useState(null);  // ← Add this back
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [showExplanations, setShowExplanations] = useState(false); // ADD THIS LINE
  // const [showRiskLegend, setShowRiskLegend] = useState(false);
  
  // Form state
  const [brandForm, setBrandForm] = useState({
    brandName: '',
    category: 'brand',
    keywords: '',
    platforms: ['youtube', 'twitter', 'reddit', 'quora']
  });

  // Get API base URL
  const getApiUrl = (endpoint) => {
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    return `${baseUrl}${endpoint}`;
  };

  // Get WebSocket URL
  const getWebSocketUrl = () => {
    return process.env.NODE_ENV === 'production' 
      ? `wss://${window.location.host}/ws` 
      : 'ws://localhost:8080';
  };

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const websocket = new WebSocket(getWebSocketUrl());
      
      websocket.onopen = () => {
        console.log('Connected to WebSocket');
        setWs(websocket);
        setConnectionStatus('connected');
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'session_update') {
            const updatedSession = data.session;
            
            // Update sessions list
            setSessions(prev => {
              const index = prev.findIndex(s => s.id === updatedSession.id);
              if (index >= 0) {
                const newSessions = [...prev];
                newSessions[index] = updatedSession;
                return newSessions;
              }
              return [...prev, updatedSession];
            });
            
            // Update active session if it matches
            setActiveSession(prev => {
              if (prev && prev.id === updatedSession.id) {
                return updatedSession;
              }
              return prev;
            });
            
            // Update analyzing state
            if (updatedSession.status === 'completed' || updatedSession.status === 'error') {
              setIsAnalyzing(false);
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      websocket.onclose = () => {
        console.log('Disconnected from WebSocket');
        setWs(null);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          console.log('Attempting to reconnect...');
          connectWebSocket();
        }, 3000);
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };
    };
    
    connectWebSocket();
    
    return () => {
      // Clean up WebSocket connection
    };
  }, []); // Empty dependency array is intentional for one-time setup

  // Load existing sessions on component mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await fetch(getApiUrl('/api/sessions'));
        if (response.ok) {
          const existingSessions = await response.json();
          setSessions(existingSessions);
          console.log(`Loaded ${existingSessions.length} existing sessions`);
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
      }
    };
    
    loadSessions();
  }, []);

  // Start new analysis
  const startAnalysis = async (e) => {
    e.preventDefault();
    
    if (!brandForm.brandName.trim()) {
      alert('Please enter a brand name');
      return;
    }
    
    if (brandForm.platforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      const response = await fetch(getApiUrl('/api/analyze'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandName: brandForm.brandName.trim(),
          category: brandForm.category,
          keywords: brandForm.keywords.split(',').map(k => k.trim()).filter(k => k),
          platforms: brandForm.platforms
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('Analysis started:', result.sessionId);
        // WebSocket will handle session updates
      } else {
        throw new Error(result.error || 'Failed to start analysis');
      }
      
    } catch (error) {
      console.error('Error starting analysis:', error);
      alert(`Error starting analysis: ${error.message}`);
      setIsAnalyzing(false);
    }
  };

  // Handle form changes
  const handleFormChange = (field, value) => {
    setBrandForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePlatformToggle = (platform) => {
    setBrandForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  // Select session to view
  const selectSession = (session) => {
    setActiveSession(session);
  };

  // Stop analysis
  const stopAnalysis = async (sessionId) => {
    try {
      const response = await fetch(getApiUrl(`/api/sessions/${sessionId}/stop`), {
        method: 'POST'
      });
      
      if (response.ok) {
        console.log('🛑 Analysis stopped');
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error('Error stopping analysis:', error);
    }
  };

  return (
    <div className="app">
      <header className="agent-header">
        <div className="agent-header-row">
          <img src="/logo.png" alt="Agent Scraper Logo" className="agent-logo" />
        </div>
        <div className="agent-tagline">
          Brand sentiment analysis with AI agents
        </div>
      </header>

      <main className="app-main">
        {/* Analysis Form */}
        <section className="analysis-form">
          <h2>Start new analysis</h2>
          
          <form onSubmit={startAnalysis}>
            <div className="main-input-row">
              <input
                type="text"
                className="main-input-bar"
                value={brandForm.brandName}
                onChange={(e) => handleFormChange('brandName', e.target.value)}
                placeholder="Enter brand/person name"
                disabled={isAnalyzing}
              />
            </div>
            <div className="input-row-rectangles">
              <div className="keywords-rectangle">
                <label>Keywords (Optional)</label>
                <textarea
                  value={brandForm.keywords}
                  onChange={(e) => handleFormChange('keywords', e.target.value)}
                  placeholder="Enter additional keywords separated by comma"
                  disabled={isAnalyzing}
                  rows={4}
                />
              </div>
              <div className="platforms-rectangle">
                <label>Deselect platforms you want to exclude</label>
                <div className="platform-checkboxes-grid">
                  {['youtube', 'twitter', 'reddit', 'quora'].map((platform, idx) => (
                    <label
                      key={platform}
                      className={`checkbox-label${brandForm.platforms.includes(platform) ? ' checked' : ''}`}
                      onClick={() => !isAnalyzing && handlePlatformToggle(platform)}
                      tabIndex={0}
                      style={{ cursor: isAnalyzing ? 'not-allowed' : 'pointer' }}
                    >
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <button 
              type="submit" 
              className="start-button"
              disabled={isAnalyzing || !brandForm.brandName.trim() || brandForm.platforms.length === 0}
            >
              {isAnalyzing ? 'Analyzing...' : 'Begin'}
            </button>
            
            {isAnalyzing && activeSession && (
        <button
                type="button"
                onClick={() => stopAnalysis(activeSession.id)}
                className="start-button"
                style={{ marginTop: '10px', background: '#f44336' }}
              >
                Stop Analysis
        </button>
            )}
          </form>
        </section>
        {/* Removed RiskLevelLegend from here */}
      </main>

      <footer className="app-footer">
        <div className="connection-status">
          WebSocket: {connectionStatus === 'connected' ? 'Connected' : 
                     connectionStatus === 'error' ? 'Error' : 'Disconnected'}
        </div>
      </footer>

      {/* Active Analysis Progress */}
      {isAnalyzing && activeSession && (
        <section className="analysis-progress">
          <h3>Analysis in Progress: {activeSession.brand.name}</h3>
          <ProgressBar 
            progress={activeSession.progress || 0} 
            status={activeSession.currentStep || 'Starting...'}
          />
          {activeSession.data && (
            <div className="collection-status">
              <h4>Data Collection Status:</h4>
              <div className="collection-grid">
                <div>YouTube: {activeSession.data.youtube?.length || 0} comments</div>
                <div>Twitter: {activeSession.data.twitter?.length || 0} tweets</div>
                <div>Reddit: {activeSession.data.reddit?.length || 0} posts</div>
                <div>Quora: {activeSession.data.quora?.length || 0} discussions</div>
              </div>
      </div>
          )}
        </section>
      )}

      {/* Analysis Results */}
      {activeSession && activeSession.results && (
        <section className="analysis-results" id="analysis-results-section">
          <h2>Analysis Results: {activeSession.brand.name}</h2>
        {/* Key Metrics */}
          <div className="metrics-grid">
          <SentimentCard
            title="Overall Sentiment"
              value={getSentimentLabel(activeSession.results.key_metrics?.overall_sentiment)}
              color={getSentimentColor(activeSession.results.key_metrics?.overall_sentiment)}
              explanation="The dominant emotion expressed across all mentions"
              showExplanations={showExplanations}
          />
          <SentimentCard
            title="Confidence"
              value={`${((activeSession.results.key_metrics?.sentiment_confidence || 0.7) * 100).toFixed(1)}%`}
            color="neutral"
              explanation="How certain AI is about the sentiment classification"
              showExplanations={showExplanations}
          />
          <SentimentCard
            title="Brand Health"
              value={`${activeSession.results.key_metrics?.brand_health_score || 7}/10`}
              color={activeSession.results.key_metrics?.brand_health_score >= 7 ? 'positive' : 
                     activeSession.results.key_metrics?.brand_health_score >= 5 ? 'neutral' : 'negative'}
              explanation="Overall brand perception score based on sentiment and engagement"
              showExplanations={showExplanations}
          />
          <SentimentCard
            title="Risk Level"
              value={activeSession.results.key_metrics?.risk_level || 'Medium'}
              color={['Very Low', 'Low', 'very_low', 'low'].includes(activeSession.results.key_metrics?.risk_level) ? 'positive' : 
                     ['Very High', 'High', 'very_high', 'high'].includes(activeSession.results.key_metrics?.risk_level) ? 'negative' : 'neutral'}
              explanation={showExplanations ? 
                (activeSession.results.key_metrics?.risk_description || 
                 "Potential reputation risk level based on negative sentiment patterns") : null}
              showExplanations={showExplanations}
          />
        </div>
        {/* Sentiment Distribution */}
          {activeSession.results.key_metrics?.sentiment_distribution && (
            <div className="sentiment-distribution">
              <h3 style={{ marginBottom: '1rem', color: '#333' }}>Sentiment Distribution</h3>
              <div className="sentiment-bar">
                <div 
                  className="sentiment-bar-positive"
                  style={{ width: `${activeSession.results.key_metrics.sentiment_distribution.positive}%` }}
                >
                  {activeSession.results.key_metrics.sentiment_distribution.positive > 10 && 
                    `${activeSession.results.key_metrics.sentiment_distribution.positive}%`}
                </div>
                <div 
                  className="sentiment-bar-neutral"
                  style={{ width: `${activeSession.results.key_metrics.sentiment_distribution.neutral}%` }}
                >
                  {activeSession.results.key_metrics.sentiment_distribution.neutral > 10 && 
                    `${activeSession.results.key_metrics.sentiment_distribution.neutral}%`}
              </div>
              <div 
                  className="sentiment-bar-negative"
                  style={{ width: `${activeSession.results.key_metrics.sentiment_distribution.negative}%` }}
                >
                  {activeSession.results.key_metrics.sentiment_distribution.negative > 10 && 
                    `${activeSession.results.key_metrics.sentiment_distribution.negative}%`}
                </div>
              </div>
              <div className="sentiment-distribution-labels">
                <span>Positive: {activeSession.results.key_metrics.sentiment_distribution.positive}%</span>
                <span>Neutral: {activeSession.results.key_metrics.sentiment_distribution.neutral}%</span>
                <span>Negative: {activeSession.results.key_metrics.sentiment_distribution.negative}%</span>
              </div>
            </div>
          )}

          {/* BUTTONS: Metric Explanations & Risk Level Guide */}
          <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
            <button
              onClick={() => setShowExplanations(!showExplanations)}
              className={`explanations-toggle ${showExplanations ? 'active' : 'inactive'}`}
            >
              {showExplanations ? 'Hide' : 'Show'} Metric Explanations
            </button>
            {/*
            <button
              onClick={() => setShowRiskLegend(!showRiskLegend)}
              className="explanations-toggle inactive"
              style={{ marginLeft: 0 }}
            >
              {showRiskLegend ? 'Hide' : 'Show'} risk level guide
            </button>
            */}
          </div>

        {/* Platform Summaries */}
          {activeSession.results.platform_summaries && (
            <div className="platform-summaries" id="platform-summaries-section">
              <h3>Platform Summaries</h3>
              <div className="summaries-grid">
                {Object.entries(activeSession.results.platform_summaries).map(([platform, summary]) => (
              <PlatformSummary
                    key={platform}
                    platform={platform}
                summary={summary}
              />
            ))}
          </div>
        </div>
          )}
        {/* Strategic Insights */}
          {activeSession.results.strategic_insights && (
            <div className="strategic-insights" id="strategic-insights-section">
              <h3>Strategic Insights</h3>
              <div className="insights-content">
                <p><strong>Health Reasoning:</strong> {activeSession.results.strategic_insights.health_reasoning}</p>
                {activeSession.results.strategic_insights.sentiment_drivers && (
                  <div className="sentiment-drivers">
                    <div className="positive-drivers">
                      <h4>Positive Drivers:</h4>
                      <ul>
                        {activeSession.results.strategic_insights.sentiment_drivers.positive?.map((driver, i) => (
                          <li key={i}>{driver}</li>
                      ))}
                    </ul>
                  </div>
                    <div className="negative-drivers">
                      <h4>Areas for Improvement:</h4>
                      <ul>
                        {activeSession.results.strategic_insights.sentiment_drivers.negative?.map((driver, i) => (
                          <li key={i}>{driver}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
                {activeSession.results.strategic_insights.recommendations && (
                  <div className="recommendations">
                    <h4>Recommendations:</h4>
                    <ul>
                      {activeSession.results.strategic_insights.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
          {/* Deep Analysis */}
          {activeSession.results.deep_analysis && (
            <div className="deep-analysis" id="deep-analysis-section">
              <h3>Deep Analysis</h3>
              <div className="analysis-content">
                {activeSession.results.deep_analysis.split('\n').map((paragraph, i) => (
                  paragraph.trim() && <p key={i}>{paragraph}</p>
                ))}
              </div>
      </div>
          )}
          {/* Export Buttons */}
          <ExportButtons session={activeSession} />
        </section>
      )}

      {/* Session History */}
      <section className="session-history">
        <h3>Recent Analyses</h3>
        {sessions.length === 0 ? (
          <p>No analyses yet. Start your first analysis above.</p>
        ) : (
          <div className="sessions-list">
            {sessions.slice().reverse().map(session => (
              <div
                key={session.id}
                className={`session-item ${session.status} ${activeSession?.id === session.id ? 'active' : ''}`}
                onClick={() => selectSession(session)}
              >
                <div className="session-header">
                  <h4>{session.brand.name}</h4>
                  <span className={`status ${session.status}`}>
                    {session.status === 'completed' ? 'Completed' : 
                     session.status === 'error' ? 'Error' : 
                     session.status === 'collecting' ? 'Collecting' : 'Paused'}
                  </span>
                </div>
                <div className="session-meta">
                  <span>{new Date(session.startTime).toLocaleString()}</span>
                  {session.results && (
                    <span>
                      {session.results.key_metrics?.overall_sentiment || 'neutral'} |
                      {session.results.key_metrics?.brand_health_score || 'N/A'}/10
                    </span>
                  )}
                </div>
                {session.status !== 'completed' && session.progress !== undefined && (
                  <div className="session-progress">
                    <div className="mini-progress-bar">
                      <div 
                        className="mini-progress-fill"
                        style={{ width: `${session.progress}%` }}
                      />
                    </div>
                    <span>{session.progress}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default App;