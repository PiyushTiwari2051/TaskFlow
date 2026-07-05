import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useBoardStore } from '../store/useBoardStore.js';
import { useSocket } from '../hooks/useSocket.js';
import { apiRequest } from '../utils/api.js';
import { ToastContext } from '../App.jsx';
import TaskCard from '../components/TaskCard.jsx';
import TaskDetailsPanel from '../components/TaskDetailsPanel.jsx';
import CommandPalette from '../components/CommandPalette.jsx';

import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  KeyboardSensor
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';

import {
  KanbanSquare,
  Plus,
  Trash2,
  Settings,
  Share2,
  Users,
  Moon,
  Sun,
  LayoutGrid,
  ChevronLeft,
  X,
  Command,
  Edit2
} from 'lucide-react';

export default function BoardViewPage() {
  const { id: boardId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useContext(ToastContext);

  const {
    user,
    currentBoard,
    columns,
    tasks,
    presence,
    cursors,
    setCurrentBoard,
    clearCurrentBoard
  } = useBoardStore();

  // Socket setup
  const { sendCursorPosition } = useSocket(boardId);

  // Local component states
  const [loading, setLoading] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Board Title Editing
  const [boardTitle, setBoardTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);

  // Column Adding
  const [addColumnTitle, setAddColumnTitle] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  // Column Editing
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [columnEditTitle, setColumnEditTitle] = useState('');

  // Quick Task Adding per Column
  const [quickTaskColId, setQuickTaskColId] = useState(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  // Cursors throttle tracking
  const lastCursorEmitRef = useRef(0);

  // Fetch Board Details on mount / ID change
  useEffect(() => {
    const fetchBoardDetails = async () => {
      setLoading(true);
      try {
        const res = await apiRequest(`/api/boards/${boardId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setCurrentBoard(data.board, data.columns, data.tasks);
            setBoardTitle(data.board.title);
          } else {
            showToast({ message: data.error?.message || 'Board not found.', type: 'error' });
            navigate('/app');
          }
        } else {
          showToast({ message: 'Not authorized to view this board.', type: 'error' });
          navigate('/app');
        }
      } catch (err) {
        showToast({ message: 'Network error. Please try again.', type: 'error' });
        navigate('/app');
      } finally {
        setLoading(false);
      }
    };

    fetchBoardDetails();
    return () => clearCurrentBoard();
  }, [boardId]);

  // Keyboard Shortcuts (Cmd+K palette, Escape close details)
  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      // Cmd+K or Ctrl+K opens Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      
      // '/' opens Command Palette
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);

  // Track Mouse Movements for Live multiplayer cursors
  const handleMouseMove = (e) => {
    const now = Date.now();
    // Throttle cursor emit to max 20 per second (50ms interval)
    if (now - lastCursorEmitRef.current > 50) {
      const boardContainer = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - boardContainer.left;
      const y = e.clientY - boardContainer.top;
      sendCursorPosition(x, y);
      lastCursorEmitRef.current = now;
    }
  };

  // --- Dnd-kit Configuration ---
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8 // Start dragging only after moving 8px to allow clicking
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms hold delay to prevent drag scroll collision
        tolerance: 5 // allow minor movement tolerance during press-hold
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragStart = (event) => {
    setActiveTaskId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTaskId(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find active task details
    const activeTask = tasks.find(t => t._id === activeId);
    if (!activeTask) return;

    // Resolve target column ID
    let targetColumnId = null;
    const isOverColumn = columns.some(c => c._id === overId);

    if (isOverColumn) {
      targetColumnId = overId;
    } else {
      const overTask = tasks.find(t => t._id === overId);
      if (overTask) {
        targetColumnId = overTask.columnId;
      }
    }

    if (!targetColumnId) return;

    // Filter out dragged card from target tasks to compute positioning gap
    const targetTasks = tasks.filter(t => t.columnId === targetColumnId && t._id !== activeId);
    
    let dropIndex = 0;
    if (!isOverColumn) {
      dropIndex = targetTasks.findIndex(t => t._id === overId);
    } else {
      dropIndex = targetTasks.length; // place at the bottom of the column container
    }

    // Fractional position calculations
    let newPosition = 1000;
    if (targetTasks.length === 0) {
      newPosition = 1000;
    } else if (dropIndex === 0) {
      newPosition = targetTasks[0].position / 2;
    } else if (dropIndex >= targetTasks.length) {
      newPosition = targetTasks[targetTasks.length - 1].position + 1000;
    } else {
      const prevPos = targetTasks[dropIndex - 1].position;
      const nextPos = targetTasks[dropIndex].position;
      newPosition = (prevPos + nextPos) / 2;
    }

    // Optimistic Save
    const backupTasks = [...tasks];
    const backupColumns = [...columns];

    const store = useBoardStore.getState();
    store.handleSocketTaskMoved({
      taskId: activeId,
      fromColumnId: activeTask.columnId,
      toColumnId: targetColumnId,
      newPosition
    });

    try {
      const res = await apiRequest(`/api/tasks/${activeId}/move`, {
        method: 'PATCH',
        body: JSON.stringify({
          newColumnId: targetColumnId,
          newPosition
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error();
      }
      
      // Handle collision updates
      if (data.collisionDetected && data.renormalizedTasks) {
        store.handleSocketColumnRenormalized({
          columnId: targetColumnId,
          tasks: data.renormalizedTasks
        });
      }
    } catch (err) {
      // Revert optimistic updates
      useBoardStore.setState({ tasks: backupTasks, columns: backupColumns });
      showToast({ message: 'Failed to sync move. Card reverted.', type: 'error' });
    }
  };

  // --- Inline Title Updates ---
  const handleUpdateBoardTitle = async () => {
    if (!boardTitle.trim() || boardTitle.trim() === currentBoard.title) {
      setBoardTitle(currentBoard.title);
      setEditingTitle(false);
      return;
    }
    
    setEditingTitle(false);
    try {
      await apiRequest(`/api/boards/${boardId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: boardTitle.trim() })
      });
    } catch (err) {
      setBoardTitle(currentBoard.title);
      showToast({ message: 'Failed to update board title.', type: 'error' });
    }
  };

  // --- Column lifecycle ---
  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (!addColumnTitle.trim()) return;

    try {
      const res = await apiRequest(`/api/boards/${boardId}/columns`, {
        method: 'POST',
        body: JSON.stringify({ title: addColumnTitle.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAddColumnTitle('');
        setIsAddingColumn(false);
      } else {
        showToast({ message: 'Failed to create column.', type: 'error' });
      }
    } catch (err) {
      showToast({ message: 'Network error.', type: 'error' });
    }
  };

  const handleRenameColumn = async (colId) => {
    if (!columnEditTitle.trim()) return;
    try {
      const res = await apiRequest(`/api/columns/${colId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: columnEditTitle.trim() })
      });
      if (res.ok) {
        setEditingColumnId(null);
      }
    } catch (err) {
      showToast({ message: 'Failed to rename column.', type: 'error' });
    }
  };

  const handleDeleteColumn = async (colId) => {
    if (!window.confirm('Delete this column and all its task cards? This action is permanent.')) return;
    try {
      await apiRequest(`/api/columns/${colId}`, { method: 'DELETE' });
    } catch (err) {
      showToast({ message: 'Failed to delete column.', type: 'error' });
    }
  };

  // --- Task lifecycle ---
  const handleCreateTask = async (columnId) => {
    if (!quickTaskTitle.trim()) return;

    try {
      const res = await apiRequest(`/api/boards/${boardId}/columns/${columnId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ title: quickTaskTitle.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setQuickTaskTitle('');
        setQuickTaskColId(null);
      } else {
        showToast({ message: 'Failed to create card.', type: 'error' });
      }
    } catch (err) {
      showToast({ message: 'Network error.', type: 'error' });
    }
  };

  // Copy share invite link
  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/invite/${currentBoard.inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    showToast({ message: 'Invite link copied to clipboard!', type: 'success' });
  };

  // Filter cursors that are older than 5 seconds (phantom filtering)
  const activeCursors = Object.entries(cursors).filter(([_, data]) => Date.now() - data.timestamp < 5000);

  // Render Skeleton Loader while fetching board data
  if (loading || !currentBoard) {
    return (
      <div class="h-full w-full flex flex-col bg-[#F9F9FB] dark:bg-navy-950">
        <div class="h-16 border-b border-navy-100 dark:border-navy-900 bg-white dark:bg-navy-900 animate-pulse"></div>
        <div class="flex-1 p-6 flex gap-6 overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} class="w-72 bg-navy-50/50 dark:bg-navy-900/30 p-4 rounded-2xl flex flex-col gap-4 animate-pulse">
              <div class="h-6 bg-navy-200 dark:bg-navy-800 rounded w-1/2"></div>
              <div class="h-28 bg-white dark:bg-navy-850 rounded-xl"></div>
              <div class="h-28 bg-white dark:bg-navy-850 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Active dragged card preview details for overlay
  const activeDraggedTask = activeTaskId ? tasks.find(t => t._id === activeTaskId) : null;

  return (
    <div 
      class="h-full flex flex-col bg-ink-light dark:bg-navy-955 overflow-hidden relative select-none"
      onMouseMove={handleMouseMove}
    >
      {/* Immersive mesh background tints matching the selected board accent color */}
      <div 
        class="absolute -top-[300px] -left-[300px] h-[700px] w-[700px] rounded-full blur-[150px] opacity-[0.07] dark:opacity-[0.09] pointer-events-none transition-all duration-700 z-0"
        style={{ backgroundColor: currentBoard.backgroundColor || '#0F6E5C' }}
      ></div>
      <div 
        class="absolute -bottom-[300px] -right-[300px] h-[700px] w-[700px] rounded-full blur-[150px] opacity-[0.07] dark:opacity-[0.09] pointer-events-none transition-all duration-700 z-0"
        style={{ backgroundColor: currentBoard.backgroundColor || '#0F6E5C' }}
      ></div>
      
      {/* Board Top-Bar Workspace Navigation */}
      <header class="bg-white dark:bg-navy-900 border-b border-navy-100 dark:border-navy-800/80 px-6 py-3 flex items-center justify-between shadow-sm z-20 shrink-0">
        <div class="flex items-center gap-4 min-w-0">
          <Link 
            to="/app" 
            class="p-2 rounded-xl text-navy-450 hover:text-primary dark:hover:text-primary-light hover:bg-navy-50 dark:hover:bg-navy-800 transition-colors btn-press"
          >
            <ChevronLeft class="h-4.5 w-4.5" />
          </Link>

          {/* Editable title */}
          <div class="flex items-center gap-2 min-w-0">
            {editingTitle ? (
              <input
                type="text"
                value={boardTitle}
                onChange={(e) => setBoardTitle(e.target.value)}
                onBlur={handleUpdateBoardTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateBoardTitle()}
                class="font-heading font-bold text-base sm:text-lg text-navy-900 dark:text-white px-2 py-1 bg-navy-50 dark:bg-navy-800 rounded-lg focus:outline-none focus:border-primary max-w-[120px] sm:max-w-[240px]"
                autoFocus
              />
            ) : (
              <div 
                onClick={() => setEditingTitle(true)}
                class="group flex items-center gap-2 cursor-pointer min-w-0"
              >
                <h1 class="font-heading font-bold text-base sm:text-lg text-navy-900 dark:text-white truncate max-w-[120px] sm:max-w-[240px]">
                  {boardTitle}
                </h1>
                <Edit2 class="h-3 w-3 sm:h-3.5 sm:w-3.5 text-navy-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>
        </div>

        {/* Action controls (Presence Stack, Invite, Theme, Settings, Cmd+K info) */}
        <div class="flex items-center gap-2 sm:gap-4 shrink-0">
          
          {/* Cmd+K info banner */}
          <button 
            onClick={() => setIsCommandPaletteOpen(true)}
            class="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-navy-50/50 dark:bg-navy-850 border border-navy-100 dark:border-navy-800 rounded-xl text-[10px] text-navy-400 font-bold hover:border-primary transition-colors"
          >
            <Command class="h-3 w-3" />
            <span>Search</span>
            <kbd class="text-[9px] opacity-70">Cmd+K</kbd>
          </button>

          {/* Presence avatar dots (hidden on mobile, shown on sm+) */}
          <div class="hidden sm:flex items-center gap-1.5 border-r border-navy-100 dark:border-navy-800 pr-4">
            <div class="flex -space-x-1.5 overflow-hidden">
              {presence.slice(0, 4).map((pres, idx) => (
                <div key={pres.userId || idx} class="relative">
                  <img
                    src={pres.avatarUrl}
                    title={pres.name}
                    alt={pres.name}
                    class="h-6 w-6 rounded-full border border-white dark:border-navy-900 object-cover"
                  />
                  {/* Status indicator ring */}
                  <span class="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-white dark:border-navy-900"></span>
                </div>
              ))}
              {presence.length > 4 && (
                <span class="h-6 w-6 rounded-full border border-white dark:border-navy-900 bg-navy-100 dark:bg-navy-850 flex items-center justify-center text-[8px] font-bold text-navy-400">
                  +{presence.length - 4}
                </span>
              )}
            </div>
          </div>

          {/* Invite Trigger */}
          <button 
            onClick={copyInviteLink}
            class="px-2.5 py-1.5 sm:px-3.5 bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-light text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5 btn-press"
          >
            <Share2 class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">Invite</span>
          </button>

          {/* Settings toggler */}
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            class="p-2 rounded-xl border border-navy-100 dark:border-navy-800 text-navy-400 hover:text-primary dark:hover:text-primary-light transition-all btn-press"
          >
            <Settings class="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* Board Column Canvas */}
      <div class="flex-1 overflow-x-auto overflow-y-hidden px-8 py-6 flex gap-6 items-start custom-scrollbar relative z-10">
        
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {columns.map(col => {
            const colTasks = tasks.filter(t => t.columnId === col._id);
            const isEditingCol = editingColumnId === col._id;

            return (
              <div 
                key={col._id}
                class="w-72 max-h-full flex flex-col bg-navy-50/50 dark:bg-navy-900/35 border border-navy-100/40 dark:border-navy-800/40 rounded-2xl p-4 shrink-0 transition-colors"
              >
                {/* Column header */}
                <div class="flex items-center justify-between mb-4 group/colheader">
                  {isEditingCol ? (
                    <input 
                      type="text"
                      value={columnEditTitle}
                      onChange={(e) => setColumnEditTitle(e.target.value)}
                      onBlur={() => handleRenameColumn(col._id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRenameColumn(col._id)}
                      class="font-heading font-bold text-sm text-navy-850 dark:text-white px-2 py-0.5 bg-white dark:bg-navy-800 border border-primary/25 rounded-md focus:outline-none w-44"
                      autoFocus
                    />
                  ) : (
                    <div 
                      onClick={() => { setEditingColumnId(col._id); setColumnEditTitle(col.title); }}
                      class="flex items-center gap-2 cursor-pointer min-w-0"
                    >
                      <h3 class="font-heading font-bold text-sm text-navy-855 dark:text-white truncate">
                        {col.title}
                      </h3>
                      <span class="text-[10px] text-navy-450 bg-navy-100/50 dark:bg-navy-800 px-2 py-0.5 rounded-full font-bold">
                        {colTasks.length}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <button 
                    onClick={() => handleDeleteColumn(col._id)}
                    class="opacity-0 group-hover/colheader:opacity-100 text-navy-400 hover:text-red-500 transition-opacity p-1"
                    title="Delete Column"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Sortable Tasks container */}
                <SortableContext
                  items={colTasks.map(t => t._id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div 
                    id={col._id}
                    class="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-3 min-h-[150px] pr-1 custom-scrollbar"
                  >
                    {colTasks.map(task => (
                      <TaskCard 
                        key={task._id} 
                        task={task} 
                        onClick={(t) => setSelectedTask(t)} 
                      />
                    ))}
                  </div>
                </SortableContext>

                {/* Column quick add card */}
                {quickTaskColId === col._id ? (
                  <div class="mt-3 flex flex-col gap-2">
                    <input 
                      type="text" 
                      placeholder="Type card name..."
                      value={quickTaskTitle}
                      onChange={(e) => setQuickTaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateTask(col._id)}
                      class="w-full px-3 py-2 text-xs border border-navy-100 dark:border-navy-750 bg-white dark:bg-navy-850 rounded-xl text-navy-850 dark:text-white focus:outline-none focus:border-primary"
                      autoFocus
                    />
                    <div class="flex items-center gap-2">
                      <button 
                        onClick={() => handleCreateTask(col._id)}
                        class="px-3 py-1 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg"
                      >
                        Add
                      </button>
                      <button 
                        onClick={() => { setQuickTaskColId(null); setQuickTaskTitle(''); }}
                        class="text-xs font-semibold text-navy-400 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setQuickTaskColId(col._id)}
                    class="mt-3 py-2 border border-dashed border-navy-100 dark:border-navy-800/80 hover:border-primary hover:bg-white dark:hover:bg-navy-850/30 text-navy-400 hover:text-primary rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 btn-press"
                  >
                    <Plus class="h-3.5 w-3.5" /> Add Card
                  </button>
                )}

              </div>
            );
          })}

          {/* Sortable drag overlay representation */}
          <DragOverlay>
            {activeDraggedTask ? (
              <div class="drag-tilt select-none">
                <TaskCard task={activeDraggedTask} onClick={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Add column trigger button */}
        {isAddingColumn ? (
          <form onSubmit={handleAddColumn} class="w-72 bg-white dark:bg-navy-900 border border-navy-100 dark:border-navy-800 p-4 rounded-2xl flex flex-col gap-3 shrink-0 shadow-md">
            <input 
              type="text" 
              placeholder="Column title..."
              value={addColumnTitle}
              onChange={(e) => setAddColumnTitle(e.target.value)}
              class="w-full px-3 py-2 text-xs border border-navy-100 dark:border-navy-750 bg-navy-50/50 dark:bg-navy-950 rounded-xl focus:outline-none focus:border-primary text-navy-800 dark:text-white"
              required
              autoFocus
            />
            <div class="flex items-center gap-2">
              <button 
                type="submit"
                class="px-3 py-1 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Create
              </button>
              <button 
                type="button"
                onClick={() => { setIsAddingColumn(false); setAddColumnTitle(''); }}
                class="text-xs font-semibold text-navy-400 hover:underline"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button 
            onClick={() => setIsAddingColumn(true)}
            class="w-72 py-3 border border-dashed border-navy-200 dark:border-navy-800/80 hover:border-primary hover:bg-white dark:hover:bg-navy-900/20 text-navy-400 hover:text-primary rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 btn-press"
          >
            <Plus class="h-4 w-4" /> Add Column
          </button>
        )}

      </div>

      {/* Multiplayer live cursors overlays */}
      <div class="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {activeCursors.map(([cUserId, cData]) => {
          // Resolve avatar color / initials
          const member = currentBoard.members.find(m => m.userId?._id === cUserId);
          if (!member || cUserId === user._id) return null; // don't render self cursor

          const initial = member.userId?.name.charAt(0).toUpperCase() || '?';
          const color = member.userId?.avatarColor || '#0F6E5C';

          return (
            <div 
              key={cUserId} 
              class="absolute transition-all duration-100 ease-out flex flex-col items-center pointer-events-none"
              style={{ 
                left: cData.x, 
                top: cData.y,
                transform: 'translate(-5px, -5px)'
              }}
            >
              {/* Cursor arrow SVG */}
              <svg 
                class="h-5 w-5 drop-shadow-md" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M5.65376 12.3963L18.8026 5.82188C19.7423 5.35206 20.7303 6.34005 20.2605 7.27976L13.6861 20.4286C13.2429 21.315 11.979 21.2057 11.6888 20.2451L9.62067 13.3793L2.75489 11.3112C1.79429 11.021 1.68504 9.75713 2.57143 9.31388L5.65376 12.3963Z" 
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {/* Name indicator tag */}
              <span 
                class="px-2 py-0.5 rounded text-[8px] font-bold text-white shadow-md mt-1 truncate max-w-[80px]"
                style={{ backgroundColor: color }}
              >
                {member.userId?.name.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Task Details Side slide-over Panel */}
      {selectedTask && (
        <TaskDetailsPanel 
          taskId={selectedTask._id} 
          onClose={() => setSelectedTask(null)} 
        />
      )}

      {/* Global Cmd+K Command Palette */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenTask={(taskId) => {
          const t = tasks.find(item => item._id === taskId);
          if (t) setSelectedTask(t);
        }}
      />

      {/* Settings Modal (Danger Zone / Members Roles) */}
      {isSettingsOpen && (
        <div class="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-6" onClick={() => setIsSettingsOpen(false)}>
          <div 
            class="bg-white dark:bg-navy-900 border border-navy-100 dark:border-navy-800 w-full max-w-md p-6 rounded-2xl shadow-2xl flex flex-col gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="flex items-center justify-between border-b border-navy-50 dark:border-navy-800/40 pb-3">
              <h3 class="font-heading font-bold text-base text-navy-900 dark:text-white">Board Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)} class="text-navy-400 hover:text-navy-750">
                <X class="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Board properties info */}
            <div class="text-xs flex flex-col gap-4">
              {/* Board members list */}
              <div class="flex flex-col gap-2">
                <span class="font-bold text-navy-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Users class="h-4 w-4" /> Board Members ({currentBoard.members.length})
                </span>
                <div class="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {currentBoard.members.map(member => (
                    <div key={member.userId?._id} class="flex items-center justify-between p-2 border border-navy-50 dark:border-navy-800/40 rounded-xl">
                      <div class="flex items-center gap-2">
                        <img src={member.userId?.avatarUrl} alt="Avatar" class="h-6 w-6 rounded-full object-cover" />
                        <div class="flex flex-col">
                          <span class="font-bold text-navy-800 dark:text-white">{member.userId?.name}</span>
                          <span class="text-[9px] text-navy-400">{member.userId?.email}</span>
                        </div>
                      </div>
                      <span class="text-[9px] uppercase tracking-wider font-extrabold bg-primary/5 text-primary dark:text-primary-light px-2 py-0.5 rounded">
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger Zone */}
              <div class="border-t border-red-100 dark:border-red-950/40 pt-4 flex flex-col gap-2">
                <span class="font-bold text-red-500 uppercase tracking-wider text-[10px]">Danger Zone</span>
                <p class="text-[10px] text-navy-400">Archiving will remove the board from your dashboard. Only the owner can permanently delete.</p>
                
                {/* Archive Button */}
                <button 
                  onClick={async () => {
                    if (!window.confirm('Are you sure you want to archive this board? You can restore it later.')) return;
                    try {
                      const res = await apiRequest(`/api/boards/${boardId}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ isArchived: true })
                      });
                      if (res.ok) {
                        showToast({ message: 'Board archived.', type: 'info' });
                        navigate('/app');
                      }
                    } catch (err) {
                      showToast({ message: 'Failed to archive.', type: 'error' });
                    }
                  }}
                  class="w-full py-2 border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 text-xs font-semibold rounded-xl transition-colors btn-press mt-1"
                >
                  Archive Board
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
