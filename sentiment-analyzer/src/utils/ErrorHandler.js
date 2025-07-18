// src/utils/ErrorHandler.js
const fs = require('fs').promises;
const path = require('path');

class ErrorHandler {
    constructor() {
        this.errorLogFile = path.join(__dirname, '../data/error_log.json');
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 30000,
            backoffMultiplier: 2
        };
        
        this.errorStats = {
            totalErrors: 0,
            errorsByType: {},
            errorsByService: {},
            lastError: null
        };
        
        this.loadErrorStats();
    }
    
    async loadErrorStats() {
        try {
            const data = await fs.readFile(this.errorLogFile, 'utf8');
            this.errorStats = { ...this.errorStats, ...JSON.parse(data) };
        } catch (error) {
            // File doesn't exist, use defaults
            await this.saveErrorStats();
        }
    }
    
    async saveErrorStats() {
        try {
            const dir = path.dirname(this.errorLogFile);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(this.errorLogFile, JSON.stringify(this.errorStats, null, 2));
        } catch (error) {
            console.error('Failed to save error stats:', error.message);
        }
    }
    
    async logError(error, context = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack,
            type: error.constructor.name,
            service: context.service || 'unknown',
            operation: context.operation || 'unknown',
            retryCount: context.retryCount || 0,
            brandConfig: context.brandConfig || null,
            platform: context.platform || null
        };
        
        // Update stats
        this.errorStats.totalErrors++;
        this.errorStats.lastError = errorEntry;
        
        // Count by type
        this.errorStats.errorsByType[errorEntry.type] = 
            (this.errorStats.errorsByType[errorEntry.type] || 0) + 1;
        
        // Count by service
        this.errorStats.errorsByService[errorEntry.service] = 
            (this.errorStats.errorsByService[errorEntry.service] || 0) + 1;
        
        // Log to console with appropriate level
        this.logToConsole(errorEntry);
        
        // Save stats
        await this.saveErrorStats();
        
        return errorEntry;
    }
    
    logToConsole(errorEntry) {
        const { service, operation, message, retryCount } = errorEntry;
        
        if (retryCount > 0) {
            console.log(`Retry ${retryCount} failed for ${service}/${operation}: ${message}`);
        } else {
            console.error(`Error in ${service}/${operation}: ${message}`);
        }
    }
    
    async executeWithRetry(operation, context = {}) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                const result = await operation();
                console.log(`${context.service}/${context.operation} successful (attempt ${attempt})`);
                return result;
                
            } catch (error) {
                lastError = error;
                
                // Log the error
                await this.logError(error, {
                    ...context,
                    retryCount: attempt - 1
                });
                
                // Check if we should retry
                if (!this.shouldRetry(error, attempt)) {
                    console.log(`Not retrying ${context.service}/${context.operation}: ${error.message}`);
                    break;
                }
                
                // Calculate delay
                const delay = this.calculateRetryDelay(attempt);
                console.log(`Retrying ${context.service}/${context.operation} in ${delay}ms (attempt ${attempt + 1})`);
                
                await this.delay(delay);
            }
        }
        
        // All retries failed, use fallback
        console.log(`Using fallback for ${context.service}/${context.operation}`);
        return await this.getFallback(context);
    }
    
    shouldRetry(error, attempt) {
        // Don't retry if we've reached max retries
        if (attempt >= this.retryConfig.maxRetries) {
            return false;
        }
        
        // Don't retry certain types of errors
        const nonRetryableErrors = [
            'AuthenticationError',
            'AuthorizationError',
            'InvalidRequestError',
            'QuotaExceededError'
        ];
        
        if (nonRetryableErrors.includes(error.constructor.name)) {
            return false;
        }
        
        // Don't retry if error message indicates permanent failure
        const permanentFailureKeywords = [
            'authentication failed',
            'invalid api key',
            'quota exceeded',
            'daily limit',
            'billing required',
            'not found',
            'forbidden'
        ];
        
        const errorMessage = error.message.toLowerCase();
        if (permanentFailureKeywords.some(keyword => errorMessage.includes(keyword))) {
            return false;
        }
        
        return true;
    }
    
    calculateRetryDelay(attempt) {
        const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
        return Math.min(delay, this.retryConfig.maxDelay);
    }
    
    async getFallback(context) {
        const { service, operation, brandConfig, platform } = context;
        
        switch (service) {
            case 'huggingface':
                return this.getSentimentFallback(brandConfig, platform);
            case 'groq':
                return this.getStrategicFallback(brandConfig);
            case 'youtube':
                return this.getYouTubeFallback(brandConfig);
            case 'reddit':
                return this.getRedditFallback(brandConfig);
            case 'twitter':
                return this.getTwitterFallback(brandConfig);
            case 'quora':
                return this.getQuoraFallback(brandConfig);
            case 'ollama':
                return this.getOllamaFallback(brandConfig);
            default:
                return this.getGenericFallback(context);
        }
    }
    
    getSentimentFallback(brandConfig, platform) {
        return {
            label: 'neutral',
            score: 0.5,
            confidence: 0.3,
            model_used: 'fallback_basic',
            fallback_reason: 'API failure'
        };
    }
    
    getStrategicFallback(brandConfig) {
        return {
            insights: [
                'Unable to generate strategic insights due to API failure',
                'Consider checking API configuration and limits'
            ],
            recommendations: [
                'Verify API keys are valid',
                'Check service quotas and billing status',
                'Consider upgrading API limits if needed'
            ],
            risk_level: 'unknown',
            fallback_reason: 'API failure'
        };
    }
    
    getYouTubeFallback(brandConfig) {
        return {
            videos: [],
            comments: [],
            total_results: 0,
            fallback_reason: 'API failure or quota exceeded'
        };
    }
    
    getRedditFallback(brandConfig) {
        return {
            posts: [],
            comments: [],
            total_results: 0,
            fallback_reason: 'API failure or rate limit exceeded'
        };
    }
    
    getTwitterFallback(brandConfig) {
        return {
            tweets: [],
            total_results: 0,
            fallback_reason: 'API failure or rate limit exceeded'
        };
    }
    
    getQuoraFallback(brandConfig) {
        return {
            discussions: [],
            total_results: 0,
            fallback_reason: 'Scraping failure or authentication issue'
        };
    }
    
    getOllamaFallback(brandConfig) {
        return {
            analysis: 'Unable to perform deep analysis due to service failure',
            insights: ['Service unavailable'],
            fallback_reason: 'Local model failure'
        };
    }
    
    getGenericFallback(context) {
        return {
            error: `Service ${context.service} is currently unavailable`,
            fallback_reason: 'Generic service failure',
            timestamp: new Date().toISOString()
        };
    }
    
    async handleScrapingError(error, platform, brandConfig) {
        const context = {
            service: platform,
            operation: 'scraping',
            brandConfig,
            platform
        };
        
        await this.logError(error, context);
        
        // Return appropriate fallback data
        switch (platform) {
            case 'youtube':
                return this.getYouTubeFallback(brandConfig);
            case 'reddit':
                return this.getRedditFallback(brandConfig);
            case 'twitter':
                return this.getTwitterFallback(brandConfig);
            case 'quora':
                return this.getQuoraFallback(brandConfig);
            default:
                return this.getGenericFallback(context);
        }
    }
    
    async handleAPIError(error, service, operation, brandConfig) {
        const context = {
            service,
            operation,
            brandConfig
        };
        
        await this.logError(error, context);
        
        // Return appropriate fallback data
        switch (service) {
            case 'huggingface':
                return this.getSentimentFallback(brandConfig);
            case 'groq':
                return this.getStrategicFallback(brandConfig);
            case 'ollama':
                return this.getOllamaFallback(brandConfig);
            default:
                return this.getGenericFallback(context);
        }
    }
    
    getErrorStats() {
        return {
            ...this.errorStats,
            errorRate: this.calculateErrorRate(),
            topErrorTypes: this.getTopErrorTypes(),
            topErrorServices: this.getTopErrorServices()
        };
    }
    
    calculateErrorRate() {
        // This would be calculated based on total requests vs errors
        // For now, return a simple percentage
        return this.errorStats.totalErrors > 0 ? 
            Math.min((this.errorStats.totalErrors / 100) * 100, 100) : 0;
    }
    
    getTopErrorTypes() {
        return Object.entries(this.errorStats.errorsByType)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([type, count]) => ({ type, count }));
    }
    
    getTopErrorServices() {
        return Object.entries(this.errorStats.errorsByService)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([service, count]) => ({ service, count }));
    }
    
    async clearErrorLog() {
        this.errorStats = {
            totalErrors: 0,
            errorsByType: {},
            errorsByService: {},
            lastError: null
        };
        await this.saveErrorStats();
        console.log('Error log cleared');
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Start periodic cleanup
    startCleanup() {
        // Save error stats every 10 minutes
        setInterval(() => {
            this.saveErrorStats();
        }, 10 * 60 * 1000);
    }
}

module.exports = ErrorHandler; 