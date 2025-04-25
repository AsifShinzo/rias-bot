const axios = require('axios');

async function fetchLatestAnimeNews() {
    try {
        const response = await axios.get('https://api.jikan.moe/v4/anime?q=&order_by=score&sort=desc&limit=1');
        const anime = response.data.data[0];
        return { title: anime.title, url: anime.url };
    } catch {
        return null;
    }
}

module.exports = { fetchLatestAnimeNews };