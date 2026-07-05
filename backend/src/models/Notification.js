import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['mention', 'assigned', 'due_soon', 'invite'],
    required: true
  },
  message: { type: String, required: true },
  link: { type: String }, // e.g. /app/boards/boardId?task=taskId
  read: { type: Boolean, default: false, index: true }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
