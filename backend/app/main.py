import requests
from datetime import date
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

sentiment_pipeline = pipeline("sentiment-analysis")

@app.get("/time-graph")
async def time_graph(keyword: str):
    websites = 'wsj.com, aljazeera.com, bbc.co.uk , nytimes.com, bloomberg.com, cnn.com, foxnews.com, reuters.com ,washingtonpost.com'
    # make website non list
    startDate = date.today()
    endDate = startDate.copy().replace(month=startDate.month - 1 if startDate.month > 1 else 12)
    try:        
        print("attempting to fetch frequency data with , keyword:", keyword)
        response = await requests.get("https://newsapi.org/v2/everything", params={
            'q': keyword,
            'domains': websites,
            'sortBy': 'popularity',
            'pageSize': 100,
            'language': 'en',
            'from': startDate,
            'to': endDate,
            'sources': websites,
            'apiKey': 'replace'})
        if response.status_code != 200:
            return {'error': 'Failed to fetch data from NewsAPI'}
        print("response", response)
        data = response.json()
        fullarticles = data.get('articles', [])
        if not fullarticles:
            return {'error': 'No articles found for the given keyword'}

        return fullarticles


    except Exception as e:
        print("Error fetching data:", e)
        return {'error': 'An error occurred while fetching data'}



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