import mongoose from 'mongoose';
import Task from '../models/Task.js';
import Column from '../models/Column.js';
import Board from '../models/Board.js';
import { broadcastToBoard } from '../services/socketService.js';
import { runInTransaction } from '../utils/transaction.js';

export const getTasksByBoard = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const tasks = await Task.find({ boardId }).sort({ position: 1 });
    return res.json({ success: true, tasks });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const { boardId, columnId } = req.params;
    const { title, description } = req.body;

    const column = await Column.findById(columnId);
    if (!column || column.boardId.toString() !== boardId) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Column not found' }
      });
    }

    let task;
    await runInTransaction(async (session) => {
      const opts = session ? { session } : {};
      
      const lastTask = await Task.findOne({ columnId }).sort({ position: -1 }).setOptions(opts);
      const position = lastTask ? lastTask.position + 1000 : 1000;

      task = new Task({
        boardId,
        columnId,
        title,
        description: description || '',
        position,
        createdBy: req.user._id,
        activityLog: [{
          action: 'create',
          userId: req.user._id,
          meta: { title }
        }]
      });

      await task.save(opts);
      column.taskOrder.push(task._id);
      await column.save(opts);
    });

    broadcastToBoard(req, boardId, 'task:created', task);

    return res.status(201).json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const task = req.task; // resolved by boardAuth requireBoardAccess
    const { title, description, labels, priority, dueDate, assignees, checklist } = req.body;

    const changes = {};
    if (title !== undefined && title !== task.title) {
      changes.title = { from: task.title, to: title };
      task.title = title;
    }
    if (description !== undefined && description !== task.description) {
      changes.description = { from: task.description, to: description };
      task.description = description;
    }
    if (labels !== undefined) {
      changes.labels = labels;
      task.labels = labels;
    }
    if (priority !== undefined && priority !== task.priority) {
      changes.priority = { from: task.priority, to: priority };
      task.priority = priority;
    }
    if (dueDate !== undefined && String(dueDate) !== String(task.dueDate)) {
      changes.dueDate = { from: task.dueDate, to: dueDate };
      task.dueDate = dueDate;
    }
    if (assignees !== undefined) {
      changes.assignees = assignees;
      task.assignees = assignees;
    }
    if (checklist !== undefined) {
      changes.checklist = checklist;
      task.checklist = checklist;
    }

    if (Object.keys(changes).length > 0) {
      task.activityLog.push({
        action: 'update',
        userId: req.user._id,
        meta: changes
      });
    }

    await task.save();

    // Populate assignees and comments for response
    const updatedTask = await Task.findById(task._id)
      .populate('assignees', 'name email avatarUrl avatarColor')
      .populate('comments.userId', 'name email avatarUrl avatarColor');

    broadcastToBoard(req, task.boardId, 'task:updated', updatedTask);

    return res.json({ success: true, task: updatedTask });
  } catch (error) {
    next(error);
  }
};

