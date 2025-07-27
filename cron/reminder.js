const cron = require('node-cron');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const nodemailer = require('nodemailer');

// scheduler: setiap hari Minggu pukul 08:00 WIB
cron.schedule('0 8 * * 0', async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const users = await User.find();

    for (const user of users) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const transactions = await Transaction.find({
        user: user._id,
        date: { $gte: oneWeekAgo }
      });

      const totalIncome = transactions
        .filter(tx => tx.type === 'income')
        .reduce((acc, tx) => acc + tx.amount, 0);

      const totalExpense = transactions
        .filter(tx => tx.type === 'expense')
        .reduce((acc, tx) => acc + tx.amount, 0);

      // Email user
      if (user.email) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: '📊 Laporan Keuangan Mingguan',
          html: `
            <h3>Halo ${user.name || 'Pengguna'},</h3>
            <p>Berikut ringkasan keuangan Anda selama 7 hari terakhir:</p>
            <ul>
              <li><strong>Pemasukan:</strong> Rp${totalIncome.toLocaleString()}</li>
              <li><strong>Pengeluaran:</strong> Rp${totalExpense.toLocaleString()}</li>
            </ul>
            <p>Jaga terus keuanganmu ya! 💰</p>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`📧 Laporan keuangan dikirim ke ${user.email}`);
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Gagal mengirim pengingat mingguan:', error);
  }
});
