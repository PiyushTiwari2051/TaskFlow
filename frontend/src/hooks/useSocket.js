import { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useBoardStore } from '../store/useBoardStore.js';
import { apiRequest } from '../utils/api.js';

let socket = null;

export const useSocket = (boardId) => {
  const lastSyncTimeRef = useRef(Date.now());
  const boardIdRef = useRef(boardId);

  const {
    user,
    setIsReconnecting,
    handleSocketTaskCreated,
    handleSocketTaskUpdated,
    handleSocketTaskMoved,
    handleSocketTaskDeleted,
    handleSocketColumnCreated,
    handleSocketColumnRenamed,
    handleSocketColumnDeleted,
    handleSocketColumnReordered,
    handleSocketColumnRenormalized,
    handleSocketCommentAdded,
    handleSocketPresenceSync,
    handleSocketCursorMoved,
    handleSocketUserLeft
  } = useBoardStore();

  // Track active boardId in a ref to avoid stale closures in listeners
  useEffect(() => {
    boardIdRef.current = boardId;
  }, [boardId]);

  // Synchronize state from API upon successful socket reconnection
  const catchUpAfterDisconnect = async (activeBoardId) => {
    if (!activeBoardId) return;

    try {
      const response = await apiRequest(`/api/boards/${activeBoardId}/sync?since=${lastSyncTimeRef.current}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const store = useBoardStore.getState();
          
          // 1. Sync board details if updated
          if (data.board) {
            store.setCurrentBoard(data.board, store.columns, store.tasks);
          }

          // 2. Sync columns (update or add)
          let currentCols = [...store.columns];
          data.columns.forEach(col => {
            const index = currentCols.findIndex(c => c._id === col._id);
            if (index !== -1) {
              currentCols[index] = col;
            } else {
              currentCols.push(col);
            }
          });

          // 3. Sync tasks (update or add)
          let currentTasks = [...store.tasks];
          data.tasks.forEach(task => {
            const index = currentTasks.findIndex(t => t._id === task._id);
            if (index !== -1) {
              currentTasks[index] = task;
            } else {
              currentTasks.push(task);
            }
          });

          // 4. Prune deleted documents
          currentCols = currentCols.filter(col => data.activeColumnIds.includes(col._id));
          currentTasks = currentTasks.filter(task => data.activeTaskIds.includes(task._id));

          // 5. Apply synchronized state
          store.setCurrentBoard(store.currentBoard, currentCols, currentTasks.sort((a, b) => a.position - b.position));
          
          // Update timestamp
          lastSyncTimeRef.current = data.syncTime;
        }
      }
    } catch (error) {
      console.error('Failed to sync board state after reconnect:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      return;
    }

    // Initialize socket connection if not exists
    if (!socket) {
      // Connect using root proxy route (transfers cookies automatically)
      socket = io('/', {
        autoConnect: false,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10
      });
    }

    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      console.log('Socket client connected to server');
      setIsReconnecting(false);
      window.socketId = socket.id;

      // Join room if active board is open
      if (boardIdRef.current) {
        socket.emit('board:join', { boardId: boardIdRef.current });
        catchUpAfterDisconnect(boardIdRef.current);
      }
    };

    const onDisconnect = () => {
      console.log('Socket client disconnected');
      setIsReconnecting(true);
      window.socketId = null;
    };

    const onReconnect = () => {
      console.log('Socket client reconnected');
      setIsReconnecting(false);
      window.socketId = socket.id;

      if (boardIdRef.current) {
        socket.emit('board:join', { boardId: boardIdRef.current });
        catchUpAfterDisconnect(boardIdRef.current);
      }
    };

    // Register event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect', onReconnect);

    // Kanban updates
    socket.on('task:created', (task) => {
      handleSocketTaskCreated(task);
      lastSyncTimeRef.current = Date.now();
    });
    
    socket.on('task:updated', (task) => {
      handleSocketTaskUpdated(task);
      lastSyncTimeRef.current = Date.now();
    });

    socket.on('task:moved', (data) => {
      handleSocketTaskMoved(data);
      lastSyncTimeRef.current = Date.now();
    });

    socket.on('task:deleted', (data) => {
      handleSocketTaskDeleted(data);
      lastSyncTimeRef.current = Date.now();
    });

    socket.on('column:created', (col) => {
      handleSocketColumnCreated(col);
      lastSyncTimeRef.current = Date.now();
    });

    socket.on('column:renamed', (colData) => {
      handleSocketColumnRenamed(colData);
      lastSyncTimeRef.current = Date.now();
    });

    socket.on('column:deleted', (colData) => {
      handleSocketColumnDeleted(colData);
      lastSyncTimeRef.current = Date.now();
    });

    socket.on('column:reordered', (data) => {
      handleSocketColumnReordered(data);
      lastSyncTimeRef.current = Date.now();
    });

    socket.on('column:renormalized', (data) => {
      handleSocketColumnRenormalized(data);
      lastSyncTimeRef.current = Date.now();
    });

    socket.on('comment:added', (data) => {
      handleSocketCommentAdded(data);
      lastSyncTimeRef.current = Date.now();
    });

    // Presence & Cursors
    socket.on('presence:sync', (list) => {
      handleSocketPresenceSync(list);
    });

    socket.on('cursor:move', (data) => {
      handleSocketCursorMoved(data);
    });

    socket.on('user:joined', (data) => {
      // Just updates list from presence:sync, handled by room
    });

    socket.on('user:left', (data) => {
      handleSocketUserLeft(data);
    });

    // Cleanup on unmount/auth change
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect', onReconnect);
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:moved');
      socket.off('task:deleted');
      socket.off('column:created');
      socket.off('column:renamed');
      socket.off('column:deleted');
      socket.off('column:reordered');
      socket.off('column:renormalized');
      socket.off('comment:added');
      socket.off('presence:sync');
      socket.off('cursor:move');
      socket.off('user:joined');
      socket.off('user:left');
    };
  }, [user]);

  // Handle boardId room changes
  useEffect(() => {
    if (socket && socket.connected && user) {
      // Leave old board room
      socket.emit('board:leave');
      
      // Reset synchronization timestamp
      lastSyncTimeRef.current = Date.now();

      if (boardId) {
        socket.emit('board:join', { boardId });
        catchUpAfterDisconnect(boardId);
      }
    }
  }, [boardId, user]);

  // Method to emit mouse movements to room
  const sendCursorPosition = (x, y) => {
    if (socket && socket.connected && boardId) {
      socket.emit('cursor:move', { x, y });
    }
  };

  return {
    socket,
    sendCursorPosition
  };
};
