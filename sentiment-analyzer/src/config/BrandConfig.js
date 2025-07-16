// src/config/BrandConfig.js
class BrandConfig {
    constructor(brandData) {
        this.id = brandData.id;
        this.name = brandData.name;
        this.category = brandData.category;
        this.keywords = brandData.keywords;
        this.platforms = brandData.platforms;
        this.context = brandData.context;
        this.competitors = brandData.competitors || [];
        this.sentimentTargets = brandData.sentimentTargets || [];
    }
    
    generateSearchQueries(platform) {
        const baseQueries = [...this.keywords];
        const contextQueries = this.context.queries || [];
        
        switch (platform) {
            case 'youtube':
                return [
                    ...baseQueries.map(kw => `${kw} review`),
                    ...baseQueries.map(kw => `${kw} reaction`),
                    ...contextQueries
                ];
            default:
                return baseQueries;
        }
    }
    
    getPlatformPriority() {
        const priorities = {
            'entertainment': ['youtube', 'reddit', 'twitter'],
            'beauty': ['youtube', 'instagram', 'reddit'],
            'tech': ['reddit', 'youtube', 'twitter'],
            'default': ['youtube', 'reddit', 'twitter']
        };
        
        return priorities[this.category] || priorities['default'];
    }
}

module.exports = { BrandConfig };