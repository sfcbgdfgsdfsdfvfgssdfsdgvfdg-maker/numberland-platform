const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.get('/profile', authController.authenticate, authController.getProfile);
router.put('/profile', authController.authenticate, authController.updateProfile);
router.put('/change-password', authController.authenticate, authController.changePassword);

module.exports = router;
