// src/agents/HuggingFaceFirstSentimentAnalyzer.js
const axios = require('axios');
const { HfInference } = require('@huggingface/inference');
const AdvancedBasicSentiment = require('./AdvancedBasicSentiment');

class HuggingFaceFirstSentimentAnalyzer {
    constructor() {
        this.hf = process.env.HUGGINGFACE_API_KEY ? new HfInference(process.env.HUGGINGFACE_API_KEY) : null;
        this.basicSentiment = new AdvancedBasicSentiment();
        
        // Hugging Face models to try (in order of preference)
        this.hfModels = [
            'cardiffnlp/twitter-roberta-base-sentiment-latest',
            'distilbert-base-uncased-finetuned-sst-2-english',
            'nlptown/bert-base-multilingual-uncased-sentiment'
        ];
        
        // Free API quotas
        this.apiQuotas = {
            twinword: { used: 0, limit: 9000 }, // 9,000 words/month free
            textrazor: { used: 0, limit: 500 }, // Adjust based on actual limit
            huggingface: { used: 0, limit: 1000 } // HF free tier limit
        };
        
        // Track failure rates
        this.failureStats = {
            huggingface: { attempts: 0, failures: 0 },
            freeApis: { attempts: 0, failures: 0 },
            basic: { attempts: 0, failures: 0 }
        };
        
        console.log('🤗 Hugging Face First Sentiment Analyzer initialized');
        console.log('✅ Priority 1: Hugging Face models');
        console.log('✅ Priority 2: Free APIs (Twinword, TextRazor)');
        console.log('✅ Priority 3: Advanced Basic Sentiment (100% reliable)');
    }
    
    async analyzeSentiment(text, platform = 'unknown') {
        const analysisStart = Date.now();
        let finalResult = null;
        let methodUsed = 'unknown';
        
        // PRIORITY 1: Try Hugging Face first
        if (this.hf && this.hasQuotaRemaining('huggingface', 1)) {
            try {
                console.log('🤗 Attempting Hugging Face analysis...');
                finalResult = await this.tryHuggingFaceModels(text);
                methodUsed = 'huggingface_success';
                this.apiQuotas.huggingface.used += 1;
                this.failureStats.huggingface.attempts += 1;
                console.log('✅ Hugging Face succeeded');
            } catch (error) {
                console.log(`⚠️ Hugging Face failed: ${error.message}`);
                this.failureStats.huggingface.attempts += 1;
                this.failureStats.huggingface.failures += 1;
            }
        } else {
            console.log('⚠️ Hugging Face not available (no API key or quota exceeded)');
        }
        
        // PRIORITY 2: If HF failed, try Free APIs
        if (!finalResult) {
            try {
                console.log('🆓 Hugging Face failed, trying free APIs...');
                finalResult = await this.tryFreeAPIs(text);
                methodUsed = 'free_apis_fallback';
                this.failureStats.freeApis.attempts += 1;
                console.log('✅ Free APIs succeeded');
            } catch (error) {
                console.log(`⚠️ Free APIs failed: ${error.message}`);
                this.failureStats.freeApis.attempts += 1;
                this.failureStats.freeApis.failures += 1;
            }
        }
        
        // PRIORITY 3: If everything failed, use Advanced Basic (always works)
        if (!finalResult) {
            console.log('🔧 All APIs failed, using reliable basic sentiment...');
            const basicResult = this.basicSentiment.analyzeSentiment(text);
            finalResult = {
                label: basicResult.label,
                score: basicResult.score,
                confidence: basicResult.score,
                method: 'basic_fallback'
            };
            methodUsed = 'basic_fallback';
            this.failureStats.basic.attempts += 1;
            console.log('✅ Basic sentiment completed (100% reliable)');
        }
        
        const analysisTime = Date.now() - analysisStart;
        
        return {
            ...finalResult,
            platform: platform,
            analysis_time_ms: analysisTime,
            method_used: methodUsed,
            reliability_score: this.getReliabilityScore(methodUsed),
            failure_stats: this.getFailureRates()
        };
    }
    
    async tryHuggingFaceModels(text) {
        const preprocessedText = this.preprocessText(text);
        
        // Try each HF model in order
        for (const model of this.hfModels) {
            try {
                console.log(`🤗 Trying HF model: ${model}`);
                
                const result = await Promise.race([
                    this.hf.textClassification({
                        model: model,
                        inputs: preprocessedText
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('HF Timeout')), 8000)
                    )
                ]);
                
                const normalized = this.normalizeHuggingFaceResult(result);
                console.log(`✅ HF model ${model} succeeded`);
                
                return {
                    label: normalized.label,
                    score: normalized.score,
                    confidence: normalized.score,
                    method: `huggingface_${model.split('/')[1]}`,
                    model_used: model
                };
                
            } catch (error) {
                console.log(`❌ HF model ${model} failed: ${error.message}`);
                continue; // Try next model
            }
        }
        
