const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require('fs');
const path = require('path');
const subsFile = path.join(__dirname, 'subscriptions.json');
const axios = require('axios');
const yts = require('yt-search');
const { execSync } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');
const figlet = require('figlet');
const chalk = require('chalk');
const qrcode = require('qrcode-terminal');
const { fetchMangaInfo } = require('./features/manga');
const { searchAnimeOnAniList } = require('./anilist');
const { fetchAnimeInfo } = require('./features/anime');
const { handleLyrics } = require('./features/lyrics');
const { handleSongDownload } = require('./features/song');
const { handleVideoDownload } = require('./features/video');
const { handleStickerCommand } = require('./features/sticker');
const { fetchLatestAnimeNews } = require('./features/news');
const { handleCommand } = require('./features/commands');
const { geminiChatReply } = require('./features/chat');

ffmpeg.setFfmpegPath(ffmpegPath);

const pino = require('pino');

const BOT_NAME = 'Rias';
const COMMAND_PREFIX = '#';
require('dotenv').config();
const ENABLED_FEATURES = {
    animeNews: true,
    stickerMaker: true,
    songDownloader: true,
    geminiChat: false
};

console.clear();
console.log(
    chalk.red(
        figlet.textSync(BOT_NAME, {
            font: 'Standard',
            horizontalLayout: 'default',
            verticalLayout: 'default'
        })
    )
);
console.log(chalk.green('Bot starting...'));

global.COOLDOWN_ENABLED = true;

const userCooldowns = {};
const userPenalties = {};

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'error' }) // suppress Baileys logs except errors
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('Scan this QR code with WhatsApp:');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
            console.log('connection closed due to', lastDisconnect?.error, ', reconnecting', !isLoggedOut);

            if (isLoggedOut) {
                console.log('Session invalid or logged out. Clearing saved session...');
                try {
                    fs.rmSync('auth_info', { recursive: true, force: true });
                    console.log('Session cleared. Please scan the new QR code.');
                } catch (e) {
                    console.error('Failed to clear session:', e);
                }
                startBot();
            } else {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('Bot connected');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const msg of messages) {
            if (!msg.message) continue;
            const sender = msg.key.remoteJid;
            const isGroup = sender.endsWith('@g.us');
            const messageContentRaw =
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                msg.message.imageMessage?.caption ||
                msg.message.videoMessage?.caption ||
                msg.message.documentMessage?.caption ||
                '';

            // Cooldown check
            const userId = msg.key.participant || sender;
            const now = Date.now();

            const isOwner = userId.replace(/@.+/, '') === process.env.OWNER_NUMBER;

            if (!isOwner && global.COOLDOWN_ENABLED) {
                if (!userCooldowns[userId]) userCooldowns[userId] = 0;
                if (!userPenalties[userId]) userPenalties[userId] = { penalty: 3000, lastWarnTime: 0 };

                // Reset penalty if user was quiet for 30 minutes
                if (now - userPenalties[userId].lastWarnTime > 30 * 60 * 1000) {
                    userPenalties[userId].penalty = 3000;
                }

                if (now < userCooldowns[userId]) {
                    const waitSeconds = Math.ceil((userCooldowns[userId] - now) / 1000);
                    await sock.sendMessage(sender, { text: `You are temporarily muted for spamming. Please wait ${waitSeconds} seconds.` });
                    continue; // ignore message during cooldown
                }
            }

            // Clean "try:" prefix if present
            let messageContent = messageContentRaw;
            if (messageContent.startsWith('try:')) {
                messageContent = messageContent.slice(4).trimStart();
            }


            // Fetch sender and group names
            let senderName = 'Unknown';
            let groupName = '';
            try {
                const metadata = isGroup ? await sock.groupMetadata(sender) : null;
                if (isGroup) {
                    groupName = metadata.subject;
                    const participant = metadata.participants.find(p => p.id === msg.key.participant);
                    senderName = participant?.notify || participant?.id || 'Unknown';
                } else {
                    const contact = await sock.onWhatsApp(sender);
                    senderName = contact?.[0]?.notify || sender;
                }
            } catch {
                senderName = sender;
            const { loadSubs, fetchNews } = require('./features/newsTopics');
            
            setInterval(async () => {
                const subs = loadSubs();
                for (const userId in subs) {
                    const user = subs[userId];
                    for (const topic of user.topics) {
                        const news = await fetchNews(topic, user.country, user.language);
                        await sock.sendMessage(userId, { text: `📰 *${topic.toUpperCase()} News:*\n\n${news}` });
                    }
                }
            }, 12 * 60 * 60 * 1000); // every 12 hours
            
            }

            const cleanMessage = messageContent.startsWith('try:') ? messageContent.slice(4).trimStart() : messageContent;

            console.log(
                chalk.yellow(`[${isGroup ? 'Group' : 'Private'}]`) +
                chalk.cyan(` ${isGroup ? groupName : senderName}: `) +
                chalk.white(cleanMessage)
            );

            const prefixes = ['#', '/', '!'];
            if (!prefixes.some(p => messageContent.trimStart().startsWith(p))) {
                // Handle Gemini chatbot in DM
                if (!isGroup && ENABLED_FEATURES.geminiChat) {
                    const reply = await geminiChatReply(messageContent);
                    await sock.sendMessage(sender, { text: reply });
                }
                continue;
            }

            console.log('Calling handleCommand...');
            await handleCommand(sock, msg, messageContent, sender, isGroup, senderName, groupName, ENABLED_FEATURES);
            console.log('handleCommand finished.');

            // Set cooldown for this user (e.g., 2 seconds)
            // Set or increase cooldown if user is spamming
            if (!userPenalties[userId]) userPenalties[userId] = { penalty: 3000, lastWarnTime: 0 };

            if (userPenalties[userId].penalty < 5 * 60 * 1000) { // max 5 min
                userPenalties[userId].penalty = Math.min(userPenalties[userId].penalty * 2, 5 * 60 * 1000);
            }
            userPenalties[userId].lastWarnTime = Date.now();
            userCooldowns[userId] = Date.now() + userPenalties[userId].penalty;
        }
    });

    const sentAnimeNews = new Set();

    // Periodically check for anime news
    setInterval(async () => {
        if (!ENABLED_FEATURES.animeNews) return;
        const news = await fetchLatestAnimeNews();
        if (news && !sentAnimeNews.has(news.title)) {
            console.log('New anime news:', news.title);

            try {
                const groups = await sock.groupFetchAllParticipating();
                for (const groupId of Object.keys(groups)) {
                    await sock.sendMessage(groupId, { text: `📰 *Anime News:*\n${news.title}\n${news.url || ''}` });
                }
                sentAnimeNews.add(news.title);
                if (sentAnimeNews.size > 50) {
                    sentAnimeNews.clear();
                }
            } catch (err) {
                console.error('Failed to send news to groups:', err);
            }
        }
    }, 10 * 60 * 1000);
}

startBot();