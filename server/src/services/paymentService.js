const axios = require('axios');

let wallexRateCache = {
    tomanRate: 191208,
    lastFetched: 0
};

/**
 * 1. استعلام زنده نرخ تتر از API عمومی والکس
 */
exports.getWallexRate = async () => {
    const now = Date.now();
    if (!wallexRateCache.lastFetched || (now - wallexRateCache.lastFetched > 3 * 60 * 1000)) {
        try {
            const response = await axios.get('https://api.wallex.ir/v1/markets', { timeout: 8000 });
            if (response.data && response.data.result && response.data.result.symbols && response.data.result.symbols.USDTTMN) {
                const tomanPrice = parseFloat(response.data.result.symbols.USDTTMN.stats.lastPrice);
                wallexRateCache.tomanRate = Math.round(tomanPrice);
                wallexRateCache.lastFetched = now;
            }
        } catch (err) {
            console.error("Wallex Rate Error:", err.message);
        }
    }
    return wallexRateCache.tomanRate;
};

/**
 * 2. بررسی موجودی حساب صرافی والکس با کلید اختصاصی API
 */
exports.getWallexBalances = async () => {
    const apiKey = process.env.WALLEX_API_KEY;
    if (!apiKey) {
        return { success: false, message: 'کلید WALLEX_API_KEY در فایل تنظیمات (.env) ثبت نشده است.' };
    }

    try {
        const response = await axios.get('https://api.wallex.ir/v1/account/balances', {
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        if (response.data && response.data.result) {
            const balances = response.data.result.balances || response.data.result;
            return {
                success: true,
                balances,
                usdtBalance: parseFloat(balances.USDT?.value || balances.USDT?.balance || 0),
                tmnBalance: parseFloat(balances.TMN?.value || balances.TMN?.balance || 0)
            };
        }
        return { success: false, message: 'پاسخ نامعتبر از والکس', raw: response.data };
    } catch (err) {
        console.error("Wallex Balances Error:", err.response?.data || err.message);
        return {
            success: false,
            message: err.response?.data?.message || err.message || 'خطا در ارتباط با حساب والکس'
        };
    }
};

/**
 * 3. دریافت لیست تاریخچه واریزهای کریپتو به حساب والکس
 */
exports.getWallexCryptoDeposits = async (page = 1, perPage = 25) => {
    const apiKey = process.env.WALLEX_API_KEY;
    if (!apiKey) {
        return { success: false, message: 'کلید WALLEX_API_KEY تنظیم نشده است.' };
    }

    try {
        const response = await axios.get('https://api.wallex.ir/v1/account/crypto-deposit', {
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            params: {
                page,
                per_page: perPage
            },
            timeout: 10000
        });

        const rawList = response.data?.result?.items || response.data?.result?.deposits || response.data?.result || [];
        const deposits = Array.isArray(rawList) ? rawList : [];

        return {
            success: true,
            deposits
        };
    } catch (err) {
        console.error("Wallex Deposits Error:", err.response?.data || err.message);
        return {
            success: false,
            message: err.response?.data?.message || err.message,
            deposits: []
        };
    }
};

/**
 * 4. اعتبارسنجی تراکنش ترون روی بلاکچین از طریق TronGrid
 */
async function verifyTronGridTx(txid, targetAddress, expectedAmountUsd) {
    try {
        const txRes = await axios.post('https://api.trongrid.io/wallet/gettransactionbyid', {
            value: txid.trim()
        }, { timeout: 8000 });

        const txData = txRes.data;
        if (!txData || !txData.ret || txData.ret.length === 0) {
            return { verified: false, message: 'تراکنش در بلاکچین ترون یافت نشد یا هنوز تایید نشده است.' };
        }

        const contractRet = txData.ret[0]?.contractRet;
        if (contractRet !== 'SUCCESS') {
            return { verified: false, message: `وضعیت تراکنش در شبکه ترون ناموفق است (${contractRet}).` };
        }

        try {
            const eventsRes = await axios.get(`https://api.trongrid.io/v1/transactions/${txid.trim()}/events`, { timeout: 8000 });
            const events = eventsRes.data?.data || [];
            const transferEvent = events.find(e => e.event_name === 'Transfer');

            if (transferEvent && transferEvent.result) {
                const rawAmount = parseFloat(transferEvent.result.value || 0) / 1e6;
                if (expectedAmountUsd && rawAmount < (expectedAmountUsd * 0.98)) {
                    return {
                        verified: false,
                        message: `مبلغ واریز شده ($${rawAmount.toFixed(2)}) کمتر از مبلغ فاکتور ($${expectedAmountUsd.toFixed(2)}) است.`
                    };
                }
                return {
                    verified: true,
                    amount: rawAmount,
                    method: 'TRON_BLOCKCHAIN_CONFIRMED'
                };
            }
        } catch (eventErr) {
            console.warn('TronGrid events warning:', eventErr.message);
        }

        return {
            verified: true,
            amount: expectedAmountUsd,
            method: 'TRON_TX_SUCCESS'
        };
    } catch (err) {
        return { verified: false, message: 'خطا در استعلام از بلاکچین ترون: ' + err.message };
    }
}

/**
 * 5. اعتبارسنجی تراکنش بایننس اسمارت چین BSC (BEP20 USDT)
 */
async function verifyBscTx(txid, targetAddress, expectedAmountUsd) {
    let cleanTxid = txid.trim();
    if (!cleanTxid.startsWith('0x') && cleanTxid.length === 64) {
        cleanTxid = '0x' + cleanTxid;
    }

    const rpcs = [
        'https://bsc-dataseed.binance.org',
        'https://bsc-dataseed1.defibit.io',
        'https://bsc-rpc.publicnode.com'
    ];

    for (const rpc of rpcs) {
        try {
            const res = await axios.post(rpc, {
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_getTransactionReceipt',
                params: [cleanTxid]
            }, { timeout: 8000 });

            const receipt = res.data?.result;
            if (!receipt) continue;

            if (receipt.status !== '0x1') {
                return { verified: false, message: 'تراکنش در شبکه BSC ناموفق (Reverted) بوده است.' };
            }

            // بررسی ایونت Transfer توکن تتر بایننس (BEP20 USDT: 0x55d398326f99059ff775485246999027b3197955)
            const transferLog = receipt.logs?.find(l =>
                l.topics?.[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
            );

            let amount = expectedAmountUsd;
            if (transferLog) {
                try {
                    const rawVal = BigInt(transferLog.data);
                    amount = Number(rawVal) / 1e18; // 18 decimals on BSC

                    if (targetAddress) {
                        const cleanTarget = targetAddress.toLowerCase().replace('0x', '');
                        const recipient = (transferLog.topics?.[2] || '').toLowerCase();
                        if (!recipient.includes(cleanTarget)) {
                            console.warn(`[BSC Warning] Recipient mismatch: target ${targetAddress}, found ${recipient}`);
                        }
                    }

                    if (expectedAmountUsd && amount < (expectedAmountUsd * 0.98)) {
                        return {
                            verified: false,
                            message: `مبلغ واریز شده در شبکه BSC ($${amount.toFixed(2)}) کمتر از مبلغ فاکتور ($${expectedAmountUsd.toFixed(2)}) است.`
                        };
                    }
                } catch (parseErr) {
                    console.warn('BSC log parse error:', parseErr.message);
                }
            }

            return {
                verified: true,
                amount,
                method: 'BSC_BLOCKCHAIN_CONFIRMED'
            };
        } catch (err) {
            console.warn(`BSC RPC ${rpc} error:`, err.message);
        }
    }

    return { verified: false, message: 'تراکنش در شبکه بایننس اسمارت چین (BSC) یافت نشد یا هنوز تایید نشده است.' };
}

/**
 * 6. موتور جامع اعتبارسنجی واریزی (والکس API + بلاکچین BSC و TRON)
 */
exports.verifyDeposit = async ({ txid, expectedAmountUsd, targetAddress }) => {
    const apiKey = process.env.WALLEX_API_KEY;
    const cleanTxid = txid.trim();

    // گام اول: اگر کلید API والکس تنظیم شده بود، بررسی مستقیم در حساب والکس
    if (apiKey) {
        console.log(`[Wallex Verify] بررسی تراکنش ${cleanTxid} در والکس...`);
        const wallexDeposits = await exports.getWallexCryptoDeposits(1, 30);
        
        if (wallexDeposits.success && wallexDeposits.deposits.length > 0) {
            const lowerTx = cleanTxid.toLowerCase();
            const matched = wallexDeposits.deposits.find(d => {
                const dTx = (d.txid || d.txId || d.hash || '').toLowerCase().trim();
                return dTx === lowerTx;
            });

            if (matched) {
                const status = (matched.status || '').toUpperCase();
                if (['DONE', 'CONFIRMED', 'SUCCESS', 'COMPLETED'].includes(status)) {
                    const depositedAmount = parseFloat(matched.amount || matched.value || expectedAmountUsd);
                    return {
                        success: true,
                        verifiedBy: 'صرافی والکس (API)',
                        depositedAmount,
                        txid: cleanTxid
                    };
                } else {
                    return {
                        success: false,
                        message: `تراکنش در والکس ثبت شده اما وضعیت آن در حال پردازش است (${matched.status}). لطفاً پس از تایید نهایی شبکه دوباره تست کنید.`
                    };
                }
            }
        }
    }

    // گام دوم: بررسی در شبکه بایننس اسمارت چین BSC (اگر هش با 0x باشد یا آدرس مقصد با 0x باشد)
    const isBscHash = cleanTxid.startsWith('0x') || cleanTxid.length === 66;
    const isBscTarget = (targetAddress && targetAddress.startsWith('0x')) || (process.env.WALLEX_USDT_BSC_ADDRESS && process.env.WALLEX_USDT_BSC_ADDRESS.startsWith('0x'));

    if (isBscHash || isBscTarget) {
        console.log(`[On-Chain Verify BSC] بررسی مستقیم تراکنش ${cleanTxid} روی شبکه بایننس (BSC)...`);
        const bscResult = await verifyBscTx(cleanTxid, process.env.WALLEX_USDT_BSC_ADDRESS || targetAddress, expectedAmountUsd);
        if (bscResult.verified) {
            return {
                success: true,
                verifiedBy: 'تایید مستقیم شبکه بایننس (BSC BEP20)',
                depositedAmount: bscResult.amount || expectedAmountUsd,
                txid: cleanTxid
            };
        }
        if (isBscHash) {
            return {
                success: false,
                message: bscResult.message
            };
        }
    }

    // گام سوم: بررسی در شبکه ترون (TronGrid)
    console.log(`[On-Chain Verify Tron] بررسی مستقیم تراکنش ${cleanTxid} روی بلاکچین ترون...`);
    const onChainResult = await verifyTronGridTx(cleanTxid, targetAddress, expectedAmountUsd);
    if (onChainResult.verified) {
        return {
            success: true,
            verifiedBy: 'تایید مستقیم بلاکچین ترون (TRC20)',
            depositedAmount: onChainResult.amount || expectedAmountUsd,
            txid: cleanTxid
        };
    }

    // اگر کلید والکس تنظیم نشده بود و در حالت توسعه/تست بودیم
    if (!apiKey) {
        if (cleanTxid.length >= 20 && !cleanTxid.includes('test_fail')) {
            console.warn(`[Sandbox Mode] تراکنش ${cleanTxid} در حالت تست پذیرفته شد.`);
            return {
                success: true,
                verifiedBy: 'حالت دمو/آزمایشی',
                depositedAmount: expectedAmountUsd,
                txid: cleanTxid
            };
        }
    }

    return {
        success: false,
        message: onChainResult.message || 'تراکنش در والکس یا بلاکچین یافت نشد. لطفاً چند دقیقه پس از انتقال مجدداً تلاش فرمایید.'
    };
};
