const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// Middleware proteksi login
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
}

// Halaman utama dengan filter dan grafik
router.get('/', isAuthenticated, async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  try {
    const { start, end } = req.query;
    const filter = { user: req.session.userId };

    if (start || end) {
      filter.date = {};
      if (start) filter.date.$gte = new Date(start);
      if (end) filter.date.$lte = new Date(end + "T23:59:59");
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 });

    const balance = transactions.reduce((acc, tx) =>
      tx.type === 'income' ? acc + tx.amount : acc - tx.amount, 0
    );

    const chartLabels = [];
    const chartIncome = [];
    const chartExpense = [];
    const grouped = {};

    transactions.forEach(tx => {
      const key = tx.date.toISOString().split('T')[0];
      if (!grouped[key]) {
        grouped[key] = { income: 0, expense: 0 };
      }
      grouped[key][tx.type] += tx.amount;
    });

    Object.keys(grouped).sort().forEach(date => {
      chartLabels.push(date);
      chartIncome.push(grouped[date].income);
      chartExpense.push(grouped[date].expense);
    });

    res.render('index', {
      transactions,
      balance,
      start,
      end,
      chartLabels,
      chartIncome,
      chartExpense
    });
  } catch (error) {
    res.status(500).send('Terjadi kesalahan saat mengambil data');
  }
});

// Form tambah transaksi
router.get('/add', isAuthenticated, (req, res) => {
  res.render('add');
});

// Proses tambah transaksi
router.post('/add', isAuthenticated, async (req, res) => {
  try {
    const { type, category, amount, note, date } = req.body;

    if (!type || !category || !amount || !date) {
      return res.status(400).send('Semua field wajib diisi!');
    }

    await Transaction.create({
      type,
      category,
      amount: Number(amount),
      note,
      date: new Date(date),
      user: req.session.userId
    });

    res.redirect('/');
  } catch (error) {
    res.status(500).send('Gagal menambahkan transaksi');
  }
});

// Form edit transaksi
router.get('/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.session.userId });
    if (!transaction) {
      return res.status(404).send('Transaksi tidak ditemukan');
    }
    res.render('edit', { transaction });
  } catch (error) {
    res.status(500).send('Gagal mengambil data transaksi');
  }
});

// Proses update transaksi
router.put('/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const { type, category, amount, note, date } = req.body;

    if (!type || !category || !amount || !date) {
      return res.status(400).send('Semua field wajib diisi!');
    }

    await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.session.userId },
      {
        type,
        category,
        amount: Number(amount),
        note,
        date: new Date(date)
      }
    );

    res.redirect('/');
  } catch (error) {
    res.status(500).send('Gagal memperbarui transaksi');
  }
});

// Proses hapus transaksi
router.delete('/delete/:id', isAuthenticated, async (req, res) => {
  try {
    await Transaction.findOneAndDelete({ _id: req.params.id, user: req.session.userId });
    res.redirect('/');
  } catch (error) {
    res.status(500).send('Gagal menghapus transaksi');
  }
});

module.exports = router;
