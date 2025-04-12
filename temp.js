

NEWS_API_KEY = "e751a2f8c355493799ac4f68674a4af7";
const MAX_RESULTS = 100;
keywords = ["trump"];

const queryParams = new URLSearchParams({
    apiKey: NEWS_API_KEY,
    country: 'us',
    q: keywords.slice(0, 4).join(' OR '), // Use OR for first 4 keywords only
    pageSize: MAX_RESULTS,
});


const url = `https://newsapi.org/v2/top-headlines?${queryParams.toString()}`;

console.log(url);

