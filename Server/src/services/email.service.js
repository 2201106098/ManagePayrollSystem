const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');

let transporter = null;

// Initialize email transporter
const initializeTransporter = () => {
  if (transporter) return transporter;

  if (!env.emailHost || !env.emailUser || !env.emailPass) {
    logger.warn('Email configuration missing. Email service will be disabled.');
    return null;
  }

  transporter = nodemailer.createTransporter({
    host: env.emailHost,
    port: env.emailPort,
    secure: env.emailPort === 465,
    auth: {
      user: env.emailUser,
      pass: env.emailPass
    }
  });

  return transporter;
};

const sendEmail = async (options) => {
  try {
    const emailTransporter = initializeTransporter();
    
    if (!emailTransporter) {
      throw new Error('Email service not configured');
    }

    const mailOptions = {
      from: env.emailUser,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    const result = await emailTransporter.sendMail(mailOptions);
    logger.info(`Email sent to ${options.to}: ${result.messageId}`);
    
    return result;
  } catch (error) {
    logger.error('Email sending failed:', error);
    throw error;
  }
};

const sendWelcomeEmail = async (user) => {
  const html = `
    <h1>Welcome to Payroll Management System</h1>
    <p>Hi ${user.firstName},</p>
    <p>Your account has been created successfully. You can now log in to the system.</p>
    <p>Best regards,<br>Payroll Team</p>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Welcome to Payroll Management System',
    html
  });
};

const sendPasswordResetEmail = async (user, resetToken) => {
  const html = `
    <h1>Password Reset Request</h1>
    <p>Hi ${user.firstName},</p>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <a href="${process.env.CLIENT_URL}/reset-password?token=${resetToken}">Reset Password</a>
    <p>This link will expire in 1 hour.</p>
    <p>Best regards,<br>Payroll Team</p>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    html
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail
};
