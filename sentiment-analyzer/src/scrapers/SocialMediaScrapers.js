// src/scrapers/SocialMediaScrapers.js
const axios = require('axios');

class RedditScraper {
    constructor() {
        this.rateLimitDelay = 2000;
    }
    
    async scrapeBrandSentiment(brandConfig) {
        console.log(`Reddit: Searching for "${brandConfig.name}"...`);
        
        // Simplified Reddit scraping for now
        // You can replace this with the official API version later
        const mockData = [
            {
                id: `reddit_mock_1`,
                platform: 'reddit',
                content: `Just finished reading ${brandConfig.name} and it's incredible! The art style is amazing.`,
                author: 'reddit_user1',
                created_at: new Date(Date.now() - 86400000).toISOString(),
                engagement_score: 25,
                url: 'https://reddit.com/mock/1',
                subreddit: 'webtoons',
                upvotes: 20,
                downvotes: 2,
                comments_count: 5,
                type: 'post'
            },
            {
                id: `reddit_mock_2`,
                platform: 'reddit',
                content: `${brandConfig.name} latest episode was so suspenseful! Can't wait for next week.`,
                author: 'reddit_user2',
                created_at: new Date(Date.now() - 172800000).toISOString(),
                engagement_score: 15,
                url: 'https://reddit.com/mock/2',
                subreddit: 'webtoons',
                upvotes: 12,
                downvotes: 1,
                comments_count: 3,
                type: 'post'
            }
        ];
        
        console.log(`Reddit: Generated ${mockData.length} mock posts for testing`);
        return mockData;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class TwitterScraper {
    constructor() {
        this.rateLimitDelay = 3000;
    }
    
    async scrapeBrandSentiment(brandConfig) {
        console.log(`Twitter: Searching for "${brandConfig.name}"...`);
        
        // Check if we have Twitter API credentials
        if (process.env.TWITTER_BEARER_TOKEN) {
            console.log('Twitter API token found - using API method');
            return await this.scrapeWithTwitterAPI(brandConfig);
        } else {
            console.log('No Twitter API token - using mock data');
            return await this.generateMockTwitterData(brandConfig);
        }
    }
    
    async scrapeWithTwitterAPI(brandConfig) {
        try {
            const query = `"${brandConfig.name}" OR "${brandConfig.keywords[0]}" -is:retweet lang:en`;
            
            const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
                headers: {
                    'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    query: query,
                    max_results: 50,
                    'tweet.fields': 'created_at,public_metrics,author_id',
                    'expansions': 'author_id',
                    'user.fields': 'username,name'
                }
            });
            
            const tweets = [];
            if (response.data?.data) {
                const users = {};
                if (response.data.includes?.users) {
                    response.data.includes.users.forEach(user => {
                        users[user.id] = user.username;
                    });
                }
                
                response.data.data.forEach(tweet => {
                    const metrics = tweet.public_metrics || {};
                    tweets.push({
                        id: `twitter_${tweet.id}`,
                        platform: 'twitter',
                        content: tweet.text,
                        author: users[tweet.author_id] || 'unknown',
                        created_at: tweet.created_at,
                        engagement_score: (metrics.like_count || 0) + (metrics.retweet_count || 0) + (metrics.reply_count || 0),
                        url: `https://twitter.com/i/status/${tweet.id}`,
                        likes: metrics.like_count || 0,
                        retweets: metrics.retweet_count || 0,
                        replies: metrics.reply_count || 0,
                        type: 'tweet'
                    });
                });
            }
            
            console.log(`Twitter API: Found ${tweets.length} tweets`);
            return tweets;
            
        } catch (error) {
            console.error('Twitter API error:', error.message);
            console.log('Falling back to mock data...');
            return await this.generateMockTwitterData(brandConfig);
        }
    }
    
    async generateMockTwitterData(brandConfig) {
        const mockTweets = [
            {
                id: `twitter_mock_1`,
                platform: 'twitter',
                content: `Just caught up with ${brandConfig.name} and WOW! The plot twists are insane 🤯 #webtoon`,
                author: 'twitter_user1',
                created_at: new Date(Date.now() - 86400000).toISOString(),
                engagement_score: 18,
                url: 'https://twitter.com/mock/status/1',
                likes: 12,
                retweets: 4,
                replies: 2,
                type: 'tweet'
            },
            {
                id: `twitter_mock_2`,
                platform: 'twitter',
                content: `Reading ${brandConfig.name} before bed was a mistake... now I can't sleep!`,
                author: 'twitter_user2',
                created_at: new Date(Date.now() - 172800000).toISOString(),
                engagement_score: 8,
                url: 'https://twitter.com/mock/status/2',
                likes: 6,
                retweets: 1,
                replies: 1,
                type: 'tweet'
            },
            {
                id: `twitter_mock_3`,
                platform: 'twitter',
                content: `Anyone else think ${brandConfig.name} has been getting better each episode? The character development is great`,
                author: 'twitter_user3',
                created_at: new Date(Date.now() - 259200000).toISOString(),
                engagement_score: 12,
                url: 'https://twitter.com/mock/status/3',
                likes: 8,
                retweets: 2,
                replies: 2,
                type: 'tweet'
            }
        ];
        
        console.log(`Twitter: Generated ${mockTweets.length} mock tweets for testing`);
        return mockTweets;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = { RedditScraper, TwitterScraper };



