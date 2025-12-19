const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const yts = require('yt-search');
const ACRCloud = require('acrcloud');
const os = require('os');
const config = require('./config');

const startTime = Date.now();
const bot = new TelegramBot(config.telegramToken, { polling: true });
const userSessions = new Map();

// API rotation trackers
let currentMusicAPI = 0;
let currentVideoAPI = 0;

const banner = `
╔═══════════════════════════════════╗
║      ✧☁️ CIRA CLOUD 2.0 ☁️✧        ║
║    Telegram AI Assistant Bot      ║
╚═══════════════════════════════════╝
📦 Version: ${config.version}
👤 Dev: ${config.developer}
🤖 Bot Username: @${config.botUsername}
`;

console.log(banner);

// ═══════════════════════════════════════════
// LOADING ANIMATION
// ═══════════════════════════════════════════

const loadingFrames = [
    '☁️ CIRA CLOUD INC LOADING',
    '☁️ CIRA CLOUD INC LOADING.',
    '☁️ CIRA CLOUD INC LOADING..',
    '☁️ CIRA CLOUD INC LOADING...',
    '☁️ CIRA CLOUD INC LOADING',
];

async function animateLoading(chatId, messageId) {
    let frame = 0;
    const interval = setInterval(async () => {
        try {
            await bot.editMessageText(loadingFrames[frame], {
                chat_id: chatId,
                message_id: messageId
            });
            frame = (frame + 1) % loadingFrames.length;
        } catch (e) {
            clearInterval(interval);
        }
    }, 500);

    return interval;
}

// ═══════════════════════════════════════════
// API ROTATION SYSTEM
// ═══════════════════════════════════════════

