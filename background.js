// NewsCompare Background Script api reqs and nlp
// config


const NEWS_API_ENDPOINT = 'https://newsapi.org/v2/top-headlines';
const MAX_RESULTS = 20; // add setting FE to chrome.storage and sync here later

let NEWS_API_KEY = null
chrome.storage.local.get(['NewsAPIKey'], function(result) {
  console.log('NewsAPI Key:', result.NewsAPIKey);
  NEWS_API_KEY = result.NewsAPIKey;
});


// Predefined news sources for comparison
const COMPARISON_SOURCES = [
  'nytimes.com',
  'wsj.com',
  'bbc.com',
  'cnn.com',
  'foxnews.com'
];

// Cache for API results to reduce API calls (do if time only)
const articleCache = {};

// Helper function to make API requests
async function fetchFromNewsAPI(keywords, excludeSource = null) {
  // Create a cache key from the keywords and excluded source
  if (!NEWS_API_KEY) {
    console.error("NewsAPIKey not loaded yet");
    return [];
  }
  const cacheKey = `${keywords.join('-')}-${excludeSource || 'none'}`;
  /*
  // Check if we have cached results
  if (articleCache[cacheKey]) {
    console.log('Using cached results for:', cacheKey);
    return articleCache[cacheKey];
  }
  */
  // Build query parameters
  const queryParams = new URLSearchParams({
    apiKey: NEWS_API_KEY,
    country: 'us',
    q: keywords.join(' OR '),
    pageSize: MAX_RESULTS,
    
    // only for everything endpoint sortBy: 'relevancy', searchIn: title,
  });
  /* implement later fr maybe
  // exclude the current source if specified
  if (excludeSource) {
    queryParams.append('domains', COMPARISON_SOURCES.filter(s => s !== excludeSource).join(','));
  }
  */
  try {
    const response = await fetch(`${NEWS_API_ENDPOINT}?${queryParams}`);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data.articles;
    /*
    // cache the results
    articleCache[cacheKey] = data.articles; // do smth w storing the cache later, no browser storage since data > 1mb
    return data.articles;
    */
  } catch (error) {
    console.error('Error fetching from News API:', error);
    return [];
  }
}

