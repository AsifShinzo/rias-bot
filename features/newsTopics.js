const fs = require('fs');
const path = require('path');
const axios = require('axios');

const subsPath = path.join(__dirname, '../subscriptions.json');
const NEWS_API_KEY = process.env.NEWS_API_KEY;

function loadSubs() {
    try {
        return JSON.parse(fs.readFileSync(subsPath, 'utf-8'));
    } catch {
        return {};
    }
}

function saveSubs(subs) {
    fs.writeFileSync(subsPath, JSON.stringify(subs, null, 2));
}

async function fetchNews(topic, country = 'us', language = 'en') {
    try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&language=${language}&apiKey=${NEWS_API_KEY}`;
        const res = await axios.get(url);
        const articles = res.data.articles.slice(0, 10);

        let newsText = '';
        let thumbBuffer = null;

        // Pick a random article with a unique image
        const uniqueImages = [];
        const articlesWithImages = [];

        for (const a of articles) {
            if (a.urlToImage && !uniqueImages.includes(a.urlToImage)) {
                uniqueImages.push(a.urlToImage);
                articlesWithImages.push(a);
            }
        }

        let chosenImageUrl = null;
        if (articlesWithImages.length > 0) {
            const randomArticle = articlesWithImages[Math.floor(Math.random() * articlesWithImages.length)];
            chosenImageUrl = randomArticle.urlToImage;
        }

        for (const a of articles) {
            newsText += `*${a.title}*\n${a.url}\n\n`;
        }

        if (chosenImageUrl) {
            try {
                const imgRes = await axios.get(chosenImageUrl, { responseType: 'arraybuffer' });
                thumbBuffer = Buffer.from(imgRes.data, 'binary');
            } catch {
                thumbBuffer = null;
            }
        }

        return { text: newsText.trim(), thumbnail: thumbBuffer };
    } catch (err) {
        console.error('News fetch error:', err.response?.data || err.message);
        return { text: 'Failed to fetch news.', thumbnail: null };
    }
}

module.exports = {
    loadSubs,
    saveSubs,
    fetchNews
};