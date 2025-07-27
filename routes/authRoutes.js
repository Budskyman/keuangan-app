const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

// GET /register
router.get('/register', (req, res) => {
  res.render('register', {
    error: null,
    currentUser: req.session.user
  });
});

// POST /register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('register', {
      error: 'Username dan password wajib diisi.',
      currentUser: null
    });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.render('register', {
        error: 'Username sudah terdaftar.',
        currentUser: null
      });
    }

    const user = new User({ username, password });
    await user.save(); // ini akan trigger pre-save hash

    req.session.userId = user._id;
    req.session.user = user;

    res.redirect('/');
  } catch (err) {
    res.render('register', {
      error: 'Terjadi kesalahan saat mendaftar.',
      currentUser: null
    });
  }
});

// GET /login
router.get('/login', (req, res) => {
  res.render('login', {
    error: null,
    currentUser: req.session.user
  });
});

// POST /login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.render('login', {
        error: 'Username atau password salah',
        currentUser: null
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('login', {
        error: 'Username atau password salah',
        currentUser: null
      });
    }

    res.redirect('/');
  } catch (err) {
    res.render('login', {
      error: 'Terjadi kesalahan saat login',
      currentUser: null
    });
  }
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
