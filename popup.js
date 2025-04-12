// NewsCompare Popup Script

// DOM Elements
const elements = {
    // Tabs
    tabSentiment: document.getElementById('tab-sentiment'),
    tabComparison: document.getElementById('tab-comparison'),
    tabSettings: document.getElementById('tab-settings'),
    
    // Sections
    sentimentSection: document.getElementById('sentiment-section'),
    comparisonSection: document.getElementById('comparison-section'),
    settingsSection: document.getElementById('settings-section'),
    
    // Status messages
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    notNews: document.getElementById('not-news'),
    
    // Sentiment tab elements
    currentTitle: document.getElementById('current-title'),
    currentSource: document.getElementById('current-source'),
    sentimentDistribution: document.getElementById('sentiment-distribution'),
    sentimentSummaryText: document.getElementById('sentiment-summary-text'),
    relatedArticlesList: document.getElementById('related-articles-list'),
    
    // Comparison tab elements
    currentParagraphText: document.getElementById('current-paragraph-text'),
    similarParagraphsContainer: document.getElementById('similar-paragraphs-container'),
    
    // Settings tab elements
    sourceNyt: document.getElementById('source-nyt'),
    sourceWsj: document.getElementById('source-wsj'),
    sourceBbc: document.getElementById('source-bbc'),
    sourceCnn: document.getElementById('source-cnn'),
    sourceFox: document.getElementById('source-fox'),
    optionAutoAnalyze: document.getElementById('option-auto-analyze'),
    optionMaxResults: document.getElementById('option-max-results'),
    saveSettings: document.getElementById('save-settings'),
    resetSettings: document.getElementById('reset-settings')
  };
  
  // Tab switching
  function setupTabs() {
    elements.tabSentiment.addEventListener('click', () => showTab('sentiment'));
    elements.tabComparison.addEventListener('click', () => showTab('comparison'));
    elements.tabSettings.addEventListener('click', () => showTab('settings'));
  }
  
  function showTab(tabName) {
    // Hide all tab content
    elements.sentimentSection.classList.add('hidden');
    elements.comparisonSection.classList.add('hidden');
    elements.settingsSection.classList.add('hidden');
    
    // Remove active class from all tabs
    elements.tabSentiment.classList.remove('active');
    elements.tabComparison.classList.remove('active');
    elements.tabSettings.classList.remove('active');
    
    // Show selected tab content and mark tab as active
    switch (tabName) {
      case 'sentiment':
        elements.sentimentSection.classList.remove('hidden');
        elements.tabSentiment.classList.add('active');
        break;
      case 'comparison':
        elements.comparisonSection.classList.remove('hidden');
        elements.tabComparison.classList.add('active');
        break;
      case 'settings':
        elements.settingsSection.classList.remove('hidden');
        elements.tabSettings.classList.add('active');
        break;
    }
  }
  
  // Create sentiment visualization
  function renderSentimentChart(sentimentData) {
    const container = elements.sentimentDistribution;
    container.innerHTML = '';
    
    // Count sentiments by source
    const sourceSentiments = {};
    let minScore = 0;
    let maxScore = 0;
    
    // Process sentiment data
    sentimentData.forEach(item => {
      const source = item.source.split('.')[0]; // Extract domain name
      const score = item.sentiment.score;
      
      // Track min/max for scale
      minScore = Math.min(minScore, score);
      maxScore = Math.max(maxScore, score);
      
      if (!sourceSentiments[source]) {
        sourceSentiments[source] = [];
      }
      sourceSentiments[source].push(score);
    });
    
    // Calculate average sentiment by source
    const averageSentiments = Object.keys(sourceSentiments).map(source => {
      const scores = sourceSentiments[source];
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      return {
        source,
        averageScore: average,
        count: scores.length
      };
    });
    
    // Sort by score (most negative to most positive)
    averageSentiments.sort((a, b) => a.averageScore - b.averageScore);
    
    // Create a simple horizontal bar chart
    const chartHtml = averageSentiments.map(item => {
      // Normalize score to 0-100 range for width
      const normalizedScore = ((item.averageScore - minScore) / (maxScore - minScore)) * 100;
      const barWidth = Math.max(5, normalizedScore); // Minimum width for visibility
      
      // Determine color based on sentiment
      let barColor;
      if (item.averageScore < -0.2) {
        barColor = '#e74c3c'; // Red for negative
      } else if (item.averageScore > 0.2) {
        barColor = '#2ecc71'; // Green for positive
      } else {
        barColor = '#f39c12'; // Orange for neutral
      }
      
      return `
        <div class="sentiment-bar-container">
          <div class="source-label">${item.source} (${item.count})</div>
          <div class="sentiment-bar">
            <div class="bar" style="width: ${barWidth}%; background-color: ${barColor};"></div>
          </div>
          <div class="score">${item.averageScore.toFixed(2)}</div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = chartHtml;
    
    // Generate summary text
    let summaryText = '';
    if (averageSentiments.length > 0) {
      const mostNegative = averageSentiments[0];
      const mostPositive = averageSentiments[averageSentiments.length - 1];
      
      summaryText = `Based on ${sentimentData.length} related articles, `;
      
      if (mostNegative.source === mostPositive.source) {
        summaryText += `coverage from ${mostNegative.source} is relatively balanced.`;
      } else {
        summaryText += `${mostPositive.source} has the most positive coverage, while ${mostNegative.source} has the most negative coverage of this topic.`;
      }
    } else {
      summaryText = 'Not enough data to analyze sentiment across sources.';
    }
    
    elements.sentimentSummaryText.textContent = summaryText;
  }
  
  // Populate related articles list
  function populateRelatedArticles(articles) {
    const container = elements.relatedArticlesList;
    container.innerHTML = '';
    
    if (articles.length === 0) {
      container.innerHTML = '<li class="no-results">No related articles found</li>';
      return;
    }
    
    const articlesHtml = articles.slice(0, 5).map(article => {
      return `
        <li class="article-item">
          <h4 class="article-title">
            <a href="${article.url}" target="_blank">${article.title}</a>
          </h4>
          <div class="article-meta">
            <span class="source">${article.source.name}</span>
            <span class="date">${formatDate(article.publishedAt)}</span>
          </div>
          <p class="article-description">${article.description || 'No description available'}</p>
        </li>
      `;
    }).join('');
    
    container.innerHTML = articlesHtml;
  }
  
  // Format date for display
  function formatDate(dateStr) {
    if (!dateStr) return 'Unknown date';
    
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return 'Invalid date';
    }
  }
  
  // Display paragraph comparisons
  function displayParagraphComparison(comparisonData) {
    if (!comparisonData) {
      elements.currentParagraphText.innerHTML = '<p>No paragraph data available. Continue reading the article.</p>';
      elements.similarParagraphsContainer.innerHTML = '<div class="no-results">No comparison data available</div>';
      return;
    }
    
    // Display current paragraph
    elements.currentParagraphText.innerHTML = `<p>${comparisonData.currentParagraph}</p>`;
    
    // Display similar paragraphs
    const similarParagraphs = comparisonData.similarParagraphs;
    
    if (similarParagraphs.length === 0) {
      elements.similarParagraphsContainer.innerHTML = '<div class="no-results">No similar paragraphs found</div>';
      return;
    }
    
    const paragraphsHtml = similarParagraphs.map(p => {
      // Calculate similarity percentage for display
      const similarityPercent = Math.round(p.similarity * 100);
      
      return `
        <div class="similar-paragraph">
          <div class="paragraph-header">
            <span class="source">${p.source}</span>
            <span class="similarity-score">Similarity: ${similarityPercent}%</span>
          </div>
          <div class="paragraph-box">
            <p>${p.paragraph}</p>
          </div>
          <a href="${p.url}" target="_blank" class="read-more">Read full article</a>
        </div>
      `;
    }).join('');
    
    elements.similarParagraphsContainer.innerHTML = paragraphsHtml;
  }
  
  // Settings management
  function loadSettings() {
    chrome.storage.local.get('settings', result => {
      const settings = result.settings || {
        enabledSites: ['nytimes.com', 'wsj.com', 'bbc.com', 'cnn.com', 'foxnews.com'],
        maxResults: 20,
        autoAnalyze: true
      };
      
      // Update UI with loaded settings
      elements.sourceNyt.checked = settings.enabledSites.includes('nytimes.com');
      elements.sourceWsj.checked = settings.enabledSites.includes('wsj.com');
      elements.sourceBbc.checked = settings.enabledSites.includes('bbc.com');
      elements.sourceCnn.checked = settings.enabledSites.includes('cnn.com');
      elements.sourceFox.checked = settings.enabledSites.includes('foxnews.com');
      
      elements.optionAutoAnalyze.checked = settings.autoAnalyze;
      elements.optionMaxResults.value = settings.maxResults.toString();
    });
  }
  
  function saveSettings() {
    const enabledSites = [];
    if (elements.sourceNyt.checked) enabledSites.push('nytimes.com');
    if (elements.sourceWsj.checked) enabledSites.push('wsj.com');
    if (elements.sourceBbc.checked) enabledSites.push('bbc.com');
    if (elements.sourceCnn.checked) enabledSites.push('cnn.com');
    if (elements.sourceFox.checked) enabledSites.push('foxnews.com');
    
    const settings = {
      enabledSites,
      maxResults: parseInt(elements.optionMaxResults.value, 10),
      autoAnalyze: elements.optionAutoAnalyze.checked
    };
    
    chrome.storage.local.set({ settings }, () => {
      // Show save confirmation
      const saveButton = elements.saveSettings;
      saveButton.textContent = 'Saved!';
      setTimeout(() => {
        saveButton.textContent = 'Save Settings';
      }, 1500);
    });
  }
  
  // Initialize the popup
  function initialize() {
    setupTabs();
    loadSettings();
    
    // Set up event listeners
    elements.saveSettings.addEventListener('click', saveSettings);
    elements.resetSettings.addEventListener('click', () => {
      chrome.storage.local.set({
        settings: {
          enabledSites: ['nytimes.com', 'wsj.com', 'bbc.com', 'cnn.com', 'foxnews.com'],
          maxResults: 20,
          autoAnalyze: true
        }
      }, () => {
        loadSettings();
        alert('Settings reset to defaults');
      });
    });
    
    // Check if we're on a news page
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const activeTab = tabs[0];
      const isNewsPage = Object.keys(NEWS_SITE_CONFIGS).some(site => 
        activeTab.url.includes(site)
      );
      
      if (!isNewsPage) {
        // Not on a supported news site
        elements.loading.classList.add('hidden');
        elements.notNews.classList.remove('hidden');
        return;
      }
      
      // Get current analysis if available
      chrome.storage.local.get(['currentAnalysis', 'currentParagraphComparison'], result => {
        elements.loading.classList.add('hidden');
        
        if (result.currentAnalysis && result.currentAnalysis.currentUrl === activeTab.url) {
          // We have analysis for this page
          elements.currentTitle.textContent = result.currentAnalysis.currentTitle;
          elements.currentSource.textContent = result.currentAnalysis.currentSite;
          
          renderSentimentChart(result.currentAnalysis.sentimentAnalysis);
          populateRelatedArticles(result.currentAnalysis.relatedArticles);
          
          // Check for paragraph comparison
          if (result.currentParagraphComparison) {
            displayParagraphComparison(result.currentParagraphComparison);
          }
        } else {
          // No analysis yet, ask content script for page info
          chrome.tabs.sendMessage(activeTab.id, { action: 'getPageInfo' }, response => {
            if (chrome.runtime.lastError || !response || response.error) {
              // Error communicating with content script
              elements.error.classList.remove('hidden');
              return;
            }
            
            // Start analysis
            chrome.runtime.sendMessage({
              action: 'analyzeArticle',
              data: response
            });
            
            elements.currentTitle.textContent = response.title || 'Article Title';
            elements.currentSource.textContent = response.site || 'Source';
          });
        }
      });
    });
    
    // Listen for updates from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'analysisComplete') {
        // Reload analysis data
        chrome.storage.local.get('currentAnalysis', result => {
          if (result.currentAnalysis) {
            elements.currentTitle.textContent = result.currentAnalysis.currentTitle;
            elements.currentSource.textContent = result.currentAnalysis.currentSite;
            
            renderSentimentChart(result.currentAnalysis.sentimentAnalysis);
            populateRelatedArticles(result.currentAnalysis.relatedArticles);
            
            elements.loading.classList.add('hidden');
          }
        });
      }
      
      if (message.action === 'paragraphComparisonReady') {
        displayParagraphComparison(message.data);
        // Automatically switch to comparison tab if we're getting live updates
        showTab('comparison');
      }
    });
  }
  
  // Constants
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
  
  // Initialize the popup when the DOM is fully loaded
  document.addEventListener('DOMContentLoaded', initialize);