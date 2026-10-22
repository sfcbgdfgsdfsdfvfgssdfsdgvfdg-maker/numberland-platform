const express = require('express');
const router = express.Router();
const numbersController = require('../controllers/numbersController');

router.get('/services', numbersController.getServices);
router.get('/providers', numbersController.getProviders);
router.get('/profit-stats', numbersController.getProfitStats);
router.post('/buy', numbersController.buyNumber);
router.get('/active', numbersController.syncActiveOrders);
router.get('/active-from-5sim', numbersController.syncActiveOrders); // backward compat
router.get('/check-sms/:orderId', numbersController.checkSms);
router.post('/cancel/:orderId', numbersController.cancelOrder);
router.post('/ban/:orderId', numbersController.banOrder);

module.exports = router;
