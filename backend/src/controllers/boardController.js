import crypto from 'crypto';
import Board from '../models/Board.js';
import Column from '../models/Column.js';
import Task from '../models/Task.js';
import mongoose from 'mongoose';
import { broadcastToBoard } from '../services/socketService.js';
import { runInTransaction } from '../utils/transaction.js';

export const createBoard = async (req, res, next) => {
  try {
    const { title, description, backgroundColor, backgroundImageUrl } = req.body;
    
    const inviteCode = crypto.randomBytes(4).toString('hex'); // 8 character random hex string
    const inviteCodeExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const board = new Board({
      title,
      description,
      ownerId: req.user._id,
      members: [{ userId: req.user._id, role: 'owner', joinedAt: new Date() }],
      inviteCode,
      inviteCodeExpiresAt,
      backgroundColor: backgroundColor || '#0F6E5C',
      backgroundImageUrl
    });

    await board.save();

    // Create 3 default columns (To Do, In Progress, Done)
    const defaultColumns = ['To Do', 'In Progress', 'Done'];
    const columnIds = [];

    for (const title of defaultColumns) {
      const column = new Column({
        boardId: board._id,
        title,
        taskOrder: []
      });
      await column.save();
      columnIds.push(column._id);
    }

    board.columnOrder = columnIds;
    await board.save();

    return res.status(201).json({ success: true, board });
  } catch (error) {
    next(error);
  }
};

export const getBoards = async (req, res, next) => {
  try {
    const boards = await Board.find({
      'members.userId': req.user._id,
      isArchived: false
    })
    .populate('members.userId', 'name email avatarUrl avatarColor')
    .sort({ updatedAt: -1 });

    return res.json({ success: true, boards });
  } catch (error) {
    next(error);
  }
};

export const getBoardById = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate('members.userId', 'name email avatarUrl avatarColor lastActiveAt');

    if (!board || board.isArchived) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Board not found' }
      });
    }

    // Fetch all columns and tasks for this board
    const columns = await Column.find({ boardId: board._id });
    const tasks = await Task.find({ boardId: board._id }).sort({ position: 1 });

    // Order columns based on board.columnOrder
    const columnMap = new Map(columns.map(col => [col._id.toString(), col]));
    const orderedColumns = board.columnOrder
      .map(id => columnMap.get(id.toString()))
      .filter(Boolean);

    // Handle columns that might not be in columnOrder (fallback safety)
    columns.forEach(col => {
      if (!board.columnOrder.some(id => id.toString() === col._id.toString())) {
        orderedColumns.push(col);
      }
    });

    return res.json({
      success: true,
      board: {
        _id: board._id,
        title: board.title,
        description: board.description,
        ownerId: board.ownerId,
        members: board.members,
        inviteCode: board.inviteCode,
        inviteCodeExpiresAt: board.inviteCodeExpiresAt,
        backgroundColor: board.backgroundColor,
        backgroundImageUrl: board.backgroundImageUrl,
        columnOrder: board.columnOrder,
        isArchived: board.isArchived,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt
      },
      columns: orderedColumns,
      tasks
    });
  } catch (error) {
    next(error);
  }
};

export const updateBoard = async (req, res, next) => {
  try {
    const board = req.board;
    const { title, description, backgroundColor, backgroundImageUrl, members, columnOrder } = req.body;

    if (title !== undefined) board.title = title;
    if (description !== undefined) board.description = description;
    if (backgroundColor !== undefined) board.backgroundColor = backgroundColor;
    if (backgroundImageUrl !== undefined) board.backgroundImageUrl = backgroundImageUrl;
    if (columnOrder !== undefined) board.columnOrder = columnOrder;

    if (members !== undefined) {
      if (req.boardRole !== 'owner') {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only board owners can update member roles.' }
        });
      }
      board.members = members;
    }

    await board.save();

    // Re-populate and return
    const updatedBoard = await Board.findById(board._id)
      .populate('members.userId', 'name email avatarUrl avatarColor');

    broadcastToBoard(req, board._id, 'board:updated', updatedBoard);

    return res.json({ success: true, board: updatedBoard });
  } catch (error) {
    next(error);
  }
};

