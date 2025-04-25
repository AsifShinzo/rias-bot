const { geminiChatReply } = require('./chat');
const { fetchAnimeInfo } = require('./anime');
const { fetchMangaInfo } = require('./manga');
const { handleLyrics } = require('./lyrics');
const { handleSongDownload } = require('./song');
const { handleVideoDownload } = require('./video');
const { handleStickerCommand } = require('./sticker');
const { getActivePrefixes, setPrefix, togglePrefixMode } = require('./prefixConfig');

async function handleCommand(sock, msg, messageContent, sender, isGroup, senderName, groupName, ENABLED_FEATURES) {
    messageContent = messageContent.trimStart();
    const prefixes = getActivePrefixes();
    if (!prefixes.some(p => messageContent.startsWith(p))) {
        if (!isGroup && ENABLED_FEATURES.geminiChat) {
            const reply = await geminiChatReply(messageContent);
            await sock.sendMessage(sender, { text: reply });
        }
        return;
    }

    // Show typing indicator
    await sock.sendPresenceUpdate('composing', sender);

    const prefixUsed = prefixes.find(p => messageContent.startsWith(p));
    const args = messageContent.slice(prefixUsed.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();


    switch (command) {
        case 'help': {
            const currentPrefixes = getActivePrefixes();
            const prefix = currentPrefixes[0] || '#';

            let thumbBuffer = null;
            try {
                thumbBuffer = require('fs').readFileSync('assets/Rias Gremory.jpg');
            } catch {
                thumbBuffer = null;
            }

            await sock.sendMessage(sender, {
                text: `╔══✦ *Rias Bot Commands* ✦══╗\n` +
                      `\n` +
                      `🔎 *${prefix}anime <name>*\n` +
                      `_Fetch anime info_\n` +
                      `\n` +
                      `📚 *${prefix}manga <name>*\n` +
                      `_Fetch manga info_\n` +
                      `\n` +
                      `✨ *${prefix}sticker (reply media) | pack | author*\n` +
                      `_Create sticker with optional pack and author_\n` +
                      `\n` +
                      `🖼️ *${prefix}steal (reply sticker) | pack | author*\n` +
                      `_Steal sticker with optional pack and author_\n` +
                      `\n` +
                      `🎵 *${prefix}song <YouTube URL or search>*\n` +
                      `_Download song_\n` +
                      `\n` +
                      `🎥 *${prefix}video <YouTube URL or search>*\n` +
                      `_Download video_\n` +
                      `\n` +
                      `🎤 *${prefix}lyrics <song name>*\n` +
                      `_Fetch song lyrics_\n` +
                      `\n` +
                      `📰 *${prefix}news topic*\n` +
                      `_Get latest headlines on any topic (science, tech, geopolitics, etc)_\n` +
                      `\n` +
                      `📰 *${prefix}animenews*\n` +
                      `_Toggle anime news alerts_\n` +
                      `\n` +
                      `❓ *${prefix}help*\n` +
                      `_Show this help message_\n` +
                      `\n` +
                      `╔══✦ *Admin Commands* ✦══╗\n` +
                      `\n` +
                      `🚫 *${prefix}kick @user*\n` +
                      `_Remove a user from the group_\n` +
                      `\n` +
                      `⭐ *${prefix}promote @user*\n` +
                      `_Promote a user to admin_\n` +
                      `\n` +
                      `⬇️ *${prefix}demote @user*\n` +
                      `_Demote an admin to user_\n` +
                      `\n` +
                      `╔══✦ *Owner Commands* ✦══╗\n` +
                      `\n` +
                      `⚙️ *${prefix}prefixmode multi|single*\n` +
                      `_Toggle prefix mode_\n` +
                      `\n` +
                      `✏️ *${prefix}setprefix $*\n` +
                      `_Set single prefix_\n` +
                      `\n` +
                      `🤖 *${prefix}gemini*\n` +
                      `_Toggle Gemini chatbot_\n` +
                      `\n` +
                      `🛡️ *${prefix}cooldown*\n` +
                      `_Toggle cooldown anti-spam_\n` +
                      `╚════════════════════╝`,
                contextInfo: {
                    externalAdReply: {
                        title: 'Rias Bot Help',
                        body: 'crafted by yours truly <3',
                        thumbnail: thumbBuffer,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        showAdAttribution: false
                    }
                }
            });
            break;
        }
        case 'kick':
        case 'promote':
        case 'demote': {
            if (!isGroup) {
                await sock.sendMessage(sender, { text: 'This command can only be used in groups.' });
                break;
            }
            const metadata = await sock.groupMetadata(sender);
            const senderId = msg.key.participant || msg.key.remoteJid;
            const senderIsOwner = senderId.replace(/@.+/, '') === process.env.OWNER_NUMBER;
            const senderIsAdmin = metadata.participants.some(p => p.id === senderId && p.admin);

            if (!senderIsAdmin && !senderIsOwner) {
                await sock.sendMessage(sender, { text: 'Only group admins or the bot owner can use this command.' });
                break;
            }
            if (args.length === 0 || !args[0].includes('@')) {
                await sock.sendMessage(sender, { text: 'Please mention a user.' });
                break;
            }
            const targetId = args[0].replace(/[@\s]/g, '') + '@s.whatsapp.net';

            if (command === 'kick') {
                await sock.groupParticipantsUpdate(sender, [targetId], 'remove');
                await sock.sendMessage(sender, { text: 'User removed.' });
            } else if (command === 'promote') {
                await sock.groupParticipantsUpdate(sender, [targetId], 'promote');
                await sock.sendMessage(sender, { text: 'User promoted to admin.' });
            } else if (command === 'demote') {
                await sock.groupParticipantsUpdate(sender, [targetId], 'demote');
                await sock.sendMessage(sender, { text: 'User demoted from admin.' });
            }
            break;
        }
        case 'anime':
            if (args.length === 0) {
                await sock.sendMessage(sender, { text: 'Please provide an anime name. Example: #anime Naruto' });
            } else {
                const progress = await sock.sendMessage(sender, { text: 'Fetching anime info, please wait...' });
                await sock.sendPresenceUpdate('composing', sender);
                const animeData = await fetchAnimeInfo(args.join(' '));
                if (animeData.message.includes('not found')) {
                    await sock.sendMessage(sender, { text: animeData.message });
                    break;
                }
                let thumbBuffer = null;
                try {
                    if (animeData.imageUrl) {
                        const thumbResponse = await require('axios').get(animeData.imageUrl, { responseType: 'arraybuffer' });
                        thumbBuffer = Buffer.from(thumbResponse.data, 'binary');
                    }
                } catch {
                    thumbBuffer = null;
                }
                await sock.sendMessage(sender, {
                    text: animeData.message,
                    jpegThumbnail: thumbBuffer,
                    contextInfo: {
                        externalAdReply: {
                            title: animeData.title,
                            body: 'Downloaded via Rias Bot',
                            thumbnail: thumbBuffer,
                            mediaUrl: animeData.url,
                            mediaType: 1,
                            renderLargerThumbnail: true,
                            showAdAttribution: false
                        }
                    }
                });
            }
            break;
        case 'manga':
            if (args.length === 0) {
                await sock.sendMessage(sender, { text: 'Please provide a manga name. Example: #manga One Piece' });
            } else {
                const progress = await sock.sendMessage(sender, { text: 'Fetching manga info, please wait...' });
                await sock.sendPresenceUpdate('composing', sender);
                const mangaData = await fetchMangaInfo(args.join(' '));
                if (mangaData.message.includes('not found')) {
                    await sock.sendMessage(sender, { text: mangaData.message });
                    break;
                }
                let thumbBuffer = null;
                try {
                    if (mangaData.imageUrl) {
                        const thumbResponse = await require('axios').get(mangaData.imageUrl, { responseType: 'arraybuffer' });
                        thumbBuffer = Buffer.from(thumbResponse.data, 'binary');
                    }
                } catch {
                    thumbBuffer = null;
                }
                await sock.sendMessage(sender, {
                    text: mangaData.message,
                    jpegThumbnail: thumbBuffer,
                    contextInfo: {
                        externalAdReply: {
                            title: mangaData.title,
                            body: 'Downloaded via Rias Bot',
                            thumbnail: thumbBuffer,
                            mediaUrl: mangaData.url,
                            mediaType: 1,
                            renderLargerThumbnail: true,
                            showAdAttribution: false
                        }
                    }
                });
            }
            break;
        case 'sticker': {
            if (!ENABLED_FEATURES.stickerMaker) break;

            const argStr = args.join(' ');
            let pack = 'Rias Gremory';
            let author = 'bones';

            if (argStr.includes('|')) {
                const parts = argStr.split('|').map(s => s.trim());
                pack = parts[0] || pack;
                author = parts[1] || author;
            }

            await handleStickerCommand(sock, msg, require('@whiskeysockets/baileys').downloadMediaMessage, { pack, author });
            break;
        }
        case 'song':
            if (args.length === 0) {
                await sock.sendMessage(sender, { text: 'Please provide a YouTube URL or search term. Example: #song Never Gonna Give You Up' });
            } else {
                await sock.sendMessage(sender, { text: 'Fetching song, please wait...' });
                await sock.sendPresenceUpdate('composing', sender);
                await handleSongDownload(sock, sender, args.join(' '));
            }
            break;
        case 'video':
            if (args.length === 0) {
                await sock.sendMessage(sender, { text: 'Please provide a YouTube URL or search term. Example: #video Never Gonna Give You Up' });
            } else {
                await sock.sendMessage(sender, { text: 'Fetching video, please wait...' });
                await sock.sendPresenceUpdate('composing', sender);
                await handleVideoDownload(sock, sender, args.join(' '));
            }
            break;
        case 'lyrics':
            if (args.length === 0) {
                await sock.sendMessage(sender, { text: 'Please provide a song name. Example: #lyrics Adele - Hello' });
            } else {
                await sock.sendMessage(sender, { text: 'Fetching lyrics, please wait...' });
                await sock.sendPresenceUpdate('composing', sender);
                await handleLyrics(sock, sender, args.join(' '));
            }
            break;
        case 'animenews':
            ENABLED_FEATURES.animeNews = !ENABLED_FEATURES.animeNews;
            await sock.sendMessage(sender, { text: `Anime news alerts are now ${ENABLED_FEATURES.animeNews ? 'enabled' : 'disabled'}.` });
            break;
        case 'news': {
            const { fetchNews } = require('./newsTopics');
            const topic = args.join(' ');
            if (!topic) {
                await sock.sendMessage(sender, { text: 'Usage: #news topic' });
                break;
            }
            const { text, thumbnail } = await fetchNews(topic, 'us', 'en');
            await sock.sendMessage(sender, {
                text: `📰 *${topic.toUpperCase()} News:*\n\n${text}`,
                contextInfo: {
                    externalAdReply: {
                        title: `${topic.toUpperCase()} News`,
                        body: 'Latest headlines',
                        thumbnail,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        showAdAttribution: false
                    }
                }
            });
            break;
        }
        case 'prefixmode':
        case 'setprefix': {
            const senderId = msg.key.participant || msg.key.remoteJid;
            const senderIsOwner = senderId.replace(/@.+/, '') === process.env.OWNER_NUMBER;

            if (!senderIsOwner) {
                await sock.sendMessage(sender, { text: 'Only the bot owner can use this command.' });
                break;
            }

            if (command === 'prefixmode') {
                if (args.length === 0 || !['multi', 'single'].includes(args[0].toLowerCase())) {
                    await sock.sendMessage(sender, { text: 'Usage: #prefixmode multi|single' });
                } else {
                    togglePrefixMode(args[0].toLowerCase());
                    await sock.sendMessage(sender, { text: `Prefix mode set to ${args[0].toLowerCase()}` });
                }
            } else if (command === 'setprefix') {
                if (args.length === 0 || args[0].length !== 1) {
                    await sock.sendMessage(sender, { text: 'Usage: #setprefix $ (single character only)' });
                } else {
                    setPrefix(args[0]);
                    await sock.sendMessage(sender, { text: `Single prefix set to ${args[0]}` });
                }
            }
            break;
        }
        case 'gemini': {
            const senderId = msg.key.participant || msg.key.remoteJid;
            const senderIsOwner = senderId.replace(/@.+/, '') === process.env.OWNER_NUMBER;

            if (!senderIsOwner) {
                await sock.sendMessage(sender, { text: 'Only the bot owner can toggle Gemini chat.' });
                break;
            }

            ENABLED_FEATURES.geminiChat = !ENABLED_FEATURES.geminiChat;
            await sock.sendMessage(sender, { text: `Gemini chat is now ${ENABLED_FEATURES.geminiChat ? 'enabled' : 'disabled'}.` });
            break;
        }
        case 'steal': {
            const argStr = args.join(' ');
            let pack = 'Rias Gremory';
            let author = 'bones';

            if (argStr.includes('|')) {
                const parts = argStr.split('|').map(s => s.trim());
                pack = parts[0] || pack;
                author = parts[1] || author;
            }

            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted || !quoted.stickerMessage) {
                await sock.sendMessage(sender, { text: 'Reply to a sticker with #steal [pack | author]' });
                break;
            }

            const stickerBuffer = await require('@whiskeysockets/baileys').downloadMediaMessage(
                { message: quoted },
                'buffer'
            );

            const { Sticker, StickerTypes } = require('wa-sticker-formatter');
            const sticker = new Sticker(stickerBuffer, {
                pack,
                author,
                type: StickerTypes.FULL,
                quality: 50
            });

            const buffer = await sticker.toBuffer();
            await sock.sendMessage(sender, { sticker: buffer }, { quoted: msg });
            break;
        }
        case 'cooldown': {
            const senderId = msg.key.participant || msg.key.remoteJid;
            const senderIsOwner = senderId.replace(/@.+/, '') === process.env.OWNER_NUMBER;

            if (!senderIsOwner) {
                await sock.sendMessage(sender, { text: 'Only the bot owner can toggle cooldown.' });
                break;
            }

            global.COOLDOWN_ENABLED = !global.COOLDOWN_ENABLED;
            await sock.sendMessage(sender, { text: `Cooldown is now ${global.COOLDOWN_ENABLED ? 'enabled' : 'disabled'}.` });
            break;
        }
        default:
            await sock.sendMessage(sender, { text: 'Unknown command. Type #help for commands.' });
    }
}

module.exports = { handleCommand };