async function downloadMusic(videoUrl, messageId, chatId) {
    const apis = config.musicAPIs;
    let lastError = null;
    
    for (let attempt = 0; attempt < apis.length; attempt++) {
        const apiIndex = (currentMusicAPI + attempt) % apis.length;
        const api = apis[apiIndex];
        
        try {
            console.log(`[Music] Trying API ${apiIndex + 1}/${apis.length}: ${api.name}`);
            
            if (attempt > 0) {
                await bot.editMessageText(
                    `🔄 Switching server... (${api.name})\n⏳ Please wait ☁️`,
                    { chat_id: chatId, message_id: messageId }
                );
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            let downloadUrl;
            
            if (api.type === 'prabath') {
                const response = await axios.post(
                    api.endpoint,
                    { url: videoUrl },
                    {
                        headers: { 'Content-Type': 'application/json', 'x-api-key': api.key },
                        timeout: 45000
                    }
                );
                if (response.data?.data?.audio) downloadUrl = response.data.data.audio.url;
            } else if (api.type === 'get') {
                const response = await axios.get(`${api.endpoint}${encodeURIComponent(videoUrl)}`, { timeout: 45000 });
                downloadUrl = response.data.result?.download_url || response.data.download_url;
            }
            
            if (downloadUrl) {
                currentMusicAPI = apiIndex;
                return downloadUrl;
            }
            throw new Error('No URL');
        } catch (error) {
            lastError = error;
            if (attempt < apis.length - 1) await new Promise(r => setTimeout(r, 1000));
        }
    }
    throw lastError;
}

async function downloadVideo(videoUrl, quality, messageId, chatId) {
    const apis = config.videoAPIs;
    let lastError = null;
    
    for (let attempt = 0; attempt < apis.length; attempt++) {
        const apiIndex = (currentVideoAPI + attempt) % apis.length;
        const api = apis[apiIndex];
        
        try {
            if (attempt > 0) {
                await bot.editMessageText(`🔄 Switching video server... (${api.name})\n⏳ Please wait ☁️`, { chat_id: chatId, message_id: messageId });
                await new Promise(r => setTimeout(r, 1000));
            }
            
            let downloadUrl;
            if (api.type === 'prabath') {
                const response = await axios.post(api.endpoint, { url: videoUrl }, {
                    headers: { 'Content-Type': 'application/json', 'x-api-key': api.key },
                    timeout: 60000
                });
                if (response.data?.data?.video) {
                    const video = response.data.data.video.find(v => v.quality === quality) || response.data.data.video[0];
                    downloadUrl = video.url;
                }
            }
            
            if (downloadUrl) {
                currentVideoAPI = apiIndex;
                return downloadUrl;
            }
            throw new Error('No URL');
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
}

// ═══════════════════════════════════════════
// HELPERS & HANDLERS
// ═══════════════════════════════════════════

function createInlineKeyboard(buttons) { return { reply_markup: { inline_keyboard: buttons } }; }

function normalizeCommand(text) {
    if (!text) return '';
    text = text.trim();
    if (['.', '/', '!'].includes(text[0])) text = text.substring(1);
    return text.toLowerCase();
}

bot.on('message', async (msg) => {
    if (!msg.text) return;
    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const normalized = normalizeCommand(text);
    const parts = normalized.split(' ');
    const command = parts[0];
    const args = parts.slice(1).join(' ');

    if (command === 'start') {
        const kb = createInlineKeyboard([
            [{ text: '🎵 Search Song', callback_data: 'cmd_song' }, { text: '🎬 Get Video', callback_data: 'cmd_video' }],
            [{ text: '📊 Status', callback_data: 'cmd_status' }, { text: '❓ Help', callback_data: 'cmd_help' }]
        ]);
        return bot.sendMessage(chatId, `✧ *Welcome to CIRA CLOUD 2.0* ☁️\n\nHey ${msg.from.first_name}! I'm your AI assistant. Send \`song\` or \`video\` to start.`, { parse_mode: 'Markdown', ...kb });
    }

    if (command === 'status') {
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        return bot.sendMessage(chatId, `📊 *CIRA STATUS*\n☁️ Uptime: ${uptime}s\n💾 RAM: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`, { parse_mode: 'Markdown' });
    }

    if (command === 'song' || command === 'play') {
        if (!args) return bot.sendMessage(chatId, '🎵 Usage: `song [name]`');
        const searchMsg = await bot.sendMessage(chatId, '🔍 Searching...');
        const search = await yts(args);
        const videos = search.videos.slice(0, 5);
        const buttons = videos.map((v, i) => [{ text: `${i + 1}. ${v.title.substring(0, 35)} (${v.timestamp})`, callback_data: `song_${i}_${v.videoId}` }]);
        userSessions.set(chatId, { videos, type: 'music' });
        return bot.editMessageText(`🎵 Results for "${args}":`, { chat_id: chatId, message_id: searchMsg.message_id, ...createInlineKeyboard([...buttons, [{ text: '❌ Cancel', callback_data: 'cancel' }]]) });
    }

    if (command === 'video') {
        if (!args) return bot.sendMessage(chatId, '🎬 Usage: `video [query/url]`');
        const searchMsg = await bot.sendMessage(chatId, '🔍 Processing...');
        const search = await yts(args);
        const videos = search.videos.slice(0, 5);
        const buttons = videos.map((v, i) => [{ text: `${i + 1}. ${v.title.substring(0, 35)}`, callback_data: `video_${i}_${v.videoId}` }]);
        userSessions.set(chatId, { videos, type: 'video' });
        return bot.editMessageText(`🎬 Select Video:`, { chat_id: chatId, message_id: searchMsg.message_id, ...createInlineKeyboard([...buttons, [{ text: '❌ Cancel', callback_data: 'cancel' }]]) });
    }

    // AI Chat Fallback
    if (config.features.geminiAI && text.length > 2 && !['song', 'play', 'video', 'status', 'help', 'start'].includes(command)) {
        try {
            const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${config.ai.model}:generateContent?key=${config.geminiKey}`, {
                contents: [{ parts: [{ text: `${config.ai.systemPrompt}\nUser: ${text}` }] }]
            });
            await bot.sendMessage(chatId, `✧ ${res.data.candidates[0].content.parts[0].text.trim()}`);
        } catch (e) { console.error("AI Error"); }
    }
});

bot.on('callback_query', async (q) => {
    const chatId = q.message.chat.id;
    const data = q.data;
    const msgId = q.message.message_id;
    await bot.answerCallbackQuery(q.id);

    if (data.startsWith('song_')) {
        const [, idx, vid] = data.split('_');
        const session = userSessions.get(chatId);
        const video = session.videos[idx];
        const kb = createInlineKeyboard([[{ text: '🎵 Audio', callback_data: `dl_audio_${vid}` }, { text: '📄 Document', callback_data: `dl_doc_${vid}` }], [{ text: '❌ Cancel', callback_data: 'cancel' }]]);
        return bot.editMessageText(`🎵 *${video.title}*\nChoose Format:`, { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown', ...kb });
    }

    if (data.startsWith('video_')) {
        const [, idx, vid] = data.split('_');
        const session = userSessions.get(chatId);
        const video = session.videos[idx];
        const kb = createInlineKeyboard([[{ text: '📱 360p', callback_data: `vdl_360p_${vid}` }, { text: '💻 720p', callback_data: `vdl_720p_${vid}` }], [{ text: '🎬 1080p', callback_data: `vdl_1080p_${vid}` }]]);
        return bot.editMessageText(`🎬 *${video.title}*\nChoose Quality:`, { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown', ...kb });
    }

    if (data.startsWith('dl_') || data.startsWith('vdl_')) {
        const isVid = data.startsWith('vdl_');
        const [, type, vid] = data.split('_');
        const session = userSessions.get(chatId);
        const video = session.videos.find(v => v.videoId === vid);
        
        await bot.editMessageText(loadingFrames[0], { chat_id: chatId, message_id: msgId });
        const loop = await animateLoading(chatId, msgId);
        
        try {
            const url = isVid ? await downloadVideo(video.url, type, msgId, chatId) : await downloadMusic(video.url, msgId, chatId);
            clearInterval(loop);
            if (isVid) await bot.sendVideo(chatId, url, { caption: `🎬 ${video.title}\n☁️ CIRA CLOUD` });
            else if (type === 'audio') await bot.sendAudio(chatId, url, { title: video.title, caption: `🎵 ${video.title}\n☁️ CIRA CLOUD` });
            else await bot.sendDocument(chatId, url, { caption: `📄 ${video.title}` });
            await bot.deleteMessage(chatId, msgId);
        } catch (e) { clearInterval(loop); await bot.editMessageText('🌫️ Failed.', { chat_id: chatId, message_id: msgId }); }
    }
    
    if (data === 'cancel') await bot.deleteMessage(chatId, msgId);
});

// CIRA EARS
async function handleEars(msg, type) {
    if (!config.features.autoShazam) return;
    const status = await bot.sendMessage(msg.chat.id, '👂 CIRA EARS listening...');
    try {
        const file = await bot.getFile(msg[type].file_id);
        const res = await axios.get(`https://api.telegram.org/file/bot${config.telegramToken}/${file.file_path}`, { responseType: 'arraybuffer' });
        const result = await new ACRCloud(config.acrCloud).identify(Buffer.from(res.data));
        if (result.status.code === 0) {
            const t = result.metadata.music[0];
            const kb = createInlineKeyboard([[{ text: '🎵 Audio', callback_data: `shazam_dl_audio_${t.title}_${t.artists[0].name}` }]]);
            await bot.editMessageText(`👂 *CIRA EARS Identified!*\n\n🎵 ${t.title}\n👤 ${t.artists[0].name}`, { chat_id: msg.chat.id, message_id: status.message_id, parse_mode: 'Markdown', ...kb });
        } else await bot.editMessageText('🌫️ Not found.', { chat_id: msg.chat.id, message_id: status.message_id });
    } catch (e) { await bot.deleteMessage(msg.chat.id, status.message_id); }
}

bot.on('audio', m => handleEars(m, 'audio'));
bot.on('voice', m => handleEars(m, 'voice'));
bot.on('video', m => handleEars(m, 'video'));

console.log('☁️ CIRA CLOUD ONLINE');
