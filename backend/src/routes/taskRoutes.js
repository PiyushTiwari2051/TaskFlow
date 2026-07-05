import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireBoardAccess } from '../middleware/boardAuth.js';
import upload from '../middleware/upload.js';
import {
  updateTask,
  moveTask,
  deleteTask,
  addComment,
  updateChecklistItem,
  addAttachment
} from '../controllers/taskController.js';

const router = express.Router();

router.use(requireAuth);

// All these routes require board access checks which requireBoardAccess resolves dynamically
router.patch('/:id', requireBoardAccess(['owner', 'editor']), updateTask);
router.patch('/:id/move', requireBoardAccess(['owner', 'editor']), moveTask);
router.delete('/:id', requireBoardAccess(['owner', 'editor']), deleteTask);

router.post('/:id/comments', requireBoardAccess(['owner', 'editor', 'viewer']), addComment);
router.patch('/:id/checklist/:itemId', requireBoardAccess(['owner', 'editor']), updateChecklistItem);

// File upload attachment endpoint
router.post('/:id/attachments', requireBoardAccess(['owner', 'editor']), upload.single('attachment'), addAttachment);

export default router;
