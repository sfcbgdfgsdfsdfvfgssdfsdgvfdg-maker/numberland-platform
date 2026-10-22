const BaseProvider = require('./baseProvider');

/**
 * Grizzly SMS Provider (https://grizzlysms.com)
 * API: https://api.grizzlysms.com/stubs/handler_api.php
 * ⚠️ Compatible with SMS-Activate API format!
 */
class GrizzlySmsProvider extends BaseProvider {
    constructor() {
        super(
            'grizzlysms',
            'Grizzly SMS',
            'https://api.grizzlysms.com/stubs/handler_api.php',
            process.env.GRIZZLYSMS_API_KEY || ''
        );
        this.countryIds = {
            'russia': 0, 'ukraine': 1, 'kazakhstan': 2, 'china': 3,
            'philippines': 4, 'indonesia': 6, 'malaysia': 7, 'brazil': 8,
            'india': 9, 'vietnam': 10, 'usa': 12, 'germany': 16,
            'england': 18, 'netherlands': 20, 'france': 22, 'spain': 24,
            'turkey': 25, 'canada': 30, 'australia': 33, 'poland': 35,
            'japan': 37, 'bangladesh': 38, 'mexico': 40, 'thailand': 44
        };
        this.serviceIds = {
            'telegram': 'tg', 'whatsapp': 'wa', 'google': 'go',
            'openai': 'oi', 'discord': 'ds', 'instagram': 'ig',
            'facebook': 'fb', 'twitter': 'tw', 'tiktok': 'tk',
            'amazon': 'am', 'microsoft': 'mm', 'viber': 'vi',
            'line': 'ln', 'uber': 'ub', 'tinder': 'ti'
        };
    }

    async getPrices() {
        if (!this.apiKey) return {};
        try {
            const { data } = await this.axios.get(this.baseUrl, {
                params: { api_key: this.apiKey, action: 'getPrices' }
            });
            if (data === 'BAD_KEY' || typeof data !== 'object') return {};

            const normalized = {};
            for (const [countryId, services] of Object.entries(data)) {
                const countryName = Object.keys(this.countryIds).find(k => this.countryIds[k] == countryId);
                if (!countryName) continue;
                if (!normalized[countryName]) normalized[countryName] = {};
                for (const [serviceId, info] of Object.entries(services)) {
                    const serviceName = Object.keys(this.serviceIds).find(k => this.serviceIds[k] === serviceId);
                    if (!serviceName) continue;
                    if (!normalized[countryName][serviceName]) normalized[countryName][serviceName] = {};
                    normalized[countryName][serviceName]['grizzlysms'] = {
                        cost: parseFloat(info.cost) || 0.1,
                        count: parseInt(info.count) || 0,
                        rate: typeof info.rate === 'number' ? info.rate : 0,
                        provider: this.name
                    };
                }
            }
            return normalized;
        } catch (e) {
            console.error('GrizzlySMS prices error:', e.message);
        }
        return {};
    }

    async buyNumber(country, service, operator) {
        const countryId = this.countryIds[country.toLowerCase()];
        const serviceId = this.serviceIds[service.toLowerCase()] || service.toLowerCase();
        if (countryId === undefined) throw new Error(`Country ${country} not supported by GrizzlySMS`);

        const { data } = await this.axios.get(this.baseUrl, {
            params: { api_key: this.apiKey, action: 'getNumber', service: serviceId, country: countryId }
        });
        if (!data || typeof data !== 'string') throw new Error(data || 'No response from GrizzlySMS');
        const parts = data.split(':');
        if (parts[0] !== 'ACCESS_NUMBER') throw new Error(data);
        return {
            orderId: parts[1],
            phone: parts[2],
            provider: this.name,
            raw: data
        };
    }

    async checkSms(orderId) {
        const { data } = await this.axios.get(this.baseUrl, {
            params: { api_key: this.apiKey, action: 'getStatus', id: orderId }
        });
        if (!data || typeof data !== 'string') return { status: 'WAITING', code: null };
        if (data.startsWith('STATUS_OK:')) return { status: 'RECEIVED', code: data.split(':')[1] };
        if (data === 'STATUS_CANCEL') return { status: 'CANCELED', code: null };
        return { status: 'WAITING', code: null };
    }

    async cancelOrder(orderId) {
        await this.axios.get(this.baseUrl, {
            params: { api_key: this.apiKey, action: 'setStatus', status: 1, id: orderId }
        });
        return { success: true, provider: this.name };
    }

    async banOrder(orderId) {
        return this.cancelOrder(orderId);
    }
}

module.exports = new GrizzlySmsProvider();
