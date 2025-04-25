const axios = require('axios');

async function fetchMangaInfo(query) {
    try {
        const response = await axios.get(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=1`);
        const manga = response.data.data[0];
        let message = `*${manga.title}*\n${manga.synopsis}\nScore: ${manga.score}\nChapters: ${manga.chapters}\nStatus: ${manga.status}\nURL: ${manga.url}`;

        let recResponse;
        if (manga.genres && manga.genres.length > 0) {
            recResponse = await axios.get(`https://api.jikan.moe/v4/manga?genres=${manga.genres[0].mal_id}&limit=5`);
        } else {
            recResponse = await axios.get(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(manga.title)}&limit=5`);
        }

        const recs = recResponse.data.data.filter(m => m.mal_id !== manga.mal_id);
        if (recs.length > 0) {
            message += `\n\n*Recommendations:*`;
            for (const rec of recs) {
                message += `\n- ${rec.title} (${rec.url})`;
            }
        }

        return {
            message,
            imageUrl: manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url || '',
            title: manga.title,
            url: manga.url
        };
    } catch (error) {
        return { message: 'Manga not found.' };
    }
}

module.exports = { fetchMangaInfo };