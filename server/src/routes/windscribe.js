const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const windscribeController = require('../controllers/windscribeController');

// مسیرهای عمومی و کاربران عادی
router.get('/plan', windscribeController.getPlanInfo);
router.post('/buy', authController.authenticate, windscribeController.buyAccount);
router.get('/my-orders', authController.authenticate, windscribeController.getMyOrders);

// مسیرهای مدیریت انبار و تنظیمات ادمین
router.get('/admin/inventory', authController.authenticate, authController.requireAdmin, windscribeController.adminGetInventory);
router.post('/admin/add-accounts', authController.authenticate, authController.requireAdmin, windscribeController.adminAddAccounts);
router.post('/admin/price', authController.authenticate, authController.requireAdmin, windscribeController.adminUpdatePrice);
router.delete('/admin/account/:id', authController.authenticate, authController.requireAdmin, windscribeController.adminDeleteAccount);

module.exports = router;
