const BaseProvider = require('./baseProvider');

/**
 * SMS-Activate Provider (https://api.sms-activate.org)
 * ⚠️ Service officially closed in 2025, but API may still work for existing accounts.
 * Successor: HeroSMS
 * Docs: reverse-engineered from github.com/LCozzoli/SMS-Activate.org
 */
class SmsActivateProvider extends BaseProvider {
    constructor() {
        super(
            'smsactivate',
            'SMS-Activate',
            'https://api.sms-activate.org/stubs/handler_api.php',
            process.env.SMSACTIVATE_API_KEY || ''
        );
        // Country mapping: SMS-Activate uses numeric IDs
        this.countryIds = {
            'russia': 0, 'ukraine': 1, 'kazakhstan': 2, 'china': 3,
            'philippines': 4, 'indonesia': 6, 'malaysia': 7, 'brazil': 8,
            'india': 9, 'vietnam': 10, 'usa': 12, 'germany': 16,
            'england': 18, 'netherlands': 20, 'france': 22, 'spain': 24,
            'turkey': 25, 'canada': 30, 'australia': 33, 'poland': 35,
            'japan': 37, 'bangladesh': 38, 'mexico': 40, 'thailand': 44
        };
        // Service mapping (SMS-Activate uses short codes)
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
                    normalized[countryName][serviceName]['smsactivate'] = {
                        cost: parseFloat(info.cost) || 1.0,
                        count: parseInt(info.count) || 0,
                        rate: 0,
                        provider: this.name
                    };
                }
            }
            return normalized;
        } catch (e) {
            console.error('SMS-Activate prices error:', e.message);
        }
        return {};
    }

    async buyNumber(country, service, operator) {
        const countryId = this.countryIds[country.toLowerCase()];
        const serviceId = this.serviceIds[service.toLowerCase()] || service.toLowerCase();
        if (countryId === undefined) throw new Error(`Country ${country} not supported by SMS-Activate`);

        // Use getNumberV2 (newer endpoint)
        const { data } = await this.axios.get(this.baseUrl, {
            params: {
                api_key: this.apiKey,
                action: 'getNumberV2',
                service: serviceId,
                country: countryId
            }
        });

        if (!data || typeof data === 'string') throw new Error(data || 'No response from SMS-Activate');
        // New response format: { activationId, phoneNumber, activationCost, ... }
        if (data.activationId) {
            return {
                orderId: data.activationId,
                phone: data.phoneNumber,
                provider: this.name,
                raw: data
            };
        }
        // Old format fallback: ACCESS_NUMBER:ID:PHONE
        if (typeof data === 'string' && data.includes(':')) {
            const parts = data.split(':');
            if (parts[0] === 'ACCESS_NUMBER') {
                return { orderId: parts[1], phone: parts[2], provider: this.name, raw: data };
            }
        }
        throw new Error('Unexpected response from SMS-Activate');
    }

    async checkSms(orderId) {
        const { data } = await this.axios.get(this.baseUrl, {
            params: { api_key: this.apiKey, action: 'getStatus', id: orderId }
        });
        if (!data) return { status: 'WAITING', code: null };
        if (typeof data === 'string') {
            if (data.startsWith('STATUS_OK:')) {
                return { status: 'RECEIVED', code: data.split(':')[1] };
            }
            if (data === 'STATUS_CANCEL') return { status: 'CANCELED', code: null };
            // STATUS_WAIT_CODE, STATUS_WAIT_RETRY, STATUS_WAIT_RESEND = still waiting
        }
        return { status: 'WAITING', code: null };
    }

    async cancelOrder(orderId) {
        // status 6 = cancel
        await this.axios.get(this.baseUrl, {
            params: { api_key: this.apiKey, action: 'setStatus', status: 6, id: orderId }
        });
        return { success: true, provider: this.name };
    }

    async banOrder(orderId) {
        // status 8 = ban/fail
        await this.axios.get(this.baseUrl, {
            params: { api_key: this.apiKey, action: 'setStatus', status: 8, id: orderId }
        });
        return { success: true, provider: this.name };
    }
}

module.exports = new SmsActivateProvider();
