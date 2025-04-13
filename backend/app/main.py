from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta, timezone
from transformers import pipeline
import asyncio
from .utils import fetch_bluesky_trending_window, sentiment_score
from pydantic import BaseModel
from typing import List
from collections import defaultdict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pipelines (initialized once)
zero_shot = pipeline("zero-shot-classification")
sentiment_pipeline = pipeline("sentiment-analysis")  # Optional; not directly used below

# Request model for the endpoint
class TrendingRequest(BaseModel):
    keywords: List[str]
    bucket_interval: int = 60  # in minutes
    max_hours_back: int = 12

@app.post("/bluesky_trending")
async def bluesky_trending(data: TrendingRequest):
    try:
        now = datetime.now(timezone.utc)
        interval = timedelta(minutes=data.bucket_interval)
        earliest_time = now - timedelta(hours=data.max_hours_back)

        # Create time buckets (oldest to newest)
        buckets = [now - i * interval for i in range(data.max_hours_back)]
        buckets.reverse()

        bucketed_scores = defaultdict(list)
        bucket_lock = asyncio.Lock()

        async def process_keyword(keyword):
            try:
                # Fetch posts for this keyword with pagination (up to 500 posts) and sample every 10th post
                posts = await fetch_bluesky_trending_window(
                    keyword, min_time=earliest_time, sample_stride=10, max_posts=300
                )
                texts_for_relevance = []
                post_refs = []

                for post in posts:
                    try:
                        text = post["content"].strip()
                        post_time = datetime.fromisoformat(
                            post["createdAt"].replace("Z", "+00:00")
                        )
                        if not text or post_time < earliest_time:
                            continue
                        texts_for_relevance.append(text)
                        post_refs.append((text, post_time))
                    except Exception as e:
                        print(f"⚠️ Skipping post: {e}")
                if not texts_for_relevance:
                    return

                # Batch zero-shot classification (using candidate keywords)
                relevance_results = zero_shot(
                    texts_for_relevance, candidate_labels=data.keywords
                )

                accepted_texts = []
                accepted_times = []
                for i, result in enumerate(relevance_results):
                    if result["scores"][0] >= 0.7:
                        accepted_texts.append(post_refs[i][0])
                        accepted_times.append(post_refs[i][1])

                # Batch sentiment analysis on accepted texts
                sentiment_scores = sentiment_score(accepted_texts)

                async with bucket_lock:
                    for score, timestamp in zip(sentiment_scores, accepted_times):
                        # Assign each accepted post to its correct bucket
                        for i in range(len(buckets) - 1):
                            start = buckets[i]
                            end = buckets[i + 1]
                            if start <= timestamp < end:
                                key = start.isoformat()
                                bucketed_scores[key].append(score)
                                scores = bucketed_scores[key]
                                avg = sum(scores) / len(scores) if scores else 0.0
                                # Compute human-friendly label
                                hours_back = int((now - start).total_seconds() // 3600)
                                label = f"{hours_back} hours back"
                                print(
                                    f"🧾 [Bucket {label}] Updated avg sentiment: {avg:.3f} from {len(scores)} posts"
                                )
                                break
            except Exception as e:
                print(f"❌ Error processing keyword '{keyword}': {e}")

        # Run processing for all keywords concurrently
        await asyncio.gather(*[process_keyword(keyword) for keyword in data.keywords])

        # Build the final time series from the buckets
        time_series = []
        for t in buckets[:-1]:
            key = t.isoformat()
            scores = bucketed_scores[key]
            avg = sum(scores) / len(scores) if scores else 0.0
            hours_back = int((now - t).total_seconds() // 3600)
            label = f"{hours_back} hours back"
            time_series.append({
                "bucket_label": label,
                "bucket_time_iso": key,
                "average_sentiment": avg,
                "count": len(scores)
            })

        return {
            "keywords": data.keywords,
            "bucket_interval_minutes": data.bucket_interval,
            "results": time_series
        }
    except Exception as e:
        print("❌ Error in /bluesky_trending endpoint:", e)
        return {
            "error": str(e),
            "bucket_interval_minutes": data.bucket_interval,
            "results": []
        }

@app.post("/analyze-article")
async def analyze_article(request: Request):
    try:
        articles = await request.json()
        texts = []
        valid_articles = []

        for article in articles:
            text = " ".join([
                article.get("content", ""),
                article.get("description", ""),
                article.get("title", "")
            ]).strip()
            if text:
                texts.append(text)
                valid_articles.append(article)

        if not texts:
            return {
                'error': 'No valid text content found',
                'sentiment': {'label': 'UNKNOWN', 'confidence': 0.0},
                'related_tweets': []
            }
        sentiment_results = sentiment_score(texts)
        for i, article in enumerate(valid_articles):
            article["score"] = sentiment_results[i]
        return valid_articles

    except Exception as e:
        print("Error analyzing article:", e)
        return {
            'error': str(e),
            'sentiment': {'label': 'UNKNOWN', 'confidence': 0.0},
            'related_tweets': []
        }

@app.get("/")
def root():
    return {"message": "✅ Server is running!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
