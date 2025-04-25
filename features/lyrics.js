const axios = require('axios');

async function handleLyrics(sock, sender, query) {
    try {
        const parts = query.split('-');
        if (parts.length < 2) {
            await sock.sendMessage(sender, { text: 'Please provide the song as "artist - title". Example:\n#lyrics Adele - Hello' });
            return;
        }
        const artist = parts[0].trim();
        const title = parts.slice(1).join('-').trim();

        const response = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
        const lyrics = response.data.lyrics;

        if (!lyrics) {
            await sock.sendMessage(sender, { text: 'Lyrics not found.' });
            return;
        }

        const maxLength = 4000;
        if (lyrics.length > maxLength) {
            const parts = lyrics.match(new RegExp(`.{1,${maxLength}}`, 'g'));
            for (const part of parts) {
                await sock.sendMessage(sender, { text: part });
            }
        } else {
            await sock.sendMessage(sender, { text: lyrics });
        }
    } catch (error) {
        console.error('Error fetching lyrics:', error.message);
        await sock.sendMessage(sender, { text: 'Failed to fetch lyrics. Please check the artist and title.' });
    }
}

module.exports = { handleLyrics };