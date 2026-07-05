import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { isDisposableEmail } from '../utils/emailFilter.js';
import { sendOtpEmail } from '../config/email.js';

const AVATAR_COLORS = [
  '#0F6E5C', // Deep Teal
  '#E8973B', // Warm Amber
  '#1B2430', // Ink Navy
  '#E05D5D', // Coral Red
  '#583F8C', // Plum Purple
  '#2D6A4F', // Forest Green
  '#4E5D6C'  // Slate Gray
];

const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET || 'local_dev_access_secret_1234567890',
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (userId, tokenId) => {
  return jwt.sign(
    { userId, tokenId },
    process.env.JWT_REFRESH_SECRET || 'local_dev_refresh_secret_1234567890',
    { expiresIn: '7d' }
  );
};

const setCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';
  
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000 // 15 mins
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

const clearCookies = (res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax'
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax'
  });
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check disposable email
    if (isDisposableEmail(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Spam/Disposable email domains are not allowed. Please register with a real email.',
          fields: { email: 'Disposable email domains are blocked' }
        }
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email already in use',
          fields: { email: 'Email address is already registered' }
        }
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${avatarColor.replace('#', '')}&color=fff`;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = new User({
      name,
      email,
      passwordHash,
      avatarColor,
      avatarUrl,
      authProvider: 'local',
      emailVerified: false,
      otpCode: otp,
      otpExpiresAt
    });

    await user.save();
    
    // Trigger real or simulated email dispatch
    await sendOtpEmail(email, name, otp);

    return res.status(201).json({
      success: true,
      email: user.email,
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      message: 'OTP sent to email. Please verify your account.'
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const user = req.user; // Attached by Passport local strategy

    // Block unverified accounts
    if (!user.emailVerified) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'EMAIL_UNVERIFIED',
          message: 'Your email address is unverified. Please verify via OTP code.',
          email: user.email
        }
      });
    }

    const tokenId = crypto.randomUUID();
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id, tokenId);

    // Save hashed refresh token
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    user.refreshTokens.push({
      token: refreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      deviceInfo: req.headers['user-agent'] || 'unknown'
    });

    await user.save();
    setCookies(res, accessToken, refreshToken);

    return res.json({
      success: true,
      accessToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        avatarColor: user.avatarColor,
        preferences: user.preferences
      }
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Refresh token missing.'
        }
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'local_dev_refresh_secret_1234567890');
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Refresh token is invalid or expired.'
        }
      });
    }

    const { userId } = decoded;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'User does not exist.'
        }
      });
    }

    const refreshTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const tokenIndex = user.refreshTokens.findIndex(rt => rt.token === refreshTokenHash);

    // REUSE DETECTION (Theft protection)
    if (tokenIndex === -1) {
      // Reused token detected! Revoke all active sessions for security.
      user.refreshTokens = [];
      await user.save();
      clearCookies(res);
      return res.status(403).json({
        success: false,
        error: {
          code: 'SECURITY_BREACH',
          message: 'Token reuse detected. All sessions terminated.'
        }
      });
    }

    // Check if expired
    const activeToken = user.refreshTokens[tokenIndex];
    if (new Date() > activeToken.expiresAt) {
      user.refreshTokens.splice(tokenIndex, 1);
      await user.save();
      clearCookies(res);
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Refresh token expired.'
        }
      });
    }

    // ROTATION: generate new pair
    const newTokenId = crypto.randomUUID();
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id, newTokenId);
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    // Replace the old refresh token with the new one
    user.refreshTokens[tokenIndex] = {
      token: newRefreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      deviceInfo: req.headers['user-agent'] || 'unknown'
    };

    await user.save();
    setCookies(res, newAccessToken, newRefreshToken);

    return res.json({
      success: true,
      accessToken: newAccessToken // and cookie is set
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'local_dev_refresh_secret_1234567890', { ignoreExpiration: true });
      const user = await User.findById(decoded.userId);
      if (user) {
        const refreshTokenHash = crypto.createHash('sha256').update(token).digest('hex');
        user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshTokenHash);
        await user.save();
      }
    }
    clearCookies(res);
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  const token = req.cookies.accessToken || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

  return res.json({
    success: true,
    accessToken: token,
    user: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      avatarUrl: req.user.avatarUrl,
      avatarColor: req.user.avatarColor,
      preferences: req.user.preferences
    }
  });
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and verification code are required.' }
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found.' }
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Email is already verified.' }
      });
    }

    // Verify code match and expiry
    if (user.otpCode !== code) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_OTP', message: 'Invalid verification code.' }
      });
    }

    if (new Date() > user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        error: { code: 'EXPIRED_OTP', message: 'Verification code has expired. Please request a new one.' }
      });
    }

    // Activate user
    user.emailVerified = true;
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;

    const tokenId = crypto.randomUUID();
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id, tokenId);

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    user.refreshTokens.push({
      token: refreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      deviceInfo: req.headers['user-agent'] || 'unknown'
    });

    await user.save();
    setCookies(res, accessToken, refreshToken);

    return res.json({
      success: true,
      accessToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        avatarColor: user.avatarColor,
        preferences: user.preferences
      }
    });
  } catch (error) {
    next(error);
  }
};

export const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email address is required.' }
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found.' }
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Email is already verified.' }
      });
    }

    // Regenerate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.save();
    await sendOtpEmail(user.email, user.name, otp);

    return res.json({
      success: true,
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      message: 'A new OTP code has been sent to your email.'
    });
  } catch (error) {
    next(error);
  }
};
