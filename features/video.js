const fs = require('fs');
const axios = require('axios');
const yts = require('yt-search');
const { execSync } = require('child_process');

async function handleVideoDownload(sock, sender, query) {
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
                title = 'YouTube Video';
                thumbnail = '';
            }
        }

        const outputTemplate = `temp_${Date.now()}.%(ext)s`;
        const command = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4" -o "${outputTemplate}" "${url}"`;
        console.log('Running command:', command);
        execSync(command, { stdio: 'inherit' });

        const outputFile = outputTemplate.replace('%(ext)s', 'mp4');
        const videoBuffer = fs.readFileSync(outputFile);

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
            video: videoBuffer,
            mimetype: 'video/mp4',
            fileName: `${title}.mp4`,
            jpegThumbnail: thumbBuffer,
            caption: title
        });

        fs.unlinkSync(outputFile);
    } catch (error) {
        console.error(error);
        await sock.sendMessage(sender, { text: 'Failed to download video.' });
    }
}

module.exports = { handleVideoDownload };