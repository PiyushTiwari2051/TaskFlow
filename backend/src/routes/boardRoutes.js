import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireBoardAccess } from '../middleware/boardAuth.js';
import {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  joinBoard,
  regenerateInvite,
  deleteBoard,
  syncBoardState
} from '../controllers/boardController.js';
import { createColumn, reorderColumns } from '../controllers/columnController.js';
import { getTasksByBoard, createTask } from '../controllers/taskController.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', createBoard);
router.get('/', getBoards);
router.post('/join/:inviteCode', joinBoard);

router.get('/:id', requireBoardAccess(['owner', 'editor', 'viewer']), getBoardById);
router.get('/:id/sync', requireBoardAccess(['owner', 'editor', 'viewer']), syncBoardState);
router.patch('/:id', requireBoardAccess(['owner', 'editor']), updateBoard);
router.delete('/:id', requireBoardAccess(['owner']), deleteBoard);

router.post('/:id/invite/regenerate', requireBoardAccess(['owner', 'editor']), regenerateInvite);

// Nested column & task actions in board context
router.post('/:boardId/columns', requireBoardAccess(['owner', 'editor']), createColumn);
router.patch('/:boardId/columns/reorder', requireBoardAccess(['owner', 'editor']), reorderColumns);
router.get('/:boardId/tasks', requireBoardAccess(['owner', 'editor', 'viewer']), getTasksByBoard);
router.post('/:boardId/columns/:columnId/tasks', requireBoardAccess(['owner', 'editor']), createTask);

export default router;
