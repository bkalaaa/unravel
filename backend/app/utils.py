import os
from datetime import datetime
from typing import Optional, List
from atproto import Client
from transformers import pipeline
import asyncio

# Reuse the zero-shot classifier pipeline across calls.
# (We use it here in sentiment_score as well.)
sentiment_classifier = pipeline("zero-shot-classification")

def fetch_bluesky_trending_window_sync(keyword: str, min_time: Optional[datetime] = None, sample_stride: int = 10, max_posts: int = 1000) -> List[dict]:
    client = Client()
    client.login(
        os.getenv("BLUESKY_USERNAME", "greenlavender.bsky.social"),
        os.getenv("BLUESKY_PASSWORD", "fa4v-uytk-f3ri-4uxi")
    )

    all_posts = []
    cursor = None
    try:
        # Paginate until we have max_posts or no cursor is returned.
        while len(all_posts) < max_posts:
            params = {'q': keyword, 'limit': 100}
            if cursor:
                params['cursor'] = cursor
            response = client.app.bsky.feed.search_posts(params)
            posts_raw = response.posts  # Use dot notation
            print(f"📥 Fetched {len(posts_raw)} posts for keyword: {keyword} (cursor: {cursor})")
            if not posts_raw:
                break
            all_posts.extend(posts_raw)
            cursor = response.cursor  # Use dot notation
            if not cursor:
                break
    except Exception as e:
        print(f"❌ Error fetching posts for keyword '{keyword}': {e}")
        return []

    sampled = []
    # Sample every sample_stride-th post from the accumulated posts.
    for i in range(0, len(all_posts), sample_stride):
        post = all_posts[i]
        try:
            created_at = post.indexed_at
            if min_time:
                dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                if dt < min_time:
                    continue
            sampled.append({
                "handle": post.author.handle,
                "displayName": getattr(post.author, "displayName", None),
                "createdAt": created_at,
                "content": post.record.text,
                "uri": post.uri
            })
        except Exception as err:
            print(f"⚠️ Skipping post due to parse error: {err}")
            continue

    return sampled

# Wrap the synchronous function to use in an async context.
async def fetch_bluesky_trending_window(keyword: str, min_time: Optional[datetime] = None, sample_stride: int = 10, max_posts: int = 1000):
    return await asyncio.to_thread(fetch_bluesky_trending_window_sync, keyword, min_time, sample_stride, max_posts)

def sentiment_score(texts):
    labels = ["very positive", "positive", "neutral", "negative", "very negative"]
    label_values = {
        "very positive": 5,
        "positive": 4,
        "neutral": 3,
        "negative": 2,
        "very negative": 1
    }

    weighted_scores = []
    try:
        results = sentiment_classifier(texts, candidate_labels=labels)
        if isinstance(results, list):
            for result in results:
                weighted_sum = sum(label_values[label] * score for label, score in zip(result["labels"], result["scores"]))
                weighted_scores.append(weighted_sum)
            return weighted_scores
    except Exception as e:
        print("⚠️ Sentiment fallback due to error:", e)

    # Fallback: process each text individually
    for text in texts:
        result = sentiment_classifier(text, candidate_labels=labels)
        weighted_sum = sum(label_values[label] * score for label, score in zip(result["labels"], result["scores"]))
        weighted_scores.append(weighted_sum)
    return weighted_scores
