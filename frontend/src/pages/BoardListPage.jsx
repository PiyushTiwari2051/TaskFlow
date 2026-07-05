import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoardStore } from '../store/useBoardStore.js';
import { apiRequest } from '../utils/api.js';
import { ToastContext } from '../App.jsx';
import { 
  KanbanSquare, 
  Search, 
  Plus, 
  FolderPlus, 
  Calendar, 
  Sun, 
  Moon, 
  LogOut,
  Users,
  LayoutGrid,
  Trash2
} from 'lucide-react';

const PRESET_COLORS = [
  '#0F6E5C', // Deep Teal
  '#E8973B', // Warm Amber
  '#0B0F19', // Ink Navy
  '#E05D5D', // Coral Red
  '#583F8C', // Plum Purple
  '#2D6A4F', // Forest Green
  '#4E5D6C'  // Slate Gray
];

export default function BoardListPage() {
  const navigate = useNavigate();
  const { user, setUser, logoutUser, boards, setBoards } = useBoardStore();
  const { showToast } = useContext(ToastContext);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newBgColor, setNewBgColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [theme, setTheme] = useState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const res = await apiRequest('/api/boards');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setBoards(data.boards);
          }
        }
      } catch (err) {
        showToast({ message: 'Failed to load boards.', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchBoards();
  }, []);

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    try {
      const res = await apiRequest('/api/boards', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          backgroundColor: newBgColor
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBoards([data.board, ...boards]);
        showToast({ message: 'Board created successfully!', type: 'success' });
        setIsModalOpen(false);
        setNewTitle('');
        setNewDescription('');
        setNewBgColor(PRESET_COLORS[0]);
        navigate(`/app/boards/${data.board._id}`);
      } else {
        showToast({ message: data.error?.message || 'Failed to create board.', type: 'error' });
      }
    } catch (err) {
      showToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed', err);
    }
    logoutUser();
    navigate('/login');
  };

  const handleDeleteBoard = async (boardId, boardTitle) => {
    if (!window.confirm(`Delete board "${boardTitle}" permanently? All columns and tasks inside will be deleted.`)) return;

    try {
      const res = await apiRequest(`/api/boards/${boardId}?immediate=true&confirmTitle=${encodeURIComponent(boardTitle)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBoards(boards.filter(b => b._id !== boardId));
        showToast({ message: 'Board deleted permanently.', type: 'success' });
      } else {
        showToast({ message: data.error?.message || 'Failed to delete board.', type: 'error' });
      }
    } catch (err) {
      showToast({ message: 'Failed to delete board.', type: 'error' });
    }
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    const current = root.classList.contains('dark') ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    
    root.classList.remove('light', 'dark');
    root.classList.add(next);
    setTheme(next);

    // Persist preference via API silently
    apiRequest('/api/auth/me', {
      method: 'PATCH', // Wait, we can define preference save route or do it dynamically. Let's make sure it's robust.
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences: { theme: next } })
    }).catch(() => {});
  };

  const filteredBoards = boards.filter(board => 
    board.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatRelativeTime = (dateStr) => {
    const elapsed = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'updated just now';
    if (minutes < 60) return `updated ${minutes}m ago`;
    if (hours < 24) return `updated ${hours}h ago`;
    return `updated ${days}d ago`;
  };

  return (
    <div class="h-full flex flex-col bg-ink-light dark:bg-navy-950 text-navy-800 dark:text-navy-100 overflow-hidden">
      
      {/* Dashboard Top bar */}
      <header class="bg-white dark:bg-navy-900 border-b border-navy-100 dark:border-navy-800/80 px-6 py-4 flex items-center justify-between shadow-sm z-20">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary rounded-xl text-white shadow-premium">
            <KanbanSquare class="h-5 w-5" />
          </div>
          <span class="font-heading font-bold text-lg tracking-tight text-navy-900 dark:text-white">Workspace</span>
        </div>

        {/* User Action Tray */}
        <div class="flex items-center gap-4">
          {/* Theme toggler */}
          <button 
            onClick={toggleTheme}
            class="p-2 rounded-xl border border-navy-100 dark:border-navy-800 text-navy-400 hover:text-primary dark:hover:text-primary-light bg-navy-50/50 dark:bg-navy-800/20 transition-all btn-press"
          >
            {theme === 'dark' ? <Sun class="h-4.5 w-4.5" /> : <Moon class="h-4.5 w-4.5" />}
          </button>

          {/* User profile initials block */}
          <div class="flex items-center gap-3 border-l border-navy-100 dark:border-navy-800 pl-4">
            <img 
              src={user?.avatarUrl} 
              alt={user?.name} 
              class="h-8 w-8 rounded-full border border-primary/20 object-cover"
            />
            <div class="hidden md:flex flex-col text-left">
              <span class="text-xs font-bold text-navy-900 dark:text-white leading-none">{user?.name}</span>
              <span class="text-[10px] text-navy-400 mt-0.5">{user?.email}</span>
            </div>
            
            {/* Logout */}
            <button 
              onClick={handleLogout}
              class="p-2 rounded-xl text-navy-400 hover:text-red-500 bg-transparent hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors btn-press ml-1"
              title="Logout"
            >
              <LogOut class="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace content */}
      <main class="flex-1 overflow-y-auto px-8 py-10 max-w-6xl w-full mx-auto">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 class="font-heading font-bold text-3xl text-navy-900 dark:text-white">Your Boards</h1>
            <p class="text-xs text-navy-400 mt-1">Manage and sync collaborative Kanban boards</p>
          </div>
          
          {/* Actions */}
          <div class="flex items-center gap-3">
            {/* Search */}
            <div class="relative w-full md:w-64">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
              <input 
                type="text" 
                placeholder="Search boards..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                class="w-full pl-9 pr-4 py-2 border border-navy-100 dark:border-navy-800/80 rounded-xl bg-white dark:bg-navy-900 text-navy-800 dark:text-white text-xs focus:outline-none focus:border-primary"
              />
            </div>

            {/* Create Trigger */}
            <button 
              onClick={() => setIsModalOpen(true)}
              class="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition-all shadow-premium hover:shadow-lg active:scale-95 flex items-center gap-1.5 duration-100 shrink-0"
            >
              <Plus class="h-4 w-4" /> Create Board
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div class="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} class="h-36 rounded-2xl border border-navy-100 dark:border-navy-800 bg-white dark:bg-navy-900/50 p-6 animate-pulse flex flex-col justify-between">
                <div class="h-5 bg-navy-200 dark:bg-navy-800 rounded w-2/3"></div>
                <div class="h-4 bg-navy-100 dark:bg-navy-850 rounded w-1/3 mt-2"></div>
                <div class="flex items-center justify-between mt-auto">
                  <div class="flex -space-x-2">
                    <div class="h-6 w-6 rounded-full bg-navy-200 dark:bg-navy-800"></div>
                    <div class="h-6 w-6 rounded-full bg-navy-200 dark:bg-navy-800"></div>
                  </div>
                  <div class="h-4 w-12 bg-navy-100 dark:bg-navy-850 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredBoards.length > 0 ? (
          /* Boards grid */
          <div class="grid md:grid-cols-3 gap-6">
            {filteredBoards.map(board => (
              <div 
                key={board._id}
                onClick={() => navigate(`/app/boards/${board._id}`)}
                class="group relative h-40 rounded-2xl border border-navy-100 dark:border-navy-800/80 bg-white dark:bg-navy-900 p-6 shadow-sm hover:shadow-cardHover hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
              >
                {/* Accent Background color slide-in */}
                <div 
                  class="absolute top-0 left-0 right-0 h-1.5 transition-all group-hover:h-2"
                  style={{ backgroundColor: board.backgroundColor }}
                ></div>

                <div class="flex items-start justify-between gap-2 w-full">
                  <div class="flex flex-col gap-1.5 min-w-0 flex-1">
                    <h3 class="font-heading font-bold text-base text-navy-855 dark:text-white group-hover:text-primary dark:group-hover:text-primary-light transition-colors line-clamp-1">
                      {board.title}
                    </h3>
                    <p class="text-xs text-navy-450 dark:text-navy-400 line-clamp-2">
                      {board.description || 'No description provided.'}
                    </p>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBoard(board._id, board.title);
                    }}
                    class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-navy-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200 shrink-0"
                    title="Delete Board"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>

                <div class="flex items-end justify-between border-t border-navy-50 dark:border-navy-800/40 pt-4 mt-auto">
                  {/* Member Stack */}
                  <div class="flex -space-x-1.5 overflow-hidden">
                    {board.members.slice(0, 4).map((member, i) => (
                      <img 
                        key={member.userId?._id || i}
                        src={member.userId?.avatarUrl} 
                        title={member.userId?.name}
                        alt="Avatar"
                        class="h-6 w-6 rounded-full border border-white dark:border-navy-900 object-cover"
                      />
                    ))}
                    {board.members.length > 4 && (
                      <span class="h-6 w-6 rounded-full border border-white dark:border-navy-900 bg-navy-100 dark:bg-navy-800 flex items-center justify-center text-[8px] font-bold text-navy-500">
                        +{board.members.length - 4}
                      </span>
                    )}
                  </div>

                  <span class="text-[10px] text-navy-400 flex items-center gap-1">
                    <Calendar class="h-3 w-3" />
                    {formatRelativeTime(board.updatedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div class="flex flex-col items-center justify-center py-20 border-2 border-dashed border-navy-100 dark:border-navy-800 rounded-3xl bg-white dark:bg-navy-900/10">
            <div class="p-4 bg-primary/5 text-primary rounded-full mb-4">
              <FolderPlus class="h-10 w-10 animate-bounce" />
            </div>
            <h2 class="font-heading font-bold text-xl text-navy-900 dark:text-white mb-2">No boards created yet</h2>
            <p class="text-xs text-navy-400 max-w-sm text-center mb-6 leading-relaxed">
              TaskFlow collaborative workspaces update instantly. Your first one takes about 20 seconds to spin up.
            </p>
            <button 
              onClick={() => setIsModalOpen(true)}
              class="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl shadow-premium transition-transform active:scale-95 duration-100 flex items-center gap-2"
            >
              <Plus class="h-4 w-4" /> Create First Board
            </button>
          </div>
        )}
      </main>

      {/* Creation Modal */}
      {isModalOpen && (
        <div class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-navy-950/40 backdrop-blur-sm animate-fade-in">
          <div 
            class="bg-white dark:bg-navy-900 border border-navy-100 dark:border-navy-800 w-full max-w-md p-6 rounded-2xl shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 class="font-heading font-bold text-lg text-navy-900 dark:text-white mb-1">Create Collaborative Board</h3>
            <p class="text-[11px] text-navy-400 mb-6">Setup title and default presets for your team board.</p>

            <form onSubmit={handleCreateBoard} class="flex flex-col gap-4">
              {/* Title */}
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold uppercase tracking-wider text-navy-400">Board Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Q3 Roadmap Planning"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  class="w-full px-3 py-2.5 border border-navy-100 dark:border-navy-800 rounded-xl bg-navy-50/50 dark:bg-navy-950 text-navy-850 dark:text-white text-xs focus:outline-none focus:border-primary"
                  required
                  autoFocus
                />
              </div>

              {/* Description */}
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold uppercase tracking-wider text-navy-400">Description</label>
                <textarea 
                  placeholder="Summarize board targets..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows="3"
                  class="w-full px-3 py-2.5 border border-navy-100 dark:border-navy-800 rounded-xl bg-navy-50/50 dark:bg-navy-950 text-navy-850 dark:text-white text-xs focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Preset Color selector */}
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold uppercase tracking-wider text-navy-400 mb-1">Accent Theme Color</label>
                <div class="flex items-center gap-2">
                  {PRESET_COLORS.map(color => (
                    <button 
                      key={color}
                      type="button"
                      onClick={() => setNewBgColor(color)}
                      class={`h-6 w-6 rounded-full border-2 transition-all hover:scale-110 ${
                        newBgColor === color ? 'border-primary dark:border-white scale-110 shadow-md' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    ></button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div class="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-navy-50 dark:border-navy-800/40">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  class="px-4 py-2 border border-navy-100 dark:border-navy-800 hover:bg-navy-50 dark:hover:bg-navy-800 text-navy-550 dark:text-navy-300 text-xs font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={creating}
                  class="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl shadow-premium transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creating ? (
                    <span class="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : 'Create Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