function bodyJoinClean(text) {
  // remove HTML tags, and clean up

  if (!text) return '';
  
  
  // Remove HTML tags first
  text = text.replace(/<[^>]*>/g, '');
  
  // Remove URLs
  text = text.replace(/https?:\/\/\S+/g, '');
  
  // Remove News API truncation markers
  text = text.replace(/\[\+\d+ chars\]/g, '');
  
  // Handle common news-specific terms
  text = text.replace(/\(ap\)/gi, ' ');
  text = text.replace(/\(reuters\)/gi, ' ');
  text = text.replace(/\(afp\)/gi, ' ');
  
  // Convert to lowercase for better matching
  text = text.toLowerCase();
  
  // Expand contractions (order matters here)
  // Handle specific cases first
  text = text.replace(/can't/g, "cannot ");
  text = text.replace(/won't/g, "will not ");
  text = text.replace(/i'm/g, "i am ");
  text = text.replace(/what's/g, "what is ");
  
  // Then handle general patterns
  text = text.replace(/n't/g, " not ");
  text = text.replace(/\'ve/g, " have ");
  text = text.replace(/\'re/g, " are ");
  text = text.replace(/\'s/g, " is ");
  text = text.replace(/\'d/g, " would ");
  text = text.replace(/\'ll/g, " will ");
  
  // Keep letters, spaces, and certain punctuation for sentiment analysis
  // Question marks and exclamation points can indicate sentiment intensity
  text = text.replace(/[^a-z ?!.]+/g, ' ');
  
  // Normalize whitespace (including handling multiple periods)
  text = text.replace(/\.{2,}/g, '. '); // Replace multiple periods
  text = text.replace(/\s+/g, ' ');
  
  return text.trim();
}



// Simplified sentiment analysis
function analyzeSentiment(text) {

  const positiveWords = ['good', 'great', 'excellent', 'positive', 'success', 'benefit', 'happy', 'win'];
  const negativeWords = ['bad', 'terrible', 'negative', 'failure', 'problem', 'crisis', 'sad', 'lose'];
  
  try {
  const lowerText = bodyJoinClean(text);



  
  
  let score = 0;
  
  // Count positive and negative words
  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches) score += matches.length;
  });
  
  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches) score -= matches.length;
  });
  
  // Normalize to a range from -1 to 1
  const words = text.split(/\s+/).length;
  return {
    score: words > 0 ? score / Math.sqrt(words) : 0,
    positiveCount: positiveWords.reduce((count, word) => {
      return count + (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    }, 0),
    negativeCount: negativeWords.reduce((count, word) => {
      return count + (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    }, 0)
  }
 } catch (error) {
  console.error('Error in sentiment analysis:', error);
  return 0;
  }
}

// Find similar paragraphs in other articles
function findSimilarParagraphs(paragraph, articles) {
  const results = [];
  
  // Simple similarity based on word overlap (replace with more sophisticated algorithm)
  const paragraphWords = new Set(paragraph.toLowerCase().match(/\b\w+\b/g) || []);
  
  for (const article of articles) {
    if (!article.content) continue;
    
    // Split article content into paragraphs
    const articleParagraphs = article.content.split(/\n+/);
    
    let bestMatch = null;
    let highestSimilarity = 0;
    
    for (const p of articleParagraphs) {
      const pWords = new Set(p.toLowerCase().match(/\b\w+\b/g) || []);
      
      // Skip very short paragraphs
      if (pWords.size < 5) continue;
      
      // Calculate Jaccard similarity
      const intersection = new Set([...paragraphWords].filter(x => pWords.has(x)));
      const union = new Set([...paragraphWords, ...pWords]);
      const similarity = intersection.size / union.size;
      
      if (similarity > highestSimilarity && similarity > 0.1) {
        highestSimilarity = similarity;
        bestMatch = {
          paragraph: p,
          similarity: similarity,
          source: article.source.name,
          url: article.url
        };
      }
    }
    
    if (bestMatch) {
      results.push(bestMatch);
    }
  }
  
  return results.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
}

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle article analysis request (Feature 1)
  if (message.action === 'analyzeArticle') {
    const { keywords, site, title, url } = message.data;
    
    // Start async processing
    (async () => {
      try {
        // Fetch related articles from other sources
        const articles = await fetchFromNewsAPI(keywords, site);
        
        console.log(`NewsCompare: Fetched ${articles.length} articles for keywords: ${keywords.join(', ')}`);
        // Calculate sentiment scores
        const sentimentScores = articles.map(article => {
          return {
            title: article.title,
            source: article.source.name,
            url: article.url,
            publishedAt: article.publishedAt,
            sentiment: analyzeSentiment(article.content + ' ' + (article.description || ''))
          };
        });
        
        // Store results for popup
        chrome.storage.local.set({
          currentAnalysis: {
            currentTitle: title,
            currentUrl: url,
            currentSite: site,
            keywords: keywords,
            relatedArticles: articles.slice(0, 10),
            sentimentAnalysis: sentimentScores,
            timestamp: Date.now()
          }
        });
        
        // Notify popup if it's open
        chrome.runtime.sendMessage({
          action: 'analysisComplete',
          data: {
            title: title,
            url: url
          }
        });
      } catch (error) {
        console.error('Error analyzing article:', error);
      }
    })();
    
    // We'll respond asynchronously
    return true;
  }
  
  // Handle paragraph in view (Feature 2)
  if (message.action === 'paragraphInView') {
    const { paragraphContent, paragraphIndex, url } = message.data;
    
    // Start async processing
    (async () => {
      try {
        // Get current analysis data
        const data = await new Promise(resolve => {
          chrome.storage.local.get('currentAnalysis', result => {
            resolve(result.currentAnalysis || null);
          });
        });
        
        if (!data) return;
        
        // Find similar paragraphs in related articles
        const similarParagraphs = findSimilarParagraphs(
          paragraphContent,
          data.relatedArticles
        );
        
        // Store paragraph comparison results
        const paragraphComparisons = {
          currentParagraph: paragraphContent,
          index: paragraphIndex,
          similarParagraphs: similarParagraphs,
          timestamp: Date.now()
        };
        
        chrome.storage.local.set({ currentParagraphComparison: paragraphComparisons });
        
        // Notify popup if it's open
        chrome.runtime.sendMessage({
          action: 'paragraphComparisonReady',
          data: paragraphComparisons
        });
      } catch (error) {
        console.error('Error comparing paragraphs:', error);
      }
    })();
    
    return true;
  }
});

// Handle installation or update
chrome.runtime.onInstalled.addListener(() => {
  console.log('NewsCompare extension installed or updated');
  
  // Initialize storage
  chrome.storage.local.set({
    settings: {
      enabledSites: COMPARISON_SOURCES,
      maxResults: MAX_RESULTS,
      autoAnalyze: true
    }
  });
});