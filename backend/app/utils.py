from atproto import Client

def fetch_bluesky_trending_window(keyword: str, limit: int = 10):
    client = Client()
    client.login('greenlavender.bsky.social', 'fa4v-uytk-f3ri-4uxi') 
    try:
        posts_raw = client.app.bsky.feed.search_posts({'q': keyword, 'limit': limit})['posts']
        print(f"📥 Fetched {len(posts_raw)} posts for keyword: {keyword}")
    except Exception as e:
        print(f"❌ Error fetching posts for keyword '{keyword}': {e}")
        return []

    results = []
    for post in posts_raw:
        try:
            results.append({
                "handle": post.author.handle,
                "displayName": getattr(post.author, "displayName", None),
                "createdAt": post.indexed_at,
                "content": post.record.text,
                "uri": post.uri
            })
        except Exception as err:
            print(f"⚠️ Skipping post due to parse error: {err}")
            continue

    return results

def sentiment_score(texts):
    from transformers import pipeline

    classifier = pipeline("zero-shot-classification")
    
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
        results = classifier(texts, candidate_labels=labels)
        if isinstance(results, list):
            for result in results:
                weighted_sum = sum(label_values[label] * score for label, score in zip(result["labels"], result["scores"]))
                weighted_scores.append(weighted_sum)
            return weighted_scores
    except:
        pass

    for text in texts:
        result = classifier(text, candidate_labels=labels)
        weighted_sum = sum(label_values[label] * score for label, score in zip(result["labels"], result["scores"]))
        weighted_scores.append(weighted_sum)

    return weighted_scores
