const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const NEON_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_k9gTQiyXm4MB@ep-broad-smoke-b5zjla5q-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';
const SQLITE_DB_PATH = path.join(__dirname, '../../data/database.sqlite');

let sqlClient = null;
let isPostgres = false;
let sqliteDb = null;

/**
 * تبدیل علامت‌های جایگزین SQLite (?) به فرمت استاندارد PostgreSQL ($1, $2, ...)
 */
function convertPlaceholders(query) {
    let index = 1;
    return query.replace(/\?/g, () => `$${index++}`);
}

/**
 * مقداردهی اولیه پایگاه داده (Neon PostgreSQL با Fallback محلی SQLite)
 */
async function initDatabase() {
    if (NEON_URL) {
        console.log('🌐 Connecting to Neon PostgreSQL...');
        sqlClient = neon(NEON_URL);

        try {
            await sqlClient.query('SELECT 1');
            isPostgres = true;
            console.log('✅ Connected to Neon PostgreSQL successfully!');

            try {
                await initPostgresSchema();
            } catch (schemaErr) {
                console.warn('ℹ️ Neon schema note:', schemaErr.message);
            }
            return;
        } catch (connErr) {
            console.warn('⚠️ Neon connection failed on first attempt, retrying in 2s...', connErr.message);
            await new Promise(r => setTimeout(r, 2000));
            try {
                await sqlClient.query('SELECT 1');
                isPostgres = true;
                console.log('✅ Connected to Neon PostgreSQL successfully on retry!');
                try {
                    await initPostgresSchema();
                } catch (schemaErr) {
                    console.warn('ℹ️ Neon schema note:', schemaErr.message);
                }
                return;
            } catch (retryErr) {
                console.error('⚠️ Neon retry failed, falling back to local SQLite:', retryErr.message);
            }
        }
    }

    // در صورت عدم دسترسی به نئون: استفاده از SQLite محلی
    console.log('📁 Using local SQLite database...');
    await initSqlite();
}

/**
 * ایجاد ساختار جداول در PostgreSQL (Neon)
 */
