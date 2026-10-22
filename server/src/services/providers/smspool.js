const BaseProvider = require('./baseProvider');

/**
 * SMSPool Provider (https://api.smspool.net)
 * Docs: https://documenter.getpostman.com/view/30155063/2s9YXmZ1JY
 */
class SmsPoolProvider extends BaseProvider {
    constructor() {
        super(
            'smspool',
            'SMSPool',
            'https://api.smspool.net',
            process.env.SMSPOOL_API_KEY || ''
        );
        this._successRateCache = {};
        this._cacheTime = 0;
    }

    _headers() {
        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        };
    }

    /**
     * Fetch success rates per country for a service
     * Caches for 10 minutes
     */
    async _getSuccessRates(service) {
        const now = Date.now();
        const cacheKey = service.toLowerCase();
        if (this._successRateCache[cacheKey] && (now - this._cacheTime) < 600000) {
            return this._successRateCache[cacheKey];
        }
        try {
            const { data } = await this.axios.get(`${this.baseUrl}/request/success_rate`, {
                params: { key: this.apiKey, service: service }
            });
            if (Array.isArray(data)) {
                const rates = {};
                for (const item of data) {
                    const country = (item.short_name || item.country || '').toLowerCase();
                    if (country) {
                        rates[country] = parseFloat(item.success_rate) || 0;
                    }
                }
                this._successRateCache[cacheKey] = rates;
                this._cacheTime = now;
                return rates;
            }
        } catch (e) {
            console.error('SMSPool success_rate error:', e.message);
        }
        return {};
    }

    async getPrices() {
        // SMSPool requires per-service queries for pricing
        // We'll return empty and rely on the /purchase/sms endpoint for live pricing
        return {};
    }

    async buyNumber(country, service, operator) {
        if (!this.apiKey) throw new Error('SMSPool API key not configured');

        // Try to get success rate for display
        let rate = 0;
        try {
            const rates = await this._getSuccessRates(service);
            rate = rates[country.toLowerCase()] || 0;
        } catch (e) { /* ignore */ }

        const params = new URLSearchParams();
        params.append('key', this.apiKey);
        params.append('country', country.toUpperCase());
        params.append('service', service);
        params.append('pool', 'main');

        const { data } = await this.axios.post(`${this.baseUrl}/purchase/sms`, params, {
            headers: this._headers()
        });

        if (!data || data.success !== 1) {
            throw new Error(data?.message || data?.type || 'No order from SMSPool');
        }

        return {
            orderId: data.order_id,
            phone: data.phonenumber,
            provider: this.name,
            rate: rate,
            raw: data
        };
    }

    async checkSms(orderId) {
        const params = new URLSearchParams();
        params.append('key', this.apiKey);
        params.append('orderid', orderId);

        const { data } = await this.axios.post(`${this.baseUrl}/sms/check`, params, {
            headers: this._headers()
        });

        if (!data) return { status: 'WAITING', code: null };
        if (data.code && data.code !== '0' && data.code !== '') {
            return { status: 'RECEIVED', code: data.full_code || data.code };
        }
        if (data.status === 0) return { status: 'CANCELED', code: null };
        return { status: 'WAITING', code: null };
    }

    async cancelOrder(orderId) {
        const params = new URLSearchParams();
        params.append('key', this.apiKey);
        params.append('orderid', orderId);

        await this.axios.post(`${this.baseUrl}/sms/cancel`, params, {
            headers: this._headers()
        });
        return { success: true, provider: this.name };
    }

    async banOrder(orderId) {
        return this.cancelOrder(orderId);
    }
}

module.exports = new SmsPoolProvider();
