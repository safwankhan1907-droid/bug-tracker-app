const router = require('express').Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Project = require('../models/Project');
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

// GET ALL PROJECTS FOR CURRENT USER
router.get('/', verifyToken, async (req, res) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const filter = {
      $or: [{ owner: req.user.id }, { 'members.user': req.user.id }]
    };
    if (!includeArchived) filter.isArchived = { $ne: true };

    const projects = await Project.find(filter)
      .populate('members.user', 'name email')
      .sort({ updatedAt: -1 });

    const tickets = await Ticket.find({}, 'projectId');
    const ticketCountMap = {};
    tickets.forEach((t) => {
      if (t.projectId) {
        const pid = String(t.projectId);
        ticketCountMap[pid] = (ticketCountMap[pid] || 0) + 1;
      }
    });

    const formatted = projects.map((p) => {
      const memberObj = p.members.find((m) => String(m.user?._id || m.user) === String(req.user.id));
      const role = String(p.owner) === String(req.user.id) ? 'Admin' : (memberObj?.role || 'Developer');
      return {
        ...p.toObject(),
        currentUserRole: role,
        ticketCount: ticketCountMap[String(p._id)] || 0
      };
    });

    res.status(200).json(formatted);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch projects', error: err.message });
  }
});

// CREATE NEW PROJECT
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Project title is required.' });
    }

    const words = title.trim().split(/\s+/);
    const keyCode = (words.length > 1 ? words[0][0] + words[1][0] : title.trim().slice(0, 2)).toUpperCase();

    const project = new Project({
      title: title.trim(),
      description: (description || '').trim(),
      keyCode,
      owner: req.user.id,
      members: [{ user: req.user.id, role: 'Admin' }]
    });

    const saved = await project.save();
    const populated = await Project.findById(saved._id).populate('members.user', 'name email');
    res.status(201).json({ ...populated.toObject(), currentUserRole: 'Admin', ticketCount: 0 });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create project', error: err.message });
  }
});

// GENERATE INVITE KEY FOR A PROJECT
router.post('/:id/invites', verifyToken, async (req, res) => {
  try {
    const { email, role } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found!' });

    const inviteKey = `INV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const validRole = ['Admin', 'Developer', 'Viewer'].includes(role) ? role : 'Developer';

    project.invitations.unshift({
      key: inviteKey,
      email: (email || '').trim().toLowerCase(),
      role: validRole,
      status: 'Pending'
    });

    await project.save();
    const createdInvite = project.invitations[0];
    res.status(201).json({ invitation: createdInvite, invitations: project.invitations });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate invite key', error: err.message });
  }
});

// JOIN PROJECT USING INVITE KEY
router.post('/join', verifyToken, async (req, res) => {
  try {
    const { inviteKey } = req.body;
    if (!inviteKey || !inviteKey.trim()) {
      return res.status(400).json({ message: 'Invite key is required!' });
    }

    const cleanKey = inviteKey.trim().toUpperCase();
    const project = await Project.findOne({ 'invitations.key': cleanKey });
    if (!project) {
      return res.status(404).json({ message: 'Invalid or expired invite key!' });
    }

    const invite = project.invitations.find((inv) => inv.key === cleanKey);
    const alreadyMember = project.members.some((m) => String(m.user) === String(req.user.id));

    if (!alreadyMember) {
      project.members.push({
        user: req.user.id,
        role: invite?.role || 'Developer'
      });
    }

    if (invite) {
      invite.status = 'Accepted';
    }

    await project.save();
    const populated = await Project.findById(project._id).populate('members.user', 'name email');
    res.status(200).json({ message: `Joined ${project.title}!`, project: populated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to join project', error: err.message });
  }
});

// TOGGLE ARCHIVE STATUS
router.patch('/:id/archive', verifyToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found!' });
    project.isArchived = !project.isArchived;
    await project.save();
    res.status(200).json(project);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update archive status', error: err.message });
  }
});

module.exports = router;
