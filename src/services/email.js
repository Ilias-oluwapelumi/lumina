const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

async function sendResetCode(to, code) {
  await transporter.sendMail({
    from: `Lumina <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your Lumina password reset code',
    text: `Your reset code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
  });
}

module.exports = { sendResetCode };