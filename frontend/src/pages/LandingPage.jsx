import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBoardStore } from '../store/useBoardStore.js';
import { 
  KanbanSquare, 
  Zap, 
  KeyRound, 
  Layers, 
  ArrowRight, 
  Sparkles, 
  CheckSquare, 
  Plus,
  Trash2
} from 'lucide-react';

export default function LandingPage() {
  const { user } = useBoardStore();

  return (
    <div class="h-full overflow-y-auto bg-[#F9F9FB] dark:bg-navy-950 text-navy-800 dark:text-navy-100 selection:bg-primary-light selection:text-primary">
      
      {/* Header */}
      <header class="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-navy-900/80 border-b border-navy-100 dark:border-navy-800/60 px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-2 bg-primary rounded-xl text-white shadow-premium">
            <KanbanSquare class="h-6 w-6" />
          </div>
          <span class="font-heading font-bold text-xl tracking-tight text-navy-900 dark:text-white">TaskFlow</span>
        </div>
        <nav class="flex items-center gap-4">
          {user ? (
            <Link 
              to="/app" 
              class="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-95 duration-100"
            >
              Go to Workspace
            </Link>
          ) : (
            <>
              <Link to="/login" class="text-sm font-semibold text-navy-600 hover:text-navy-900 dark:text-navy-400 dark:hover:text-white transition-colors">
                Sign In
              </Link>
              <Link 
                to="/register" 
                class="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-95 duration-100"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section class="max-w-7xl mx-auto px-6 pt-16 pb-20 text-center flex flex-col items-center">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-light dark:bg-primary/10 text-primary dark:text-primary-light text-xs font-semibold rounded-full mb-6">
          <Sparkles class="h-3.5 w-3.5" />
          Real-time collaborative planning
        </div>
        
        <h1 class="text-4xl md:text-6xl font-heading font-bold tracking-tight text-navy-900 dark:text-white max-w-4xl leading-tight">
          Stop asking "did you move that card?" — <span class="text-primary dark:text-primary-light">everyone sees it happen.</span>
        </h1>
        
        <p class="mt-6 text-lg md:text-xl text-navy-500 dark:text-navy-400 max-w-2xl leading-relaxed">
          A collaborative Kanban board where distributed teams plan, drag, and complete work. Changes sync instantly on every screen with zero conflicts.
        </p>

        <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link 
            to={user ? "/app" : "/register"} 
            class="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all shadow-premium hover:shadow-lg active:scale-95 duration-100 flex items-center gap-2"
          >
            Create Your First Board <ArrowRight class="h-4 w-4" />
          </Link>
        </div>

        {/* Embedded Interactive Kanban Demo Sandbox */}
        <div class="mt-16 w-full max-w-5xl">
          <div class="text-left mb-4 flex flex-col md:flex-row md:items-center justify-between gap-2 px-2">
            <div>
              <h3 class="text-sm font-bold uppercase tracking-wider text-primary dark:text-primary-light">Interactive Playground</h3>
              <p class="text-xs text-navy-400">Try dragging cards or completing tasks below. Fully interactive preview.</p>
            </div>
            <span class="text-xs font-semibold text-accent flex items-center gap-1.5 bg-accent-light dark:bg-accent/10 px-2.5 py-1 rounded-lg">
              <span class="h-1.5 w-1.5 rounded-full bg-accent animate-pulse"></span> Offline Demo Sandbox
            </span>
          </div>
          <InteractiveSandbox />
        </div>
      </section>

      {/* Differentiators / Features */}
      <section class="border-t border-navy-100 dark:border-navy-800/80 bg-white dark:bg-navy-900/40 py-20">
        <div class="max-w-6xl mx-auto px-6">
          <div class="text-center max-w-2xl mx-auto mb-16">
            <h2 class="text-3xl font-heading font-bold text-navy-900 dark:text-white">Why teams choose TaskFlow</h2>
            <p class="mt-4 text-navy-500 dark:text-navy-400 text-sm md:text-base">We re-engineered the Kanban board for modern multiplayer workflows. No lag, no page refreshes, no conflicts.</p>
          </div>

          <div class="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div class="p-8 rounded-2xl border border-navy-100 dark:border-navy-800/50 bg-[#F9F9FB] dark:bg-navy-900/50 hover:shadow-md transition-shadow">
              <div class="p-3 bg-primary/10 text-primary dark:text-primary-light rounded-xl w-fit">
                <Zap class="h-6 w-6" />
              </div>
              <h3 class="mt-6 text-lg font-bold text-navy-900 dark:text-white">Real-Time Multiplayer Sync</h3>
              <p class="mt-3 text-sm text-navy-500 dark:text-navy-400 leading-relaxed">
                Powered by Socket.io. When a coworker drags a task card, it glides across your screen in real time. Live cursor coordinates show exactly who is working on what.
              </p>
            </div>

            {/* Feature 2 */}
            <div class="p-8 rounded-2xl border border-navy-100 dark:border-navy-800/50 bg-[#F9F9FB] dark:bg-navy-900/50 hover:shadow-md transition-shadow">
              <div class="p-3 bg-primary/10 text-primary dark:text-primary-light rounded-xl w-fit">
                <Layers class="h-6 w-6" />
              </div>
              <h3 class="mt-6 text-lg font-bold text-navy-900 dark:text-white">Fractional-Index Ordering</h3>
              <p class="mt-3 text-sm text-navy-500 dark:text-navy-400 leading-relaxed">
                No database list splices. We calculate task card positions using fractional indices. This ensures conflict-free concurrent editing without card overlaps or resets.
              </p>
            </div>

            {/* Feature 3 */}
            <div class="p-8 rounded-2xl border border-navy-100 dark:border-navy-800/50 bg-[#F9F9FB] dark:bg-navy-900/50 hover:shadow-md transition-shadow">
              <div class="p-3 bg-primary/10 text-primary dark:text-primary-light rounded-xl w-fit">
                <KeyRound class="h-6 w-6" />
              </div>
              <h3 class="mt-6 text-lg font-bold text-navy-900 dark:text-white">Secure Session Rotation</h3>
              <p class="mt-3 text-sm text-navy-500 dark:text-navy-400 leading-relaxed">
                Tokens are stored in secure httpOnly cookies. Rotating refresh tokens automatically detect reuse, blocking potential session hijacking and logging out unauthorized users.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section class="max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 class="text-3xl font-heading font-bold text-navy-900 dark:text-white">Ready to organize your team?</h2>
        <p class="mt-4 text-navy-500 dark:text-navy-400 max-w-md mx-auto text-sm">Create your workspace in seconds. Invite teammates and watch productivity click into place.</p>
        <div class="mt-8">
          <Link 
            to={user ? "/app" : "/register"} 
            class="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all shadow-md active:scale-95 duration-100"
          >
            Get Started For Free
          </Link>
        </div>
      </section>

      <footer class="border-t border-navy-100 dark:border-navy-800/60 py-8 text-center text-xs text-navy-400 bg-white dark:bg-navy-950">
        <p>&copy; {new Date().getFullYear()} TaskFlow Inc. Built for collaborative engineering teams.</p>
      </footer>
    </div>
  );
}

// Sandbox component for visitors to play with
function InteractiveSandbox() {
  const [columns, setColumns] = useState([
    { id: 'todo', title: 'To Do', color: '#3B82F6' },
    { id: 'progress', title: 'In Progress', color: '#F59E0B' },
    { id: 'done', title: 'Done', color: '#10B981' }
  ]);
  
  const [tasks, setTasks] = useState([
    { id: '1', columnId: 'todo', title: 'Drag me to another column', description: 'This is a description', priority: 'medium', checklist: [{ text: 'Double check it', done: false }] },
    { id: '2', columnId: 'todo', title: 'Create a new column', description: '', priority: 'low', checklist: [] },
    { id: '3', columnId: 'progress', title: 'Try checking items', description: '', priority: 'urgent', checklist: [{ text: 'Click checkbox', done: true }, { text: 'Watch bar progress', done: false }] },
    { id: '4', columnId: 'done', title: 'Finish writing documentation', description: '', priority: 'high', checklist: [] }
  ]);

  const [newTaskText, setNewTaskText] = useState('');
  const [activeColId, setActiveColId] = useState(null);

  const handleAddTask = (columnId) => {
    if (!newTaskText.trim()) return;
    const newTask = {
      id: Date.now().toString(),
      columnId,
      title: newTaskText.trim(),
      description: '',
      priority: 'medium',
      checklist: []
    };
    setTasks([...tasks, newTask]);
    setNewTaskText('');
    setActiveColId(null);
  };

  const handleToggleCheck = (taskId, itemIndex) => {
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        const list = [...t.checklist];
        list[itemIndex].done = !list[itemIndex].done;
        return { ...t, checklist: list };
      }
      return t;
    }));
  };

  const handleDeleteTask = (taskId) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  // Basic Click-to-Move simulation for sandbox simplicity without installing heavy packages just for the landing page hero.
  // We'll also allow clicking columns to send cards there!
  const handleMoveCard = (taskId, targetColId) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, columnId: targetColId } : t));
  };

  return (
    <div class="w-full bg-white dark:bg-navy-900 border border-navy-100 dark:border-navy-800/80 rounded-2xl shadow-xl overflow-hidden text-left">
      {/* Board header */}
      <div class="bg-navy-50/50 dark:bg-navy-800/30 px-6 py-4 border-b border-navy-100 dark:border-navy-800/60 flex items-center justify-between">
        <h4 class="font-heading font-semibold text-navy-800 dark:text-navy-200">Multilayer Team Board</h4>
        <div class="flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
          <span class="text-xs text-navy-500 dark:text-navy-400">Sandbox Mode</span>
        </div>
      </div>

      {/* Board columns */}
      <div class="p-6 grid md:grid-cols-3 gap-6 overflow-x-auto min-h-[420px]">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.columnId === col.id);

          return (
            <div key={col.id} class="flex flex-col bg-navy-50/60 dark:bg-navy-800/20 p-4 rounded-xl border border-navy-100/50 dark:border-navy-800/30">
              {/* Header */}
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <span class="h-3 w-3 rounded-full" style={{ backgroundColor: col.color }}></span>
                  <h5 class="font-heading font-bold text-navy-800 dark:text-navy-200 text-sm">{col.title}</h5>
                  <span class="text-xs text-navy-400 bg-navy-100 dark:bg-navy-800 px-2 py-0.5 rounded-full font-bold">
                    {colTasks.length}
                  </span>
                </div>
              </div>

              {/* Tasks list */}
              <div class="flex-1 flex flex-col gap-3 min-h-[220px]">
                {colTasks.map(task => {
                  const doneCount = task.checklist.filter(c => c.done).length;
                  const totalCount = task.checklist.length;
                  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

                  return (
                    <div 
                      key={task.id} 
                      class="bg-white dark:bg-navy-800 p-4 rounded-lg border border-navy-100 dark:border-navy-850 shadow-sm hover:shadow-md transition-shadow group relative"
                    >
                      <div class="flex items-start justify-between gap-2">
                        <span class="font-semibold text-xs leading-relaxed text-navy-800 dark:text-navy-100">
                          {task.title}
                        </span>
                        <button 
                          onClick={() => handleDeleteTask(task.id)}
                          class="opacity-0 group-hover:opacity-100 text-navy-400 hover:text-red-500 transition-opacity"
                        >
                          <Trash2 class="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Checklist */}
                      {totalCount > 0 && (
                        <div class="mt-3">
                          <div class="flex items-center justify-between text-[10px] text-navy-400 mb-1">
                            <span>Checklist ({doneCount}/{totalCount})</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div class="w-full bg-navy-100 dark:bg-navy-700 h-1 rounded-full overflow-hidden mb-2">
                            <div class="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
                          </div>
                          <div class="flex flex-col gap-1.5">
                            {task.checklist.map((item, idx) => (
                              <label key={idx} class="flex items-center gap-2 text-xs text-navy-500 dark:text-navy-400 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={item.done}
                                  onChange={() => handleToggleCheck(task.id, idx)}
                                  class="rounded border-navy-300 text-primary focus:ring-primary h-3.5 w-3.5"
                                />
                                <span class={item.done ? 'line-through opacity-60' : ''}>{item.text}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Priority Tag */}
                      <div class="mt-4 flex items-center justify-between">
                        <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          task.priority === 'urgent' ? 'bg-red-50 text-red-500 dark:bg-red-500/10' :
                          task.priority === 'high' ? 'bg-orange-50 text-orange-500 dark:bg-orange-500/10' :
                          task.priority === 'medium' ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/10' :
                          'bg-navy-50 text-navy-500 dark:bg-navy-800'
                        }`}>
                          {task.priority}
                        </span>

                        {/* Move Card Actions for Sandbox */}
                        <div class="flex items-center gap-1">
                          {columns.filter(c => c.id !== task.columnId).map(c => (
                            <button 
                              key={c.id}
                              onClick={() => handleMoveCard(task.id, c.id)}
                              class="text-[10px] font-semibold text-primary hover:underline px-1"
                            >
                              To {c.title.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add task trigger */}
              {activeColId === col.id ? (
                <div class="mt-4 flex flex-col gap-2">
                  <input 
                    type="text" 
                    placeholder="Type task title..." 
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask(col.id)}
                    class="px-3 py-2 text-xs border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-800 focus:outline-none focus:border-primary text-navy-800 dark:text-white"
                    autoFocus
                  />
                  <div class="flex items-center gap-2">
                    <button 
                      onClick={() => handleAddTask(col.id)}
                      class="px-3 py-1 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg"
                    >
                      Add
                    </button>
                    <button 
                      onClick={() => { setActiveColId(null); setNewTaskText(''); }}
                      class="px-3 py-1 text-navy-500 dark:text-navy-400 text-xs font-semibold hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setActiveColId(col.id)}
                  class="mt-4 py-2 border border-dashed border-navy-200 dark:border-navy-800 hover:border-primary hover:bg-white dark:hover:bg-navy-800/30 text-navy-400 hover:text-primary rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-98 duration-100"
                >
                  <Plus class="h-3.5 w-3.5" /> Add Task
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
