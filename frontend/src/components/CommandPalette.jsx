import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoardStore } from '../store/useBoardStore.js';
import { 
  Search, 
  Moon, 
  Sun, 
  Layout, 
  PlusCircle, 
  Sparkles,
  Command
} from 'lucide-react';

export default function CommandPalette({ isOpen, onClose, onOpenTask, onAddTaskTrigger }) {
  const navigate = useNavigate();
  const { tasks, boards } = useBoardStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Small timeout to allow input rendering before focusing
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle global shortcuts to close palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build commands list
  const systemCommands = [
    { 
      id: 'dashboard', 
      title: 'Go to Boards Dashboard', 
      category: 'Navigation', 
      icon: <Layout class="h-4 w-4" />,
      action: () => { navigate('/app'); onClose(); }
    },
    { 
      id: 'theme', 
      title: 'Toggle Dark / Light Theme', 
      category: 'Preferences', 
      icon: <Sun class="h-4 w-4" />,
      action: () => { 
        const root = document.documentElement;
        const next = root.classList.contains('dark') ? 'light' : 'dark';
        root.classList.remove('light', 'dark');
        root.classList.add(next);
        onClose(); 
      }
    }
  ];

  // Filter tasks based on query
  const filteredTasks = query.trim()
    ? tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase())).map(t => ({
        id: `task-${t._id}`,
        title: `Open task: ${t.title}`,
        category: 'Tasks',
        icon: <Sparkles class="h-4 w-4" />,
        action: () => { onOpenTask(t._id); onClose(); }
      }))
    : [];

  // Filter other boards
  const filteredBoards = query.trim()
    ? boards.filter(b => b.title.toLowerCase().includes(query.toLowerCase())).map(b => ({
        id: `board-${b._id}`,
        title: `Jump to board: ${b.title}`,
        category: 'Boards',
        icon: <Layout class="h-4 w-4" />,
        action: () => { navigate(`/app/boards/${b._id}`); onClose(); }
      }))
    : [];

  const combinedItems = [
    ...systemCommands.filter(c => c.title.toLowerCase().includes(query.toLowerCase())),
    ...filteredBoards,
    ...filteredTasks
  ];

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % combinedItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + combinedItems.length) % combinedItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (combinedItems[selectedIndex]) {
        combinedItems[selectedIndex].action();
      }
    }
  };

  return (
    <div 
      class="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-start justify-center pt-24 px-6 animate-fade-in"
      onClick={onClose}
    >
      
      {/* Palette box */}
      <div 
        class="bg-white dark:bg-navy-900 border border-navy-100 dark:border-navy-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Input */}
        <div class="relative border-b border-navy-100 dark:border-navy-800/80 px-4 py-3 flex items-center">
          <Search class="h-5 w-5 text-navy-450 shrink-0 mr-3" />
          <input 
            type="text"
            ref={inputRef}
            placeholder="Search tasks, boards or actions..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            class="w-full bg-transparent text-navy-850 dark:text-white text-sm focus:outline-none focus:ring-0 placeholder-navy-300"
          />
          <div class="flex items-center gap-0.5 px-2 py-1 bg-navy-50 dark:bg-navy-800 border border-navy-100 dark:border-navy-750 rounded-lg text-[10px] font-bold text-navy-400 select-none">
            <span class="text-xs">ESC</span>
          </div>
        </div>

        {/* List of items */}
        {combinedItems.length > 0 ? (
          <div class="max-h-[300px] overflow-y-auto p-2 flex flex-col gap-1 custom-scrollbar">
            {combinedItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                class={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                  selectedIndex === idx 
                    ? 'bg-primary/10 text-primary dark:text-primary-light' 
                    : 'text-navy-600 dark:text-navy-300 hover:bg-navy-50/50'
                }`}
              >
                <div class="flex items-center gap-3">
                  <div class={`${selectedIndex === idx ? 'text-primary dark:text-primary-light' : 'text-navy-400'}`}>
                    {item.icon}
                  </div>
                  <span>{item.title}</span>
                </div>
                <span class="text-[9px] uppercase tracking-wider text-navy-400 font-bold bg-navy-50 dark:bg-navy-800/60 px-2 py-0.5 rounded">
                  {item.category}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div class="py-12 text-center text-xs text-navy-400">
            No matching boards, tasks, or actions found.
          </div>
        )}

        {/* Footer info */}
        <div class="px-4 py-2.5 bg-navy-50/50 dark:bg-navy-850 border-t border-navy-100 dark:border-navy-800/60 flex items-center gap-4 text-[10px] text-navy-400">
          <span class="flex items-center gap-1"><Command class="h-3 w-3" /> Navigation: ↑↓ to navigate, Enter to trigger</span>
        </div>

      </div>

    </div>
  );
}
