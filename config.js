module.exports = {
    // ══════ BOT IDENTITY ══════
    botName: 'CIRA',
    version: '2.1.0',
    developer: '@its_craigeexx',
    
    // ══════ TOKENS ══════
    telegramToken: 'YOUR_TELEGRAM_BOT_TOKEN_HERE',
    botUsername: 'your_bot_username',
    geminiKey: 'YOUR_GEMINI_API_KEY_HERE',
    
    // ══════ ACRCLOUD (CIRA EARS 👂) ══════
    acrCloud: {
        host: 'identify-us-west-2.acrcloud.com',
        access_key: '4ee38e62e85515a47158aeb3d26fb741',
        access_secret: 'KZd3cUQoOYSmZQn1n5ACW5XSbqGlKLhg6G8S8EvJ'
    },
    
    // ══════ MUSIC ROTATION APIs ══════
    musicAPIs: [
        {
            name: 'Prabath API',
            type: 'prabath',
            endpoint: 'https://api.prabath.top/api/v1/dl/youtube',
            key: 'prabath_sk_2676dd36898775b693f9eda3355af8a52e7b12b7'
        },
        {
            name: 'David Tech API',
            type: 'get',
            endpoint: 'https://api.davidcyriltech.my.id/download/ytmp3?url='
        }
    ],
    
    // ══════ VIDEO ROTATION APIs ══════
    videoAPIs: [
        {
            name: 'Prabath Video API',
            type: 'prabath',
            endpoint: 'https://api.prabath.top/api/v1/dl/youtube',
            key: 'prabath_sk_2676dd36898775b693f9eda3355af8a52e7b12b7'
        }
    ],
    
    features: {
        songDownload: true,
        videoDownload: true,
        autoShazam: true,
        geminiAI: true
    },
    
    ai: {
        model: 'gemini-1.5-flash',
        systemPrompt: 'You are CIRA 2.0, a minimalist AI assistant. Keep responses short.',
    }
};
