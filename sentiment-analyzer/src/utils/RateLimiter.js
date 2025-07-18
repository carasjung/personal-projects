// src/utils/RateLimiter.js
const APIMonitor = require('./APIMonitor');

class RateLimiter {
    constructor() {
        this.apiMonitor = new APIMonitor();
        this.requestQueues = new Map();
        this.retryDelays = new Map();
        
        // Rate limits per service (requests per minute)
        this.rateLimits = {
            huggingface: {
                requestsPerMinute: 60,
                burstLimit: 10,
                retryDelay: 1000
            },
            groq: {
                requestsPerMinute: 120,
                burstLimit: 20,
                retryDelay: 500
            },
            youtube: {
                requestsPerMinute: 100,
                burstLimit: 15,
                retryDelay: 2000
            },
            ollama: {
                requestsPerMinute: 200,
                burstLimit: 30,
                retryDelay: 300
            }
        };
        
        // Initialize queues for each service
        Object.keys(this.rateLimits).forEach(service => {
            this.requestQueues.set(service, []);
            this.retryDelays.set(service, 0);
        });
        
        // Start cleanup intervals
        this.startCleanupIntervals();
    }
    
    async executeWithRateLimit(service, operation, maxRetries = 3) {
        const rateLimit = this.rateLimits[service];
        if (!rateLimit) {
            throw new Error(`Unknown service: ${service}`);
        }
        
        // Check if we're within rate limits
        if (!this.canMakeRequest(service)) {
            const delay = this.calculateDelay(service);
            console.log(`Rate limit hit for ${service}, waiting ${delay}ms`);
            await this.delay(delay);
        }
        
        // Check daily limits
        const dailyStatus = this.apiMonitor.getServiceStatus(service);
        if (!dailyStatus.isAvailable) {
            throw new Error(`Daily limit reached for ${service}: ${dailyStatus.requests}/${dailyStatus.limit}`);
        }
        
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Track the request
                const startTime = Date.now();
                const result = await operation();
                const duration = Date.now() - startTime;
                
                // Track successful request
                this.apiMonitor.trackRequest(service, this.estimateTokens(result), true);
                this.recordRequest(service, startTime);
                
                console.log(`${service} request successful (attempt ${attempt}/${maxRetries})`);
                return result;
                
            } catch (error) {
                lastError = error;
                
                // Track failed request
                this.apiMonitor.trackRequest(service, 0, false);
                
                console.log(`${service} request failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
                
                // Check if it's a rate limit error
                if (this.isRateLimitError(error)) {
                    const retryDelay = this.calculateRetryDelay(service, attempt);
                    console.log(`Rate limit error, retrying in ${retryDelay}ms`);
                    await this.delay(retryDelay);
                    this.retryDelays.set(service, retryDelay * 2);
                } else if (this.isQuotaExceededError(error)) {
                    console.log(`Quota exceeded for ${service}, using fallback`);
                    return this.handleQuotaExceeded(service, operation);
                } else if (attempt < maxRetries) {
                    // For other errors, use exponential backoff
                    const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    console.log(`Retrying in ${backoffDelay}ms due to error`);
                    await this.delay(backoffDelay);
                }
            }
        }
        
        throw new Error(`All retries failed for ${service}: ${lastError.message}`);
    }
    
    canMakeRequest(service) {
        const rateLimit = this.rateLimits[service];
        const queue = this.requestQueues.get(service);
        
        if (!queue || !rateLimit) return true;
        
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        // Remove old requests from queue
        const recentRequests = queue.filter(timestamp => timestamp > oneMinuteAgo);
        this.requestQueues.set(service, recentRequests);
        
        // Check if we're within limits
        if (recentRequests.length >= rateLimit.requestsPerMinute) {
            return false;
        }
        
        // Check burst limit
        const lastSecond = now - 1000;
        const burstRequests = recentRequests.filter(timestamp => timestamp > lastSecond);
        
        return burstRequests.length < rateLimit.burstLimit;
    }
    
    recordRequest(service, timestamp) {
        const queue = this.requestQueues.get(service);
        if (queue) {
            queue.push(timestamp);
        }
    }
    
    calculateDelay(service) {
        const queue = this.requestQueues.get(service);
        const rateLimit = this.rateLimits[service];
        
        if (!queue || queue.length === 0) return 0;
        
        const now = Date.now();
        const oldestRequest = Math.min(...queue);
        const timeSinceOldest = now - oldestRequest;
        
        // If we've made requests in the last minute, calculate delay
        if (timeSinceOldest < 60000) {
            const requestsInLastMinute = queue.filter(timestamp => timestamp > now - 60000).length;
            const remainingTime = 60000 - timeSinceOldest;
            const delayPerRequest = remainingTime / (rateLimit.requestsPerMinute - requestsInLastMinute);
            
            return Math.max(delayPerRequest, 100); // Minimum 100ms delay
        }
        
        return 0;
    }
    
    calculateRetryDelay(service, attempt) {
        const baseDelay = this.rateLimits[service].retryDelay;
        const currentDelay = this.retryDelays.get(service) || baseDelay;
        
        // Exponential backoff with jitter
        const jitter = Math.random() * 0.1;
        const newDelay = Math.min(currentDelay * Math.pow(2, attempt - 1) * (1 + jitter), 30000);
        
        this.retryDelays.set(service, newDelay);
        return newDelay;
    }
    
    isRateLimitError(error) {
        const rateLimitKeywords = [
            'rate limit', 'too many requests', '429', 'quota exceeded',
            'rate exceeded', 'throttled', 'limit exceeded'
        ];
        
        const errorMessage = error.message.toLowerCase();
        return rateLimitKeywords.some(keyword => errorMessage.includes(keyword));
    }
    
    isQuotaExceededError(error) {
        const quotaKeywords = [
            'quota exceeded', 'daily limit', 'usage limit',
            'billing', 'payment required', 'insufficient quota'
        ];
        
        const errorMessage = error.message.toLowerCase();
        return quotaKeywords.some(keyword => errorMessage.includes(keyword));
    }
    
    async handleQuotaExceeded(service, originalOperation) {
        console.log(`Using fallback for ${service} due to quota exceeded`);
        
        // Return mock data or use alternative service
        switch (service) {
            case 'huggingface':
                return this.getMockSentimentAnalysis();
            case 'groq':
                return this.getMockStrategicAnalysis();
            case 'youtube':
                return this.getMockYouTubeData();
            case 'ollama':
                return this.getMockDeepAnalysis();
            default:
                throw new Error(`No fallback available for ${service}`);
        }
    }
    
    getMockSentimentAnalysis() {
        return {
            label: 'neutral',
            score: 0.5,
            model_used: 'mock_fallback'
        };
    }
    
    getMockStrategicAnalysis() {
        return {
            insights: ['Mock strategic analysis due to quota limits'],
            recommendations: ['Consider upgrading API limits'],
            risk_level: 'medium'
        };
    }
    
    getMockYouTubeData() {
        return {
            videos: [],
            comments: [],
            mock_data: true
        };
    }
    
    getMockDeepAnalysis() {
        return {
            analysis: 'Mock deep analysis due to quota limits',
            mock_data: true
        };
    }
    
    estimateTokens(result) {
        // Rough token estimation based on response size
        if (typeof result === 'string') {
            return Math.ceil(result.length / 4); // ~4 characters per token
        } else if (typeof result === 'object') {
            const jsonString = JSON.stringify(result);
            return Math.ceil(jsonString.length / 4);
        }
        return 10; // Default estimate
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    startCleanupIntervals() {
        // Clean up old request records every 5 minutes
        setInterval(() => {
            const now = Date.now();
            Object.keys(this.rateLimits).forEach(service => {
                const queue = this.requestQueues.get(service);
                if (queue) {
                    const recentRequests = queue.filter(timestamp => now - timestamp < 60000);
                    this.requestQueues.set(service, recentRequests);
                }
            });
        }, 300000);
        
        // Reset retry delays every hour
        setInterval(() => {
            Object.keys(this.rateLimits).forEach(service => {
                this.retryDelays.set(service, 0);
            });
        }, 3600000);
    }
    
    getRateLimitStatus() {
        const status = {};
        
        Object.keys(this.rateLimits).forEach(service => {
            const queue = this.requestQueues.get(service);
            const rateLimit = this.rateLimits[service];
            
            const now = Date.now();
            const recentRequests = queue ? queue.filter(timestamp => now - timestamp < 60000) : [];
            
            status[service] = {
                requestsInLastMinute: recentRequests.length,
                limit: rateLimit.requestsPerMinute,
                burstLimit: rateLimit.burstLimit,
                canMakeRequest: this.canMakeRequest(service),
                retryDelay: this.retryDelays.get(service) || 0
            };
        });
        
        return status;
    }
}

module.exports = RateLimiter; 