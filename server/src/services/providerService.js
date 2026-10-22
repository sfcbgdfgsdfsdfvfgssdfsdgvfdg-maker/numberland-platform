const fiveSim = require('./providers/fiveSim');
const smsActivate = require('./providers/smsActivate');
const smspool = require('./providers/smspool');
const grizzlySms = require('./providers/grizzlySms');
const smsMan = require('./providers/smsMan');
const onlineSim = require('./providers/onlineSim');

const ALL_PROVIDERS = [fiveSim, smsActivate, smspool, grizzlySms, smsMan, onlineSim];

// === سود شما (قابل تنظیم از .env) ===
const PROFIT_MARGIN = parseFloat(process.env.PROFIT_MARGIN) || 0.20; // 20%

const PROVIDER_META = {
    fivesim:      { color: '#10b981', icon: 'fa-signal', url: 'https://5sim.net' },
    smsactivate:  { color: '#3b82f6', icon: 'fa-mobile-screen', url: 'https://sms-activate.org' },
    smspool:      { color: '#8b5cf6', icon: 'fa-layer-group', url: 'https://smspool.net' },
    grizzlysms:   { color: '#f59e0b', icon: 'fa-bear', url: 'https://grizzlysms.com' },
    smsman:       { color: '#ef4444', icon: 'fa-user-secret', url: 'https://sms-man.com' },
    onlinesim:    { color: '#06b6d4', icon: 'fa-globe', url: 'https://onlinesim.io' }
};

/**
 * Calculate effective price considering delivery rate
 */
function calcEffectivePrice(cost, rate) {
    if (!rate || rate <= 0) return cost * 2;
    return cost / (rate / 100);
}

/**
 * Apply profit margin to a raw provider cost
 * rawCost: what provider charges us
 * returns: what user pays us
 */
function applyProfit(rawCost) {
    return parseFloat((rawCost * (1 + PROFIT_MARGIN)).toFixed(4));
}

/**
 * Get aggregated prices from ALL providers (parallel)
 * Prices returned include profit margin
 */
exports.getPricesAndAvailability = async () => {
    const results = await Promise.allSettled(
        ALL_PROVIDERS.map(p => p.getPrices().catch(e => {
            console.error(`[${p.name}] getPrices error:`, e.message);
            return {};
        }))
    );

    const merged = {};
    for (const result of results) {
        const prices = result.status === 'fulfilled' ? result.value : {};
        for (const [country, services] of Object.entries(prices)) {
            if (!merged[country]) merged[country] = {};
            for (const [service, operators] of Object.entries(services)) {
                if (!merged[country][service]) merged[country][service] = {};
                for (const [opKey, opInfo] of Object.entries(operators)) {
                    const fullKey = `${opInfo.provider || 'unknown'}:${opKey}`;
                    const rawCost = opInfo.cost;
                    const finalCost = applyProfit(rawCost);
                    merged[country][service][fullKey] = {
                        ...opInfo,
                        rawCost: rawCost,           // قیمت خرید از provider
                        cost: finalCost,            // قیمت فروش به کاربر (با سود)
                        profit: parseFloat((finalCost - rawCost).toFixed(4)), // سود ما
                        effectivePrice: calcEffectivePrice(finalCost, opInfo.rate)
                    };
                }
            }
        }
    }

    return merged;
};

/**
 * Get cheapest provider (prices with profit included)
 */
exports.getCheapest = async (country, service, mode = 'smart') => {
    const prices = await exports.getPricesAndAvailability();
    const countryData = prices[country] || {};
    const serviceData = countryData[service] || {};

    let cheapest = null;
    for (const [key, info] of Object.entries(serviceData)) {
        if (info.count <= 0) continue;
        const compareVal = mode === 'smart' ? info.effectivePrice : info.cost;
        if (!cheapest || compareVal < (mode === 'smart' ? cheapest.effectivePrice : cheapest.cost)) {
            cheapest = { ...info, operatorKey: key };
        }
    }
    return cheapest;
};

/**
 * Buy a number — we pay rawCost to provider, charge user the final cost
 */
exports.buyActivation = async (country, operator, service, preferredProvider = null) => {
    if (preferredProvider) {
        const provider = ALL_PROVIDERS.find(p => p.name === preferredProvider);
        if (!provider) throw new Error(`Provider ${preferredProvider} not found`);
        const result = await provider.buyNumber(country, service, operator);
        // rawCost = what provider charges, cost = what user pays
        return { ...result, rawCost: result.cost || 0.1, cost: applyProfit(result.cost || 0.1) };
    }

    const prices = await exports.getPricesAndAvailability();
    const countryData = prices[country] || {};
    const serviceData = countryData[service] || {};

    const sorted = Object.entries(serviceData)
        .filter(([k, v]) => v.count > 0)
        .sort((a, b) => (a[1].effectivePrice || a[1].cost) - (b[1].effectivePrice || b[1].cost));

    if (sorted.length === 0) {
        throw new Error(`No available numbers for ${service} in ${country}`);
    }

    let lastError = null;
    for (const [key, info] of sorted) {
        const providerName = info.provider;
        const provider = ALL_PROVIDERS.find(p => p.name === providerName);
        if (!provider) continue;
        try {
            const result = await provider.buyNumber(country, service, key.split(':')[1]);
            return {
                ...result,
                rawCost: info.rawCost,
                cost: info.cost,        // قیمت با سود
                profit: info.profit,    // سود ما
                rate: info.rate
            };
        } catch (e) {
            lastError = e;
            console.error(`[${providerName}] buy failed, trying next...`, e.message);
        }
    }

    throw lastError || new Error('All providers failed');
};

exports.checkSms = async (providerName, orderId) => {
    const provider = ALL_PROVIDERS.find(p => p.name === providerName);
    if (!provider) throw new Error(`Provider ${providerName} not found`);
    return await provider.checkSms(orderId);
};

exports.cancelOrder = async (providerName, orderId) => {
    const provider = ALL_PROVIDERS.find(p => p.name === providerName);
    if (!provider) throw new Error(`Provider ${providerName} not found`);
    return await provider.cancelOrder(orderId);
};

exports.banOrder = async (providerName, orderId) => {
    const provider = ALL_PROVIDERS.find(p => p.name === providerName);
    if (!provider) throw new Error(`Provider ${providerName} not found`);
    return await provider.banOrder(orderId);
};

exports.getActiveProviders = () => {
    return ALL_PROVIDERS
        .filter(p => p.apiKey)
        .map(p => ({
            name: p.name,
            displayName: p.displayName,
            hasKey: true,
            ...PROVIDER_META[p.name]
        }));
};

exports.getAllProviderMeta = () => {
    return ALL_PROVIDERS.map(p => ({
        name: p.name,
        displayName: p.displayName,
        hasKey: !!p.apiKey,
        ...PROVIDER_META[p.name]
    }));
};

exports.providers = ALL_PROVIDERS;
exports.PROVIDER_META = PROVIDER_META;
exports.PROFIT_MARGIN = PROFIT_MARGIN;
exports.calcEffectivePrice = calcEffectivePrice;
exports.applyProfit = applyProfit;