        throw new Error('All Hugging Face models failed');
    }
    
    async tryFreeAPIs(text) {
        // Try Twinword first (most generous free tier)
        if (this.hasQuotaRemaining('twinword', text.length)) {
            try {
                const result = await this.analyzeWithTwinword(text);
                this.apiQuotas.twinword.used += text.length;
                console.log('✅ Twinword API succeeded');
                return {
                    label: result.label,
                    score: result.score,
                    confidence: result.score,
                    method: 'twinword_fallback',
                    enhanced_data: result
                };
            } catch (error) {
                console.log(`❌ Twinword failed: ${error.message}`);
            }
        }
        
        // Try TextRazor if Twinword failed
        if (this.hasQuotaRemaining('textrazor', 1)) {
            try {
                const result = await this.analyzeWithTextRazor(text);
                this.apiQuotas.textrazor.used += 1;
                console.log('✅ TextRazor API succeeded');
                return {
                    label: result.label,
                    score: result.score,
                    confidence: result.score,
                    method: 'textrazor_fallback',
                    enhanced_data: result
                };
            } catch (error) {
                console.log(`❌ TextRazor failed: ${error.message}`);
            }
        }
        
        throw new Error('All free APIs failed or quota exceeded');
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
            score: Math.abs(sentiment.score || 0.5)
        };
    }
    
    preprocessText(text) {
        return text
            .replace(/https?:\/\/\S+/g, '')
            .replace(/@\w+/g, '')
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 512);
    }
    
    normalizeHuggingFaceResult(result) {
        if (Array.isArray(result)) result = result[0];
        
        const labelMap = {
            'POSITIVE': 'positive', 
            'NEGATIVE': 'negative', 
            'NEUTRAL': 'neutral',
            'LABEL_0': 'negative', 
            'LABEL_1': 'neutral', 
            'LABEL_2': 'positive'
        };
        
        return {
            label: labelMap[result.label] || result.label.toLowerCase(),
            score: result.score || 0.5
        };
    }
    
    hasQuotaRemaining(api, cost) {
        const quota = this.apiQuotas[api];
        return (quota.used + cost) <= quota.limit;
    }
    
    getReliabilityScore(method) {
        const scores = {
            'huggingface_success': 0.92,
            'free_apis_fallback': 0.85,
            'basic_fallback': 0.82
        };
        return scores[method] || 0.75;
    }
    
    getFailureRates() {
        const calculateRate = (stats) => {
            if (stats.attempts === 0) return 0;
            return Math.round((stats.failures / stats.attempts) * 100);
        };
        
        return {
            huggingface_failure_rate: calculateRate(this.failureStats.huggingface) + '%',
            free_apis_failure_rate: calculateRate(this.failureStats.freeApis) + '%',
            basic_failure_rate: calculateRate(this.failureStats.basic) + '%',
            total_attempts: this.failureStats.huggingface.attempts + 
                           this.failureStats.freeApis.attempts + 
                           this.failureStats.basic.attempts
        };
    }
    
    async analyzeBatch(texts, platform = 'unknown') {
        console.log(`🔄 Analyzing ${texts.length} texts for ${platform} (HF first, then fallbacks)...`);
        
        const results = [];
        const batchSize = 3;
        
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            
            const batchPromises = batch.map(text => 
                this.analyzeSentiment(text, platform)
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Rate limiting between batches
            if (i + batchSize < texts.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // Log success rates
        const methodCounts = {};
        results.forEach(r => {
            methodCounts[r.method_used] = (methodCounts[r.method_used] || 0) + 1;
        });
        
        console.log('📊 Analysis method distribution:', methodCounts);
        console.log(`✅ Completed ${results.length} sentiment analyses`);
        
        return results;
    }
    
    getQuotaStatus() {
        return {
            huggingface: {
                used: this.apiQuotas.huggingface.used,
                remaining: this.apiQuotas.huggingface.limit - this.apiQuotas.huggingface.used,
                limit: this.apiQuotas.huggingface.limit,
                percentage_used: Math.round((this.apiQuotas.huggingface.used / this.apiQuotas.huggingface.limit) * 100)
            },
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
        this.apiQuotas.huggingface.used = 0;
        this.apiQuotas.twinword.used = 0;
        this.apiQuotas.textrazor.used = 0;
        console.log('🔄 Monthly API quotas reset');
    }
    
    getAnalyticsReport() {
        const total = this.failureStats.huggingface.attempts + 
                     this.failureStats.freeApis.attempts + 
                     this.failureStats.basic.attempts;
        
        return {
            total_analyses: total,
            success_by_method: {
                huggingface_success: this.failureStats.huggingface.attempts - this.failureStats.huggingface.failures,
                free_apis_success: this.failureStats.freeApis.attempts - this.failureStats.freeApis.failures,
                basic_fallback: this.failureStats.basic.attempts - this.failureStats.basic.failures
            },
            failure_rates: this.getFailureRates(),
            quota_status: this.getQuotaStatus(),
            recommendation: this.getRecommendation()
        };
    }
    
    getRecommendation() {
        const hfFailureRate = this.failureStats.huggingface.failures / Math.max(this.failureStats.huggingface.attempts, 1);
        
        if (hfFailureRate > 0.7) {
            return "Consider switching to Free APIs first due to high Hugging Face failure rate";
        } else if (hfFailureRate > 0.5) {
            return "Hugging Face reliability is moderate, monitor quota usage";
        } else {
            return "Current setup is working well with good Hugging Face reliability";
        }
    }
}

module.exports = HuggingFaceFirstSentimentAnalyzer;