const axios = require('axios');

async function searchAnimeOnAniList(query) {
    const url = 'https://graphql.anilist.co';
    const graphqlQuery = {
        query: `
        query ($search: String) {
            Media(search: $search, type: ANIME) {
                id
                title {
                    romaji
                    english
                }
                episodes
            }
        }`,
        variables: { search: query }
    };

    try {
        const response = await axios.post(url, graphqlQuery, {
            headers: { 'Content-Type': 'application/json' }
        });
        const media = response.data.data.Media;
        return {
            id: media.id,
            title: media.title.english || media.title.romaji,
            episodes: media.episodes
        };
    } catch (error) {
        return null;
    }
}

module.exports = { searchAnimeOnAniList };