export const moveTask = async (req, res, next) => {
  try {
    const task = req.task;
    const { newColumnId, newPosition } = req.body;

    const oldColumnId = task.columnId;
    task.columnId = newColumnId;
    task.position = newPosition;

    task.activityLog.push({
      action: 'move',
      userId: req.user._id,
      meta: { fromColumnId: oldColumnId, toColumnId: newColumnId, position: newPosition }
    });

    let collisionDetected = false;
    let renormalizedTasks = [];

    await runInTransaction(async (session) => {
      const opts = session ? { session } : {};
      await task.save(opts);

      if (oldColumnId) {
        await Column.updateOne(
          { _id: oldColumnId },
          { $pull: { taskOrder: task._id } },
          opts
        );
      }

      if (newColumnId) {
        // Find tasks in new column to establish correct taskOrder array
        const tasksInCol = await Task.find({ columnId: newColumnId }).sort({ position: 1 }).setOptions(opts);
        const taskIds = tasksInCol.map(t => t._id);
        
        await Column.updateOne(
          { _id: newColumnId },
          { $set: { taskOrder: taskIds } },
          opts
        );
      }

      const allTasksInCol = await Task.find({ columnId: newColumnId }).sort({ position: 1 }).setOptions(opts);
      for (let i = 0; i < allTasksInCol.length - 1; i++) {
        if (Math.abs(allTasksInCol[i + 1].position - allTasksInCol[i].position) < 1e-9) {
          collisionDetected = true;
          break;
        }
      }

      if (collisionDetected) {
        for (let i = 0; i < allTasksInCol.length; i++) {
          const newPos = (i + 1) * 1000;
          allTasksInCol[i].position = newPos;
          await allTasksInCol[i].save(opts);
          renormalizedTasks.push({ id: allTasksInCol[i]._id, position: newPos });
        }
      }
    });

    broadcastToBoard(req, task.boardId, 'task:moved', {
      taskId: task._id,
      fromColumnId: oldColumnId,
      toColumnId: newColumnId,
      newPosition,
      movedBy: req.user._id
    });

    if (collisionDetected) {
      broadcastToBoard(req, task.boardId, 'column:renormalized', {
        columnId: newColumnId,
        tasks: renormalizedTasks
      });
    }

    return res.json({
      success: true,
      task,
      collisionDetected,
      renormalizedTasks
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const task = req.task;

    await runInTransaction(async (session) => {
      const opts = session ? { session } : {};
      const column = await Column.findById(task.columnId).setOptions(opts);
      if (column) {
        column.taskOrder = column.taskOrder.filter(tId => tId.toString() !== task._id.toString());
        await column.save(opts);
      }
      await Task.findByIdAndDelete(task._id, opts);
    });

    broadcastToBoard(req, task.boardId, 'task:deleted', {
      taskId: task._id,
      columnId: task.columnId
    });

    return res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const addComment = async (req, res, next) => {
  try {
    const task = req.task;
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Comment text is required' }
      });
    }

    task.comments.push({
      userId: req.user._id,
      text
    });

    task.activityLog.push({
      action: 'comment',
      userId: req.user._id,
      meta: { text: text.substring(0, 30) }
    });

    await task.save();

    // Populate comments user details before responding
    const updatedTask = await Task.findById(task._id)
      .populate('comments.userId', 'name email avatarUrl avatarColor');

    const addedComment = updatedTask.comments[updatedTask.comments.length - 1];

    broadcastToBoard(req, task.boardId, 'comment:added', {
      taskId: task._id,
      comment: addedComment
    });

    return res.status(201).json({ success: true, comment: addedComment });
  } catch (error) {
    next(error);
  }
};

export const updateChecklistItem = async (req, res, next) => {
  try {
    const task = req.task;
    const { itemId } = req.params;
    const { done, text } = req.body;

    const item = task.checklist.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Checklist item not found' }
      });
    }

    if (done !== undefined) item.done = done;
    if (text !== undefined) item.text = text;

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('assignees', 'name email avatarUrl avatarColor')
      .populate('comments.userId', 'name email avatarUrl avatarColor');

    broadcastToBoard(req, task.boardId, 'task:updated', updatedTask);

    return res.json({ success: true, task: updatedTask });
  } catch (error) {
    next(error);
  }
};

export const addAttachment = async (req, res, next) => {
  try {
    const task = req.task;
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file was uploaded' }
      });
    }

    const attachmentUrl = `/uploads/${req.file.filename}`;
    const attachment = {
      url: attachmentUrl,
      filename: req.file.originalname,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    };

    task.attachments.push(attachment);
    task.activityLog.push({
      action: 'attach',
      userId: req.user._id,
      meta: { filename: req.file.originalname }
    });

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('assignees', 'name email avatarUrl avatarColor')
      .populate('comments.userId', 'name email avatarUrl avatarColor');

    broadcastToBoard(req, task.boardId, 'task:updated', updatedTask);

    return res.status(201).json({ success: true, attachment, task: updatedTask });
  } catch (error) {
    next(error);
  }
};
