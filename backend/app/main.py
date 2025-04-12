from fastapi import FastAPI, Query
import snscrape.modules.twitter as sntwitter

app = FastAPI()

def scrape_tweets(query: str, max_results: int = 50):
    results = []
    for i, tweet in enumerate(sntwitter.TwitterSearchScraper(query).get_items()):
        if i >= max_results:
            break
        results.append({
            "date": tweet.date.strftime("%Y-%m-%d %H:%M:%S"),
            "username": tweet.user.username,
            "content": tweet.content,
            "retweetCount": tweet.retweetCount,
            "followersCount": tweet.user.followersCount,
            "location": tweet.user.location,
        })
    return results

@app.get("/scrape")
def scrape(query: str = Query(...), max_results: int = 50):
    tweets = scrape_tweets(query, max_results)
    return {"query": query, "tweets": tweets}

@app.get("/")
def root():
    return {"message": "✅ Server is running!"}