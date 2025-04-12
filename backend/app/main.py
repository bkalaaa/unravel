from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*"],  # Allows requests from any Chrome extension
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sentiment_pipeline = pipeline("sentiment-analysis")

@app.post("/analyze-article")
async def analyze_article(articles):
    try:
        analyzethis = []
        for i in range(len(articles)):
            text = articles[i]["content"] + articles[i]["description"]
            analyzethis.append(text)
            
        # Extract text from article
        from utils import sentiment_score        
        sentiment_result = sentiment_score(analyzethis)
        # Get sentiment analysis
        for index in range(len(articles)):
            articles[index]["score"] = sentiment_result[index]

        # Get related tweets for context
        # tweets = scrape_tweets(article.get('title', ''), max_results=5)
        
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