def sentiment_score(texts):
    from transformers import pipeline, AutoModelForSequenceClassification, AutoTokenizer
    
    # Initialize the classifier once
    classifier = pipeline("zero-shot-classification")
    
    # Define the sentiment labels and their numeric values
    labels = ["very positive", "positive", "neutral", "negative", "very negative"]
    label_values = {
        "very positive": 5,
        "positive": 4,
        "neutral": 3,
        "negative": 2,
        "very negative": 1
    }
    
    # Process all texts in one batch if possible
    # Note: Some pipelines support batching natively, but zero-shot might not
    # If the classifier supports batching:
    try:
        results = classifier(texts, candidate_labels=labels)
        # If it returns a list of results
        if isinstance(results, list):
            weighted_scores = []
            for result in results:
                weighted_sum = sum(label_values[label] * score for label, score in zip(result["labels"], result["scores"]))
                weighted_scores.append(weighted_sum)
            return weighted_scores
    except:
        pass
    
    # Fallback: process one by one if batching isn't supported
    weighted_scores = []
    for text in texts:
        result = classifier(text, candidate_labels=labels)
        
        # Calculate weighted score
        weighted_sum = sum(label_values[label] * score for label, score in zip(result["labels"], result["scores"]))
        weighted_scores.append(weighted_sum)
    
    return weighted_scores