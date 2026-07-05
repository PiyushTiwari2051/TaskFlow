import request from 'supertest';
import { app } from '../src/app.js';
import User from '../src/models/User.js';

describe('Authentication API Endpoints with OTP', () => {
  const registerPayload = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  };

  test('POST /api/auth/register - Should register unverified user and return success message without cookies', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(registerPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.email).toBe(registerPayload.email);
    expect(res.body.message).toContain('OTP sent');

    // Verification cookies should NOT be issued on registration
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeUndefined();

    // Verify OTP code is saved in database
    const user = await User.findOne({ email: registerPayload.email });
    expect(user).toBeDefined();
    expect(user.emailVerified).toBe(false);
    expect(user.otpCode).toBeDefined();
    expect(user.otpCode.length).toBe(6);
  });

  test('POST /api/auth/register - Should block registrations with disposable email addresses', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Spammer',
        email: 'spam@mailinator.com',
        password: 'password123'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('Spam/Disposable email');
  });

  test('POST /api/auth/verify-otp - Should verify user, activate account, and issue token cookies', async () => {
    await request(app)
      .post('/api/auth/register')
      .send(registerPayload);

    const user = await User.findOne({ email: registerPayload.email });
    const otpCode = user.otpCode;

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: registerPayload.email,
        code: otpCode
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(registerPayload.email);
    expect(res.body.accessToken).toBeDefined();

    // Verification cookies must be issued now
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const hasAccessToken = cookies.some(c => c.includes('accessToken'));
    const hasRefreshToken = cookies.some(c => c.includes('refreshToken'));
    expect(hasAccessToken).toBe(true);
    expect(hasRefreshToken).toBe(true);

    const updatedUser = await User.findOne({ email: registerPayload.email });
    expect(updatedUser.emailVerified).toBe(true);
    expect(updatedUser.otpCode).toBeUndefined();
  });

  test('POST /api/auth/login - Should block login if email is unverified', async () => {
    await request(app)
      .post('/api/auth/register')
      .send(registerPayload);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: registerPayload.email,
        password: registerPayload.password
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_UNVERIFIED');
  });

  test('POST /api/auth/login - Should succeed after verifying email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send(registerPayload);

    const user = await User.findOne({ email: registerPayload.email });
    const otpCode = user.otpCode;

    // Verify first
    await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: registerPayload.email,
        code: otpCode
      });

    // Login should now work
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: registerPayload.email,
        password: registerPayload.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(registerPayload.email);
  });

  test('POST /api/auth/logout - Should clear cookies and session', async () => {
    await request(app)
      .post('/api/auth/register')
      .send(registerPayload);

    const user = await User.findOne({ email: registerPayload.email });
    const otpCode = user.otpCode;

    // Verify to get cookies
    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: registerPayload.email,
        code: otpCode
      });

    const cookies = verifyRes.headers['set-cookie'];
    const refreshTokenCookie = cookies.find(c => c.includes('refreshToken'));

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [refreshTokenCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const clearedCookies = res.headers['set-cookie'];
    expect(clearedCookies.some(c => c.includes('accessToken=;'))).toBe(true);
    expect(clearedCookies.some(c => c.includes('refreshToken=;'))).toBe(true);
  });
});
