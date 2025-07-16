// src/utils/AutomatedChromeManager.js
const { exec } = require('child_process');
const axios = require('axios');
const os = require('os');
const path = require('path');

class AutomatedChromeManager {
    constructor() {
        this.userDataDir = path.join(os.homedir(), '.quora-scraper-chrome');
        this.debugPort = 9222;
        this.chromeProcess = null;
        this.isRunning = false;
    }
    
    async ensureChromeRunning() {
        console.log('🔍 Checking Chrome status for Quora scraping...');
        
        // Check if Chrome is already running
        if (await this.isChromeRunning()) {
            console.log('✅ Chrome is already running and accessible');
            return true;
        }
        
        console.log('🚀 Starting Chrome automatically...');
        return await this.startChrome();
    }
    
    async isChromeRunning() {
        try {
            const response = await axios.get(`http://localhost:${this.debugPort}/json/version`, {
                timeout: 2000
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }
    
    async startChrome() {
        return new Promise((resolve) => {
            const chromeCommand = this.getChromeCommand();
            
            console.log('📂 Chrome profile location:', this.userDataDir);
            console.log('🎯 Debug port:', this.debugPort);
            
            // Start Chrome in headless mode for automation
            this.chromeProcess = exec(chromeCommand, (error) => {
                if (error && !error.message.includes('Error: Command failed')) {
                    console.log('⚠️ Chrome startup message:', error.message);
                }
            });
            
            // Give Chrome time to start and check if it's running
            setTimeout(async () => {
                const isRunning = await this.isChromeRunning();
                if (isRunning) {
                    console.log('✅ Chrome started successfully');
                    this.isRunning = true;
                    resolve(true);
                } else {
                    console.log('❌ Chrome failed to start properly');
                    resolve(false);
                }
            }, 3000);
        });
    }
    
    getChromeCommand() {
        const baseArgs = [
            `--remote-debugging-port=${this.debugPort}`,
            `--user-data-dir="${this.userDataDir}"`,
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows'
        ];
        
        // Add headless mode for production, windowed for development
        if (process.env.NODE_ENV === 'production') {
            baseArgs.push('--headless');
        }
        
        if (os.platform() === 'darwin') { // macOS
            return `/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome ${baseArgs.join(' ')}`;
        } else if (os.platform() === 'win32') { // Windows
            return `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" ${baseArgs.join(' ')}`;
        } else { // Linux
            return `google-chrome ${baseArgs.join(' ')}`;
        }
    }
    
    async setupFirstTimeLogin() {
        if (process.env.NODE_ENV === 'production') {
            console.log('⚠️ Production mode: Quora login required. Please set QUORA_SESSION_COOKIE in environment.');
            return false;
        }
        
        console.log('\n🔐 First-time Quora setup needed:');
        console.log('1. Chrome will open to Quora.com');
        console.log('2. Please log in to your Quora account');
        console.log('3. Close this message and run analysis again');
        console.log('4. Future runs will be automatic!');
        
        // Open Quora login page
        const loginCommand = this.getChromeCommand() + ' https://quora.com/login';
        exec(loginCommand);
        
        return false; // Return false to skip Quora for this run
    }
    
    async shutdown() {
        if (this.chromeProcess) {
            console.log('🛑 Shutting down Chrome...');
            this.chromeProcess.kill();
            this.isRunning = false;
        }
    }
}

// Enhanced Quora Scraper with automated Chrome management
class AutomatedQuoraChromeScraper {
    constructor() {
        this.chromeManager = new AutomatedChromeManager();
    }
    
    async initialize() {
        return await this.chromeManager.ensureChromeRunning();
    }
    
    async scrapeBrandSentiment(brandConfig) {
        console.log('🤔 Attempting automated Quora scraping...');
        
        // Try to ensure Chrome is running
        const chromeReady = await this.initialize();
        
        if (!chromeReady) {
            console.log('⚠️ Chrome not ready, using mock Quora data');
            return this.generateMockQuoraData(brandConfig);
        }
        
        try {
            // Import your existing QuoraChromeScraper
            const QuoraChromeScraper = require('../scrapers/QuoraChromeScraper');
            const scraper = new QuoraChromeScraper();
            
            // Try to connect and scrape
            const connected = await scraper.initialize();
            if (connected) {
                const results = await scraper.scrapeBrandSentiment(brandConfig);
                await scraper.close();
                return results;
            } else {
                throw new Error('Could not connect to Chrome');
            }
            
        } catch (error) {
            console.log('⚠️ Quora scraping failed, using mock data:', error.message);
            return this.generateMockQuoraData(brandConfig);
        }
    }
    
    generateMockQuoraData(brandConfig) {
        return [
            {
                id: 'quora_mock_1',
                platform: 'quora',
                content: `What do people think about ${brandConfig.name}? I've been reading it and find the character development really interesting, especially how the author handles the psychological aspects.`,
                author: 'QuoraUser1',
                created_at: new Date(Date.now() - 86400000).toISOString(),
                engagement_score: 12,
                url: 'https://quora.com/mock/question/1',
                type: 'question',
                answers_count: 5,
                views: 250
            },
            {
                id: 'quora_mock_2',
                platform: 'quora',
                content: `I love ${brandConfig.name}! The art style is unique and the story keeps you on edge. Definitely one of the better webtoons I've read recently.`,
                author: 'QuoraUser2',
                created_at: new Date(Date.now() - 172800000).toISOString(),
                engagement_score: 8,
                url: 'https://quora.com/mock/answer/1',
                type: 'answer',
                upvotes: 8,
                question_title: `What are your thoughts on ${brandConfig.name}?`
            },
            {
                id: 'quora_mock_3',
                platform: 'quora',
                content: `Can someone explain the plot of ${brandConfig.name}? I'm a bit confused about the dimension jumping part and how it all connects.`,
                author: 'QuoraUser3',
                created_at: new Date(Date.now() - 259200000).toISOString(),
                engagement_score: 6,
                url: 'https://quora.com/mock/question/2',
                type: 'question',
                answers_count: 3,
                views: 180
            }
        ];
    }
    
    async close() {
        // Don't close Chrome since other processes might use it
        console.log('🔗 Keeping Chrome running for future use');
    }
}

module.exports = { AutomatedChromeManager, AutomatedQuoraChromeScraper };