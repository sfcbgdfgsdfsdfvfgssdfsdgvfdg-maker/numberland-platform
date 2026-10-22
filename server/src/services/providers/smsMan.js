const BaseProvider = require('./baseProvider');

/**
 * SMS-Man Provider (https://sms-man.com)
 * API v1: http://api.sms-man.ru/control
 * Auth: token query param
 */
class SmsManProvider extends BaseProvider {
    constructor() {
        super(
            'smsman',
            'SMS-Man',
            'http://api.sms-man.ru/control',
            process.env.SMSMAN_API_KEY || ''
        );
        this.countryIds = {
            'russia': 1, 'ukraine': 2, 'kazakhstan': 3, 'china': 4,
            'indonesia': 6, 'malaysia': 7, 'philippines': 8, 'india': 9,
            'vietnam': 10, 'usa': 11, 'germany': 12, 'england': 13,
            'netherlands': 14, 'france': 15, 'turkey': 16, 'brazil': 17,
            'canada': 18, 'australia': 19, 'poland': 20, 'japan': 21,
            'mexico': 22, 'thailand': 23, 'bangladesh': 24
        };
        this.serviceIds = {
            'telegram': 'telegram', 'whatsapp': 'whatsapp', 'google': 'google',
            'openai': 'openai', 'discord': 'discord', 'instagram': 'instagram',
            'facebook': 'facebook', 'twitter': 'twitter', 'tiktok': 'tiktok',
            'amazon': 'amazon', 'viber': 'viber', 'line': 'line'
        };
    }

    async getPrices() {
        if (!this.apiKey) return {};
        try {
            // /limits returns all countries/apps if no params
            const { data } = await this.axios.get(`${this.baseUrl}/limits`, {
                params: { token: this.apiKey }
            });
            if (!data || typeof data !== 'object') return {};

            const normalized = {};
            // Response format varies - try to parse
            if (Array.isArray(data)) {
                for (const item of data) {
                    const country = (item.country_name || '').toLowerCase();
                    const service = (item.app_name || '').toLowerCase();
                    if (!country || !service) continue;
                    if (!normalized[country]) normalized[country] = {};
                    if (!normalized[country][service]) normalized[country][service] = {};
                    normalized[country][service]['smsman'] = {
                        cost: parseFloat(item.price) || 0.1,
                        count: parseInt(item.count) || 0,
                        rate: 0,
                        provider: this.name
                    };
                }
            }
            return normalized;
        } catch (e) {
            console.error('SMS-Man prices error:', e.message);
        }
        return {};
    }

    async buyNumber(country, service, operator) {
        const countryId = this.countryIds[country.toLowerCase()];
        const serviceId = this.serviceIds[service.toLowerCase()] || service.toLowerCase();
        if (!countryId) throw new Error(`Country ${country} not supported by SMS-Man`);

        const { data } = await this.axios.get(`${this.baseUrl}/get-number`, {
            params: { token: this.apiKey, country_id: countryId, application_id: serviceId }
        });
        if (!data || data.error_code) {
            throw new Error(data?.error_msg || data?.error_code || 'No order from SMS-Man');
        }
        if (!data.request_id) throw new Error('No request_id from SMS-Man');
        return {
            orderId: data.request_id,
            phone: data.number,
            provider: this.name,
            raw: data
        };
    }

    async checkSms(orderId) {
        const { data } = await this.axios.get(`${this.baseUrl}/get-sms`, {
            params: { token: this.apiKey, request_id: orderId }
        });
        if (!data) return { status: 'WAITING', code: null };
        if (data.sms_code) return { status: 'RECEIVED', code: data.sms_code };
        if (data.error_code === 'wait_sms' || data.error_msg) return { status: 'WAITING', code: null };
        return { status: 'WAITING', code: null };
    }

    async cancelOrder(orderId) {
        await this.axios.get(`${this.baseUrl}/set-status`, {
            params: { token: this.apiKey, request_id: orderId, status: 'reject' }
        });
        return { success: true, provider: this.name };
    }

    async banOrder(orderId) {
        return this.cancelOrder(orderId);
    }
}

module.exports = new SmsManProvider();
