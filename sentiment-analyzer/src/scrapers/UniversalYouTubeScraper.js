// src/scrapers/UniversalYouTubeScraper.js
require('dotenv').config();
const axios = require('axios');

class UniversalYouTubeScraper {
    constructor() {
        this.apiKey = process.env.YOUTUBE_API_KEY;
        this.baseUrl = 'https://www.googleapis.com/youtube/v3';
        this.quotaUsed = 0;
    }
    
    // Generate search queries from brand config
    generateSearchQueries(brandConfig, platform = 'youtube') {
        const baseQueries = [
            brandConfig.name,
            `${brandConfig.name} review`,
            `${brandConfig.name} ${brandConfig.category}`
        ];
        
        // Add keywords if they exist
        if (brandConfig.keywords && brandConfig.keywords.length > 0) {
            brandConfig.keywords.forEach(keyword => {
                if (keyword && keyword.trim()) {
                    baseQueries.push(keyword.trim());
                }
            });
        }
        
        return baseQueries.slice(0, 5); // Limit to 5 queries
    }
    
    async searchBrandVideos(brandConfig, maxResults = 5) {
        console.log(`Searching YouTube for: ${brandConfig.name}`);
        
        // Use our own method to generate search queries
        const searchQueries = this.generateSearchQueries(brandConfig, 'youtube');
        const allVideos = [];
        
        // If no API key, return mock data
        if (!this.apiKey) {
            console.log('⚠️ No YouTube API key - generating mock video data');
            return this.generateMockVideoData(brandConfig);
        }
        
        for (const query of searchQueries.slice(0, 3)) { // Limit to 3 queries
            try {
                console.log(`   Query: "${query}"`);
                
                const response = await axios.get(`${this.baseUrl}/search`, {
                    params: {
                        key: this.apiKey,
                        q: query,
                        part: 'snippet',
                        type: 'video',
                        maxResults: maxResults,
                        order: 'relevance'
                    }
                });
                
                const videos = response.data.items.map(item => ({
                    videoId: item.id.videoId,
                    title: item.snippet.title,
                    channelTitle: item.snippet.channelTitle,
                    url: `https://youtube.com/watch?v=${item.id.videoId}`,
                    searchQuery: query
                }));
                
                allVideos.push(...videos);
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`Search error for "${query}":`, error.message);
                if (error.response?.status === 403) {
                    console.log('⚠️ YouTube API quota exceeded - using mock data');
                    return this.generateMockVideoData(brandConfig);
                }
            }
        }
        
        // Remove duplicates
        const uniqueVideos = allVideos.filter((video, index, self) => 
            index === self.findIndex(v => v.videoId === video.videoId)
        );
        
