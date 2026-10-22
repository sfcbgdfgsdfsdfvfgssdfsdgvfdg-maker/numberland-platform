const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authController = require('../controllers/authController');

// Transaction history & general wallet
router.get('/transactions', walletController.getTransactions);
router.post('/invoice', walletController.createInvoice);
router.post('/wallex/create', walletController.createInvoice);
router.post('/trc20/verify', walletController.verifyTrc20);
router.get('/mock-pay', walletController.mockPay);
router.get('/rate', walletController.getWallexRate);
router.get('/status', walletController.getWallexStatus);
router.get('/wallex/status', walletController.getWallexStatus);
router.post('/deposit', walletController.deposit);

// Card-to-Card routes (کاربر عادی)
router.get('/card/info', walletController.getCardInfo);
router.post('/card/create', walletController.createCardInvoice);
router.post('/card/submit', walletController.submitCardReceipt);

// Card-to-Card Admin routes (مدیریت کارت به کارت برای ادمین)
router.get('/admin/card-settings', authController.requireAdmin, walletController.adminGetCardSettings);
router.post('/admin/card-settings', authController.requireAdmin, walletController.adminUpdateCardSettings);
router.get('/admin/card-requests', authController.requireAdmin, walletController.adminGetCardRequests);
router.post('/admin/card-approve', authController.requireAdmin, walletController.adminApproveCard);
router.post('/admin/card-reject', authController.requireAdmin, walletController.adminRejectCard);

module.exports = router;
