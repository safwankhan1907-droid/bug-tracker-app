const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  userName: { type: String, default: 'Collaborator' },
  createdAt: { type: Date, default: Date.now }
});

const ticketSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['To Do', 'In Progress', 'Completed'], default: 'To Do' },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comments: [commentSchema]
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
