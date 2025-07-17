// Enhanced Platform Summary Generator with User Quotes
class DetailedPlatformSummaryGenerator {
    constructor() {
        this.maxQuotesPerSummary = 3;
        this.maxQuoteLength = 120;
    }
    
    async generateDetailedPlatformSummaries(data, sentimentData, brandConfig) {
        console.log('Generating detailed platform summaries with user quotes...');
        
        const summaries = {};
        
        for (const [platform, mentions] of Object.entries(data)) {
            if (mentions.length === 0) continue;
            
            console.log(`Creating detailed summary for ${platform}...`);
            
            // Get platform sentiment data
            const platformSentiment = sentimentData[platform];
            const overallSentiment = platformSentiment?.aggregated_sentiment?.label || 'neutral';
            
            // Select diverse and impactful quotes
            const selectedQuotes = this.selectImpactfulQuotes(mentions, platformSentiment);
            
            // Analyze content themes and topics
            const contentAnalysis = this.analyzeContentThemes(mentions);
            
            // Generate detailed summary with quotes
            const detailedSummary = this.generateDetailedSummary(
                platform, 
                mentions, 
                overallSentiment, 
                selectedQuotes, 
                contentAnalysis, 
                brandConfig
            );
            
            summaries[platform] = {
                platform: platform,
                overall_sentiment: overallSentiment,
                total_mentions: mentions.length,
                summary: detailedSummary,
                user_quotes: selectedQuotes,
                content_themes: contentAnalysis.themes,
                key_topics: contentAnalysis.topics,
                sentiment_distribution: this.calculateSentimentDistribution(platformSentiment?.sentiments || []),
                engagement_stats: this.calculateEngagementStats(mentions),
                temporal_analysis: this.analyzeTemporalPatterns(mentions)
            };
        }
        
        return summaries;
    }
    
