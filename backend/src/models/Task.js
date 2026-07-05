import mongoose from 'mongoose';

const labelSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  color: { type: String, required: true }
}, { _id: false });

const checklistItemSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  done: { type: Boolean, default: false }
}); // Automatically generates _id

const attachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  filename: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  editedAt: { type: Date }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Creates createdAt for comments
}); // Automatically generates _id

const activityLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  meta: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const taskSchema = new mongoose.Schema({
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
  columnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Column', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  labels: [labelSchema],
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dueDate: { type: Date },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  checklist: [checklistItemSchema],
  attachments: [attachmentSchema],
  comments: [commentSchema],
  position: { type: Number, required: true }, // Fractional index float
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  activityLog: [activityLogSchema]
}, {
  timestamps: true
});

const Task = mongoose.model('Task', taskSchema);
export default Task;
