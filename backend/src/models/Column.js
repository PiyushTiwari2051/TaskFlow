import mongoose from 'mongoose';

const columnSchema = new mongoose.Schema({
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
  title: { type: String, required: true, trim: true },
  taskOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  color: { type: String, default: '#E2E8F0' }
}, {
  timestamps: true
});

const Column = mongoose.model('Column', columnSchema);
export default Column;
