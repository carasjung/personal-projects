// TwitterAPIScraper.js - Using official Twitter API v2
class TwitterAPIScraper {
    constructor() {
        this.baseUrl = 'https://api.twitter.com/2';
        this.rateLimitDelay = 1000; // Twitter API v2 rate limits
        this.maxResults = 100; // Maximum per request
    }
    
    async scrapeBrandSentiment(brandConfig) {
        console.log(`🐦 Twitter API: Searching for "${brandConfig.name}"...`);
        
        if (!process.env.TWITTER_BEARER_TOKEN) {
            console.error('❌ Twitter Bearer Token not found in environment variables');
            return [];
        }
        
        const allTweets = [];
        
        try {
            // 1. Recent search for brand mentions
            const recentTweets = await this.searchRecentTweets(brandConfig);
            allTweets.push(...recentTweets);
            
            // 2. Search for specific keywords
            const keywordTweets = await this.searchKeywordTweets(brandConfig);
            allTweets.push(...keywordTweets);
            
            // 3. Get conversation context for high-engagement tweets
            const enrichedTweets = await this.enrichWithConversations(allTweets);
            
            // Remove duplicates and filter relevant content
            const uniqueTweets = this.removeDuplicates(enrichedTweets);
            const relevantTweets = this.filterRelevantTweets(uniqueTweets, brandConfig);
            
            console.log(`✅ Twitter API: Found ${relevantTweets.length} relevant tweets`);
            return relevantTweets;
            
        } catch (error) {
            console.error('❌ Twitter API scraping failed:', error.message);
            return [];
        }
    }
    
    async searchRecentTweets(brandConfig) {
        const tweets = [];
        
        // Construct search query
        const query = this.buildSearchQuery(brandConfig);
        
        try {
            await this.delay(this.rateLimitDelay);
            
            const response = await axios.get(`${this.baseUrl}/tweets/search/recent`, {
                headers: {
                    'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    query: query,
                    max_results: this.maxResults,
                    'tweet.fields': 'created_at,public_metrics,author_id,context_annotations,conversation_id,referenced_tweets',
                    'expansions': 'author_id,referenced_tweets.id',
                    'user.fields': 'username,name,verified,public_metrics'
                }
            });
            
            if (response.data?.data) {
                const users = this.createUserMap(response.data.includes?.users || []);
                const referencedTweets = this.createTweetMap(response.data.includes?.tweets || []);
                
                response.data.data.forEach(tweet => {
                    tweets.push(this.formatTweetData(tweet, users, referencedTweets));
                });
            }
            
        } catch (error) {
            if (error.response?.status === 429) {
                console.log('⚠️  Twitter API rate limit hit, waiting...');
                await this.delay(15 * 60 * 1000); // Wait 15 minutes
            }
            throw error;
        }
        
        return tweets;
    }
    
