const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, saveDatabase } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'numberland_secret_key_2024';
const JWT_EXPIRES = '7d';

/**
 * Register a new user
 */
exports.register = async (req, res) => {
    try {
        const { email, password, fullName } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'ایمیل و رمز عبور الزامی است' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'رمز عبور باید حداقل 6 کاراکتر باشد' });
        }

        const db = getDb();

        // Check if email exists
        const existing = await db.exec("SELECT id FROM users WHERE LOWER(email) = LOWER('" + email.replace(/'/g, "''") + "')");
        if (existing.length > 0 && existing[0].values.length > 0) {
            return res.status(400).json({ success: false, message: 'این ایمیل قبلاً ثبت شده است' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        await db.run('INSERT INTO users (email, password, full_name, balance) VALUES (?, ?, ?, ?)', 
            [email, hashedPassword, fullName || '', 0]);
        saveDatabase();

        // Get user ID
        const result = await db.exec("SELECT id FROM users WHERE LOWER(email) = LOWER('" + email.replace(/'/g, "''") + "')");
        const userId = result[0].values[0][0];

        // Generate token
        const token = jwt.sign({ userId, email, isAdmin: false }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

        res.json({
            success: true,
            message: 'ثبت‌نام با موفقیت انجام شد',
            token,
            user: { id: userId, email, fullName: fullName || '', balance: 0, isAdmin: false }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'خطا در ثبت‌نام' });
    }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'ایمیل و رمز عبور الزامی است' });
        }

        const db = getDb();

        // Find user
        const cleanEmail = (email || '').trim().replace(/'/g, "''");
        const result = await db.exec("SELECT id, email, password, full_name, balance, is_admin FROM users WHERE LOWER(email) = LOWER('" + cleanEmail + "')");
        if (result.length === 0 || result[0].values.length === 0) {
            return res.status(401).json({ success: false, message: 'ایمیل یا رمز عبور اشتباه است' });
        }

        const [userId, userEmail, hashedPassword, fullName, balance, isAdmin] = result[0].values[0];

        // Check password
        const isValid = await bcrypt.compare(password, hashedPassword);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'ایمیل یا رمز عبور اشتباه است' });
        }

        // Generate token
        const token = jwt.sign({ userId, email: userEmail, isAdmin: !!isAdmin }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

        res.json({
            success: true,
            message: 'ورود موفقیت‌آمیز',
            token,
            user: { id: userId, email: userEmail, fullName: fullName || '', balance: parseFloat(balance || 0), isAdmin: !!isAdmin }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'خطا در ورود' });
    }
};

/**
 * ورود / ثبت‌نام سریع با گوگل (Google OAuth / GIS)
 */
exports.googleLogin = async (req, res) => {
    try {
        const { email, name, googleId, picture } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'ایمیل از سوی گوگل دریافت نشد' });
        }

        const cleanEmail = email.toLowerCase().trim();
        const db = getDb();

        // بررسی اینکه آیا این ایمیل متعلق به ادمین سیستم است؟
        const isAdminUser = cleanEmail === 'nafa.1395@gmail.com' || cleanEmail === 'admin@numberland.com';

        // بررسی وجود کاربر
        const existing = await db.exec("SELECT id, email, full_name, balance, is_admin FROM users WHERE LOWER(email) = LOWER('" + cleanEmail.replace(/'/g, "''") + "')");
        
        let userId, userEmail, fullName, balance, isAdmin;

        if (existing.length > 0 && existing[0].values.length > 0) {
            // کاربر قبلاً ثبت شده، ورود انجام می‌شود
            [userId, userEmail, fullName, balance, isAdmin] = existing[0].values[0];

            // اگر ادمین اصلی بود، اطمینان از دسترسی ادمین
            if (isAdminUser && !isAdmin) {
                await db.run("UPDATE users SET is_admin = TRUE WHERE id = ?", [userId]);
                isAdmin = 1;
            }

            // به‌روزرسانی نام در صورت عدم وجود
            if (!fullName && name) {
                await db.run("UPDATE users SET full_name = ? WHERE id = ?", [name, userId]);
                fullName = name;
            }
            saveDatabase();
        } else {
            // ثبت‌نام کاربر جدید با گوگل
            const bcrypt = require('bcryptjs');
            const randomPassword = 'G_' + Math.random().toString(36).substring(2) + Date.now();
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            const initialBalance = isAdminUser ? 1000 : 0;
            const adminFlag = isAdminUser ? true : false;

            await db.run(
                'INSERT INTO users (email, password, full_name, balance, is_admin) VALUES (?, ?, ?, ?, ?)',
                [cleanEmail, hashedPassword, name || 'کاربر گوگل', initialBalance, adminFlag]
            );
            saveDatabase();

            const newResult = await db.exec("SELECT id, email, full_name, balance, is_admin FROM users WHERE LOWER(email) = LOWER('" + cleanEmail.replace(/'/g, "''") + "')");
            [userId, userEmail, fullName, balance, isAdmin] = newResult[0].values[0];
        }

        // ساخت توکن JWT
        const token = jwt.sign({ userId, email: userEmail, isAdmin: !!isAdmin }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

        res.json({
            success: true,
            message: 'ورود با حساب گوگل با موفقیت انجام شد',
            token,
            user: {
                id: userId,
                email: userEmail,
                fullName: fullName || name || '',
                balance: parseFloat(balance || 0),
                isAdmin: !!isAdmin,
                picture: picture || ''
            }
        });
    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ success: false, message: 'خطا در احراز هویت با گوگل: ' + error.message });
    }
};

