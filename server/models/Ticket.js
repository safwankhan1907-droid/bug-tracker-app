const router = require('express').Router();
const Ticket = require('../models/Ticket');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: "Access Denied! No token provided." });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: "Invalid Token!" });
  }
};

// GET ALL TICKETS
router.get('/', verifyToken, async (req, res) => {
  try {
    const tickets = await Ticket.find().populate('assignee', 'name email');
    res.status(200).json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE TICKET
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, priority, status, assignee, projectId } = req.body;
    const newTicket = new Ticket({
      title,
      description,
      priority: priority || 'Medium',
      status: status || 'To Do',
      assignee,
      projectId,
      createdBy: req.user.id
    });
    const savedTicket = await newTicket.save();
    res.status(201).json(savedTicket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE TICKET (Status change, Kanban drag-drop, edit details)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    The updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate('assignee', 'name email');
    
    if (!updatedTicket) return res.status(404).json({ message: "Ticket not found!" });
    res.status(200).json(updatedTicket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE TICKET
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const deletedTicket = await Ticket.findByIdAndDelete(req.params.id);
    if (!deletedTicket) return res.status(404).json({ message: "Ticket not found!" });
    res.status(200).json({ message: "Ticket deleted successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD COMMENT TO TICKET
router.post('/:id/comments', verifyToken, async (req, res) => {
  try {
    const { text, userName } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found!" });

    ticket.comments.push({ text, userName: userName || 'Collaborator', createdAt: new Date() });
    await ticket.save();
    res.status(200).json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
