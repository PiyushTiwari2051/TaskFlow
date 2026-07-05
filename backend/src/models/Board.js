import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const boardSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [memberSchema],
  inviteCode: { type: String, unique: true, sparse: true },
  inviteCodeExpiresAt: { type: Date },
  backgroundColor: { type: String, default: '#0F6E5C' },
  backgroundImageUrl: { type: String },
  columnOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Column' }],
  isArchived: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Index for querying boards a user belongs to
boardSchema.index({ 'members.userId': 1 });

const Board = mongoose.model('Board', boardSchema);
export default Board;
