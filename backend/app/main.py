import aiohttp
from datetime import date, timedelta
from requests import Request
from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any Chrome extension
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/time-graph")
async def time_graph(request: Request):

    keyword = await request.json()
    print("keyword", keyword)
    keyword = keyword.get("keyword", "")

    websites = 'wsj.com, aljazeera.com, bbc.co.uk, nytimes.com, bloomberg.com, cnn.com, foxnews.com, reuters.com, washingtonpost.com'
    # make website non list
    # Fix date handling - date objects don't have copy()
    end_date = date.today()
    # Calculate date 30 days ago
    start_date = end_date - timedelta(days=30)
    print("starting BE func, keyword:", keyword)
    try:        
        print("attempting to fetch frequency data with , keyword:", keyword)
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://newsapi.org/v2/everything", 
                params={
                    'q': keyword,
                    'domains': websites,
                    'sortBy': 'popularity',
                    'pageSize': 100,
                    'language': 'en',
                    'from': start_date.isoformat(),
                    'to': end_date.isoformat(),
                    'apiKey': '8df54a033ba74dda9612770ac4bf8c5c'
                }
            ) as response:
                if response.status != 200:
                    return {'error': f'Failed to fetch data from NewsAPI: {response.status}'}
            
                data = await response.json()
                full_articles = data.get('articles', [])
                
                if not full_articles:
                    return {'error': 'No articles found for the given keyword'}
                
                return full_articles
            
    except Exception as e:
        print("Error fetching data:", e)
        return {'error': str(e)}
    


sentiment_pipeline = pipeline("sentiment-analysis")

@app.post("/analyze-article")
async def analyze_article(request: Request):

    articles = await request.json()
    try:

        # Prepare all texts in one batch and filter out empty texts
        texts = []
        valid_articles = []
        
        for article in articles:
            text = (article.get("content", "") or "") + " " + (article.get("description", "") or "" + (article.get("title", "") or ""))
            text = text.strip()
            
            if text:  # Only include non-empty texts
                texts.append(text)
                valid_articles.append(article)
            else:
                # For articles with empty content+description, use title as fallback
                title = article.get("title", "").strip()
                if title:
                    texts.append(title)
                    valid_articles.append(article)
                    
        if not texts:
            return {
                'error': 'No valid text content found in any of the articles',
                'sentiment': {'label': 'UNKNOWN', 'confidence': 0.0},
                'related_tweets': []
            }
        
        # Prepare all texts in one batch

        print("texts", texts)
        
        # Get sentiment scores for all articles at once
        from .utils import sentiment_score        
        sentiment_results = sentiment_score(texts)
        
        # Assign scores back to the articles
        for index, article in enumerate(articles):
            article["score"] = sentiment_results[index]
        
        print("articles", articles)
        return articles
    
    except Exception as e:
        print("Error analyzing article:", e)
        return {
            'error': str(e),
            'sentiment': {
                'label': 'UNKNOWN',
                'confidence': 0.0
            },
            'related_tweets': []
        }

@app.get("/")
def root():
    return {"message": "✅ Server is running!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)