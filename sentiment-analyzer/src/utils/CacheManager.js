// src/utils/CacheManager.js
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class CacheManager {
    constructor() {
        this.cacheDir = path.join(__dirname, '../data/cache');
        this.maxCacheSize = 100 * 1024 * 1024; // 100MB
        this.maxAge = 24 * 60 * 60 * 1000; // 24 hours
        this.cacheStats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            size: 0
        };
        
        this.ensureCacheDirectory();
        this.loadCacheStats();
    }
    
    async ensureCacheDirectory() {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create cache directory:', error.message);
        }
    }
    
    generateCacheKey(data) {
        // Create a hash of the data for consistent cache keys
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        return crypto.createHash('md5').update(dataString).digest('hex');
    }
    
    getCacheFilePath(key) {
        return path.join(this.cacheDir, `${key}.json`);
    }
    
    async get(key) {
        try {
            const filePath = this.getCacheFilePath(key);
            const data = await fs.readFile(filePath, 'utf8');
            const cached = JSON.parse(data);
            
            // Check if cache is still valid
            if (Date.now() - cached.timestamp > this.maxAge) {
                await this.delete(key);
                this.cacheStats.misses++;
                return null;
            }
            
            this.cacheStats.hits++;
            console.log(`Cache hit for key: ${key}`);
            return cached.data;
            
        } catch (error) {
            this.cacheStats.misses++;
            return null;
        }
    }
    
    async set(key, data, ttl = null) {
        try {
            const cacheEntry = {
                data: data,
                timestamp: Date.now(),
                ttl: ttl || this.maxAge
            };
            
            const filePath = this.getCacheFilePath(key);
            await fs.writeFile(filePath, JSON.stringify(cacheEntry, null, 2));
            
            // Update cache size
            const stats = await fs.stat(filePath);
            this.cacheStats.size += stats.size;
            
            // Check if we need to evict old entries
            await this.evictIfNeeded();
            
            console.log(`Cached data for key: ${key}`);
            
        } catch (error) {
            console.error('Failed to cache data:', error.message);
        }
    }
    
    async delete(key) {
        try {
            const filePath = this.getCacheFilePath(key);
            const stats = await fs.stat(filePath);
            await fs.unlink(filePath);
            
            this.cacheStats.size -= stats.size;
            console.log(`Deleted cache entry: ${key}`);
            
        } catch (error) {
            // File might not exist, which is fine
        }
    }
    
    async evictIfNeeded() {
        if (this.cacheStats.size <= this.maxCacheSize) {
            return;
        }
        
        try {
            const files = await fs.readdir(this.cacheDir);
            const fileStats = [];
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.cacheDir, file);
                    const stats = await fs.stat(filePath);
                    fileStats.push({
                        name: file,
                        path: filePath,
                        size: stats.size,
                        mtime: stats.mtime
                    });
                }
            }
            
            // Sort by modification time (oldest first)
            fileStats.sort((a, b) => a.mtime - b.mtime);
            
            // Remove oldest files until we're under the limit
            for (const file of fileStats) {
                if (this.cacheStats.size <= this.maxCacheSize * 0.8) {
                    break;
                }
                
                await fs.unlink(file.path);
                this.cacheStats.size -= file.size;
                this.cacheStats.evictions++;
                console.log(`Evicted cache file: ${file.name}`);
            }
            
        } catch (error) {
            console.error('❌ Failed to evict cache:', error.message);
        }
    }
    
    async getOrSet(key, dataGenerator, ttl = null) {
        // Try to get from cache first
        let cachedData = await this.get(key);
        
        if (cachedData !== null) {
            return cachedData;
        }
        
        // Generate new data
        console.log(`Generating new data for key: ${key}`);
        const newData = await dataGenerator();
        
        // Cache the new data
        await this.set(key, newData, ttl);
        
        return newData;
    }
    
    async getOrSetWithFallback(key, dataGenerator, fallbackGenerator, ttl = null) {
        try {
            return await this.getOrSet(key, dataGenerator, ttl);
        } catch (error) {
            console.log(`Primary data generation failed for ${key}, using fallback`);
            return await this.getOrSet(`${key}_fallback`, fallbackGenerator, ttl);
        }
    }
    
    async cacheSentimentAnalysis(brandConfig, platform, content) {
        const cacheKey = `sentiment_${brandConfig.id}_${platform}_${this.generateCacheKey(content)}`;
        return await this.getOrSet(cacheKey, async () => {
            // This would be replaced with actual sentiment analysis
            return {
                label: 'neutral',
                score: 0.5,
                cached: true
            };
        }, 12 * 60 * 60 * 1000); // 12 hours for sentiment analysis
    }
    
    async cachePlatformData(brandConfig, platform) {
        const cacheKey = `platform_${brandConfig.id}_${platform}`;
        return await this.getOrSet(cacheKey, async () => {
            // This would be replaced with actual platform scraping
            return {
                mentions: [],
                cached: true
            };
        }, 6 * 60 * 60 * 1000); // 6 hours for platform data
    }
    
    async cacheStrategicAnalysis(brandConfig, sentimentData) {
        const cacheKey = `strategic_${brandConfig.id}_${this.generateCacheKey(sentimentData)}`;
        return await this.getOrSet(cacheKey, async () => {
            // This would be replaced with actual strategic analysis
            return {
                insights: ['Cached strategic analysis'],
                recommendations: ['Consider upgrading cache'],
                cached: true
            };
        }, 24 * 60 * 60 * 1000); // 24 hours for strategic analysis
    }
    
    async clearExpired() {
        try {
            const files = await fs.readdir(this.cacheDir);
            let clearedCount = 0;
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.cacheDir, file);
                    const data = await fs.readFile(filePath, 'utf8');
                    const cached = JSON.parse(data);
                    
                    if (Date.now() - cached.timestamp > this.maxAge) {
                        await fs.unlink(filePath);
                        clearedCount++;
                    }
                }
            }
            
            console.log(`Cleared ${clearedCount} expired cache entries`);
            
        } catch (error) {
            console.error('Failed to clear expired cache:', error.message);
        }
    }
    
    async clearAll() {
        try {
            const files = await fs.readdir(this.cacheDir);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.cacheDir, file);
                    await fs.unlink(filePath);
                }
            }
            
            this.cacheStats.size = 0;
            console.log('Cleared all cache entries');
            
        } catch (error) {
            console.error('Failed to clear cache:', error.message);
        }
    }
    
    async getCacheStats() {
        try {
            const files = await fs.readdir(this.cacheDir);
            const fileCount = files.filter(file => file.endsWith('.json')).length;
            
            return {
                ...this.cacheStats,
                fileCount,
                hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0,
                maxSize: this.maxCacheSize,
                maxAge: this.maxAge
            };
            
        } catch (error) {
            return this.cacheStats;
        }
    }
    
    async loadCacheStats() {
        try {
            const statsFile = path.join(this.cacheDir, 'stats.json');
            const data = await fs.readFile(statsFile, 'utf8');
            this.cacheStats = { ...this.cacheStats, ...JSON.parse(data) };
        } catch (error) {
            // Stats file doesn't exist, use defaults
        }
    }
    
    async saveCacheStats() {
        try {
            const statsFile = path.join(this.cacheDir, 'stats.json');
            await fs.writeFile(statsFile, JSON.stringify(this.cacheStats, null, 2));
        } catch (error) {
            console.error('Failed to save cache stats:', error.message);
        }
    }
    
    // Start periodic cleanup
    startCleanup() {
        // Clear expired entries every hour
        setInterval(() => {
            this.clearExpired();
        }, 60 * 60 * 1000);
        
        // Save stats every 10 minutes
        setInterval(() => {
            this.saveCacheStats();
        }, 10 * 60 * 1000);
    }
}

module.exports = CacheManager; 