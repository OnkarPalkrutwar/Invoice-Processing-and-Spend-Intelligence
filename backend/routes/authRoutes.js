const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { registerValidator, loginValidator, changePasswordValidator } = require('../validators/authValidator');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

router.post('/register', registerValidator, handleValidationErrors, authController.register);
router.post('/login', loginValidator, handleValidationErrors, authController.login);
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);
router.put('/change-password', authenticate, changePasswordValidator, handleValidationErrors, authController.changePassword);

module.exports = router;