/**
 * Get current user profile
 */
exports.getProfile = async (req, res) => {
    try {
        const db = getDb();
        const result = await db.exec("SELECT id, email, full_name, balance, is_admin, created_at FROM users WHERE id = " + parseInt(req.user.userId, 10));
        
        if (result.length === 0 || result[0].values.length === 0) {
            return res.status(404).json({ success: false, message: 'کاربر یافت نشد' });
        }

        const [id, email, fullName, balance, isAdmin, createdAt] = result[0].values[0];

        res.json({
            success: true,
            user: { id, email, fullName: fullName || '', balance: parseFloat(balance || 0), isAdmin: !!isAdmin, createdAt }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'خطا در دریافت پروفایل' });
    }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
    try {
        const { fullName } = req.body;
        const db = getDb();

        await db.run('UPDATE users SET full_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
            [fullName || '', req.user.userId]);
        saveDatabase();

        res.json({ success: true, message: 'پروفایل بروزرسانی شد' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'خطا در بروزرسانی پروفایل' });
    }
};

/**
 * Change password
 */
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'رمز عبور فعلی و جدید الزامی است' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'رمز عبور جدید باید حداقل 6 کاراکتر باشد' });
        }

        const db = getDb();

        // Get current password
        const result = await db.exec('SELECT password FROM users WHERE id = ?', [req.user.userId]);
        if (result.length === 0) {
            return res.status(404).json({ success: false, message: 'کاربر یافت نشد' });
        }

        const [hashedPassword] = result[0].values[0];

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, hashedPassword);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'رمز عبور فعلی اشتباه است' });
        }

        // Hash new password
        const newHashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await db.run('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
            [newHashedPassword, req.user.userId]);
        saveDatabase();

        res.json({ success: true, message: 'رمز عبور با موفقیت تغییر کرد' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'خطا در تغییر رمز عبور' });
    }
};

/**
 * Middleware: Authenticate JWT token
 */
exports.authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ success: false, message: 'توکن احراز هویت یافت نشد. لطفاً وارد حساب خود شوید.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        // Ensure user actually exists in the active database
        const db = getDb();
        const userCheck = await db.exec('SELECT id, is_admin FROM users WHERE id = ?', [decoded.userId]);
        if (userCheck.length === 0 || userCheck[0].values.length === 0) {
            return res.status(401).json({ success: false, message: 'حساب کاربری یافت نشد. لطفاً مجدداً وارد شوید.' });
        }

        req.user.isAdmin = !!userCheck[0].values[0][1];
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'توکن نامعتبر یا منقضی شده است' });
    }
};

/**
 * Middleware: Optional authentication (doesn't fail if no token)
 */
exports.optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        } catch (error) {
            // Token invalid, but continue without auth
        }
    }
    next();
};

/**
 * Middleware: Require admin
 */
exports.requireAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
    }
    next();
};

exports.JWT_SECRET = JWT_SECRET;
