const { Sticker, StickerTypes } = require('wa-sticker-formatter');

async function handleStickerCommand(sock, msg, downloadMediaMessage, options = {}) {
    const sender = msg.key.remoteJid;

    let mediaMessage = null;

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted) {
        if (quoted.imageMessage) mediaMessage = quoted.imageMessage;
        else if (quoted.videoMessage) mediaMessage = quoted.videoMessage;
    }

    if (!mediaMessage) {
        if (msg.message?.imageMessage) mediaMessage = msg.message.imageMessage;
        else if (msg.message?.videoMessage) mediaMessage = msg.message.videoMessage;
    }

    if (!mediaMessage) {
        await sock.sendMessage(sender, { text: 'Send or reply to an image/video/gif with #sticker caption to create a sticker.' });
        return;
    }

    let fullMessage;
    if (quoted) {
        fullMessage = { message: quoted };
    } else {
        fullMessage = msg;
    }

    try {
        const stream = await downloadMediaMessage(
            fullMessage,
            'buffer'
        );

        const sticker = new Sticker(stream, {
            pack: options.pack || 'Rias Gremory',
            author: options.author || 'bones',
            type: StickerTypes.FULL,
            quality: 50
        });

        const buffer = await sticker.toBuffer();
        await sock.sendMessage(sender, { sticker: buffer }, { quoted: msg });
    } catch (error) {
        console.error('Sticker creation error:', error);
        await sock.sendMessage(sender, { text: 'Failed to create sticker. The video/image might be too large or unsupported.' }, { quoted: msg });
    }
}

module.exports = { handleStickerCommand };