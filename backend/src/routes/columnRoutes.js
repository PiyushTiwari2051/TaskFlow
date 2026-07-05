import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireBoardAccess } from '../middleware/boardAuth.js';
import { updateColumn, deleteColumn } from '../controllers/columnController.js';

const router = express.Router();

router.use(requireAuth);

router.patch('/:id', requireBoardAccess(['owner', 'editor']), updateColumn);
router.delete('/:id', requireBoardAccess(['owner', 'editor']), deleteColumn);

export default router;
