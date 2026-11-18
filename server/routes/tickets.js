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

// CREATE A TICKET FOR A PROJECT
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, priority, projectId, assignedTo } = req.body;
    
    const newTicket = new Ticket({
      title,
      description,
      priority: priority || 'Medium',
      project: projectId,
      assignedTo: assignedTo || null,
      createdBy: req.user.id
    });

    const savedTicket = await newTicket.save();
    res.status(201).json(savedTicket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET ALL TICKETS FOR A SPECIFIC PROJECT
router.get('/project/:projectId', verifyToken, async (req, res) => {
  try {
    const tickets = await Ticket.find({ project: req.params.projectId })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');
    res.status(200).json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE TICKET STATUS / DETAILS
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate('assignedTo', 'name email').populate('createdBy', 'name email');
    res.status(200).json(updatedTicket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD COMMENT TO A TICKET
router.post('/:id/comments', verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found!" });

    ticket.comments.push({
      text,
      author: req.user.id // Token se user ID le li
    });

    await ticket.save();
    
    // Populated ticket wapas bhejenge taaki frontend par details seedha dikhein
    const updatedTicket = await Ticket.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    res.status(200).json(updatedTicket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE A TICKET
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await Ticket.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Ticket deleted successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;