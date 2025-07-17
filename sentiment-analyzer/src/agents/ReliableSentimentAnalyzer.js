// src/agents/ReliableSentimentAnalyzer.js
const AdvancedBasicSentiment = require('./AdvancedBasicSentiment');

class ReliableSentimentAnalyzer {
    constructor() {
        this.basicSentiment = new AdvancedBasicSentiment();
        this.failureCount = 0;
        this.successCount = 0;
        
        // Alternative APIs that are more reliable than Hugging Face
        this.alternativeAPIs = {
            textrazor: process.env.TEXTRAZOR_API_KEY,
            meaningcloud: process.env.MEANINGCLOUD_API_KEY,
            openai: process.env.OPENAI_API_KEY
        };
        
        console.log('Reliable Sentiment Analyzer initialized');
        console.log('Primary: Advanced Basic Sentiment (100% reliable)');
        console.log('Backup: TextRazor, MeaningCloud, OpenAI');
    }
    
    async analyzeSentiment(text, platform = 'unknown') {
        const analysisStart = Date.now();
        
        // Always start with our reliable basic analyzer
        const basicResult = this.basicSentiment.analyzeSentiment(text);
        
        // Try to enhance with external APIs (but don't fail if they don't work)
        let enhancedResult = null;
        
        try {
            enhancedResult = await this.tryEnhancedAnalysis(text);
            this.successCount++;
        } catch (error) {
            this.failureCount++;
            console.log(`⚠️ Enhanced analysis failed (${this.failureCount} failures), using basic analysis`);
        }
        
        // Combine results for best accuracy
        const finalResult = this.combineResults(basicResult, enhancedResult);
        
        const analysisTime = Date.now() - analysisStart;
        
        return {
            ...finalResult,
            platform: platform,
            analysis_time_ms: analysisTime,
            method_used: enhancedResult ? 'enhanced_combined' : 'basic_advanced',
            reliability_score: enhancedResult ? 0.9 : 0.85
        };
    }
    
    async tryEnhancedAnalysis(text) {
        // Try OpenAI first (most reliable if available)
        if (this.alternativeAPIs.openai) {
            try {
                return await this.analyzeWithOpenAI(text);
            } catch (error) {
                console.log('⚠️ OpenAI failed, trying other methods...');
            }
        }
        
        // Try TextRazor (very reliable)
        if (this.alternativeAPIs.textrazor) {
            try {
                return await this.analyzeWithTextRazor(text);
            } catch (error) {
                console.log('⚠️ TextRazor failed, trying MeaningCloud...');
            }
        }
        
        // Try MeaningCloud (good backup)
        if (this.alternativeAPIs.meaningcloud) {
            try {
                return await this.analyzeWithMeaningCloud(text);
            } catch (error) {
                console.log('⚠️ MeaningCloud failed');
            }
        }
        
        throw new Error('All enhanced methods failed');
    }
    
    async analyzeWithOpenAI(text) {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: this.alternativeAPIs.openai });
        
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a sentiment analyzer. Respond only with JSON: {\"sentiment\": \"positive/negative/neutral\", \"confidence\": 0.0-1.0, \"reasoning\": \"brief explanation\"}"
                },
                {
                    role: "user",
                    content: `Analyze sentiment: "${text}"`
                }
            ],
            max_tokens: 100,
            temperature: 0.1
        });
        
        const result = JSON.parse(response.choices[0].message.content);
        return {
            label: result.sentiment,
            score: result.confidence,
            reasoning: result.reasoning,
            method: 'openai'
        };
    }
    
    async analyzeWithTextRazor(text) {
        const axios = require('axios');
        
        const response = await axios.post('https://api.textrazor.com/', 
            `text=${encodeURIComponent(text)}&extractors=entities,topics,sentiment`,
            {
                headers: {
                    'X-TextRazor-Key': this.alternativeAPIs.textrazor,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        const sentiment = response.data.response.sentiment;
        return {
            label: sentiment.label,
            score: Math.abs(sentiment.score),
            method: 'textrazor'
        };
    }
    
    async analyzeWithMeaningCloud(text) {
        const axios = require('axios');
        
        const response = await axios.post('https://api.meaningcloud.com/sentiment-2.1', {
            key: this.alternativeAPIs.meaningcloud,
            txt: text,
            lang: 'en'
        });
        
        const sentiment = response.data;
        const labelMap = {
            'P+': 'positive', 'P': 'positive',
            'NEU': 'neutral',
            'N': 'negative', 'N+': 'negative'
        };
        
        return {
            label: labelMap[sentiment.score_tag] || 'neutral',
            score: parseFloat(sentiment.confidence) / 100,
            method: 'meaningcloud'
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
                confidence: Math.min(0.95, (basicResult.score + enhancedResult.score) / 2 + 0.1),
                method: `combined_${enhancedResult.method}`,
                agreement: 'full'
            };
        }
        
        // If they disagree, use the one with higher confidence
        if (basicResult.score > enhancedResult.score) {
            return {
                label: basicResult.label,
                score: basicResult.score,
                confidence: basicResult.score * 0.9, // Slightly lower confidence due to disagreement
                method: 'basic_advanced_preferred',
                agreement: 'partial'
            };
        } else {
            return {
                label: enhancedResult.label,
                score: enhancedResult.score,
                confidence: enhancedResult.score * 0.9,
                method: `${enhancedResult.method}_preferred`,
                agreement: 'partial'
            };
        }
    }
    
    async analyzeBatch(texts, platform = 'unknown') {
        console.log(`Analyzing ${texts.length} texts for ${platform}...`);
        
        const results = [];
        const batchSize = 5; // Process in small batches
        
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            
            const batchPromises = batch.map(text => 
                this.analyzeSentiment(text, platform)
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Small delay between batches
            if (i + batchSize < texts.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        console.log(`Completed ${results.length} sentiment analyses`);
        return results;
    }
    
    getStats() {
        const total = this.successCount + this.failureCount;
        return {
            total_analyses: total,
            enhanced_success: this.successCount,
            basic_fallback: this.failureCount,
            success_rate: total > 0 ? (this.successCount / total * 100).toFixed(1) + '%' : '0%'
        };
    }
}

module.exports = ReliableSentimentAnalyzer;