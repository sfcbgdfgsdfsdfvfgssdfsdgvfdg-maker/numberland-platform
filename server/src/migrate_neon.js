const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

const connectionString = 'postgresql://neondb_owner:npg_k9gTQiyXm4MB@ep-broad-smoke-b5zjla5q-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(connectionString);

async function initNeon() {
  console.log('🚀 Connecting to Neon PostgreSQL and creating schema...');

  await sql.query(`
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

  await sql.query(`
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

  await sql.query(`
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

  await sql.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await sql.query(`
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

  await sql.query(`
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

  await sql.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed settings
  await sql.query(`
    INSERT INTO settings (key, value)
    VALUES ('windscribe_monthly_price', '4.0')
    ON CONFLICT (key) DO NOTHING;
  `);

  await sql.query(`
    INSERT INTO settings (key, value)
    VALUES ('windscribe_plan_title', 'اکانت پرمیوم ۱ ماهه ویندسکرایب (نامحدود)')
    ON CONFLICT (key) DO NOTHING;
  `);

  // Seed admin user
  const adminEmail = 'nafa.1395@gmail.com';
  const adminPass = 'Kbka@222223224225227';
  const hashedPassword = await bcrypt.hash(adminPass, 10);

  await sql.query(`
    INSERT INTO users (email, password, full_name, balance, is_admin)
    VALUES ($1, $2, $3, 1000, TRUE)
    ON CONFLICT (email) DO UPDATE
    SET password = $2, is_admin = TRUE;
  `, [adminEmail, hashedPassword, 'مدیر ارشد سیستم']);

  console.log('✅ ALL TABLES CREATED AND SEEDED IN NEON POSTGRESQL SUCCESSFULLY!');
  process.exit(0);
}

initNeon().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
