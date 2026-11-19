const router = require('express').Router();
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const getJwtSecret = () => process.env.JWT_SECRET || 'devflow_fallback_secret_change_in_prod';

// Middleware to verify JWT token
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

// REGISTER API
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(400).json({ message: 'User already exists!' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });
    const savedUser = await newUser.save();

    res.status(201).json({ message: 'User registered successfully!', userId: savedUser._id });
  } catch (err) {
    console.error('Register route error:', err);
    res.status(500).json({ message: 'Server error during registration', error: err.message });
  }
});

// LOGIN API
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: 'User not found!' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials!' });

    const token = jwt.sign({ id: user._id }, getJwtSecret(), { expiresIn: '1d' });

    res.status(200).json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('Login route error:', err);
    res.status(500).json({ message: 'Server error during login', error: err.message });
  }
});

// UPDATE PROFILE (Name & Optional New Password)
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, password, confirmPassword } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Full name is required.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    user.name = name.trim();

    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match!' });
      }
      if (password.length < 4) {
        return res.status(400).json({ message: 'Password must be at least 4 characters.' });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully!',
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Failed to update profile', error: err.message });
  }
});

// GET ALL USERS (For Assignee Dropdown)
router.get('/users', verifyToken, async (req, res) => {
  try {
    const users = await User.find({}, 'name email');
    res.status(200).json(users);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
});

module.exports = router;
