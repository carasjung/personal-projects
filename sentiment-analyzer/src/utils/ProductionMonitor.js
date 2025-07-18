// src/utils/ProductionMonitor.js
const APIMonitor = require('./APIMonitor');
const RateLimiter = require('./RateLimiter');
const CacheManager = require('./CacheManager');
const ErrorHandler = require('./ErrorHandler');
const fs = require('fs').promises;
const path = require('path');

class ProductionMonitor {
    constructor() {
        this.apiMonitor = new APIMonitor();
        this.rateLimiter = new RateLimiter();
        this.cacheManager = new CacheManager();
        this.errorHandler = new ErrorHandler();
        
        this.monitoringData = {
            uptime: Date.now(),
            totalRequests: 0,
            activeSessions: 0,
            systemHealth: 'healthy',
            lastHealthCheck: new Date().toISOString()
        };
        
        this.healthThresholds = {
            errorRate: 0.1, // 10% error rate threshold
            responseTime: 5000, // 5 second response time threshold
            cacheHitRate: 0.3, // 30% cache hit rate minimum
            apiUtilization: 0.8 // 80% API utilization threshold
        };
        
        this.startMonitoring();
    }
    
    async executeWithFullMonitoring(service, operation, context = {}) {
        const startTime = Date.now();
        this.monitoringData.totalRequests++;
        
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(operation, context);
            let result = await this.cacheManager.get(cacheKey);
            
            if (result) {
                console.log(`Cache hit for ${service}/${context.operation || 'operation'}`);
                return result;
            }
            
            // Execute with rate limiting and error handling
            result = await this.rateLimiter.executeWithRateLimit(service, async () => {
                return await this.errorHandler.executeWithRetry(operation, {
                    service,
                    operation: context.operation || 'operation',
                    brandConfig: context.brandConfig,
                    platform: context.platform
                });
            });
            
            // Cache the result
            await this.cacheManager.set(cacheKey, result, context.cacheTTL);
            
            const duration = Date.now() - startTime;
            this.logPerformance(service, duration, true);
            
            return result;
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logPerformance(service, duration, false);
            
            // Handle the error and return fallback
            return await this.errorHandler.handleAPIError(error, service, context.operation || 'operation', context.brandConfig);
        }
    }
    
    generateCacheKey(operation, context) {
        const keyData = {
            operation: operation.toString(),
            brandConfig: context.brandConfig?.id,
            platform: context.platform,
            service: context.service
        };
        
        return this.cacheManager.generateCacheKey(keyData);
    }
    
    logPerformance(service, duration, success) {
        // This would be expanded to track detailed performance metrics
        if (duration > this.healthThresholds.responseTime) {
            console.warn(`Slow response time for ${service}: ${duration}ms`);
        }
        
        if (!success) {
            console.error(`Failed operation for ${service} after ${duration}ms`);
        }
    }
    
    async getSystemHealth() {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.monitoringData.uptime,
            components: {}
        };
        
        // Check API health
        const apiStatus = await this.checkAPIHealth();
        health.components.api = apiStatus;
        
        // Check cache health
        const cacheStatus = await this.checkCacheHealth();
        health.components.cache = cacheStatus;
        
        // Check error rates
        const errorStatus = await this.checkErrorHealth();
        health.components.errors = errorStatus;
        
        // Check rate limiting
        const rateLimitStatus = this.checkRateLimitHealth();
        health.components.rateLimiting = rateLimitStatus;
        
        // Determine overall health
        const unhealthyComponents = Object.values(health.components).filter(comp => comp.status === 'unhealthy');
        
        if (unhealthyComponents.length > 0) {
            health.status = 'degraded';
            if (unhealthyComponents.length > 2) {
                health.status = 'unhealthy';
            }
        }
        
        this.monitoringData.systemHealth = health.status;
        this.monitoringData.lastHealthCheck = health.timestamp;
        
        return health;
    }
    
    async checkAPIHealth() {
        const apiReport = await this.apiMonitor.getUsageReport();
        const status = {
            status: 'healthy',
            services: {}
        };
        
        Object.entries(apiReport.daily).forEach(([service, data]) => {
            const isHealthy = data.utilization < this.healthThresholds.apiUtilization * 100;
            const hasErrors = data.errors > 0;
            
            status.services[service] = {
                status: isHealthy && !hasErrors ? 'healthy' : 'degraded',
                utilization: data.utilization,
                errors: data.errors,
                remaining: data.remaining
            };
            
            if (!isHealthy || hasErrors) {
                status.status = 'degraded';
            }
        });
        
        return status;
    }
    
    async checkCacheHealth() {
        const cacheStats = await this.cacheManager.getCacheStats();
        const hitRate = cacheStats.hitRate;
        
        return {
            status: hitRate >= this.healthThresholds.cacheHitRate ? 'healthy' : 'degraded',
            hitRate: hitRate,
            size: cacheStats.size,
            fileCount: cacheStats.fileCount,
            evictions: cacheStats.evictions
        };
    }
    
    async checkErrorHealth() {
        const errorStats = this.errorHandler.getErrorStats();
        const errorRate = errorStats.errorRate;
        
        return {
            status: errorRate <= this.healthThresholds.errorRate ? 'healthy' : 'unhealthy',
            errorRate: errorRate,
            totalErrors: errorStats.totalErrors,
            topErrorTypes: errorStats.topErrorTypes,
            topErrorServices: errorStats.topErrorServices
        };
    }
    
    checkRateLimitHealth() {
        const rateLimitStatus = this.rateLimiter.getRateLimitStatus();
        const status = {
            status: 'healthy',
            services: {}
        };
        
        Object.entries(rateLimitStatus).forEach(([service, data]) => {
            const isHealthy = data.canMakeRequest && data.requestsInLastMinute < data.limit * 0.8;
            
            status.services[service] = {
                status: isHealthy ? 'healthy' : 'degraded',
                requestsInLastMinute: data.requestsInLastMinute,
                limit: data.limit,
                canMakeRequest: data.canMakeRequest,
                retryDelay: data.retryDelay
            };
            
            if (!isHealthy) {
                status.status = 'degraded';
            }
        });
        
        return status;
    }
    
    async generateProductionReport() {
        const health = await this.getSystemHealth();
        const apiReport = await this.apiMonitor.generateCostReport();
        const cacheStats = await this.cacheManager.getCacheStats();
        const errorStats = this.errorHandler.getErrorStats();
        const rateLimitStatus = this.rateLimiter.getRateLimitStatus();
        
        return {
            timestamp: new Date().toISOString(),
            systemHealth: health,
            apiUsage: apiReport,
            cache: cacheStats,
            errors: errorStats,
            rateLimiting: rateLimitStatus,
            monitoring: this.monitoringData,
            recommendations: this.generateRecommendations({
                health,
                apiReport,
                cacheStats,
                errorStats,
                rateLimitStatus
            })
        };
    }
    
    generateRecommendations(data) {
        const recommendations = [];
        
        // API usage recommendations
        if (data.apiReport.estimatedMonthlyCost > 10) {
            recommendations.push('Consider implementing more aggressive caching to reduce API costs');
        }
        
        Object.entries(data.apiReport.daily).forEach(([service, usage]) => {
            if (usage.utilization > 80) {
                recommendations.push(`High utilization for ${service} - consider upgrading limits or implementing caching`);
            }
            
            if (usage.errors > usage.requests * 0.05) {
                recommendations.push(`High error rate for ${service} - check API configuration and keys`);
            }
        });
        
        // Cache recommendations
        if (data.cacheStats.hitRate < 0.3) {
            recommendations.push('Low cache hit rate - consider expanding cache coverage or adjusting TTL');
        }
        
        if (data.cacheStats.evictions > 10) {
            recommendations.push('High cache evictions - consider increasing cache size or optimizing storage');
        }
        
        // Error recommendations
        if (data.errorStats.errorRate > 0.1) {
            recommendations.push('High error rate - investigate service failures and improve error handling');
        }
        
        // Rate limiting recommendations
        Object.entries(data.rateLimiting).forEach(([service, status]) => {
            if (!status.canMakeRequest) {
                recommendations.push(`${service} rate limited - consider adjusting rate limits or implementing backoff`);
            }
        });
        
        return recommendations;
    }
    
    async saveMonitoringData() {
        try {
            const dataDir = path.join(__dirname, '../data');
            await fs.mkdir(dataDir, { recursive: true });
            
            const report = await this.generateProductionReport();
            await fs.writeFile(
                path.join(dataDir, 'production_report.json'),
                JSON.stringify(report, null, 2)
            );
            
            console.log('Production monitoring data saved');
        } catch (error) {
            console.error('Failed to save monitoring data:', error.message);
        }
    }
    
    startMonitoring() {
        // Generate health report every 5 minutes
        setInterval(async () => {
            await this.getSystemHealth();
        }, 5 * 60 * 1000);
        
        // Save monitoring data every 15 minutes
        setInterval(async () => {
            await this.saveMonitoringData();
        }, 15 * 60 * 1000);
        
        // Start cleanup processes
        this.cacheManager.startCleanup();
        this.errorHandler.startCleanup();
        
        console.log('Production monitoring started');
    }
    
    async getQuickStatus() {
        const health = await this.getSystemHealth();
        const apiReport = await this.apiMonitor.getUsageReport();
        
        return {
            systemHealth: health.status,
            totalRequests: this.monitoringData.totalRequests,
            activeSessions: this.monitoringData.activeSessions,
            uptime: Date.now() - this.monitoringData.uptime,
            apiUtilization: Math.max(...Object.values(apiReport.daily).map(d => parseFloat(d.utilization))),
            lastHealthCheck: this.monitoringData.lastHealthCheck
        };
    }
}

module.exports = ProductionMonitor; 