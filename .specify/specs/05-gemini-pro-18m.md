# Feature Spec: Google Gemini Pro 18 Months (اکانت جمنای پرو ۱۸ ماهه)

**Created:** 2026-10-22  
**Status:** Implemented & Online  
**Delivery Model:** Activation/Redemption Link Pool (تحویل آنی لینک اختصاصی)

---

## 1. Problem & Product Overview
Users require access to Google's flagship AI model (Gemini 1.5 Pro) with 2TB Google One cloud storage for an 18-month duration. Unlike Windscribe (which requires user:pass credentials), Gemini Pro is delivered as a **one-time activation / invitation link** (لینک دعوت یا فعال‌سازی) that users click to activate directly on their personal Google/Gmail accounts.

---

## 2. Requirements

### 2.1 Admin Capabilities
- **Pricing Control:** Admin can set the USD price (stored in `settings.gemini_18m_price`, default: $12.00).
- **Instructions Control:** Admin can customize the user instructions shown alongside the link (`settings.gemini_instructions`).
- **Inventory Management:**
  - Bulk add links via multiline paste (one link per line).
  - Track available vs. sold links.
  - Delete unsold links.
  - View buyer emails, order IDs, and sold dates.

### 2.2 Customer Experience (Web & Bot)
- **Web App (`/` tab `gemini`):**
  - View plan details, features, USD price & live Toman price (via Wallex).
  - Instant purchase with wallet balance deduction.
  - Immediate fulfillment: displays the activation link with "Copy Link" and "Open Activation Link" buttons.
  - Order history tab showing previous Gemini purchases.
- **Telegram Bot (`@onstagh_bot`):**
  - Dedicated menu button: `💎 خرید جمنای پرو`.
  - Command: `/gemini`.
  - Automatic balance check, instant link delivery with copyable `<code>` block and inline URL button.
  - Integrated into `/orders`.

---

## 3. Database Architecture (Neon PostgreSQL)

### `gemini_links` Table
```sql
CREATE TABLE IF NOT EXISTS gemini_links (
    id SERIAL PRIMARY KEY,
    invite_link TEXT NOT NULL,
    plan_type TEXT DEFAULT 'gemini_pro_18m',
    status TEXT DEFAULT 'AVAILABLE', -- 'AVAILABLE' or 'SOLD'
    note TEXT,
    sold_to_user_id INTEGER REFERENCES users(id),
    sold_at TIMESTAMP,
    order_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `gemini_orders` Table
```sql
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
```

---

## 4. API Endpoints
- `GET /api/gemini/plan`: Public plan metadata, USD price, Toman rate, available link count, and instructions.
- `POST /api/gemini/buy`: Authenticated purchase, deducting balance and claiming 1 available link.
- `GET /api/gemini/my-orders`: User's previous Gemini orders.
- `GET /api/gemini/admin/inventory`: Admin stats and link listings.
- `POST /api/gemini/admin/add-links`: Bulk link insertion.
- `POST /api/gemini/admin/settings`: Price and instructions updater.
- `DELETE /api/gemini/admin/link/:id`: Deletion of unsold links.
