import mongoose from 'mongoose';
import Column from '../models/Column.js';
import Board from '../models/Board.js';
import Task from '../models/Task.js';
import { broadcastToBoard } from '../services/socketService.js';
import { runInTransaction } from '../utils/transaction.js';

export const createColumn = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { title, color } = req.body;
    const board = req.board;

    const column = new Column({
      boardId,
      title,
      color: color || '#E2E8F0',
      taskOrder: []
    });

    await runInTransaction(async (session) => {
      const opts = session ? { session } : {};
      await column.save(opts);
      board.columnOrder.push(column._id);
      await board.save(opts);
    });

    broadcastToBoard(req, boardId, 'column:created', column);

    return res.status(201).json({ success: true, column });
  } catch (error) {
    next(error);
  }
};

export const updateColumn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, color } = req.body;
    const column = req.column; // resolved by requireBoardAccess

    if (title !== undefined) column.title = title;
    if (color !== undefined) column.color = color;

    await column.save();

    broadcastToBoard(req, column.boardId, 'column:renamed', {
      columnId: column._id,
      title: column.title,
      color: column.color
    });

    return res.json({ success: true, column });
  } catch (error) {
    next(error);
  }
};

export const deleteColumn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const column = req.column;
    const board = await Board.findById(column.boardId);

    if (!board) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Board not found' }
      });
    }

    await runInTransaction(async (session) => {
      const opts = session ? { session } : {};
      await Task.deleteMany({ columnId: column._id }, opts);
      await Column.findByIdAndDelete(column._id, opts);
      board.columnOrder = board.columnOrder.filter(cId => cId.toString() !== column._id.toString());
      await board.save(opts);
    });

    broadcastToBoard(req, column.boardId, 'column:deleted', { columnId: column._id });

    return res.json({ success: true, message: 'Column deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const reorderColumns = async (req, res, next) => {
  try {
    const board = req.board;
    const { columnOrder } = req.body;

    if (!columnOrder || !Array.isArray(columnOrder)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'columnOrder must be an array of Column IDs' }
      });
    }

    board.columnOrder = columnOrder;
    await board.save();

    broadcastToBoard(req, board._id, 'column:reordered', { columnOrder: board.columnOrder });

    return res.json({ success: true, columnOrder: board.columnOrder });
  } catch (error) {
    next(error);
  }
};
