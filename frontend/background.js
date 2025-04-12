// NewsCompare Background Script api reqs and nlp
// config


const NEWS_API_ENDPOINT = 'https://newsapi.org/v2/top-headlines';
const MAX_RESULTS = 20; // add setting FE to chrome.storage and sync here later

let NEWS_API_KEY = null

NEWS_API_KEY = chrome.storage.local.get(['NewsAPIKey'], function (result) {
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

  NEWS_API_KEY = "e751a2f8c355493799ac4f68674a4af7";

  if (!NEWS_API_KEY) {
    console.error("NewsAPIKey not loaded yet");
    return [];
  }
  keywords = keywords[0]; // Limit to only the first keyword for the query
  // const cacheKey = `${keywords.join('-')}-${excludeSource || 'none'}`;

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
    q: keywords, // Use OR for multiple keywords
    pageSize: MAX_RESULTS
    // only for everything endpoint sortBy: 'relevancy', searchIn: title, pageSize: MAX_RESULTS,
  });
  /* implement later fr maybe
  // exclude the current source if specified
  if (excludeSource) {
    queryParams.append('domains', COMPARISON_SOURCES.filter(s => s !== excludeSource).join(','));
  }
  */
  console.log(queryParams.toString());
  try {
    console.log('Fetching from News API:', `${NEWS_API_ENDPOINT}?${queryParams}`);
    const response = await fetch(`${NEWS_API_ENDPOINT}?${queryParams}`, {
      headers: {
        'X-Api-Key': NEWS_API_KEY
    }
    });
    if (!response.ok) {
      console.log(`data: ${response}`);
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
        console.log(`NewsCompare: Fetching articles for keywords: ${keywords.join(', ')}`);
        const articles = await fetchFromNewsAPI(keywords, site);
        
        console.log(`NewsCompare: Fetched ${articles.length} articles for keywords: ${keywords.join(', ')}`);
        


        const articlesForAnalysis = articles.map(article => ({
          content: article.content || '',
          description: article.description || '',
          // You can add any other fields the backend might need to preserve
          url: article.url,
          title: article.title
        }));


        console.log('Articles for analysis:', articlesForAnalysis);
        // Send all articles in a single batch request
        const response = await fetch("http://localhost:8000/analyze-article", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(articlesForAnalysis)
        });


        
        const sentimentResults = await response.json();

          
        console.log('Sentiment analysis results:', sentimentResults);

        const sentimentScores = sentimentResults.map(result => {
            return {
              title: result.title,
              source: result.source?.name || '',
              url: result.url,
              publishedAt: result.publishedAt,
              sentiment: {
                score: result.score // Now accessing the score field directly
              }
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