async function initPostgresSchema() {
    await sqlClient.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            full_name TEXT,
            balance NUMERIC(15, 2) DEFAULT 0,
            is_admin BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await sqlClient.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            order_id TEXT NOT NULL,
            phone TEXT,
            service TEXT,
            country TEXT,
            price NUMERIC(15, 4),
            raw_cost NUMERIC(15, 4),
            profit NUMERIC(15, 4),
            provider TEXT,
            operator TEXT,
            status TEXT DEFAULT 'WAITING_SMS',
            sms_code TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await sqlClient.query(`
        CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            invoice_id TEXT UNIQUE NOT NULL,
            amount_usd NUMERIC(15, 2) NOT NULL,
            amount_toman NUMERIC(15, 0),
            gateway TEXT DEFAULT 'manual',
            status TEXT DEFAULT 'PENDING',
            txid TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await sqlClient.query(`
        CREATE TABLE IF NOT EXISTS sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await sqlClient.query(`
        CREATE TABLE IF NOT EXISTS windscribe_accounts (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            plan_type TEXT DEFAULT 'monthly_unlimited',
            status TEXT DEFAULT 'AVAILABLE',
            sold_to_user_id INTEGER REFERENCES users(id),
            sold_at TIMESTAMP,
            order_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await sqlClient.query(`
        CREATE TABLE IF NOT EXISTS windscribe_orders (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            order_id TEXT UNIQUE NOT NULL,
            account_id INTEGER REFERENCES windscribe_accounts(id),
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            plan_name TEXT DEFAULT 'پلن ۱ ماهه نامحدود',
            price_usd NUMERIC(15, 2) NOT NULL,
            price_toman NUMERIC(15, 0),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await sqlClient.query(`
        CREATE TABLE IF NOT EXISTS gemini_links (
            id SERIAL PRIMARY KEY,
            invite_link TEXT NOT NULL,
            plan_type TEXT DEFAULT 'gemini_pro_18m',
            status TEXT DEFAULT 'AVAILABLE',
            note TEXT,
            sold_to_user_id INTEGER REFERENCES users(id),
            sold_at TIMESTAMP,
            order_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await sqlClient.query(`
        CREATE TABLE IF NOT EXISTS gemini_orders (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            order_id TEXT UNIQUE NOT NULL,
            link_id INTEGER REFERENCES gemini_links(id),
            invite_link TEXT NOT NULL,
            plan_name TEXT DEFAULT 'اکانت جمنای پرو ۱۸ ماهه (Gemini Advanced)',
            price_usd NUMERIC(15, 2) NOT NULL,
            price_toman NUMERIC(15, 0),
            instructions TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await sqlClient.query(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    `);

    // Seed default settings
    await sqlClient.query(`
        INSERT INTO settings (key, value)
        VALUES ('windscribe_monthly_price', '4.0')
        ON CONFLICT (key) DO NOTHING;
    `);

    await sqlClient.query(`
        INSERT INTO settings (key, value)
        VALUES ('windscribe_plan_title', 'اکانت پرمیوم ۱ ماهه ویندسکرایب (نامحدود)')
        ON CONFLICT (key) DO NOTHING;
    `);

    await sqlClient.query(`
        INSERT INTO settings (key, value)
        VALUES ('gemini_18m_price', '12.0')
        ON CONFLICT (key) DO NOTHING;
    `);

    await sqlClient.query(`
        INSERT INTO settings (key, value)
        VALUES ('gemini_plan_title', 'اکانت جمنای پرو ۱۸ ماهه (Google Gemini Advanced)')
        ON CONFLICT (key) DO NOTHING;
    `);

    await sqlClient.query(`
        INSERT INTO settings (key, value)
        VALUES ('gemini_instructions', 'روی لینک فعال‌سازی کلیک کرده و با اکانت گوگل (جیمیل) خود وارد شوید تا پلن پرمیوم ۱۸ ماهه فعال گردد.')
        ON CONFLICT (key) DO NOTHING;
    `);

    // Card-to-card and Telegram columns
    await sqlClient.query(`
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sender_card TEXT;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tracking_code TEXT;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_image TEXT;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS admin_note TEXT;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username TEXT;
    `);

    await sqlClient.query(`
        INSERT INTO settings (key, value) VALUES ('card_number', '6037-9979-1234-5678')
        ON CONFLICT (key) DO NOTHING;
    `);
    await sqlClient.query(`
        INSERT INTO settings (key, value) VALUES ('card_holder', 'مدیریت سیم‌جت')
        ON CONFLICT (key) DO NOTHING;
    `);
    await sqlClient.query(`
        INSERT INTO settings (key, value) VALUES ('card_bank', 'بانک ملی ایران')
        ON CONFLICT (key) DO NOTHING;
    `);
    await sqlClient.query(`
        INSERT INTO settings (key, value) VALUES ('card_enabled', 'true')
        ON CONFLICT (key) DO NOTHING;
    `);

    // Seed admin user
    const adminEmail = 'nafa.1395@gmail.com';
    const adminPass = 'Kbka@222223224225227';
    const hashedPassword = await bcrypt.hash(adminPass, 10);

    await sqlClient.query(`
        INSERT INTO users (email, password, full_name, balance, is_admin)
        VALUES ($1, $2, $3, 1000, TRUE)
        ON CONFLICT (email) DO UPDATE
        SET password = $2, is_admin = TRUE;
    `, [adminEmail, hashedPassword, 'مدیر ارشد سیستم']);

    console.log(`👑 Admin verified in Neon: ${adminEmail}`);
}

/**
 * مقداردهی اولیه SQLite در صورت آفلاین بودن
 */
async function initSqlite() {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    const dataDir = path.dirname(SQLITE_DB_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(SQLITE_DB_PATH)) {
        const buffer = fs.readFileSync(SQLITE_DB_PATH);
        sqliteDb = new SQL.Database(buffer);
    } else {
        sqliteDb = new SQL.Database();
    }
}

/**
 * شیء ارتباطی دیتابیس با پشتیبانی از کدهای موجود
 */
function getDb() {
    if (isPostgres && sqlClient) {
        return {
            exec: async (query, params = []) => {
                const pgSql = convertPlaceholders(query);
                const rows = await sqlClient.query(pgSql, params || []);
                const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
                const values = rows.map(r => Object.values(r));
                const res = rows.length > 0 ? [{ columns, values }] : [];
                res.rows = rows;
                return res;
            },
            run: async (query, params = []) => {
                // تبدیل دستورات اختصاصی SQLite مانند INSERT OR REPLACE
                let cleanQuery = query;
                if (/INSERT\s+OR\s+REPLACE\s+INTO\s+settings/i.test(cleanQuery)) {
                    cleanQuery = cleanQuery.replace(/INSERT\s+OR\s+REPLACE\s+INTO\s+settings/i, 'INSERT INTO settings') + ' ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value';
                }
                const pgSql = convertPlaceholders(cleanQuery);
                await sqlClient.query(pgSql, params || []);
                return { success: true };
            },
            query: async (query, params = []) => {
                const pgSql = convertPlaceholders(query);
                return await sqlClient.query(pgSql, params || []);
            }
        };
    } else {
        return {
            exec: (query, params = []) => sqliteDb.exec(query, params),
            run: (query, params = []) => sqliteDb.run(query, params),
            query: (query, params = []) => sqliteDb.exec(query, params)
        };
    }
}

function saveDatabase() {
    if (!isPostgres && sqliteDb) {
        const data = sqliteDb.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(SQLITE_DB_PATH, buffer);
    }
}

module.exports = { initDatabase, getDb, saveDatabase, isUsingPostgres: () => isPostgres };
