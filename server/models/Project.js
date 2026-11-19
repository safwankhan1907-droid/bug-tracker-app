const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  key: { type: String, required: true },
  email: { type: String, default: '' },
  role: { type: String, enum: ['Admin', 'Developer', 'Viewer'], default: 'Developer' },
  status: { type: String, enum: ['Pending', 'Accepted'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['Admin', 'Developer', 'Viewer'], default: 'Developer' },
  joinedAt: { type: Date, default: Date.now }
});

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  keyCode: { type: String, required: true, trim: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isArchived: { type: Boolean, default: false },
  members: [memberSchema],
  invitations: [invitationSchema]
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
