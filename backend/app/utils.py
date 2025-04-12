def sentiment_score(analyzethis):
    from transformers import pipeline, AutoModelForSequenceClassification, AutoTokenizer
    
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
    res = []
    for text in analyzethis:
        result = classifier(text, candidate_labels=labels)
        
        # Get the scores and labels from the result
        scores = result["scores"]
        predicted_labels = result["labels"]

        # Weighted average: sum(score * value) / sum(scores)
        weighted_sum = 0
        total_score = 0
        for label, score in zip(predicted_labels, scores):
            value = label_values[label]
            weighted_sum += value * score
            total_score += score
        
        res.append(weighted_sum)

    return res