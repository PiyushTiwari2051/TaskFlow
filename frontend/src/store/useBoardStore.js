import { create } from 'zustand';

export const useBoardStore = create((set, get) => ({
  user: null,
  accessToken: null,
  boards: [],
  currentBoard: null,
  columns: [],
  tasks: [],
  presence: [],
  cursors: {},
  notifications: [],
  isReconnecting: false,

  // Auth Reducers
  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  logoutUser: () => set({ user: null, accessToken: null, boards: [], currentBoard: null, columns: [], tasks: [], presence: [], cursors: {} }),

  // Boards list Reducers
  setBoards: (boards) => set({ boards }),
  addBoard: (board) => set((state) => ({ boards: [board, ...state.boards] })),

  // Active Board state Reducers
  setCurrentBoard: (board, columns, tasks) => set({
    currentBoard: board,
    columns: columns || [],
    tasks: tasks || []
  }),
  clearCurrentBoard: () => set({ currentBoard: null, columns: [], tasks: [], presence: [], cursors: {} }),

  // Reconnection Indicators
  setIsReconnecting: (isReconnecting) => set({ isReconnecting }),

  // Notification Reducers
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications]
  })),
  markAllNotificationsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true }))
  })),

  // --- Real-time Socket Event Reducers (Single-source-of-truth syncing) ---
  
  handleSocketTaskCreated: (task) => set((state) => {
    // Avoid duplicate creation
    if (state.tasks.some(t => t._id === task._id)) return {};
    
    const updatedTasks = [...state.tasks, task].sort((a, b) => a.position - b.position);
    
    // Update dual-mechanism taskOrder in column
    const updatedColumns = state.columns.map(col => {
      if (col._id === task.columnId) {
        return {
          ...col,
          taskOrder: [...col.taskOrder.filter(id => id !== task._id), task._id]
        };
      }
      return col;
    });

    return { tasks: updatedTasks, columns: updatedColumns };
  }),

  handleSocketTaskUpdated: (task) => set((state) => ({
    tasks: state.tasks.map(t => t._id === task._id ? task : t)
  })),

  handleSocketTaskMoved: ({ taskId, fromColumnId, toColumnId, newPosition }) => set((state) => {
    // 1. Move task
    const updatedTasks = state.tasks.map(t => {
      if (t._id === taskId) {
        return { ...t, columnId: toColumnId, position: newPosition };
      }
      return t;
    }).sort((a, b) => a.position - b.position);

    // 2. Sync taskOrders in affected columns
    const updatedColumns = state.columns.map(col => {
      // Remove from source column order
      if (col._id === fromColumnId) {
        return { ...col, taskOrder: col.taskOrder.filter(id => id !== taskId) };
      }
      // Add to target column order
      if (col._id === toColumnId) {
        const filtered = col.taskOrder.filter(id => id !== taskId);
        // Find insert index in target column using task positions
        const tasksInTarget = updatedTasks.filter(t => t.columnId === toColumnId);
        const taskIndex = tasksInTarget.findIndex(t => t._id === taskId);
        
        const finalOrder = [...filtered];
        if (taskIndex !== -1) {
          finalOrder.splice(taskIndex, 0, taskId);
        } else {
          finalOrder.push(taskId);
        }
        return { ...col, taskOrder: finalOrder };
      }
      return col;
    });

    return { tasks: updatedTasks, columns: updatedColumns };
  }),

  handleSocketTaskDeleted: ({ taskId, columnId }) => set((state) => {
    const updatedTasks = state.tasks.filter(t => t._id !== taskId);
    const updatedColumns = state.columns.map(col => {
      if (col._id === columnId) {
        return { ...col, taskOrder: col.taskOrder.filter(id => id !== taskId) };
      }
      return col;
    });
    return { tasks: updatedTasks, columns: updatedColumns };
  }),

  handleSocketColumnCreated: (column) => set((state) => {
    if (state.columns.some(c => c._id === column._id)) return {};
    return {
      columns: [...state.columns, column],
      currentBoard: state.currentBoard ? {
        ...state.currentBoard,
        columnOrder: [...state.currentBoard.columnOrder, column._id]
      } : null
    };
  }),

  handleSocketColumnRenamed: ({ columnId, title, color }) => set((state) => ({
    columns: state.columns.map(col => {
      if (col._id === columnId) {
        return { ...col, title, color };
      }
      return col;
    })
  })),

  handleSocketColumnDeleted: ({ columnId }) => set((state) => ({
    columns: state.columns.filter(col => col._id !== columnId),
    tasks: state.tasks.filter(t => t.columnId !== columnId),
    currentBoard: state.currentBoard ? {
      ...state.currentBoard,
      columnOrder: state.currentBoard.columnOrder.filter(id => id !== columnId)
    } : null
  })),

  handleSocketColumnReordered: ({ columnOrder }) => set((state) => ({
    currentBoard: state.currentBoard ? {
      ...state.currentBoard,
      columnOrder
    } : null
  })),

  handleSocketColumnRenormalized: ({ columnId, tasks }) => set((state) => {
    const positionMap = new Map(tasks.map(t => [t.id, t.position]));
    const updatedTasks = state.tasks.map(t => {
      if (positionMap.has(t._id)) {
        return { ...t, position: positionMap.get(t._id) };
      }
      return t;
    }).sort((a, b) => a.position - b.position);
    return { tasks: updatedTasks };
  }),

  handleSocketCommentAdded: ({ taskId, comment }) => set((state) => ({
    tasks: state.tasks.map(t => {
      if (t._id === taskId) {
        // Prevent duplicate comment insertion
        if (t.comments.some(c => c._id === comment._id)) return t;
        return { ...t, comments: [...t.comments, comment] };
      }
      return t;
    })
  })),

  // Presence Synchronization
  handleSocketPresenceSync: (presenceList) => set({ presence: presenceList }),
  
  handleSocketCursorMoved: ({ userId, x, y }) => set((state) => ({
    cursors: {
      ...state.cursors,
      [userId]: { x, y, timestamp: Date.now() }
    }
  })),

  handleSocketUserLeft: ({ userId }) => set((state) => {
    const newCursors = { ...state.cursors };
    delete newCursors[userId];
    return {
      presence: state.presence.filter(p => p.userId !== userId),
      cursors: newCursors
    };
  })
}));
