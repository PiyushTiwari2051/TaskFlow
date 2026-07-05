import Board from '../models/Board.js';
import Column from '../models/Column.js';
import Task from '../models/Task.js';

export const requireBoardAccess = (roles = ['owner', 'editor', 'viewer']) => async (req, res, next) => {
  try {
    let boardId = req.params.boardId || req.params.id;

    // If request has task id, find task and resolve boardId
    if (req.params.taskId || (req.baseUrl.includes('tasks') && req.params.id)) {
      const taskId = req.params.taskId || req.params.id;
      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Task not found' }
        });
      }
      boardId = task.boardId;
      req.task = task;
    }
    // If request has column id, find column and resolve boardId
    else if (req.params.columnId || (req.baseUrl.includes('columns') && req.params.id)) {
      const columnId = req.params.columnId || req.params.id;
      const column = await Column.findById(columnId);
      if (!column) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Column not found' }
        });
      }
      boardId = column.boardId;
      req.column = column;
    }

    if (!boardId) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Board ID could not be resolved' }
      });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Board not found' }
      });
    }

    // Check membership
    const member = board.members.find(m => m.userId.toString() === req.user._id.toString());
    if (!member) {
      // 404 for non-members to avoid leaking existence
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Board not found' }
      });
    }

    // Check roles
    if (!roles.includes(member.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions for this action' }
      });
    }

    req.board = board;
    req.boardRole = member.role;
    next();
  } catch (error) {
    next(error);
  }
};
