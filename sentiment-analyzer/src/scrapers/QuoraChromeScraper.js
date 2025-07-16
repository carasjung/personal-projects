// src/scrapers/QuoraChromeScraper.js
require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class QuoraChromeScraper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isConnected = false;
    }
    
    async initialize() {
        console.log('🔗 Connecting to Chrome session for Quora scraping...');
        
        try {
            // Connect to existing Chrome instance
            this.browser = await puppeteer.connect({
                browserURL: 'http://localhost:9222',
                defaultViewport: null
            });
            
            // Create new page for scraping
            this.page = await this.browser.newPage();
            this.isConnected = true;
            
            console.log('✅ Connected to Chrome browser');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to connect to Chrome:', error.message);
            console.log('💡 Make sure Chrome is running with: node persistent-chrome-setup.js');
            return false;
        }
    }
    
    async verifyLogin() {
        console.log('🔍 Verifying Quora login status...');
        
        try {
            await this.page.goto('https://www.quora.com', { waitUntil: 'networkidle2' });
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const loginStatus = await this.page.evaluate(() => {
                const hasEmailField = !!document.querySelector('input[type="email"]');
                const bodyText = document.body.textContent || '';
                return {
                    isLoggedIn: !hasEmailField && bodyText.length > 2000,
                    pageLength: bodyText.length
                };
            });
            
            if (loginStatus.isLoggedIn) {
                console.log('✅ Logged in to Quora');
                return true;
            } else {
                console.log('❌ Not logged in to Quora');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Login verification failed:', error.message);
            return false;
        }
    }
    
    async searchBrandDiscussions(brandConfig, limit = 20) {
        console.log(`🔍 Searching Quora for: ${brandConfig.name}`);
        
        if (!this.isConnected) {
            throw new Error('Not connected to Chrome. Call initialize() first.');
        }
        
        const searchQueries = this.generateQuoraQueries(brandConfig);
        const allDiscussions = [];
        
        for (const query of searchQueries.slice(0, 3)) { // Limit to 3 queries
            try {
                console.log(`   🔍 Query: "${query}"`);
                
                const discussions = await this.searchQuery(query, brandConfig);
                allDiscussions.push(...discussions);
                
                console.log(`      Found ${discussions.length} discussions`);
                
                // Delay between searches to be respectful
                await new Promise(resolve => setTimeout(resolve, 4000));
                
            } catch (error) {
                console.error(`❌ Error searching "${query}":`, error.message);
            }
        }
        
        // Process and rank results
        const uniqueDiscussions = this.deduplicateDiscussions(allDiscussions);
        const rankedDiscussions = this.rankDiscussions(uniqueDiscussions, brandConfig);
        
        console.log(`✅ Total unique discussions found: ${rankedDiscussions.length}`);
        return rankedDiscussions.slice(0, limit);
    }
    
    generateQuoraQueries(brandConfig) {
        const baseQueries = [...brandConfig.keywords];
        
        switch (brandConfig.category) {
            case 'entertainment':
                return [
                    ...baseQueries,
                    ...baseQueries.map(kw => `${kw} review`),
                    ...baseQueries.map(kw => `What do you think about ${kw}?`),
                    ...baseQueries.map(kw => `${kw} opinion`),
                    ...baseQueries.map(kw => `${kw} vs`)
                ];
                
            case 'beauty':
                return [
                    ...baseQueries,
                    ...baseQueries.map(kw => `${kw} review`),
                    ...baseQueries.map(kw => `Is ${kw} worth it?`),
                    ...baseQueries.map(kw => `${kw} experience`),
                    ...baseQueries.map(kw => `${kw} vs`)
                ];
                
            case 'tech':
                return [
                    ...baseQueries,
                    ...baseQueries.map(kw => `${kw} review`),
                    ...baseQueries.map(kw => `Should I buy ${kw}?`),
                    ...baseQueries.map(kw => `${kw} pros and cons`),
                    ...baseQueries.map(kw => `${kw} comparison`)
                ];
                
            default:
                return [
                    ...baseQueries,
                    ...baseQueries.map(kw => `${kw} review`),
                    ...baseQueries.map(kw => `What do you think about ${kw}?`)
                ];
        }
    }
    
    async searchQuery(query, brandConfig) {
        const searchUrl = `https://www.quora.com/search?q=${encodeURIComponent(query)}`;
        
        try {
            await this.page.goto(searchUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000
            });
            
            // Wait for content to load
            await new Promise(resolve => setTimeout(resolve, 4000));
            
            // Scroll to load more content
            await this.scrollToLoadContent();
            
            // Extract discussions
            const discussions = await this.extractDiscussions(brandConfig, query);
            
            return discussions;
            
        } catch (error) {
            console.error(`❌ Search error for "${query}":`, error.message);
            return [];
        }
    }
    
    async scrollToLoadContent() {
        try {
            // Scroll down multiple times to load more results
            for (let i = 0; i < 3; i++) {
                await this.page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                });
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // Scroll back to top for easier extraction
            await this.page.evaluate(() => {
                window.scrollTo(0, 0);
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.log('⚠️  Scrolling error:', error.message);
        }
    }
    
    async extractDiscussions(brandConfig, searchQuery) {
        console.log('📄 Extracting discussions from page...');
        
        const discussions = await this.page.evaluate((brandName, searchQuery) => {
            const results = [];
            
            // More specific selectors for actual content (not navigation)
            const contentSelectors = [
                // Question and answer content
                '[class*="Question"] span[class*="qu-userSelect--text"]',
                '[class*="Answer"] span[class*="qu-userSelect--text"]',
                '[class*="ExpandedQText"]',
                '[class*="qu-userSelect--text"]',
                
                // Question titles and links
                'a[href*="/question/"]',
                'h1[class*="qu-"], h2[class*="qu-"], h3[class*="qu-"]',
                
                // Answer and post content
                'div[class*="AnswerText"] span',
                'div[class*="PostText"] span',
                'div[class*="qu-whitespace--pre-wrap"]',
                
                // Generic content containers with text
                'div[class*="spacing_log"] span[class*="qu-userSelect--text"]',
                'div[data-testid] span[class*="qu-userSelect--text"]'
            ];
            
            let contentElements = [];
            
            // Collect content elements
            contentSelectors.forEach(selector => {
                try {
                    const elements = Array.from(document.querySelectorAll(selector));
                    contentElements.push(...elements);
                } catch (e) {
                    // Skip invalid selectors
                }
            });
            
            // Remove duplicates
            contentElements = Array.from(new Set(contentElements));
            
            console.log(`Processing ${contentElements.length} content elements`);
            
            contentElements.forEach((element, index) => {
                try {
                    const text = element.textContent?.trim() || '';
                    
                    // Filter out navigation and UI elements
                    const isNavigationText = text.match(/^(Skip to|By type|All types|Questions|Answers|Posts|Profiles|Topics|Spaces|People you follow|Past hour|Past day|Past week|Past month|Past year|Results for)/i);
                    const isShortText = text.length < 30;
                    const isRepeatedText = text.includes('Results for') && text.length < 200;
                    
                    if (!isNavigationText && !isShortText && !isRepeatedText && text.length > 50) {
                        // Check relevance to brand/search
                        const isRelevant = 
                            text.toLowerCase().includes(brandName.toLowerCase()) ||
                            text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            searchQuery.toLowerCase().split(' ').some(word => 
                                word.length > 3 && text.toLowerCase().includes(word)
                            );
                        
                        if (isRelevant) {
                            // Try to get more context from parent elements
                            const parentContainer = element.closest('[class*="Answer"], [class*="Question"], [data-testid], div[class*="qu-"]') || element.parentElement;
                            
                            // Look for question context
                            const questionElement = parentContainer?.querySelector('a[href*="/question/"], h1, h2, h3') || 
                                                   element.closest('[class*="Question"]')?.querySelector('a[href*="/question/"], h1, h2, h3');
                            const question = questionElement ? questionElement.textContent.trim() : '';
                            
                            // Determine if this is an answer
                            const isAnswer = element.closest('[class*="Answer"], [class*="answer"]') !== null;
                            
                            // Look for author information
                            const authorContainer = parentContainer || element.parentElement;
                            const authorElement = authorContainer?.querySelector('[href*="/profile/"], [class*="author"], [class*="UserName"]');
                            let author = 'Quora User';
                            
                            if (authorElement) {
                                const authorText = authorElement.textContent.trim();
                                // Clean up author text (remove extra text like "Follow" etc.)
                                author = authorText.split('·')[0].split('Follow')[0].trim() || 'Quora User';
                            }
                            
                            // Look for engagement metrics
                            const engagementElement = authorContainer?.querySelector('[class*="vote"], [class*="upvote"], [class*="NumberedReactionMeta"], button[aria-label*="upvote"]');
                            const engagementText = engagementElement ? engagementElement.textContent.trim() : '0';
                            
                            // Only include substantial, unique content
                            if (text.length > 50 && text.length < 5000) { // Reasonable content length
                                results.push({
                                    question: question && question.length > 10 ? question : '',
                                    content: text,
                                    fullText: question && question.length > 10 ? `${question} ${text}` : text,
                                    author: author,
                                    engagementText: engagementText,
                                    isAnswer: isAnswer,
                                    contentLength: text.length,
                                    elementTag: element.tagName,
                                    index: index
                                });
                            }
                        }
                    }
                    
                } catch (error) {
                    // Skip problematic elements
                }
            });
            
            // Additional cleanup: remove very similar content
            const cleanedResults = [];
            const seenContent = new Set();
            
            results.forEach(result => {
                const contentPreview = result.content.substring(0, 100).toLowerCase().replace(/\s+/g, '');
                if (!seenContent.has(contentPreview)) {
                    seenContent.add(contentPreview);
                    cleanedResults.push(result);
                }
            });
            
            console.log(`Extracted ${cleanedResults.length} unique discussions after cleanup`);
            return cleanedResults;
            
        }, brandConfig.name, searchQuery);
        
        // Format for sentiment analysis
        const formattedDiscussions = discussions.map((disc, index) => ({
            platform: 'quora',
            brand_id: brandConfig.id,
            brand_name: brandConfig.name,
            brand_category: brandConfig.category,
            id: `quora_${brandConfig.id}_${Date.now()}_${index}`,
            content: disc.fullText.trim(),
            author: disc.author !== 'Quora User' ? disc.author : `QuoraUser${index}`,
            engagement_score: this.parseEngagement(disc.engagementText),
            url: this.page.url(),
            created_at: new Date(),
            metadata: {
                question: disc.question,
                answer: disc.content,
                search_query: searchQuery,
                is_answer: disc.isAnswer,
                content_length: disc.contentLength,
                element_tag: disc.elementTag,
                engagement_text: disc.engagementText,
                extraction_method: 'chrome_session_cleaned'
            }
        }));
        
        return formattedDiscussions;
    }
    
    parseEngagement(engagementText) {
        if (!engagementText) return 0;
        
        // Extract numbers from engagement text
        const matches = engagementText.match(/(\d+(?:\.?\d*)?[KkMm]?)/g);
        if (matches && matches.length > 0) {
            let value = parseFloat(matches[0]);
            const text = matches[0].toLowerCase();
            
            if (text.includes('k')) value *= 1000;
            if (text.includes('m')) value *= 1000000;
            
            return Math.floor(value);
        }
        
        return 0;
    }
    
    deduplicateDiscussions(discussions) {
        const seen = new Set();
        return discussions.filter(discussion => {
            // Create a simple hash of the content
            const contentHash = discussion.content.substring(0, 100).toLowerCase().replace(/\s+/g, '');
            
            if (seen.has(contentHash)) {
                return false;
            }
            
            seen.add(contentHash);
            return true;
        });
    }
    
    rankDiscussions(discussions, brandConfig) {
        return discussions.map(discussion => {
            let relevanceScore = 0;
            const content = discussion.content.toLowerCase();
            
            // Brand keyword matches (high value)
            brandConfig.keywords.forEach(keyword => {
                if (content.includes(keyword.toLowerCase())) {
                    relevanceScore += 3;
                }
            });
            
            // Sentiment targets (medium value)
            brandConfig.sentimentTargets?.forEach(target => {
                if (content.includes(target.toLowerCase())) {
                    relevanceScore += 1;
                }
            });
            
            // Question format bonus
            if (discussion.metadata.question && discussion.metadata.question.length > 10) {
                relevanceScore += 2;
            }
            
            // Answer format bonus
            if (discussion.metadata.is_answer) {
                relevanceScore += 1;
            }
            
            // Content length bonus
            if (discussion.content.length > 200) {
                relevanceScore += 1;
            }
            
            // Engagement bonus
            if (discussion.engagement_score > 5) {
                relevanceScore += 1;
            }
            
            discussion.relevance_score = relevanceScore;
            return discussion;
        }).sort((a, b) => b.relevance_score - a.relevance_score);
    }
    
    async close() {
        try {
            if (this.page) {
                await this.page.close();
            }
            if (this.browser) {
                await this.browser.disconnect(); // Don't close, just disconnect
            }
            this.isConnected = false;
            console.log('🔗 Disconnected from Chrome (Chrome stays open)');
        } catch (error) {
            console.log('⚠️  Disconnect error:', error.message);
        }
    }
    
    async scrapeBrandSentiment(brandConfig) {
        console.log(`🤔 Scraping Quora sentiment for: ${brandConfig.name} (${brandConfig.category})`);
        
        try {
            // Verify we're still logged in
            const isLoggedIn = await this.verifyLogin();
            if (!isLoggedIn) {
                throw new Error('Not logged in to Quora');
            }
            
            // Search for discussions
            const discussions = await this.searchBrandDiscussions(brandConfig, 20);
            
            console.log(`\n📊 Quora scraping results for ${brandConfig.name}:`);
            console.log(`   Total discussions: ${discussions.length}`);
            
            if (discussions.length > 0) {
                const avgRelevance = discussions.reduce((sum, d) => sum + d.relevance_score, 0) / discussions.length;
                const hasQuestions = discussions.filter(d => d.metadata.question).length;
                const hasAnswers = discussions.filter(d => d.metadata.is_answer).length;
                
                console.log(`   Average relevance: ${avgRelevance.toFixed(1)}/10`);
                console.log(`   Questions found: ${hasQuestions}`);
                console.log(`   Answers found: ${hasAnswers}`);
                console.log(`   Total engagement: ${discussions.reduce((sum, d) => sum + d.engagement_score, 0)}`);
            }
            
            return discussions;
            
        } catch (error) {
            console.error('❌ Quora scraping error:', error.message);
            return [];
        }
    }
}

module.exports = QuoraChromeScraper;