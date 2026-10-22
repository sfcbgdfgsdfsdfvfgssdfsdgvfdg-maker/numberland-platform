const axios = require('axios');

class BaseProvider {
    constructor(name, displayName, baseUrl, apiKey) {
        this.name = name;
        this.displayName = displayName;
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.axios = axios.create({ timeout: 10000 });
    }

    // Get all prices & availability
    async getPrices() {
        throw new Error('getPrices() not implemented');
    }

    // Buy a virtual number
    async buyNumber(country, service, operator) {
        throw new Error('buyNumber() not implemented');
    }

    // Check SMS status for an order
    async checkSms(orderId) {
        throw new Error('checkSms() not implemented');
    }

    // Cancel an order
    async cancelOrder(orderId) {
        throw new Error('cancelOrder() not implemented');
    }

    // Ban/report an order
    async banOrder(orderId) {
        throw new Error('banOrder() not implemented');
    }

    // Normalize country names across providers
    normalizeCountry(country) {
        const map = {
            'usa': 'usa', 'united states': 'usa', 'us': 'usa',
            'russia': 'russia', 'ru': 'russia',
            'indonesia': 'indonesia', 'id': 'indonesia',
            'england': 'england', 'uk': 'england', 'gb': 'england',
            'canada': 'canada', 'ca': 'canada',
            'germany': 'germany', 'de': 'germany',
            'france': 'france', 'fr': 'france',
            'india': 'india', 'in': 'india',
            'brazil': 'brazil', 'br': 'brazil',
            'china': 'china', 'cn': 'china',
            'japan': 'japan', 'jp': 'japan',
            'australia': 'australia', 'au': 'australia',
            'netherlands': 'netherlands', 'nl': 'netherlands',
            'poland': 'poland', 'pl': 'poland',
            'ukraine': 'ukraine', 'ua': 'ukraine',
            'turkey': 'turkey', 'tr': 'turkey',
            'philippines': 'philippines', 'ph': 'philippines',
            'vietnam': 'vietnam', 'vn': 'vietnam',
            'mexico': 'mexico', 'mx': 'mexico',
            'thailand': 'thailand', 'th': 'thailand',
            'bangladesh': 'bangladesh', 'bd': 'bangladesh',
        };
        return map[(country || '').toLowerCase()] || country.toLowerCase();
    }

    // Normalize service names across providers
    normalizeService(service) {
        const map = {
            'telegram': 'telegram', 'tg': 'telegram',
            'whatsapp': 'whatsapp', 'wa': 'whatsapp',
            'google': 'google', 'gmail': 'google',
            'openai': 'openai', 'chatgpt': 'openai',
            'discord': 'discord',
            'instagram': 'instagram', 'ig': 'instagram',
            'facebook': 'facebook', 'fb': 'facebook',
            'twitter': 'twitter', 'x': 'twitter',
            'tiktok': 'tiktok',
            'amazon': 'amazon',
            'microsoft': 'microsoft', 'ms': 'microsoft',
            'apple': 'apple',
            'uber': 'uber',
            'tinder': 'tinder',
            'viber': 'viber',
            'line': 'line',
            'wechat': 'wechat',
        };
        return map[(service || '').toLowerCase()] || service.toLowerCase();
    }
}

module.exports = BaseProvider;
