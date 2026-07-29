const nodemailer = require('nodemailer');

/**
 * Sends a plain-text email using the store owner's own SMTP credentials.
 * Returns { sent: false } instead of throwing if smtp config is missing
 * or sending fails -- email delivery is a nice-to-have on top of the
 * on-page receipt, never something that should break a checkout.
 */
async function sendDeliveryEmail({ smtp, to, subject, text }) {
  if (!smtp || !smtp.host || !smtp.user || !smtp.pass || !to) {
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port) || 587,
      secure: Number(smtp.port) === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });

    await transporter.sendMail({
      from: `"${smtp.fromName || 'Solenex Store'}" <${smtp.fromEmail || smtp.user}>`,
      to,
      subject,
      text,
    });
    return { sent: true };
  } catch (err) {
    console.error('Delivery email failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendDeliveryEmail };
