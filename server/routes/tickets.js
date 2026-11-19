const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Ticket = require('../models/Ticket');

const getJwtSecret = () => process.env.JWT_SECRET || 'devflow_fallback_secret_change_in_prod';

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'Access Denied! No token provided.' });

  try {
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const verified = jwt.verify(cleanToken, getJwtSecret());
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid Token!' });
  }
};

// GET ALL TICKETS (optionally filtered by ?projectId=...)
router.get('/', verifyToken, async (req, res) => {
  try {
    const query = req.query.projectId ? { projectId: req.query.projectId } : {};
    const tickets = await Ticket.find(query)
      .populate('assignee', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json(tickets);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch tickets', error: err.message });
  }
});

// CREATE TICKET
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, priority, status, assignee, projectId } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Ticket title is required.' });
    }

    const newTicket = new Ticket({
      title: title.trim(),
      description: (description || '').trim(),
      priority: priority || 'Medium',
      status: status || 'To Do',
      assignee: assignee || null,
      projectId: projectId || null,
      createdBy: req.user.id
    });

    const savedTicket = await newTicket.save();
    const populatedTicket = await Ticket.findById(savedTicket._id).populate('assignee', 'name email');
    res.status(201).json(populatedTicket);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create ticket', error: err.message });
  }
});

// UPDATE TICKET
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate('assignee', 'name email');

    if (!updatedTicket) return res.status(404).json({ message: 'Ticket not found!' });
    res.status(200).json(updatedTicket);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update ticket', error: err.message });
  }
});

// DELETE TICKET
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const deletedTicket = await Ticket.findByIdAndDelete(req.params.id);
    if (!deletedTicket) return res.status(404).json({ message: 'Ticket not found!' });
    res.status(200).json({ message: 'Ticket deleted successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete ticket', error: err.message });
  }
});

// ADD COMMENT TO TICKET
router.post('/:id/comments', verifyToken, async (req, res) => {
  try {
    const { text, userName } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found!' });

    ticket.comments.push({
      text: text.trim(),
      userName: userName || 'Collaborator',
      createdAt: new Date()
    });
    await ticket.save();

    const populated = await Ticket.findById(ticket._id).populate('assignee', 'name email');
    res.status(200).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add comment', error: err.message });
  }
});

module.exports = router;
