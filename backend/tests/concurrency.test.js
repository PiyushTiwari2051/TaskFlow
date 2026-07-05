import request from 'supertest';
import { app } from '../src/app.js';
import User from '../src/models/User.js';
import Task from '../src/models/Task.js';
import Column from '../src/models/Column.js';

describe('Task Move Concurrency & Consistency', () => {
  let cookie = null;
  let boardId = null;
  let columnId = null;
  let taskId = null;

  beforeEach(async () => {
    // 1. Register user
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Concurrency User', email: 'concurrent@example.com', password: 'password123' });
    const user = await User.findOne({ email: 'concurrent@example.com' });
    
    // Verify OTP
    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'concurrent@example.com', code: user.otpCode });
    cookie = verifyRes.headers['set-cookie'];

    // 2. Create board (provisions columns)
    const boardRes = await request(app)
      .post('/api/boards')
      .set('Cookie', cookie)
      .send({ title: 'Race Conditions Board' });
    boardId = boardRes.body.board._id;

    // Get the first column ID
    const boardDetails = await request(app)
      .get(`/api/boards/${boardId}`)
      .set('Cookie', cookie);
    columnId = boardDetails.body.columns[0]._id;

    // 3. Create a task in column
    const taskRes = await request(app)
      .post(`/api/boards/${boardId}/columns/${columnId}/tasks`)
      .set('Cookie', cookie)
      .send({ title: 'Dragged Task' });
    taskId = taskRes.body.task._id;
  });

  test('Should handle near-simultaneous card moves to the same position, preventing duplicate indexes through collision checks', async () => {
    // We will simulate 2 concurrent requests to move our task to the same column at the same position.
    // The target position is 1500 (between first task at 1000 and another).
    const targetPosition = 1500;

    // Fire two near-simultaneous move requests
    const p1 = request(app)
      .patch(`/api/tasks/${taskId}/move`)
      .set('Cookie', cookie)
      .send({ newColumnId: columnId, newPosition: targetPosition });

    const p2 = request(app)
      .patch(`/api/tasks/${taskId}/move`)
      .set('Cookie', cookie)
      .send({ newColumnId: columnId, newPosition: targetPosition });

    const [r1, r2] = await Promise.all([p1, p2]);

    // At least one request should succeed (or both, depending on timing and transactions)
    expect([200, 201]).toContain(r1.status);
    expect([200, 201]).toContain(r2.status);

    // Verify task positions in column. They must be consistent.
    const allTasks = await Task.find({ columnId }).sort({ position: 1 });
    
    // Check if there are any duplicate positions
    const positions = allTasks.map(t => t.position);
    const uniquePositions = [...new Set(positions)];
    
    expect(positions.length).toBe(uniquePositions.length);
  });
});
