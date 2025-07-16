// RedditAPIScraper.js 
const axios = require('axios');

class RedditAPIScraper {
    constructor() {
        this.baseUrl = 'https://oauth.reddit.com';
        this.authUrl = 'https://www.reddit.com/api/v1/access_token';
        this.accessToken = null;
        this.tokenExpiry = null;
        this.userAgent = 'SentimentAnalyzer/1.0 by YourUsername';
        this.rateLimitDelay = 1000; // Reddit allows 60 requests per minute
    }
    
    async initialize() {
        console.log('🔑 Authenticating with Reddit API...');
        
        try {
            await this.authenticate();
            console.log('✅ Reddit API authentication successful');
            return true;
        } catch (error) {
            console.error('❌ Reddit API authentication failed:', error.message);
            return false;
        }
    }
    
    async authenticate() {
        const auth = Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64');
        
        const response = await axios.post(this.authUrl, 
            'grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.userAgent
                }
            }
        );
        
        this.accessToken = response.data.access_token;
        this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
    }
    
    async ensureValidToken() {
        if (!this.accessToken || Date.now() >= this.tokenExpiry - 60000) {
            await this.authenticate();
        }
    }
    
    async scrapeBrandSentiment(brandConfig) {
        console.log(`🔍 Reddit API: Searching for "${brandConfig.name}"...`);
        
        await this.ensureValidToken();
        
        const allPosts = [];
        
        try {
            // 1. Search across all of Reddit
            const searchResults = await this.searchReddit(brandConfig);
            allPosts.push(...searchResults);
            
            // 2. Search in relevant subreddits
            const subredditResults = await this.searchRelevantSubreddits(brandConfig);
            allPosts.push(...subredditResults);
            
            // 3. Get detailed comments for high-engagement posts
            const postsWithComments = await this.enrichWithComments(allPosts);
            
            // Remove duplicates and filter relevant content
            const uniquePosts = this.removeDuplicates(postsWithComments);
            const relevantPosts = this.filterRelevantPosts(uniquePosts, brandConfig);
            
            console.log(`✅ Reddit API: Found ${relevantPosts.length} relevant posts/comments`);
            return relevantPosts;
            
        } catch (error) {
            console.error('❌ Reddit API scraping failed:', error.message);
            return [];
        }
    }
    
    async searchReddit(brandConfig) {
        const posts = [];
        const searchQueries = [
            brandConfig.name,
            ...brandConfig.keywords.slice(0, 3) // Limit to avoid too many API calls
        ];
        
        for (const query of searchQueries) {
            try {
                await this.delay(this.rateLimitDelay);
                
                const response = await axios.get(`${this.baseUrl}/search`, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'User-Agent': this.userAgent
                    },
                    params: {
                        q: query,
                        sort: 'relevance',
                        limit: 25,
                        type: 'link',
                        t: 'month' // Posts from last month
                    }
                });
                
                if (response.data?.data?.children) {
                    for (const child of response.data.data.children) {
                        const post = child.data;
                        posts.push(this.formatPostData(post));
                    }
                }
                
            } catch (error) {
                console.error(`❌ Search error for "${query}":`, error.message);
            }
        }
        
        return posts;
    }
    
    async searchRelevantSubreddits(brandConfig) {
        const posts = [];
        const relevantSubreddits = this.getRelevantSubreddits(brandConfig.category);
        
        for (const subreddit of relevantSubreddits.slice(0, 5)) { // Limit subreddits
            try {
                await this.delay(this.rateLimitDelay);
                
                // Search within specific subreddit
                const response = await axios.get(`${this.baseUrl}/r/${subreddit}/search`, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'User-Agent': this.userAgent
                    },
                    params: {
                        q: brandConfig.name,
                        restrict_sr: true,
                        sort: 'relevance',
                        limit: 15,
                        t: 'month'
                    }
                });
                
                if (response.data?.data?.children) {
                    for (const child of response.data.data.children) {
                        const post = child.data;
                        posts.push(this.formatPostData(post));
                    }
                }
                
            } catch (error) {
                console.error(`❌ Subreddit search error for r/${subreddit}:`, error.message);
            }
        }
        
        return posts;
    }
    
    async enrichWithComments(posts) {
        const enrichedPosts = [...posts];
        
        // Get comments for high-engagement posts
        const highEngagementPosts = posts
            .filter(post => post.engagement_score > 20)
            .slice(0, 10); // Limit to avoid API quota issues
        
        for (const post of highEngagementPosts) {
            try {
                await this.delay(this.rateLimitDelay);
                
                const comments = await this.getPostComments(post.subreddit, post.reddit_id);
                enrichedPosts.push(...comments);
                
            } catch (error) {
                console.error(`❌ Comments error for post ${post.reddit_id}:`, error.message);
            }
        }
        
        return enrichedPosts;
    }
    
    async getPostComments(subreddit, postId) {
        const comments = [];
        
        try {
            const response = await axios.get(`${this.baseUrl}/r/${subreddit}/comments/${postId}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'User-Agent': this.userAgent
                },
                params: {
                    limit: 20,
                    depth: 2, // Get replies to top-level comments
                    sort: 'top'
                }
            });
            
            if (response.data && response.data.length > 1) {
                const commentsData = response.data[1].data.children;
                
                for (const commentChild of commentsData) {
                    const comment = commentChild.data;
                    
                    if (comment.body && comment.body !== '[deleted]' && comment.body !== '[removed]') {
                        comments.push(this.formatCommentData(comment, subreddit));
                        
                        // Get replies if they exist
                        if (comment.replies && comment.replies.data && comment.replies.data.children) {
                            for (const replyChild of comment.replies.data.children.slice(0, 5)) {
                                const reply = replyChild.data;
                                if (reply.body && reply.body !== '[deleted]' && reply.body !== '[removed]') {
                                    comments.push(this.formatCommentData(reply, subreddit, comment.id));
                                }
                            }
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error(`❌ Comment fetch error:`, error.message);
        }
        
        return comments;
    }
    
    formatPostData(post) {
        return {
            id: `reddit_post_${post.id}`,
            reddit_id: post.id,
            platform: 'reddit',
            content: `${post.title} ${post.selftext || ''}`.trim(),
            author: post.author,
            created_at: new Date(post.created_utc * 1000).toISOString(),
            engagement_score: post.score + post.num_comments,
            url: `https://reddit.com${post.permalink}`,
            subreddit: post.subreddit,
            upvotes: post.ups,
            downvotes: post.downs || 0,
            comments_count: post.num_comments,
            awards: post.total_awards_received || 0,
            type: 'post',
            is_nsfw: post.over_18 || false,
            post_flair: post.link_flair_text || null
        };
    }
    
    formatCommentData(comment, subreddit, parentId = null) {
        return {
            id: `reddit_comment_${comment.id}`,
            reddit_id: comment.id,
            platform: 'reddit',
            content: comment.body,
            author: comment.author,
            created_at: new Date(comment.created_utc * 1000).toISOString(),
            engagement_score: comment.score,
            url: `https://reddit.com/r/${subreddit}/comments/${comment.link_id?.replace('t3_', '')}/_/${comment.id}`,
            subreddit: subreddit,
            upvotes: comment.ups,
            downvotes: comment.downs || 0,
            type: 'comment',
            parent_id: parentId,
            is_submitter: comment.is_submitter || false,
            awards: comment.total_awards_received || 0
        };
    }
    
    getRelevantSubreddits(category) {
        const subredditMap = {
            'entertainment': [
                'television', 'movies', 'entertainment', 'PopCultureChat', 
                'discuss', 'serialpodcast', 'netflix', 'streaming'
            ],
            'gaming': [
                'gaming', 'Games', 'gamedev', 'truegaming', 'pcgaming', 
                'NintendoSwitch', 'PS4', 'xboxone', 'gaming4gamers'
            ],
            'technology': [
                'technology', 'tech', 'gadgets', 'apple', 'android', 
                'programming', 'startups', 'artificial'
            ],
            'webtoon': [
                'webtoons', 'manhwa', 'manga', 'comic', 'comics', 
                'webcomics', 'naver', 'WEBTOON'
            ]
        };
        
        return subredditMap[category] || ['all', 'popular'];
    }
    
    filterRelevantPosts(posts, brandConfig) {
        return posts.filter(post => {
            const content = post.content.toLowerCase();
            const brandName = brandConfig.name.toLowerCase();
            
            // Check if post mentions brand name or keywords
            const mentionsBrand = content.includes(brandName);
            const mentionsKeywords = brandConfig.keywords.some(keyword => 
                content.includes(keyword.toLowerCase())
            );
            
            // Filter out very short comments (less than 10 characters)
            const hasSubstance = content.length >= 10;
            
            return (mentionsBrand || mentionsKeywords) && hasSubstance;
        });
    }
    
    removeDuplicates(posts) {
        const seen = new Set();
        return posts.filter(post => {
            const key = post.reddit_id || post.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}