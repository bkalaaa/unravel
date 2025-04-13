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
    
    // Map sentiment scores to a 0-5 scale (assuming they already are)
    // Sort articles by score (lowest to highest)
    const sortedData = [...sentimentData].sort((a, b) => a.sentiment.score - b.sentiment.score);
    
    // Create a bar for each individual article
    const chartHtml = sortedData.map(item => {
      const source = item.source.split('.')[0]; // Extract domain name
      const score = item.sentiment.score; // Already on a 0-5 scale
      const url = item.url || '#'; // Get the article URL, default to # if not available
      
      // Format URL for display - extract domain without TLD
      let displayUrl = url.replace(/^https?:\/\/(www\.)?/i, '');
      // Stop at the first dot to get just the domain name part
      displayUrl = displayUrl.split('.')[0];
      
      // Limit to 10 characters
      if (displayUrl.length > 10) {
        displayUrl = displayUrl.substring(0, 10) + '...';
      }
      
      // Calculate bar width as percentage of max (5)
      const barWidth = Math.max(5, (score / 5) * 100);
      
      // Determine color based on sentiment
      let barColor;
      if (score < 2) {
        barColor = '#e74c3c'; // Red for negative
      } else if (score > 3) {
        barColor = '#2ecc71'; // Green for positive
      } else {
        barColor = '#f39c12'; // Orange for neutral
      }
      
      return `
        <div class="sentiment-bar-container">
          <div class="source-label">
            ${source}  ${displayUrl}
          </div>
          <div class="sentiment-bar">
            <div class="bar" style="width: ${barWidth}%; background-color: ${barColor};"></div>
          </div>
          <div class="score">${score.toFixed(1)}</div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = chartHtml;
    
    // Generate summary text
    let summaryText = '';
    if (sortedData.length > 0) {
      const mostNegative = sortedData[0];
      const mostPositive = sortedData[sortedData.length - 1];
      
      summaryText = `Based on ${sentimentData.length} related articles, `;
      
      const negSource = mostNegative.source.split('.')[0];
      const posSource = mostPositive.source.split('.')[0];
      
      if (negSource === posSource && sortedData.length > 1) {
        summaryText += `${negSource} shows varied perspectives on this topic.`;
      } else {
        summaryText += `${posSource} has the most positive coverage (${mostPositive.sentiment.score.toFixed(1)}), while ${negSource} has the most negative coverage (${mostNegative.sentiment.score.toFixed(1)}) of this topic.`;
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
    // Clear existing content
    elements.currentParagraphText.innerHTML = '';
    elements.similarParagraphsContainer.innerHTML = '';
    
    // Set up graph header
    const graphTitle = document.createElement('h3');
    graphTitle.textContent = 'News Coverage Over Time';
    elements.currentParagraphText.appendChild(graphTitle);
    
    // Create a canvas for Chart.js
    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'chart-container';
    canvasContainer.style.height = '250px';
    
    const canvas = document.createElement('canvas');
    canvas.id = 'coverage-chart';
    canvasContainer.appendChild(canvas);
    elements.currentParagraphText.appendChild(canvasContainer);

    // Retrieve frequency data from storage
    chrome.storage.local.get('frequencyGraphData', (result) => {
      let articles = [];
      
      if (result.frequencyGraphData && result.frequencyGraphData.articles) {
        articles = result.frequencyGraphData.articles;
        console.log('Retrieved frequency data:', articles);
      }
      
      // Process articles to get counts by date
      const dateCountMap = processDatesFromArticles(articles);
      
      // Create Chart.js configuration
      const chartConfig = {
        type: 'line',
        data: {
          labels: dateCountMap.labels,
          datasets: [{
            label: 'Article Coverage',
            data: dateCountMap.counts,
            fill: false,
            borderColor: '#3498db',
            pointRadius: 6,
            pointHitRadius: 18,
            tension: 0.1,
            spanGaps: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            xAxis: {
              grid: {
                color: '#e0e0e0'
              },
              ticks: {
                color: '#333333'
              },
              title: {
                display: true,
                text: 'Date',
                color: '#333333',
                font: {
                  size: 14
                }
              }
            },
            yAxis: {
              grid: {
                color: '#e0e0e0'
              },
              ticks: {
                color: '#333333'
              },
              title: {
                display: true,
                text: 'Article Count',
                color: '#333333',
                font: {
                  size: 14
                }
              }
            }
          },
          plugins: {
            legend: {
              labels: {
                color: '#333333',
                font: {
                  size: 14
                }
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          }
        }
      };
      
      // Create the chart
      new Chart(canvas, chartConfig);
      
      // Add explanation text below the graph
      const explanationText = document.createElement('div');
      explanationText.className = 'graph-explanation';
      explanationText.innerHTML = `
        <p>This graph shows the number of articles published about this topic over time.</p>
        <p>Higher values indicate more news coverage on the topic.</p>
      `;
      elements.similarParagraphsContainer.appendChild(explanationText);
    });
  }
  
  // Function to process article dates and create data for the chart
  function processDatesFromArticles(articles) {
    // Default to empty if no articles
    if (!articles || articles.length === 0 || articles.error) {
      // Generate last 12 days
      const labels = [];
      const counts = [];
      
      for (let i = 12; i >= 0; i -= 2) {
        if (i === 0) {
          labels.push('Today');
        } else {
          labels.push(`${i} days ago`);
        }
        counts.push(0);
      }
      
      return { labels, counts };
    }
  
    // Process articles with dates
    const dateMap = {};
    const today = new Date();
    
    // Group articles by date
    articles.forEach(article => {
      if (!article.publishedAt) return;
      
      const pubDate = new Date(article.publishedAt);
      const daysDiff = Math.floor((today - pubDate) / (1000 * 60 * 60 * 24));
      
      // Round to even days for display purposes (0, 2, 4, 6, 8, 10, 12)
      const roundedDays = Math.min(12, Math.floor(daysDiff / 2) * 2);
      
      if (!dateMap[roundedDays]) {
        dateMap[roundedDays] = 0;
      }
      dateMap[roundedDays]++;
    });
    
    // Create arrays for chart
    const labels = [];
    const counts = [];
    
    // Fill in all days (including those with zero articles)
    for (let i = 12; i >= 0; i -= 2) {
      let label;
      if (i === 0) {
        label = 'Today';
      } else {
        label = `${i} days ago`;
      }
      
      labels.push(label);
      counts.push(dateMap[i] || 0);
    }
    
    return { labels, counts };
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