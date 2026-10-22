const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const geminiController = require('../controllers/geminiController');

// مسیرهای عمومی و کاربران
router.get('/plan', geminiController.getPlanInfo);
router.post('/buy', authController.authenticate, geminiController.buyAccount);
router.get('/my-orders', authController.authenticate, geminiController.getMyOrders);

// مسیرهای مدیریت ادمین
router.get('/admin/inventory', authController.authenticate, authController.requireAdmin, geminiController.adminGetInventory);
router.post('/admin/add-links', authController.authenticate, authController.requireAdmin, geminiController.adminAddLinks);
router.post('/admin/settings', authController.authenticate, authController.requireAdmin, geminiController.adminUpdateSettings);
router.delete('/admin/link/:id', authController.authenticate, authController.requireAdmin, geminiController.adminDeleteLink);

module.exports = router;