    selectImpactfulQuotes(mentions, platformSentiment) {
        const quotes = [];
        
        // Get high-engagement quotes
        const highEngagement = mentions
            .filter(m => (m.engagement_score || 0) > 5)
            .sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0))
            .slice(0, 2);
        
        // Get representative sentiment quotes
        const sentiments = platformSentiment?.sentiments || [];
        const positiveQuotes = sentiments
            .filter(s => s.sentiment === 'positive' && s.confidence > 0.7)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 1);
        
        const negativeQuotes = sentiments
            .filter(s => s.sentiment === 'negative' && s.confidence > 0.7)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 1);
        
        // Get recent quotes
        const recentQuotes = mentions
            .filter(m => m.created_at)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 1);
        
        // Combine and format quotes
        const allCandidates = [
            ...highEngagement.map(m => ({
                text: this.formatQuote(m.content),
                author: m.author || 'Anonymous',
                engagement: m.engagement_score || 0,
                type: 'high_engagement',
                platform_data: this.getPlatformSpecificData(m)
            })),
            ...positiveQuotes.map(s => {
                const mention = mentions.find(m => m.id === s.mention_id);
                return {
                    text: this.formatQuote(s.text || mention?.content),
                    author: mention?.author || 'Anonymous',
                    sentiment: 'positive',
                    confidence: s.confidence,
                    type: 'positive_sentiment',
                    platform_data: this.getPlatformSpecificData(mention)
                };
            }),
            ...negativeQuotes.map(s => {
                const mention = mentions.find(m => m.id === s.mention_id);
                return {
                    text: this.formatQuote(s.text || mention?.content),
                    author: mention?.author || 'Anonymous',
                    sentiment: 'negative',
                    confidence: s.confidence,
                    type: 'negative_sentiment',
                    platform_data: this.getPlatformSpecificData(mention)
                };
            }),
            ...recentQuotes.map(m => ({
                text: this.formatQuote(m.content),
                author: m.author || 'Anonymous',
                created_at: m.created_at,
                type: 'recent',
                platform_data: this.getPlatformSpecificData(m)
            }))
        ];
        
        // Remove duplicates and select best quotes
        const uniqueQuotes = this.removeDuplicateQuotes(allCandidates);
        return uniqueQuotes.slice(0, this.maxQuotesPerSummary);
    }
    
    formatQuote(text) {
        if (!text) return '';
        
        // Clean and shorten the quote
        let quote = text
            .replace(/https?:\/\/\S+/g, '') // Remove URLs
            .replace(/@\w+/g, '') // Remove mentions
            .replace(/[^\w\s.,!?'"()-]/g, ' ') // Remove special chars
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        
        // Truncate if too long
        if (quote.length > this.maxQuoteLength) {
            quote = quote.substring(0, this.maxQuoteLength - 3) + '...';
        }
        
        return quote;
    }
    
    getPlatformSpecificData(mention) {
        if (!mention) return {};
        
        const platformData = {};
        
        if (mention.platform === 'youtube') {
            platformData.likes = mention.metadata?.likes || mention.engagement_score;
            platformData.video_title = mention.metadata?.video_title;
        } else if (mention.platform === 'twitter') {
            platformData.likes = mention.likes;
            platformData.retweets = mention.retweets;
            platformData.replies = mention.replies;
        } else if (mention.platform === 'reddit') {
            platformData.upvotes = mention.upvotes;
            platformData.downvotes = mention.downvotes;
            platformData.subreddit = mention.subreddit;
        } else if (mention.platform === 'quora') {
            platformData.upvotes = mention.upvotes;
            platformData.views = mention.views;
            platformData.type = mention.type; // question or answer
        }
        
        return platformData;
    }
    
    removeDuplicateQuotes(quotes) {
        const seen = new Set();
        return quotes.filter(quote => {
            const normalized = quote.text.toLowerCase().replace(/[^\w]/g, '');
            if (seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });
    }
    
    analyzeContentThemes(mentions) {
        const allText = mentions.map(m => m.content.toLowerCase()).join(' ');
        
        // Generic content themes that work for any brand/category
        const contentThemes = {
            'quality': this.countMentions(allText, ['amazing', 'awesome', 'incredible', 'excellent', 'perfect', 'love', 'best', 'great', 'fantastic', 'wonderful']),
            'negative_quality': this.countMentions(allText, ['bad', 'terrible', 'boring', 'disappointing', 'worst', 'hate', 'awful', 'horrible', 'disgusting']),
            'service': this.countMentions(allText, ['service', 'customer', 'support', 'help', 'assistance', 'care']),
            'product': this.countMentions(allText, ['product', 'item', 'goods', 'merchandise', 'stuff', 'thing']),
            'price': this.countMentions(allText, ['price', 'cost', 'expensive', 'cheap', 'affordable', 'value', 'money', 'worth']),
            'experience': this.countMentions(allText, ['experience', 'feel', 'felt', 'tried', 'used', 'bought', 'boughted']),
            'recommendation': this.countMentions(allText, ['recommend', 'suggest', 'advise', 'should', 'would', 'will']),
            'comparison': this.countMentions(allText, ['better', 'worse', 'compared', 'versus', 'instead', 'than']),
            'innovation': this.countMentions(allText, ['new', 'innovative', 'creative', 'unique', 'different', 'original']),
            'reliability': this.countMentions(allText, ['reliable', 'trustworthy', 'able', 'consistent', 'stable']),
            'convenience': this.countMentions(allText, ['convenient', 'easy', 'simple', 'quick', 'fast', 'slow', 'difficult'])
        };
        
        // Quality themes
        const qualityThemes = {
            'positive_quality': this.countMentions(allText, ['amazing', 'awesome', 'incredible', 'excellent', 'perfect', 'love', 'best', 'great', 'fantastic', 'wonderful']),
            'negative_quality': this.countMentions(allText, ['bad', 'terrible', 'boring', 'disappointing', 'worst', 'hate', 'awful', 'horrible', 'disgusting']),
            'confusion': this.countMentions(allText, ['confused', 'confusing', 'unclear', "don't understand", 'complicated', 'complex']),
            'anticipation': this.countMentions(allText, ['waiting', 'next', 'upcoming', 'can\'t wait', 'soon', 'future', 'later'])
        };
        
        // Extract top themes
        const allThemes = { ...contentThemes, ...qualityThemes };
        const topThemes = Object.entries(allThemes)
            .filter(([theme, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([theme, count]) => ({ theme, mentions: count }));
        
        // Extract key topics (important words)
        const topics = this.extractKeyTopics(mentions);
        
        return {
            themes: topThemes,
            topics: topics,
            // Remove character_focus as it's specific to entertainment content
            content_focus: Object.entries(contentThemes)
                .filter(([theme, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([theme]) => theme)
        };
    }
    
    countMentions(text, keywords) {
        return keywords.reduce((count, keyword) => {
            const regex = new RegExp(keyword, 'gi');
            const matches = text.match(regex);
            return count + (matches ? matches.length : 0);
        }, 0);
    }
    
    extractKeyTopics(mentions) {
        const allText = mentions.map(m => m.content).join(' ').toLowerCase();
        const words = allText.split(/\s+/);
        const wordCount = {};
        
        // Generic important terms that work for any brand/category
        const genericImportantTerms = [
            'quality', 'service', 'product', 'price', 'value', 'experience',
            'recommend', 'suggest', 'better', 'worse', 'bad',
            'love', 'hate', 'amazing', 'terrible', 'excellent', 'poor',
            'customer', 'support', 'help', 'buy', 'purchase', 'try',
            'new', 'old', 'best', 'worst', 'great', 'awful'
        ];
        
        words.forEach(word => {
            const cleanWord = word.replace(/[^\w]/g, '');
            if (cleanWord.length > 3 && !this.isStopWord(cleanWord)) {
                wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
            }
        });
        
        // Boost generic important terms
        genericImportantTerms.forEach(term => {
            if (wordCount[term]) {
                wordCount[term] *= 2; // Reduced boost since these are more generic
            }
        });
        
        return Object.entries(wordCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([word, count]) => ({ word, count }));
    }
    
    generateDetailedSummary(platform, mentions, overallSentiment, quotes, contentAnalysis, brandConfig) {
        let summary = `Analysis of ${mentions.length} ${platform} mentions reveals ${overallSentiment} sentiment toward ${brandConfig.name}. `;
        
        // Add engagement context
        const avgEngagement = mentions.reduce((sum, m) => sum + (m.engagement_score || 0), 0) / mentions.length;
        if (avgEngagement > 10) {
            summary += `The content shows high engagement with an average of ${Math.round(avgEngagement)} interactions per post. `;
        }
        
        // Add theme insights
        if (contentAnalysis.themes.length > 0) {
            const topTheme = contentAnalysis.themes[0];
            summary += `The primary discussion theme is ${topTheme.theme.replace(/_/g, ' ')} (${topTheme.mentions} mentions). `;
        }
        
        // Add content focus for any brand/category
        if (contentAnalysis.content_focus && contentAnalysis.content_focus.length > 0) {
            summary += `Key discussion areas include ${contentAnalysis.content_focus.join(', ')}. `;
        }
        
        // Add quote-based insights
        if (quotes.length > 0) {
            const positiveQuotes = quotes.filter(q => q.sentiment === 'positive');
            const negativeQuotes = quotes.filter(q => q.sentiment === 'negative');
            
            if (positiveQuotes.length > 0) {
                summary += `Users express appreciation with comments like: "${positiveQuotes[0].text}" `;
            }
            
            if (negativeQuotes.length > 0) {
                summary += `Some concerns include: "${negativeQuotes[0].text}" `;
            }
            
            // Add high-engagement quote if different
            const highEngagementQuote = quotes.find(q => q.type === 'high_engagement' && !q.sentiment);
            if (highEngagementQuote) {
                summary += `A highly engaged comment states: "${highEngagementQuote.text}" `;
            }
        }
        
        // Add platform-specific context
        summary += this.getPlatformSpecificContext(platform, mentions, quotes);
        
        return summary.trim();
    }
    
    getPlatformSpecificContext(platform, mentions, quotes) {
        switch (platform) {
            case 'youtube':
                const avgLikes = mentions.reduce((sum, m) => sum + (m.engagement_score || 0), 0) / mentions.length;
                return `YouTube viewers are actively engaging with an average of ${Math.round(avgLikes)} likes per comment, indicating strong audience investment.`;
                
            case 'twitter':
                const hasRetweets = mentions.some(m => (m.retweets || 0) > 5);
                return hasRetweets ? 
                    'Twitter discussions show viral potential with significant retweet activity.' :
                    'Twitter conversations remain focused with moderate but consistent engagement.';
                    
            case 'reddit':
                const subreddits = [...new Set(mentions.map(m => m.subreddit).filter(s => s))];
                return subreddits.length > 1 ? 
                    `Reddit discussions span multiple communities including r/${subreddits.slice(0, 2).join(', r/')}.` :
                    `Reddit activity is concentrated in r/${subreddits[0] || 'webtoons'} with active community participation.`;
                    
            case 'quora':
                const questions = mentions.filter(m => m.type === 'question').length;
                const answers = mentions.filter(m => m.type === 'answer').length;
                return `Quora shows ${questions} questions and ${answers} answers, indicating both curiosity and knowledge sharing about the topic.`;
                
            default:
                return 'Community engagement shows consistent interest and active participation.';
        }
    }
    
    calculateSentimentDistribution(sentiments) {
        if (sentiments.length === 0) return { positive: 0, negative: 0, neutral: 1 };
        
        const counts = { positive: 0, negative: 0, neutral: 0 };
        sentiments.forEach(s => counts[s.sentiment]++);
        
        const total = sentiments.length;
        return {
            positive: Math.round((counts.positive / total) * 100) / 100,
            negative: Math.round((counts.negative / total) * 100) / 100,
            neutral: Math.round((counts.neutral / total) * 100) / 100
        };
    }
    
    calculateEngagementStats(mentions) {
        const engagements = mentions.map(m => m.engagement_score || 0);
        const total = engagements.reduce((sum, e) => sum + e, 0);
        const avg = mentions.length > 0 ? total / mentions.length : 0;
        const max = Math.max(...engagements, 0);
        
        return {
            total_engagement: total,
            average_engagement: Math.round(avg * 10) / 10,
            max_engagement: max,
            highly_engaged_posts: engagements.filter(e => e > avg * 2).length
        };
    }
    
    analyzeTemporalPatterns(mentions) {
        const datedMentions = mentions.filter(m => m.created_at);
        if (datedMentions.length === 0) return { pattern: 'no_data' };
        
        // Group by day
        const dailyCounts = {};
        datedMentions.forEach(m => {
            const date = new Date(m.created_at).toDateString();
            dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        });
        
        const days = Object.keys(dailyCounts).length;
        const avgPerDay = datedMentions.length / Math.max(days, 1);
        
        // Detect patterns
        let pattern = 'steady';
        if (avgPerDay > 10) pattern = 'high_activity';
        else if (avgPerDay < 2) pattern = 'low_activity';
        
        // Check for recent surge
        const recent = datedMentions.filter(m => 
            (Date.now() - new Date(m.created_at)) < 86400000 * 2 // Last 2 days
        );
        
        if (recent.length > datedMentions.length * 0.5) {
            pattern = 'recent_surge';
        }
        
        return {
            pattern: pattern,
            total_days: days,
            average_per_day: Math.round(avgPerDay * 10) / 10,
            recent_activity: recent.length,
            peak_day: Object.entries(dailyCounts)
                .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'
        };
    }
    
    isStopWord(word) {
        const stopWords = [
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one',
            'our', 'had', 'words', 'what', 'some', 'time', 'very', 'when', 'come', 'may', 'say',
            'each', 'she', 'which', 'their', 'would', 'there', 'could', 'other', 'this', 'that',
            'with', 'have', 'from', 'they', 'been', 'will', 'into', 'just', 'like', 'really'
        ];
        return stopWords.includes(word.toLowerCase());
    }
}

module.exports = DetailedPlatformSummaryGenerator;