    async searchKeywordTweets(brandConfig) {
        const tweets = [];
        
        // Search for each keyword separately to get more comprehensive results
        for (const keyword of brandConfig.keywords.slice(0, 3)) {
            try {
                await this.delay(this.rateLimitDelay);
                
                const response = await axios.get(`${this.baseUrl}/tweets/search/recent`, {
                    headers: {
                        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    params: {
                        query: `"${keyword}" -is:retweet lang:en`,
                        max_results: 50,
                        'tweet.fields': 'created_at,public_metrics,author_id,context_annotations',
                        'expansions': 'author_id',
                        'user.fields': 'username,name,verified'
                    }
                });
                
                if (response.data?.data) {
                    const users = this.createUserMap(response.data.includes?.users || []);
                    
                    response.data.data.forEach(tweet => {
                        tweets.push(this.formatTweetData(tweet, users));
                    });
                }
                
            } catch (error) {
                console.error(`❌ Keyword search error for "${keyword}":`, error.message);
            }
        }
        
        return tweets;
    }
    
    async enrichWithConversations(tweets) {
        const enrichedTweets = [...tweets];
        
        // Get replies for high-engagement tweets
        const highEngagementTweets = tweets
            .filter(tweet => tweet.engagement_score > 10)
            .slice(0, 5); // Limit to avoid rate limits
        
        for (const tweet of highEngagementTweets) {
            try {
                await this.delay(this.rateLimitDelay);
                
                const replies = await this.getTweetReplies(tweet.conversation_id);
                enrichedTweets.push(...replies);
                
            } catch (error) {
                console.error(`❌ Conversation error for tweet ${tweet.twitter_id}:`, error.message);
            }
        }
        
        return enrichedTweets;
    }
    
    async getTweetReplies(conversationId) {
        const replies = [];
        
        try {
            const response = await axios.get(`${this.baseUrl}/tweets/search/recent`, {
                headers: {
                    'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    query: `conversation_id:${conversationId} -is:retweet`,
                    max_results: 20,
                    'tweet.fields': 'created_at,public_metrics,author_id,in_reply_to_user_id',
                    'expansions': 'author_id',
                    'user.fields': 'username,name'
                }
            });
            
            if (response.data?.data) {
                const users = this.createUserMap(response.data.includes?.users || []);
                
                response.data.data.forEach(tweet => {
                    replies.push(this.formatTweetData(tweet, users, null, 'reply'));
                });
            }
            
        } catch (error) {
            console.error(`❌ Replies fetch error:`, error.message);
        }
        
        return replies;
    }
    
    buildSearchQuery(brandConfig) {
        // Build a comprehensive search query
        const brandQuery = `"${brandConfig.name}"`;
        const keywordQueries = brandConfig.keywords.slice(0, 2).map(k => `"${k}"`);
        
        const query = [brandQuery, ...keywordQueries].join(' OR ');
        
        // Add filters
        return `(${query}) -is:retweet lang:en`;
    }
    
    formatTweetData(tweet, users = {}, referencedTweets = {}, type = 'tweet') {
        const user = users[tweet.author_id] || {};
        const metrics = tweet.public_metrics || {};
        
        return {
            id: `twitter_${tweet.id}`,
            twitter_id: tweet.id,
            platform: 'twitter',
            content: tweet.text,
            author: user.username || 'unknown',
            author_name: user.name || 'Unknown User',
            author_verified: user.verified || false,
            created_at: tweet.created_at,
            engagement_score: (metrics.like_count || 0) + 
                           (metrics.retweet_count || 0) + 
                           (metrics.reply_count || 0) + 
                           (metrics.quote_count || 0),
            url: `https://twitter.com/${user.username}/status/${tweet.id}`,
            likes: metrics.like_count || 0,
            retweets: metrics.retweet_count || 0,
            replies: metrics.reply_count || 0,
            quotes: metrics.quote_count || 0,
            type: type,
            conversation_id: tweet.conversation_id,
            context_annotations: tweet.context_annotations || [],
            referenced_tweets: tweet.referenced_tweets || [],
            in_reply_to_user_id: tweet.in_reply_to_user_id
        };
    }
    
    createUserMap(users) {
        const userMap = {};
        users.forEach(user => {
            userMap[user.id] = user;
        });
        return userMap;
    }
    
    createTweetMap(tweets) {
        const tweetMap = {};
        tweets.forEach(tweet => {
            tweetMap[tweet.id] = tweet;
        });
        return tweetMap;
    }
    
    filterRelevantTweets(tweets, brandConfig) {
        return tweets.filter(tweet => {
            const content = tweet.content.toLowerCase();
            const brandName = brandConfig.name.toLowerCase();
            
            // Check if tweet mentions brand name or keywords
            const mentionsBrand = content.includes(brandName);
            const mentionsKeywords = brandConfig.keywords.some(keyword => 
                content.includes(keyword.toLowerCase())
            );
            
            // Filter out very short tweets or spam-like content
            const hasSubstance = content.length >= 20;
            const notSpam = !content.includes('follow for follow') && 
                           !content.includes('check out my');
            
            return (mentionsBrand || mentionsKeywords) && hasSubstance && notSpam;
        });
    }
    
    removeDuplicates(tweets) {
        const seen = new Set();
        return tweets.filter(tweet => {
            const key = tweet.twitter_id || tweet.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = { RedditAPIScraper, TwitterAPIScraper };