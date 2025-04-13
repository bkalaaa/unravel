from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta, timezone
from transformers import pipeline
from .utils import fetch_bluesky_trending_window, sentiment_score
from pydantic import BaseModel
from typing import List
from collections import defaultdict


app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any Chrome extension
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pipelines
zero_shot = pipeline("zero-shot-classification")
sentiment_pipeline = pipeline("sentiment-analysis")  # Optional: default sentiment

# Request body model
class TrendingRequest(BaseModel):
    keywords: List[str]
    bucket_interval: int = 60  # minutes
    max_hours_back: int = 12

@app.post("/bluesky_trending")
async def bluesky_trending(data: TrendingRequest):
    now = datetime.now(timezone.utc)
    interval = timedelta(minutes=data.bucket_interval)

    # Generate time buckets
    buckets = [
        now - i * interval for i in range(data.max_hours_back)
    ]
    buckets.reverse()

    bucketed_scores = defaultdict(list)

    for keyword in data.keywords:
        print(f"🔍 Searching for: {keyword}")
        posts = fetch_bluesky_trending_window(keyword, limit=100)

        for post in posts:
            try:
                post_time = datetime.fromisoformat(post["createdAt"].replace("Z", "+00:00"))
                text = post["content"].strip()
                if not text:
                    continue

                # Determine bucket
                for i in range(len(buckets) - 1):
                    start = buckets[i]
                    end = buckets[i + 1]
                    if start <= post_time < end:
                        # Relevance filter
                        result = zero_shot(
                            text,
                            candidate_labels=data.keywords
                        )
                        if result["scores"][0] >= 0.7:
                            score = sentiment_score([text])[0]
                            bucketed_scores[start.isoformat()].append(score)
                        break
            except Exception as e:
                print("⚠️ Post filtering error:", e)

    # Build output
    time_series = []
    for t in buckets[:-1]:
        key = t.isoformat()
        scores = bucketed_scores[key]
        avg = sum(scores) / len(scores) if scores else 0.0
        time_series.append({
            "bucket_time": key,
            "average_sentiment": avg,
            "count": len(scores)
        })

    return {
        "keywords": data.keywords,
        "bucket_interval_minutes": data.bucket_interval,
        "results": time_series
    }

@app.post("/analyze-article")
async def analyze_article(request: Request):
    try:
        articles = await request.json()

        # Prepare texts
        texts = []
        valid_articles = []
        
        for article in articles:
            text = (article.get("content", "") or "") + " " + (article.get("description", "") or "") + " " + (article.get("title", "") or "")
            text = text.strip()
            
            if text:
                texts.append(text)
                valid_articles.append(article)
            else:
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

        print("texts", texts)
        sentiment_results = sentiment_score(texts)

        # Attach scores
        for index, article in enumerate(valid_articles):
            article["score"] = sentiment_results[index]

        print("articles", valid_articles)
        return valid_articles

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