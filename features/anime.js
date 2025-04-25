const axios = require('axios');

async function fetchAnimeInfo(query) {
    try {
        const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
        const anime = response.data.data[0];
        let message = `*${anime.title}*\n${anime.synopsis}\nScore: ${anime.score}\nEpisodes: ${anime.episodes}\nURL: ${anime.url}`;

        let recResponse;
        if (anime.genres && anime.genres.length > 0) {
            recResponse = await axios.get(`https://api.jikan.moe/v4/anime?genres=${anime.genres[0].mal_id}&limit=5`);
        } else {
            recResponse = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(anime.title)}&limit=5`);
        }

        const recs = recResponse.data.data.filter(a => a.mal_id !== anime.mal_id);
        if (recs.length > 0) {
            message += `\n\n*Recommendations:*`;
            for (const rec of recs) {
                message += `\n- ${rec.title} (${rec.url})`;
            }
        }

        return {
            message,
            imageUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '',
            title: anime.title,
            url: anime.url
        };
    } catch (error) {
        return { message: 'Anime not found.' };
    }
}

module.exports = { fetchAnimeInfo };