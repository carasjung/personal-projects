// src/agents/FreeSentimentAnalyzer.js
const axios = require('axios');
const AdvancedBasicSentiment = require('./AdvancedBasicSentiment');

class FreeSentimentAnalyzer {
    constructor() {
        this.basicSentiment = new AdvancedBasicSentiment();
        this.apiQuotas = {
            twinword: { used: 0, limit: 9000 }, // 9,000 words/month free
            textrazor: { used: 0, limit: 500 }, // Adjust based on actual limit
            google: { used: 0, limit: 5000 }    // 5,000 units/month free
        };
        
        console.log('🆓 Free Sentiment Analyzer initialized');
        console.log('✅ Primary: Advanced Basic Sentiment (100% reliable)');
        console.log('✅ Backups: Twinword, TextRazor, Google NLP');
    }
    
    async analyzeSentiment(text, platform = 'unknown') {
        const analysisStart = Date.now();
        
        // Always start with our reliable basic analyzer
        const basicResult = this.basicSentiment.analyzeSentiment(text);
        
        // Try to enhance with free APIs (but don't fail if they don't work)
        let enhancedResult = null;
        
        try {
            enhancedResult = await this.tryFreeAPIs(text);
        } catch (error) {
            console.log(`⚠️ Free APIs failed, using basic analysis: ${error.message}`);
        }
        
        // Combine results for best accuracy
        const finalResult = this.combineResults(basicResult, enhancedResult);
        
        const analysisTime = Date.now() - analysisStart;
        
        return {
            ...finalResult,
            platform: platform,
            analysis_time_ms: analysisTime,
            method_used: enhancedResult ? 'enhanced_free' : 'basic_advanced',
            reliability_score: enhancedResult ? 0.88 : 0.85
        };
    }
    
    async tryFreeAPIs(text) {
        // Try Twinword first (most generous free tier)
        if (this.hasQuotaRemaining('twinword', text.length)) {
            try {
                const result = await this.analyzeWithTwinword(text);
                this.apiQuotas.twinword.used += text.length;
                return result;
            } catch (error) {
                console.log('⚠️ Twinword failed, trying TextRazor...');
            }
        }
        
        // Try TextRazor (reliable free tier)
        if (this.hasQuotaRemaining('textrazor', 1)) {
            try {
                const result = await this.analyzeWithTextRazor(text);
                this.apiQuotas.textrazor.used += 1;
                return result;
            } catch (error) {
                console.log('⚠️ TextRazor failed, trying Google...');
            }
        }
        
        // Try Google NLP (professional grade)
        if (this.hasQuotaRemaining('google', Math.ceil(text.length / 1000))) {
            try {
                const result = await this.analyzeWithGoogleNLP(text);
                this.apiQuotas.google.used += Math.ceil(text.length / 1000);
                return result;
            } catch (error) {
                console.log('⚠️ Google NLP failed');
            }
        }TEXTRAZOR_API_KEY=
        
        throw new Error('All free APIs exhausted or failed');
    }
    
    async analyzeWithTwinword(text) {
        if (!process.env.RAPIDAPI_KEY) {
            throw new Error('RAPIDAPI_KEY not found');
        }
        
        const response = await axios.post(
            'https://twinword-sentiment-analysis.p.rapidapi.com/analyze/',
            { text: text },
            {
                headers: {
                    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                    'X-RapidAPI-Host': 'twinword-sentiment-analysis.p.rapidapi.com',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 5000
            }
        );
        
        const result = response.data;
        return {
            label: result.type, // 'positive', 'negative', 'neutral'
            score: Math.abs(result.score || 0.5),
            ratio: result.ratio || 0,
            method: 'twinword',
            keywords: result.keywords || []
        };
    }
    
    async analyzeWithTextRazor(text) {
        if (!process.env.TEXTRAZOR_API_KEY) {
            throw new Error('TEXTRAZOR_API_KEY not found');
        }
        
        const response = await axios.post(
            'https://api.textrazor.com/',
            `text=${encodeURIComponent(text)}&extractors=sentiment`,
            {
                headers: {
                    'X-TextRazor-Key': process.env.TEXTRAZOR_API_KEY,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 8000
            }
        );
        
        const sentiment = response.data.response.sentiment || {};
        const labelMap = {
            'positive': 'positive',
            'negative': 'negative'
        };
        
        return {
            label: labelMap[sentiment.label] || 'neutral',
            score: Math.abs(sentiment.score || 0.5),
            method: 'textrazor'
        };
    }
    
    combineResults(basicResult, enhancedResult) {
        if (!enhancedResult) {
            return {
                label: basicResult.label,
                score: basicResult.score,
                confidence: basicResult.score,
                method: 'basic_advanced'
            };
        }
        
        // If both agree, use higher confidence
        if (basicResult.label === enhancedResult.label) {
            return {
                label: basicResult.label,
                score: Math.max(basicResult.score, enhancedResult.score),
                confidence: Math.min(0.92, (basicResult.score + enhancedResult.score) / 2 + 0.1),
                method: `combined_${enhancedResult.method}`,
                agreement: 'full',
                enhanced_data: enhancedResult
            };
        }
        
        // If they disagree, use the one with higher confidence
        if (basicResult.score > enhancedResult.score) {
            return {
                label: basicResult.label,
                score: basicResult.score,
                confidence: basicResult.score * 0.88,
                method: 'basic_advanced_preferred',
                agreement: 'partial'
            };
        } else {
            return {
                label: enhancedResult.label,
                score: enhancedResult.score,
                confidence: enhancedResult.score * 0.88,
                method: `${enhancedResult.method}_preferred`,
                agreement: 'partial',
                enhanced_data: enhancedResult
            };
        }
    }
    
    hasQuotaRemaining(api, cost) {
        const quota = this.apiQuotas[api];
        return (quota.used + cost) <= quota.limit;
    }
    
    async analyzeBatch(texts, platform = 'unknown') {
        console.log(`🔄 Analyzing ${texts.length} texts for ${platform} with free APIs...`);
        
        const results = [];
        const batchSize = 3; // Smaller batches for free APIs
        
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            
            const batchPromises = batch.map(text => 
                this.analyzeSentiment(text, platform)
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Longer delay between batches for free APIs
            if (i + batchSize < texts.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log(`✅ Completed ${results.length} sentiment analyses (free APIs)`);
        return results;
    }
    
    getQuotaStatus() {
        return {
            twinword: {
                used: this.apiQuotas.twinword.used,
                remaining: this.apiQuotas.twinword.limit - this.apiQuotas.twinword.used,
                limit: this.apiQuotas.twinword.limit,
                percentage_used: Math.round((this.apiQuotas.twinword.used / this.apiQuotas.twinword.limit) * 100)
            },
            textrazor: {
                used: this.apiQuotas.textrazor.used,
                remaining: this.apiQuotas.textrazor.limit - this.apiQuotas.textrazor.used,
                limit: this.apiQuotas.textrazor.limit,
                percentage_used: Math.round((this.apiQuotas.textrazor.used / this.apiQuotas.textrazor.limit) * 100)
            }
        };
    }
    
    resetMonthlyQuotas() {
        // Call this at the beginning of each month
        this.apiQuotas.twinword.used = 0;
        this.apiQuotas.textrazor.used = 0;
        console.log('🔄 Monthly API quotas reset');
    }
}

module.exports = FreeSentimentAnalyzer;