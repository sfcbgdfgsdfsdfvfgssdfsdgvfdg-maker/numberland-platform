const BaseProvider = require('./baseProvider');

/**
 * OnlineSim Provider (https://onlinesim.io)
 * API v1.1: https://onlinesim.io/api/
 * Auth: apikey query param
 */
class OnlineSimProvider extends BaseProvider {
    constructor() {
        super(
            'onlinesim',
            'OnlineSim',
            'https://onlinesim.io/api',
            process.env.ONLINESIM_API_KEY || ''
        );
        // Country codes = international dialing codes
        this.countryCodes = {
            'usa': 1, 'canada': 1, 'russia': 7, 'ukraine': 380,
            'kazakhstan': 7, 'china': 86, 'indonesia': 62, 'malaysia': 60,
            'philippines': 63, 'india': 91, 'vietnam': 84, 'germany': 49,
            'england': 44, 'uk': 44, 'netherlands': 31, 'france': 33,
            'spain': 34, 'turkey': 90, 'brazil': 55, 'australia': 61,
            'poland': 48, 'japan': 81, 'mexico': 52, 'thailand': 66,
            'bangladesh': 880, 'italia': 39, 'italy': 39, 'portugal': 351,
            'sweden': 46, 'norway': 47, 'denmark': 45, 'finland': 358,
            'czech': 420, 'romania': 40, 'hungary': 36, 'greece': 30,
            'south korea': 82, 'argentina': 54, 'colombia': 57, 'peru': 51,
            'chile': 56, 'south africa': 27, 'nigeria': 234, 'kenya': 254,
            'egypt': 20, 'saudi arabia': 966, 'uae': 971, 'iran': 98,
            'pakistan': 92, 'bangladesh': 880, 'myanmar': 95, 'cambodia': 855,
            'laos': 856, 'mongolia': 976, 'nepal': 977, 'sri lanka': 94
        };
    }

    async getPrices() {
        if (!this.apiKey) return {};
        try {
            const { data } = await this.axios.get(`${this.baseUrl}/getTariffs.php`, {
                params: { apikey: this.apiKey }
            });
            if (!data || data.response !== '1' && data.response !== 1) return {};

            const normalized = {};
            const countries = data.countries || {};
            const services = data.services || {};

            // Build country name → dialing code reverse map
            const codeToCountry = {};
            for (const [name, code] of Object.entries(this.countryCodes)) {
                codeToCountry[code] = name;
            }

            // Parse services with prices
            for (const [serviceKey, serviceInfo] of Object.entries(services)) {
                const serviceName = (serviceInfo.slug || serviceKey.replace(/^_/, '')).toLowerCase();
                const price = parseFloat(serviceInfo.price) || 0.1;
                const count = parseInt(serviceInfo.count) || 0;

                // OnlineSim tariffs don't give per-country breakdown easily
                // We'll store under a generic entry
                if (!normalized['_global']) normalized['_global'] = {};
                if (!normalized['_global'][serviceName]) normalized['_global'][serviceName] = {};
                normalized['_global'][serviceName]['onlinesim'] = {
                    cost: price,
                    count: count,
                    rate: 0,
                    provider: this.name
                };
            }

            // Also parse country-specific tariffs if available
            if (data.tariffs) {
                for (const [countryCode, countryServices] of Object.entries(data.tariffs)) {
                    const countryName = codeToCountry[parseInt(countryCode)] || `_${countryCode}`;
                    if (!normalized[countryName]) normalized[countryName] = {};
                    for (const [serviceSlug, info] of Object.entries(countryServices)) {
                        const serviceName = serviceSlug.toLowerCase();
                        if (!normalized[countryName][serviceName]) normalized[countryName][serviceName] = {};
                        normalized[countryName][serviceName]['onlinesim'] = {
                            cost: parseFloat(info.price) || 0.1,
                            count: parseInt(info.count) || 0,
                            rate: parseFloat(info.rate) || 0,
                            provider: this.name
                        };
                    }
                }
            }

            return normalized;
        } catch (e) {
            console.error('OnlineSim prices error:', e.message);
        }
        return {};
    }

    async buyNumber(country, service, operator) {
        if (!this.apiKey) throw new Error('OnlineSim API key not configured');

        const countryCode = this.countryCodes[country.toLowerCase()];
        if (!countryCode) throw new Error(`Country ${country} not supported by OnlineSim`);

        const { data } = await this.axios.get(`${this.baseUrl}/getNum.php`, {
            params: {
                apikey: this.apiKey,
                service: service.toLowerCase(),
                country: countryCode
            }
        });

        if (!data || (data.response !== 1 && data.response !== '1')) {
            throw new Error(data?.message || data?.error || `OnlineSim error: ${JSON.stringify(data)}`);
        }
        if (!data.tzid) throw new Error('No operation ID from OnlineSim');

        return {
            orderId: data.tzid,
            phone: data.number || null,
            provider: this.name,
            raw: data
        };
    }

    async checkSms(orderId) {
        const { data } = await this.axios.get(`${this.baseUrl}/getState.php`, {
            params: { apikey: this.apiKey, tzid: orderId }
        });

        if (!data) return { status: 'WAITING', code: null };

        // Response: { response: "1", tzid: ID, status: "TZ_NUM_WAIT"|"TZ_NUM_ANSWER"|"..." }
        const status = data.status || '';
        if (status === 'TZ_NUM_ANSWER' || data.msg) {
            return { status: 'RECEIVED', code: data.msg || data.code || data.sms };
        }
        if (status === 'TZ_NUM_WAIT' || status === 'TZ_WAIT') {
            return { status: 'WAITING', code: null };
        }
        if (status === 'TZ_CANCEL' || status === 'TZ_OVER') {
            return { status: 'CANCELED', code: null };
        }
        // If there's a message/code field directly
        if (data.msg || data.code || data.sms) {
            return { status: 'RECEIVED', code: data.msg || data.code || data.sms };
        }
        return { status: 'WAITING', code: null };
    }

    async cancelOrder(orderId) {
        // OnlineSim: don't call setOperationOk = auto-expires in 15 min
        // But we can try to close it
        try {
            await this.axios.get(`${this.baseUrl}/setOperationOk.php`, {
                params: { apikey: this.apiKey, tzid: orderId }
            });
        } catch (e) {
            // Ignore - operation will expire naturally
        }
        return { success: true, provider: this.name };
    }

    async banOrder(orderId) {
        return this.cancelOrder(orderId);
    }
}

module.exports = new OnlineSimProvider();
