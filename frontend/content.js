
// hardcodes of selectors for different news sites
const NEWS_SITE_CONFIGS = {
    'nytimes.com': {
      titleSelector: 'h1.css-1vxca1d',
      paragraphSelector: 'div.css-53u6y8 p',
      articleBodySelector: 'section[name="articleBody"]'
    },
    'wsj.com': {
      titleSelector: 'h1.article-title',
      paragraphSelector: 'div.article-content p',
      articleBodySelector: 'div.article-content'
    },
    'bbc.com': {
      titleSelector: 'h1#main-heading',
      paragraphSelector: 'article p',
      articleBodySelector: 'article'
    },
    'cnn.com': {
      titleSelector: 'h1.pg-headline',
      paragraphSelector: 'div.article__content p',
      articleBodySelector: 'div.article__content'
    },
    'foxnews.com': {
      titleSelector: 'h1.headline',
      paragraphSelector: 'div.article-body p',
      articleBodySelector: 'div.article-body'
    }
  };
  
  // Determine which news site we're on
  function getCurrentNewsSite() {
    const hostname = window.location.hostname;
    for (const site in NEWS_SITE_CONFIGS) {
      if (hostname.includes(site)) {
        return site;
      }
    }
    return null;
  }
  
  // Extract the article title
  function extractArticleTitle(site) {
    const config = NEWS_SITE_CONFIGS[site];
    const titleElement = document.querySelector(config.titleSelector);
    return titleElement ? titleElement.textContent.trim() : null;
  }
  
  // Extract article paragraphs
  function extractArticleParagraphs(site) {
    const config = NEWS_SITE_CONFIGS[site];
    const paragraphElements = document.querySelectorAll(config.paragraphSelector);
    return Array.from(paragraphElements).map(p => p.textContent.trim());
  }
  
  // Extract keywords from title (REMEMBER TO IMPROVE CUZ TS ASS)
  function extractKeywords(title) {
    if (!title) return [];
    
    // Remove common stop words (expand this list as needed)
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by'];
    
    // Split, filter, and return lowercase keywords
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(' ')
      .filter(word => word.length > 2 && !stopWords.includes(word));
  }

  // Main function to analyze the current page
  function analyzeCurrentPage() {
    const currentSite = getCurrentNewsSite();
    if (!currentSite) return; // Not on a supported news site
    
    console.log(`NewsCompare: Analyzing article on ${currentSite}`);
    
    const title = extractArticleTitle(currentSite);
    if (!title) {
      console.log('NewsCompare: Could not extract article title');
      return;
    }
    
    const keywords = extractKeywords(title);
    const paragraphs = extractArticleParagraphs(currentSite);
    

    // feed every othere paragraph as input to the model    HEREEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE
    
    
    console.log(`NewsCompare: Extracted title: "${title}"`);
    console.log(`NewsCompare: Keywords: ${keywords.join(', ')}`);
    console.log(`NewsCompare: Found ${paragraphs.length} paragraphs`);
    
    // Send the data to the background script for processing
    chrome.runtime.sendMessage({
      action: 'analyzeArticle',
      data: {
        site: currentSite,
        title: title,
        keywords: keywords,
        paragraphs: paragraphs,
        url: window.location.href
      }
    });
    chrome.runtime.sendMessage({
      action: 'frequencyGraph',
      data: {
        keywords: keywords
      }
    });
    // Set up paragraph tracking for Feature 2
    setupParagraphTracking(currentSite, paragraphs);
  }
  
  // Track which paragraphs are currently being viewed
  function setupParagraphTracking(site, paragraphs) {
    const config = NEWS_SITE_CONFIGS[site];
    const paragraphElements = document.querySelectorAll(config.paragraphSelector);
    
    // Create observer for intersection detection
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = Array.from(paragraphElements).indexOf(entry.target);
          if (index !== -1) {
            chrome.runtime.sendMessage({
              action: 'paragraphInView',
              data: {
                paragraphIndex: index,
                paragraphContent: paragraphs[index],
                url: window.location.href
              }
            });
          }
        }
      });
    }, { threshold: 0.5 }); // Element is considered in view when 50% visible
    
    // Observe all paragraph elements
    paragraphElements.forEach(p => observer.observe(p));
  }
  
  // Run analysis when page is fully loaded
  window.addEventListener('load', analyzeCurrentPage);
  
  // Listen for messages from the background script or popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getPageInfo') {
      const currentSite = getCurrentNewsSite();
      if (currentSite) {
        const title = extractArticleTitle(currentSite);
        const paragraphs = extractArticleParagraphs(currentSite);
        sendResponse({
          site: currentSite,
          title: title,
          paragraphs: paragraphs,
          url: window.location.href
        });
      } else {
        sendResponse({ error: 'Not on a supported news site' });
      }
      return true; // Indicates async response
    }
  });