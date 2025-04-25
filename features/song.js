const fs = require('fs');
const axios = require('axios');
const yts = require('yt-search');
const { execSync } = require('child_process');

async function handleSongDownload(sock, sender, query) {
    try {
        let url = query.trim();
        let title = '';
        let thumbnail = '';

        if (!/^https?:\/\//i.test(url)) {
            const searchResult = await yts(url);
            if (!searchResult.videos.length) {
                await sock.sendMessage(sender, { text: 'No results found on YouTube.' });
                return;
            }
            const video = searchResult.videos[0];
            url = video.url;
            title = video.title;
            thumbnail = video.thumbnail;
        } else {
            const searchResult = await yts(url);
            if (searchResult.videos.length) {
                const video = searchResult.videos[0];
                title = video.title;
                thumbnail = video.thumbnail;
            } else {
                title = 'YouTube Audio';
                thumbnail = '';
            }
        }

        const outputTemplate = `temp_${Date.now()}.%(ext)s`;
        const command = `yt-dlp -f bestaudio --extract-audio --audio-format mp3 --embed-thumbnail --add-metadata --audio-quality 0 -o "${outputTemplate}" "${url}"`;
        console.log('Running command:', command);
        execSync(command, { stdio: 'inherit' });

        const outputFile = outputTemplate.replace('%(ext)s', 'mp3');
        const audioBuffer = fs.readFileSync(outputFile);

        let thumbBuffer = null;
        try {
            if (thumbnail) {
                const thumbResponse = await axios.get(thumbnail, { responseType: 'arraybuffer' });
                thumbBuffer = Buffer.from(thumbResponse.data, 'binary');
            }
        } catch {
            thumbBuffer = null;
        }

        await sock.sendMessage(sender, {
            audio: audioBuffer,
            mimetype: 'audio/mp4',
            ptt: false,
            fileName: `${title}.mp3`,
            jpegThumbnail: thumbBuffer,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: 'Downloaded via Rias Bot',
                    thumbnail: thumbBuffer,
                    mediaUrl: url,
                    mediaType: 2,
                    renderLargerThumbnail: true,
                    showAdAttribution: false
                }
            }
        });

        fs.unlinkSync(outputFile);
    } catch (error) {
        console.error(error);
        await sock.sendMessage(sender, { text: 'Failed to download song.' });
    }
}

module.exports = { handleSongDownload };