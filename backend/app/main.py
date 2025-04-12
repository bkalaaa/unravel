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

@app.post("/analyze-article")
async def analyze_article(request: Request):

    articles = await request.json()
    try:

        # Prepare all texts in one batch and filter out empty texts
        texts = []
        valid_articles = []
        
        for article in articles:
            text = (article.get("content", "") or "") + " " + (article.get("description", "") or "")
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