export const joinBoard = async (req, res, next) => {
  try {
    const { inviteCode } = req.params;
    const board = await Board.findOne({ inviteCode, isArchived: false });

    if (!board) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invite link is invalid or the board has been archived.' }
      });
    }

    // Check expiration
    if (board.inviteCodeExpiresAt && new Date() > board.inviteCodeExpiresAt) {
      return res.status(410).json({
        success: false,
        error: { code: 'INVITE_EXPIRED', message: 'This invite link has expired.' }
      });
    }

    // Check if already member
    const isMember = board.members.some(m => m.userId.toString() === req.user._id.toString());
    if (isMember) {
      return res.json({ success: true, boardId: board._id, message: 'Already a member.' });
    }

    // Add member as editor
    board.members.push({
      userId: req.user._id,
      role: 'editor',
      joinedAt: new Date()
    });

    await board.save();

    return res.json({ success: true, boardId: board._id, message: 'Joined board successfully.' });
  } catch (error) {
    next(error);
  }
};

export const regenerateInvite = async (req, res, next) => {
  try {
    const board = req.board;
    if (req.boardRole !== 'owner' && req.boardRole !== 'editor') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only owners or editors can regenerate the invite link.' }
      });
    }

    board.inviteCode = crypto.randomBytes(4).toString('hex');
    board.inviteCodeExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await board.save();

    return res.json({
      success: true,
      inviteCode: board.inviteCode,
      inviteCodeExpiresAt: board.inviteCodeExpiresAt
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBoard = async (req, res, next) => {
  try {
    const board = req.board;
    const { immediate, confirmTitle } = req.query;

    if (req.boardRole !== 'owner') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only the board owner can delete the board.' }
      });
    }

    if (immediate === 'true') {
      if (confirmTitle !== board.title) {
        return res.status(400).json({
          success: false,
          error: { code: 'CONFIRMATION_FAILED', message: 'Board name confirmation does not match.' }
        });
      }

      // Hard Delete using transaction helper
      await runInTransaction(async (session) => {
        const opts = session ? { session } : {};
        await Task.deleteMany({ boardId: board._id }, opts);
        await Column.deleteMany({ boardId: board._id }, opts);
        await Board.findByIdAndDelete(board._id, opts);
      });

      broadcastToBoard(req, board._id, 'board:deleted', { boardId: board._id });

      return res.json({ success: true, message: 'Board deleted permanently.' });
    } else {
      // Soft Delete
      board.isArchived = true;
      await board.save();

      broadcastToBoard(req, board._id, 'board:deleted', { boardId: board._id });

      return res.json({ success: true, message: 'Board archived successfully.' });
    }
  } catch (error) {
    next(error);
  }
};

export const syncBoardState = async (req, res, next) => {
  try {
    const board = req.board;
    const { since } = req.query;

    const sinceDate = since ? new Date(Number(since)) : new Date(0);

    // Fetch what has changed
    const updatedBoard = board.updatedAt > sinceDate ? board : null;
    
    const updatedColumns = await Column.find({
      boardId: board._id,
      updatedAt: { $gt: sinceDate }
    });

    const updatedTasks = await Task.find({
      boardId: board._id,
      updatedAt: { $gt: sinceDate }
    })
    .populate('assignees', 'name email avatarUrl avatarColor')
    .populate('comments.userId', 'name email avatarUrl avatarColor');

    // Also send list of current column and task IDs for reconciliation
    const activeColumns = await Column.find({ boardId: board._id }).select('_id');
    const activeTasks = await Task.find({ boardId: board._id }).select('_id');

    return res.json({
      success: true,
      syncTime: Date.now(),
      board: updatedBoard,
      columns: updatedColumns,
      tasks: updatedTasks,
      activeColumnIds: activeColumns.map(c => c._id),
      activeTaskIds: activeTasks.map(t => t._id)
    });
  } catch (error) {
    next(error);
  }
};