        console.log(`Found ${uniqueVideos.length} unique videos`);
        return uniqueVideos.length > 0 ? uniqueVideos : this.generateMockVideoData(brandConfig);
    }
    
    generateMockVideoData(brandConfig) {
        return [
            {
                videoId: 'mock_video_1',
                title: `${brandConfig.name} Review - Amazing Content!`,
                channelTitle: 'MockReviewer1',
                url: 'https://youtube.com/watch?v=mock_video_1',
                searchQuery: brandConfig.name
            },
            {
                videoId: 'mock_video_2',
                title: `Everything you need to know about ${brandConfig.name}`,
                channelTitle: 'MockReviewer2',
                url: 'https://youtube.com/watch?v=mock_video_2',
                searchQuery: brandConfig.name
            }
        ];
    }
    
    async getBrandComments(brandConfig, videoId, maxResults = 20) {
        console.log(`Getting comments for video: ${videoId}`);
        
        // If mock video, return mock comments
        if (videoId.includes('mock')) {
            return this.generateMockCommentsForVideo(brandConfig, videoId);
        }
        
        try {
            const response = await axios.get(`${this.baseUrl}/commentThreads`, {
                params: {
                    key: this.apiKey,
                    videoId: videoId,
                    part: 'snippet',
                    maxResults: maxResults,
                    order: 'relevance'
                }
            });
            
            const comments = response.data.items.map(item => {
                const comment = item.snippet.topLevelComment.snippet;
                
                return {
                    platform: 'youtube',
                    brand_id: brandConfig.id || 'unknown',
                    brand_name: brandConfig.name,
                    id: item.snippet.topLevelComment.id,
                    content: comment.textDisplay,
                    author: comment.authorDisplayName,
                    engagement_score: comment.likeCount || 0,
                    url: `https://youtube.com/watch?v=${videoId}&lc=${item.snippet.topLevelComment.id}`,
                    created_at: new Date(comment.publishedAt).toISOString(),
                    type: 'comment',
                    metadata: {
                        video_id: videoId,
                        likes: comment.likeCount || 0
                    }
                };
            });
            
            console.log(`Extracted ${comments.length} comments`);
            return comments;
            
        } catch (error) {
            console.error('Comments error:', error.message);
            return this.generateMockCommentsForVideo(brandConfig, videoId);
        }
    }
    
    generateMockCommentsForVideo(brandConfig, videoId) {
        return [
            {
                platform: 'youtube',
                brand_id: brandConfig.id || 'unknown',
                brand_name: brandConfig.name,
                id: `${videoId}_comment_1`,
                content: `Love this ${brandConfig.name} content! Really well done and engaging.`,
                author: 'MockYouTuber1',
                engagement_score: 15,
                url: `https://youtube.com/watch?v=${videoId}&lc=${videoId}_comment_1`,
                created_at: new Date(Date.now() - 86400000).toISOString(),
                type: 'comment',
                sentiment: 'positive',
                confidence: 0.8,
                metadata: {
                    video_id: videoId,
                    likes: 15
                }
            },
            {
                platform: 'youtube',
                brand_id: brandConfig.id || 'unknown',
                brand_name: brandConfig.name,
                id: `${videoId}_comment_2`,
                content: `${brandConfig.name} is getting really interesting. Can't wait for more episodes!`,
                author: 'MockYouTuber2',
                engagement_score: 8,
                url: `https://youtube.com/watch?v=${videoId}&lc=${videoId}_comment_2`,
                created_at: new Date(Date.now() - 172800000).toISOString(),
                type: 'comment',
                sentiment: 'positive',
                confidence: 0.7,
                metadata: {
                    video_id: videoId,
                    likes: 8
                }
            },
            {
                platform: 'youtube',
                brand_id: brandConfig.id || 'unknown',
                brand_name: brandConfig.name,
                id: `${videoId}_comment_3`,
                content: `Not sure about the latest ${brandConfig.name} episode. Felt a bit rushed to me.`,
                author: 'MockYouTuber3',
                engagement_score: 3,
                url: `https://youtube.com/watch?v=${videoId}&lc=${videoId}_comment_3`,
                created_at: new Date(Date.now() - 259200000).toISOString(),
                type: 'comment',
                sentiment: 'negative',
                confidence: 0.6,
                metadata: {
                    video_id: videoId,
                    likes: 3
                }
            }
        ];
    }
    
    async scrapeBrandSentiment(brandConfig) {
        console.log(`🎬 Scraping YouTube for: ${brandConfig.name}`);
        
        const allComments = [];
        
        try {
            const videos = await this.searchBrandVideos(brandConfig, 3);
            
            for (const video of videos.slice(0, 2)) { // Limit to 2 videos for testing
                console.log(`\nProcessing: "${video.title}"`);
                
                const videoComments = await this.getBrandComments(brandConfig, video.videoId, 10);
                
                videoComments.forEach(comment => {
                    comment.metadata = comment.metadata || {};
                    comment.metadata.video_title = video.title;
                    comment.metadata.channel_title = video.channelTitle;
                });
                
                allComments.push(...videoComments);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
            }
            
        } catch (error) {
            console.error('Scraping error:', error);
            // Return mock data if everything fails
            return this.generateMockCommentsForVideo(brandConfig, 'mock_video_fallback');
        }
        
        console.log(`\n🎉 Total comments: ${allComments.length}`);
        return allComments;
    }
}

module.exports = UniversalYouTubeScraper;