from transformers import pipeline


def analyze_sentiment(text):
    try:
        sentiment_pipeline = pipeline("sentiment-analysis")
        
        # Pass the text to the pipeline
        result = sentiment_pipeline(text)
        label = result[0]['label']
        score = result[0]['score']

        return {
            'label': label,           # 'POSITIVE' or 'NEGATIVE'
            'confidence': score       # Between 0 and 1
        }

    except Exception as e:
        print("Error during sentiment analysis:", e)
        return {
            'label': 'UNKNOWN',
            'confidence': 0.0
        }
    