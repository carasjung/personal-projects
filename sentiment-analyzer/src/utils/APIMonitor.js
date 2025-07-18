// src/utils/APIMonitor.js
const fs = require('fs').promises;
const path = require('path');

class APIMonitor {
    constructor() {
        this.usageData = {
            huggingface: {
                requests: 0,
                tokens: 0,
                cost: 0,
                errors: 0,
                lastReset: new Date().toISOString()
            },
            groq: {
                requests: 0,
                tokens: 0,
                cost: 0,
                errors: 0,
                lastReset: new Date().toISOString()
            },
            youtube: {
                requests: 0,
                quotaUsed: 0,
                cost: 0,
                errors: 0,
                lastReset: new Date().toISOString()
            },
            ollama: {
                requests: 0,
                tokens: 0,
                cost: 0,
                errors: 0,
                lastReset: new Date().toISOString()
            }
        };
        
        this.costRates = {
            huggingface: {
                perRequest: 0.0001, // Estimated cost per request
                perToken: 0.00001    // Estimated cost per token
            },
            groq: {
                perRequest: 0.0002,
                perToken: 0.00002
            },
            youtube: {
                perRequest: 0.0001,
                quotaCost: 0.00001   // Cost per quota unit
            },
            ollama: {
                perRequest: 0.00005, // Local model costs
                perToken: 0.000005
            }
        };
        
        this.dailyLimits = {
            huggingface: 1000,
            groq: 5000,
            youtube: 10000,
            ollama: 10000
        };
        
        this.dataFile = path.join(__dirname, '../data/api_usage.json');
        this.loadUsageData();
    }
    
    async loadUsageData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            const parsed = JSON.parse(data);
            
            // Merge with current data, preserving today's data
            Object.keys(this.usageData).forEach(service => {
                if (parsed[service]) {
                    const lastReset = new Date(parsed[service].lastReset);
                    const today = new Date();
                    
                    // Reset if it's a new day
                    if (lastReset.toDateString() !== today.toDateString()) {
                        this.usageData[service] = {
                            ...this.usageData[service],
                            lastReset: today.toISOString()
                        };
                    } else {
                        this.usageData[service] = parsed[service];
                    }
                }
            });
            
            console.log('API usage data loaded');
        } catch (error) {
            console.log('Creating new API usage tracking file');
            await this.saveUsageData();
        }
    }
    
    async saveUsageData() {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.dataFile);
            await fs.mkdir(dir, { recursive: true });
            
            await fs.writeFile(this.dataFile, JSON.stringify(this.usageData, null, 2));
        } catch (error) {
            console.error('❌ Failed to save API usage data:', error.message);
        }
    }
    
    trackRequest(service, tokens = 0, success = true) {
        if (!this.usageData[service]) {
            console.warn(`⚠️ Unknown service: ${service}`);
            return;
        }
        
        const usage = this.usageData[service];
        usage.requests++;
        usage.tokens += tokens;
        
        if (!success) {
            usage.errors++;
        }
        
        // Calculate cost
        const costRates = this.costRates[service];
        if (costRates) {
            usage.cost += costRates.perRequest + (tokens * costRates.perToken);
        }
        
        // Check if approaching limits
        this.checkLimits(service);
        
        // Save periodically
        if (usage.requests % 10 === 0) {
            this.saveUsageData();
        }
        
        return {
            remaining: this.dailyLimits[service] - usage.requests,
            cost: usage.cost,
            errors: usage.errors
        };
    }
    
    trackYouTubeQuota(quotaUsed) {
        const usage = this.usageData.youtube;
        usage.quotaUsed += quotaUsed;
        usage.requests++;
        
        // YouTube has a daily quota limit
        const remainingQuota = 10000 - usage.quotaUsed;
        
        if (remainingQuota < 100) {
            console.warn('YouTube API quota nearly exhausted');
        }
        
        return {
            remainingQuota,
            quotaUsed: usage.quotaUsed,
            cost: usage.cost
        };
    }
    
    checkLimits(service) {
        const usage = this.usageData[service];
        const limit = this.dailyLimits[service];
        
        if (usage.requests >= limit * 0.9) {
            console.warn(`${service} approaching daily limit: ${usage.requests}/${limit}`);
        }
        
        if (usage.requests >= limit) {
            console.error(`${service} daily limit reached: ${usage.requests}/${limit}`);
            return false;
        }
        
        return true;
    }
    
    getUsageReport() {
        const report = {
            timestamp: new Date().toISOString(),
            daily: {},
            total: {
                requests: 0,
                cost: 0,
                errors: 0
            }
        };
        
        Object.keys(this.usageData).forEach(service => {
            const usage = this.usageData[service];
            const limit = this.dailyLimits[service];
            
            report.daily[service] = {
                requests: usage.requests,
                limit: limit,
                remaining: limit - usage.requests,
                cost: usage.cost,
                errors: usage.errors,
                utilization: ((usage.requests / limit) * 100).toFixed(1) + '%'
            };
            
            report.total.requests += usage.requests;
            report.total.cost += usage.cost;
            report.total.errors += usage.errors;
        });
        
        return report;
    }
    
    async generateCostReport() {
        const report = this.getUsageReport();
        const estimatedMonthlyCost = report.total.cost * 30;
        
        return {
            ...report,
            estimatedMonthlyCost,
            recommendations: this.generateRecommendations(report)
        };
    }
    
    generateRecommendations(report) {
        const recommendations = [];
        
        Object.entries(report.daily).forEach(([service, data]) => {
            if (data.utilization > 80) {
                recommendations.push(`Consider upgrading ${service} limits or implementing caching`);
            }
            
            if (data.errors > data.requests * 0.1) {
                recommendations.push(`High error rate for ${service} - check API configuration`);
            }
            
            if (data.cost > 1) {
                recommendations.push(`High cost for ${service} - consider optimization`);
            }
        });
        
        return recommendations;
    }
    
    resetDailyUsage() {
        Object.keys(this.usageData).forEach(service => {
            this.usageData[service] = {
                requests: 0,
                tokens: 0,
                cost: 0,
                errors: 0,
                lastReset: new Date().toISOString()
            };
        });
        
        this.saveUsageData();
        console.log('Daily API usage reset');
    }
    
    async getServiceStatus(service) {
        const usage = this.usageData[service];
        const limit = this.dailyLimits[service];
        
        return {
            service,
            requests: usage.requests,
            limit,
            remaining: limit - usage.requests,
            utilization: ((usage.requests / limit) * 100).toFixed(1) + '%',
            cost: usage.cost,
            errors: usage.errors,
            isAvailable: usage.requests < limit
        };
    }
}

module.exports = APIMonitor; 