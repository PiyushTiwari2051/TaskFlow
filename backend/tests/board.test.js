import request from 'supertest';
import { app } from '../src/app.js';
import User from '../src/models/User.js';
import Board from '../src/models/Board.js';

describe('Board API Permissions & Default Provisioning', () => {
  let ownerCookie = null;
  let nonMemberCookie = null;
  let boardId = null;

  beforeEach(async () => {
    // 1. Setup owner
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Board Owner', email: 'owner@example.com', password: 'password123' });
    const ownerUser = await User.findOne({ email: 'owner@example.com' });
    const ownerVerify = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'owner@example.com', code: ownerUser.otpCode });
    ownerCookie = ownerVerify.headers['set-cookie'];

    // 2. Setup non-member
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Non Member', email: 'nonmember@example.com', password: 'password123' });
    const nonMemberUser = await User.findOne({ email: 'nonmember@example.com' });
    const nonMemberVerify = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'nonmember@example.com', code: nonMemberUser.otpCode });
    nonMemberCookie = nonMemberVerify.headers['set-cookie'];

    // 3. Create a board using owner session
    const boardRes = await request(app)
      .post('/api/boards')
      .set('Cookie', ownerCookie)
      .send({ title: 'Multiplayer Board', description: 'Realtime specs' });
    boardId = boardRes.body.board._id;
  });

  test('POST /api/boards - Should auto-provision To Do, In Progress, and Done default columns', async () => {
    // Query board details
    const res = await request(app)
      .get(`/api/boards/${boardId}`)
      .set('Cookie', ownerCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.columns.length).toBe(3);
    
    const titles = res.body.columns.map(c => c.title);
    expect(titles).toContain('To Do');
    expect(titles).toContain('In Progress');
    expect(titles).toContain('Done');
    expect(res.body.board.columnOrder.length).toBe(3);
  });

  test('GET /api/boards/:id - Non-members should receive a 404 Not Found to prevent data leakage', async () => {
    const res = await request(app)
      .get(`/api/boards/${boardId}`)
      .set('Cookie', nonMemberCookie);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('PATCH /api/boards/:id - Only owners/editors can change board titles', async () => {
    const res = await request(app)
      .patch(`/api/boards/${boardId}`)
      .set('Cookie', nonMemberCookie)
      .send({ title: 'Hacked Title' });

    // Non-members receive a 404
    expect(res.status).toBe(404);

    // Owner edits title successfully
    const successRes = await request(app)
      .patch(`/api/boards/${boardId}`)
      .set('Cookie', ownerCookie)
      .send({ title: 'New Owner Title' });

    expect(successRes.status).toBe(200);
    expect(successRes.body.board.title).toBe('New Owner Title');
  });
});
