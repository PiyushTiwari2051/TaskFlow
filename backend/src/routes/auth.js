import express from 'express';
import passport from 'passport';
import { z } from 'zod';
import { validate } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { register, login, refresh, logout, getMe, verifyOtp, resendOtp } from '../controllers/authController.js';

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

router.post('/register', validate(registerSchema), register);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);

router.post('/login', loginLimiter, validate(loginSchema), (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: info ? info.message : 'Invalid credentials'
        }
      });
    }
    req.user = user;
    next();
  })(req, res, next);
}, login);

router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

export default router;
