import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  deviceInfo: { type: String }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  passwordHash: { type: String, required: function() { return this.authProvider === 'local'; } },
  avatarUrl: { type: String },
  avatarColor: { type: String, default: '#0F6E5C' }, // auto-assigned on signup
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  refreshTokens: [refreshTokenSchema],
  emailVerified: { type: Boolean, default: false },
  otpCode: { type: String },
  otpExpiresAt: { type: Date },
  lastActiveAt: { type: Date, default: Date.now },
  preferences: {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    notificationsEnabled: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);
export default User;
