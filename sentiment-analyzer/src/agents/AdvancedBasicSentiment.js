// src/agents/AdvancedBasicSentiment.js 
// Advanced Basic Sentiment Analyzer - Better than simple keyword matching
class AdvancedBasicSentiment {
    constructor() {
        this.positiveWords = [
            // Strong positive
            'amazing', 'awesome', 'brilliant', 'excellent', 'fantastic', 'incredible', 'outstanding', 'perfect', 'spectacular', 'wonderful',
            // Medium positive  
            'good', 'great', 'nice', 'cool', 'beautiful', 'impressive', 'solid', 'strong', 'effective', 'successful',
            // Mild positive
            'like', 'enjoy', 'happy', 'pleased', 'satisfied', 'glad', 'fine', 'okay', 'decent', 'acceptable'
        ];
        
        this.negativeWords = [
            // Strong negative
            'terrible', 'awful', 'horrible', 'disgusting', 'pathetic', 'abysmal', 'atrocious', 'deplorable', 'dreadful', 'appalling',
            // Medium negative
            'bad', 'poor', 'weak', 'disappointing', 'inadequate', 'unsatisfactory', 'problematic', 'concerning', 'troubling', 'worrying',
            // Mild negative
            'dislike', 'annoying', 'frustrating', 'confusing', 'boring', 'mediocre', 'average', 'lacking', 'limited', 'minor'
        ];
        
        this.intensifiers = ['very', 'extremely', 'incredibly', 'absolutely', 'totally', 'completely', 'utterly', 'quite', 'really', 'truly'];
        this.negators = ['not', 'no', 'never', 'nothing', 'nobody', 'nowhere', 'neither', 'nor', "don't", "won't", "can't", "isn't", "aren't"];
    }
    
    analyzeSentiment(text) {
        const words = text.toLowerCase().split(/\s+/);
        let positiveScore = 0;
        let negativeScore = 0;
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const prevWord = i > 0 ? words[i - 1] : '';
            const nextWord = i < words.length - 1 ? words[i + 1] : '';
            
            // Check for negation (within 2 words)
            const isNegated = this.negators.includes(prevWord) || 
                             this.negators.includes(nextWord) ||
                             (i > 1 && this.negators.includes(words[i - 2]));
            
            // Check for intensification
            const isIntensified = this.intensifiers.includes(prevWord);
            const intensityMultiplier = isIntensified ? 1.5 : 1.0;
            
            // Calculate word score based on strength
            let wordScore = 0;
            if (this.positiveWords.slice(0, 10).includes(word)) wordScore = 3; // Strong positive
            else if (this.positiveWords.slice(10, 20).includes(word)) wordScore = 2; // Medium positive
            else if (this.positiveWords.slice(20).includes(word)) wordScore = 1; // Mild positive
            else if (this.negativeWords.slice(0, 10).includes(word)) wordScore = -3; // Strong negative
            else if (this.negativeWords.slice(10, 20).includes(word)) wordScore = -2; // Medium negative
            else if (this.negativeWords.slice(20).includes(word)) wordScore = -1; // Mild negative
            
            if (wordScore !== 0) {
                const finalScore = wordScore * intensityMultiplier;
                
                if (isNegated) {
                    // Flip the sentiment if negated
                    if (finalScore > 0) negativeScore += Math.abs(finalScore);
                    else positiveScore += Math.abs(finalScore);
                } else {
                    if (finalScore > 0) positiveScore += finalScore;
                    else negativeScore += Math.abs(finalScore);
                }
            }
        }
        
        // Normalize scores
        const textLength = Math.max(words.length, 1);
        const normalizedPositive = positiveScore / (textLength * 0.1);
        const normalizedNegative = negativeScore / (textLength * 0.1);
        
        // Calculate confidence and label
        const scoreDiff = normalizedPositive - normalizedNegative;
        const maxScore = Math.max(normalizedPositive, normalizedNegative);
        
        let label, confidence;
        
        if (Math.abs(scoreDiff) < 0.5) {
            label = 'neutral';
            confidence = 0.5 + Math.min(0.3, maxScore * 0.1);
        } else if (scoreDiff > 0) {
            label = 'positive';
            confidence = 0.6 + Math.min(0.35, normalizedPositive * 0.1);
        } else {
            label = 'negative';
            confidence = 0.6 + Math.min(0.35, normalizedNegative * 0.1);
        }
        
        return {
            label: label,
            score: Math.min(0.95, confidence),
            raw_scores: { positive: positiveScore, negative: negativeScore },
            normalized_scores: { positive: normalizedPositive, negative: normalizedNegative }
        };
    }
}

module.exports = AdvancedBasicSentiment;