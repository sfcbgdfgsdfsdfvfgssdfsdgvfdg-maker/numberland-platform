const BaseProvider = require('./baseProvider');

class FiveSimProvider extends BaseProvider {
    constructor() {
        super(
            'fivesim',
            '5SIM',
            'https://5sim.net/v1',
            process.env.FIVESIM_API_KEY || '9985ad5e741040dca620a0f7010dd5c0'
        );
    }

    /**
     * Pick the best delivery rate from 5SIM's multiple rate fields
     * Prefers longer time windows (more reliable data)
     */
    _pickBestRate(info) {
        // Priority: rate720 (30d) > rate168 (1w) > rate72 (3d) > rate24 (24h) > rate3 > rate1 > rate
        const fields = ['rate720', 'rate168', 'rate72', 'rate24', 'rate3', 'rate1', 'rate'];
        for (const f of fields) {
            const val = parseFloat(info[f]);
            if (val > 0) return val;
        }
        return 0;
    }

    async getPrices() {
        const { data } = await this.axios.get('https://5sim.net/v1/guest/prices');
        const normalized = {};
        for (const [country, services] of Object.entries(data)) {
            if (!normalized[country]) normalized[country] = {};
            for (const [service, operators] of Object.entries(services)) {
                if (!normalized[country][service]) normalized[country][service] = {};
                for (const [operator, info] of Object.entries(operators)) {
                    const rate = this._pickBestRate(info);
                    normalized[country][service][operator] = {
                        cost: parseFloat(info.cost) || 0.1,
                        count: parseInt(info.count) || 0,
                        rate: rate,
                        rateSource: rate > 0 ? '5sim' : null,
                        provider: this.name
                    };
                }
            }
        }
        return normalized;
    }

    async buyNumber(country, service, operator = 'any') {
        const { data } = await this.axios.get(
            `${this.baseUrl}/user/buy/activation/${country}/${operator}/${service}`,
            { headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Accept': 'application/json' } }
        );
        if (!data || typeof data === 'string' || !data.id) {
            throw new Error(typeof data === 'string' ? data : 'No order ID returned');
        }
        return {
            orderId: data.id,
            phone: data.phone,
            provider: this.name,
            raw: data
        };
    }

    async checkSms(orderId) {
        const { data } = await this.axios.get(
            `${this.baseUrl}/user/orders?category=activation&limit=50`,
            { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
        );
        const orders = data.Data || [];
        const order = orders.find(o => o.id == orderId);
        if (!order) return { status: 'NOT_FOUND', code: null };
        if (order.sms && order.sms.length > 0) {
            return { status: 'RECEIVED', code: order.sms[0].code };
        }
        const st = (order.status || '').toUpperCase();
        if (['TIMEOUT', 'CANCELED', 'CANCELLED'].includes(st)) return { status: 'CANCELED', code: null };
        if (st === 'BANNED') return { status: 'BANNED', code: null };
        return { status: 'WAITING', code: null };
    }

    async cancelOrder(orderId) {
        await this.axios.get(`${this.baseUrl}/user/cancel/${orderId}`, {
            headers: { 'Authorization': `Bearer ${this.apiKey}` }
        });
        return { success: true, provider: this.name };
    }

    async banOrder(orderId) {
        await this.axios.get(`${this.baseUrl}/user/ban/${orderId}`, {
            headers: { 'Authorization': `Bearer ${this.apiKey}` }
        });
        return { success: true, provider: this.name };
    }
}

module.exports = new FiveSimProvider();
