import React, { useState, useEffect, useContext, useRef } from 'react';
import { useBoardStore } from '../store/useBoardStore.js';
import { apiRequest } from '../utils/api.js';
import { ToastContext } from '../App.jsx';
import { 
  X, 
  Tag, 
  UserPlus, 
  Calendar, 
  CheckSquare, 
  Paperclip, 
  MessageSquare, 
  History,
  Trash2,
  Plus,
  Send,
  Loader2,
  FileText
} from 'lucide-react';

const LABEL_PRESETS = [
  { name: 'Feature', color: '#0F6E5C' },
  { name: 'Bug', color: '#E05D5D' },
  { name: 'Task', color: '#4E5D6C' },
  { name: 'Docs', color: '#583F8C' },
  { name: 'Design', color: '#E8973B' }
];

export default function TaskDetailsPanel({ taskId, onClose }) {
  const { currentBoard, tasks, showToast } = useBoardStore();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  // Input states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');

  // Dropdown states
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Tab state
  const [activeTab, setActiveTab] = useState('details'); // details | comments | history

  useEffect(() => {
    // Find task in local store first
    const activeTask = tasks.find(t => t._id === taskId);
    if (activeTask) {
      setTask(activeTask);
      setTitle(activeTask.title);
      setDescription(activeTask.description || '');
      setPriority(activeTask.priority || 'medium');
      setDueDate(activeTask.dueDate ? activeTask.dueDate.split('T')[0] : '');
      setLoading(false);
    }
  }, [taskId, tasks]);

  if (loading || !task) {
    return (
      <div class="fixed inset-0 z-50 bg-navy-950/20 backdrop-blur-xs flex items-center justify-end">
        <div class="h-full w-full md:w-[480px] bg-white dark:bg-navy-900 shadow-2xl p-6 flex flex-col items-center justify-center">
          <Loader2 class="h-8 w-8 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  const handleUpdateField = async (field, value) => {
    try {
      const res = await apiRequest(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: value })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast({ message: 'Failed to update task field.', type: 'error' });
      }
    } catch (err) {
      showToast({ message: 'Network error.', type: 'error' });
    }
  };

  const handleAddLabel = async (preset) => {
    const exists = task.labels.some(l => l.name === preset.name);
    let updatedLabels = [];
    if (exists) {
      updatedLabels = task.labels.filter(l => l.name !== preset.name);
    } else {
      updatedLabels = [...task.labels, preset];
    }
    setTask({ ...task, labels: updatedLabels });
    await handleUpdateField('labels', updatedLabels);
  };

  const handleToggleAssignee = async (memberId) => {
    const isAssigned = task.assignees.some(a => a._id === memberId);
    let updatedAssignees = [];
    if (isAssigned) {
      updatedAssignees = task.assignees.filter(a => a._id !== memberId).map(a => a._id);
    } else {
      updatedAssignees = [...task.assignees.map(a => a._id), memberId];
    }
    await handleUpdateField('assignees', updatedAssignees);
  };

  const handleAddChecklistItem = async (e) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;

    const newItem = { text: newChecklistText.trim(), done: false };
    const updatedChecklist = [...task.checklist, newItem];
    
    // Save checklist
    setTask({ ...task, checklist: updatedChecklist });
    setNewChecklistText('');
    await handleUpdateField('checklist', updatedChecklist);
  };

  const handleToggleChecklistItem = async (itemId, doneState) => {
    try {
      const res = await apiRequest(`/api/tasks/${taskId}/checklist/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ done: doneState })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast({ message: 'Failed to update checklist.', type: 'error' });
      }
    } catch (err) {
      showToast({ message: 'Network error.', type: 'error' });
    }
  };

  const handleDeleteChecklistItem = async (itemId) => {
    const updatedChecklist = task.checklist.filter(item => item._id !== itemId);
    setTask({ ...task, checklist: updatedChecklist });
    await handleUpdateField('checklist', updatedChecklist);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await apiRequest(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: newComment.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewComment('');
      } else {
        showToast({ message: 'Failed to post comment.', type: 'error' });
      }
    } catch (err) {
      showToast({ message: 'Network error.', type: 'error' });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('attachment', file);

    try {
      const res = await apiRequest(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        headers: {
          // Leave content-type blank for fetch + FormData multipart uploads
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast({ message: 'File uploaded successfully!', type: 'success' });
      } else {
        showToast({ message: data.error?.message || 'File upload failed.', type: 'error' });
      }
    } catch (err) {
      showToast({ message: 'Network upload error.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await apiRequest(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        onClose();
      } else {
        showToast({ message: 'Failed to delete task.', type: 'error' });
      }
    } catch (err) {
      showToast({ message: 'Network error.', type: 'error' });
    }
  };

  return (
    <div class="fixed inset-0 z-50 bg-navy-950/30 backdrop-blur-xs flex justify-end animate-fade-in" onClick={onClose}>
      
      {/* Container */}
      <div 
        class="h-full w-full md:w-[480px] bg-white dark:bg-navy-900 border-l border-navy-100 dark:border-navy-800 shadow-2xl flex flex-col animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div class="px-6 py-4 border-b border-navy-100 dark:border-navy-800/80 flex items-center justify-between">
          <span class="text-xs font-bold text-navy-450 uppercase tracking-wider">Task Details</span>
          <div class="flex items-center gap-2">
            <button 
              onClick={handleDeleteTask}
              class="p-2 rounded-xl text-navy-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors btn-press"
              title="Delete Task"
            >
              <Trash2 class="h-4.5 w-4.5" />
            </button>
            <button 
              onClick={onClose}
              class="p-2 rounded-xl text-navy-400 hover:text-primary dark:hover:text-primary-light hover:bg-navy-50 dark:hover:bg-navy-850 transition-colors btn-press"
            >
              <X class="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div class="flex border-b border-navy-100 dark:border-navy-800/40 text-xs px-4">
          <button 
            onClick={() => setActiveTab('details')}
            class={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'details' ? 'border-primary text-primary dark:text-primary-light' : 'border-transparent text-navy-400 hover:text-navy-700'
            }`}
          >
            Details
          </button>
          <button 
            onClick={() => setActiveTab('comments')}
            class={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'comments' ? 'border-primary text-primary dark:text-primary-light' : 'border-transparent text-navy-400 hover:text-navy-700'
            }`}
          >
            Comments ({task.comments?.length || 0})
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            class={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'history' ? 'border-primary text-primary dark:text-primary-light' : 'border-transparent text-navy-400 hover:text-navy-700'
            }`}
          >
            Activity Log
          </button>
        </div>

        {/* Dynamic Body */}
        <div class="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-6">
          {activeTab === 'details' && (
            <>
              {/* Title Input */}
              <div class="flex flex-col gap-1.5">
                <input 
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => title.trim() !== task.title && handleUpdateField('title', title.trim())}
                  class="font-heading font-bold text-xl text-navy-900 dark:text-white bg-transparent border-0 focus:ring-0 focus:outline-none w-full border-b border-transparent focus:border-navy-200 dark:focus:border-navy-800 pb-1"
                />
              </div>

              {/* Labels & Members configuration Row */}
              <div class="flex flex-wrap gap-6 text-xs">
                {/* Labels Block */}
                <div class="flex flex-col gap-2 relative">
                  <span class="font-bold text-navy-400 uppercase tracking-wider text-[10px]">Labels</span>
                  <div class="flex items-center gap-1.5">
                    {task.labels?.map((l, i) => (
                      <span 
                        key={i} 
                        class="px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{ backgroundColor: `${l.color}20`, color: l.color }}
                      >
                        {l.name}
                      </span>
                    ))}
                    <button 
                      onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                      class="h-6 w-6 rounded-full border border-dashed border-navy-200 dark:border-navy-800 text-navy-400 hover:text-primary hover:border-primary flex items-center justify-center bg-transparent"
                    >
                      <Tag class="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {showLabelDropdown && (
                    <div class="absolute top-14 left-0 z-20 w-44 bg-white dark:bg-navy-850 border border-navy-100 dark:border-navy-800 rounded-xl shadow-xl p-2 flex flex-col gap-1">
                      {LABEL_PRESETS.map((preset, idx) => {
                        const active = task.labels.some(l => l.name === preset.name);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddLabel(preset)}
                            class={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                              active ? 'bg-navy-50 dark:bg-navy-800 text-navy-900 dark:text-white' : 'text-navy-600 dark:text-navy-300 hover:bg-navy-50/50'
                            }`}
                          >
                            <span class="flex items-center gap-2">
                              <span class="h-2 w-2 rounded-full" style={{ backgroundColor: preset.color }}></span>
                              {preset.name}
                            </span>
                            {active && <span class="h-1.5 w-1.5 rounded-full bg-primary"></span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Assignees Block */}
                <div class="flex flex-col gap-2 relative">
                  <span class="font-bold text-navy-400 uppercase tracking-wider text-[10px]">Assignees</span>
                  <div class="flex items-center gap-1.5">
                    {task.assignees?.map((assignee, i) => (
                      <img 
                        key={assignee._id || i}
                        src={assignee.avatarUrl} 
                        title={assignee.name}
                        alt="avatar"
                        class="h-6 w-6 rounded-full object-cover border border-primary/10"
                      />
                    ))}
                    <button 
                      onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                      class="h-6 w-6 rounded-full border border-dashed border-navy-200 dark:border-navy-800 text-navy-400 hover:text-primary hover:border-primary flex items-center justify-center bg-transparent"
                    >
                      <UserPlus class="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {showAssigneeDropdown && (
                    <div class="absolute top-14 left-0 z-20 w-56 bg-white dark:bg-navy-850 border border-navy-100 dark:border-navy-800 rounded-xl shadow-xl p-2 flex flex-col gap-1">
                      {currentBoard?.members.map(member => {
                        const u = member.userId;
                        if (!u) return null;
                        const isAssigned = task.assignees.some(a => a._id === u._id);
                        return (
                          <button
                            key={u._id}
                            type="button"
                            onClick={() => handleToggleAssignee(u._id)}
                            class={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                              isAssigned ? 'bg-navy-50 dark:bg-navy-800 text-navy-900 dark:text-white' : 'text-navy-600 dark:text-navy-300 hover:bg-navy-50/50'
                            }`}
                          >
                            <span class="flex items-center gap-2">
                              <img src={u.avatarUrl} alt="avatar" class="h-5 w-5 rounded-full object-cover" />
                              {u.name}
                            </span>
                            {isAssigned && <span class="h-1.5 w-1.5 rounded-full bg-primary"></span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Priority & Due Date selection row */}
              <div class="grid grid-cols-2 gap-4 text-xs">
                {/* Priority */}
                <div class="flex flex-col gap-1.5">
                  <span class="font-bold text-navy-400 uppercase tracking-wider text-[10px]">Priority</span>
                  <select 
                    value={priority} 
                    onChange={(e) => { setPriority(e.target.value); handleUpdateField('priority', e.target.value); }}
                    class="w-full px-3 py-2 border border-navy-100 dark:border-navy-800 rounded-xl bg-navy-50/50 dark:bg-navy-950 text-navy-800 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* Due Date */}
                <div class="flex flex-col gap-1.5">
                  <span class="font-bold text-navy-400 uppercase tracking-wider text-[10px]">Due Date</span>
                  <div class="relative">
                    <input 
                      type="date" 
                      value={dueDate}
                      onChange={(e) => { setDueDate(e.target.value); handleUpdateField('dueDate', e.target.value); }}
                      class="w-full px-3 py-2 border border-navy-100 dark:border-navy-800 rounded-xl bg-navy-50/50 dark:bg-navy-950 text-navy-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Description Markdown text-area */}
              <div class="flex flex-col gap-2">
                <span class="font-bold text-navy-400 uppercase tracking-wider text-[10px]">Description</span>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => description !== task.description && handleUpdateField('description', description)}
                  placeholder="Add detailed description (Supports rich text)..."
                  rows="5"
                  class="w-full px-3 py-2 border border-navy-100 dark:border-navy-800 rounded-xl bg-navy-50/50 dark:bg-navy-950 text-navy-850 dark:text-white text-xs focus:outline-none focus:border-primary resize-none leading-relaxed"
                />
              </div>

              {/* Checklist editor */}
              <div class="flex flex-col gap-3">
                <span class="font-bold text-navy-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <CheckSquare class="h-4 w-4 text-navy-400" /> Checklist
                </span>

                <div class="flex flex-col gap-2">
                  {task.checklist?.map((item, idx) => (
                    <div key={item._id || idx} class="flex items-center justify-between gap-3 group/item">
                      <label class="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={item.done}
                          onChange={(e) => {
                            const list = [...task.checklist];
                            list[idx].done = e.target.checked;
                            setTask({ ...task, checklist: list });
                            handleToggleChecklistItem(item._id, e.target.checked);
                          }}
                          class="rounded border-navy-300 text-primary focus:ring-primary h-4.5 w-4.5"
                        />
                        <span class={`text-xs text-navy-700 dark:text-navy-300 ${item.done ? 'line-through opacity-55' : ''}`}>
                          {item.text}
                        </span>
                      </label>
                      <button 
                        onClick={() => handleDeleteChecklistItem(item._id)}
                        class="opacity-0 group-hover/item:opacity-100 text-navy-300 hover:text-red-500 transition-opacity"
                      >
                        <Trash2 class="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddChecklistItem} class="flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="Add checklist item..."
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    class="flex-1 px-3 py-2 border border-navy-100 dark:border-navy-800 rounded-xl bg-navy-50/50 dark:bg-navy-950 text-navy-800 dark:text-white text-xs focus:outline-none focus:border-primary"
                  />
                  <button 
                    type="submit"
                    class="p-2 bg-primary hover:bg-primary-hover text-white rounded-xl shadow btn-press"
                  >
                    <Plus class="h-4 w-4" />
                  </button>
                </form>
              </div>

              {/* Attachments Section */}
              <div class="flex flex-col gap-3">
                <span class="font-bold text-navy-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Paperclip class="h-4 w-4" /> Attachments
                </span>

                <div class="flex flex-col gap-2">
                  {task.attachments?.map((attachment, idx) => (
                    <div key={idx} class="flex items-center justify-between p-3 border border-navy-100 dark:border-navy-800 rounded-xl bg-navy-50/20">
                      <div class="flex items-center gap-2.5 overflow-hidden">
                        <FileText class="h-5 w-5 text-primary shrink-0" />
                        <a 
                          href={attachment.url} 
                          target="_blank" 
                          rel="noreferrer"
                          class="text-xs font-semibold text-navy-700 dark:text-navy-300 hover:underline hover:text-primary truncate"
                        >
                          {attachment.filename}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upload drag drop zone */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  class="border-2 border-dashed border-navy-100 dark:border-navy-800 hover:border-primary/50 py-6 rounded-xl flex flex-col items-center justify-center gap-2 bg-navy-50/10 hover:bg-primary/5 dark:hover:bg-primary/5 cursor-pointer transition-all duration-150"
                >
                  {uploading ? (
                    <Loader2 class="h-6 w-6 text-primary animate-spin" />
                  ) : (
                    <>
                      <Paperclip class="h-5 w-5 text-navy-400" />
                      <span class="text-[11px] font-bold text-navy-450 dark:text-navy-450">Click to upload file attachment</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    class="hidden" 
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'comments' && (
            <div class="flex-1 flex flex-col justify-between min-h-[300px]">
              {/* Comments stream */}
              <div class="flex flex-col gap-4 mb-4">
                {task.comments && task.comments.length > 0 ? (
                  task.comments.map((c, i) => (
                    <div key={c._id || i} class="flex items-start gap-3">
                      <img src={c.userId?.avatarUrl} alt="Avatar" class="h-7 w-7 rounded-full object-cover border border-primary/10" />
                      <div class="flex-1 bg-navy-50/50 dark:bg-navy-850 p-3 rounded-2xl border border-navy-100/40 dark:border-navy-800/40 text-xs">
                        <div class="flex items-center justify-between mb-1.5">
                          <span class="font-bold text-navy-855 dark:text-white">{c.userId?.name}</span>
                          <span class="text-[9px] text-navy-400">
                            {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        <p class="text-navy-650 dark:text-navy-300 leading-relaxed break-words">{c.text}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p class="text-center text-xs text-navy-400 py-10">No comments posted yet.</p>
                )}
              </div>

              {/* Add comment box */}
              <form onSubmit={handleAddComment} class="flex items-end gap-2 border-t border-navy-50 dark:border-navy-800/40 pt-4 mt-auto">
                <textarea
                  placeholder="Post comment to thread..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows="2"
                  class="flex-1 px-3 py-2 border border-navy-100 dark:border-navy-800 rounded-xl bg-navy-50/50 dark:bg-navy-950 text-navy-800 dark:text-white text-xs focus:outline-none focus:border-primary resize-none"
                />
                <button 
                  type="submit"
                  class="p-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl shadow btn-press h-10 flex items-center justify-center shrink-0"
                >
                  <Send class="h-4 w-4" />
                </button>
              </form>
            </div>
          )}

          {activeTab === 'history' && (
            <div class="flex flex-col gap-4">
              {task.activityLog && task.activityLog.length > 0 ? (
                task.activityLog.slice().reverse().map((log, idx) => (
                  <div key={idx} class="flex items-start gap-3 text-xs leading-relaxed group">
                    <div class="h-6 w-6 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center shrink-0 text-navy-500">
                      <History class="h-3.5 w-3.5" />
                    </div>
                    <div class="flex-1 text-navy-550 dark:text-navy-400">
                      <div class="flex items-center gap-1.5">
                        <span class="font-bold text-navy-800 dark:text-white">{log.userId?.name || 'Someone'}</span>
                        <span class="text-[9px] text-navy-400">
                          {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      <p class="mt-0.5">
                        Performed <span class="font-semibold text-primary dark:text-primary-light uppercase text-[10px] tracking-wider bg-primary/5 px-1.5 py-0.5 rounded">{log.action}</span> action.
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p class="text-center text-xs text-navy-400 py-10">No activities logged yet.</p>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
