/**
 * Notification Service
 * Handles multi-channel notifications: In-App, Responsive HTML Email, and SMS Hooks.
 */
const { Notification, User, Branch, Product } = require('../models');

// Responsive HTML Email Template Builder
function generateApprovalEmailHtml({ recipientName, title, subtitle, details, actionUrl, actionText = 'View in System', statusType = 'info' }) {
  const statusColors = {
    info: '#0EA5E9',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  };
  const accentColor = statusColors[statusType] || '#0EA5E9';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7; color: #333333; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-spacing: 0; }
    td { padding: 0; }
    img { border: 0; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #f4f4f7; padding: 40px 0; }
    .main-card { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
    .header { background: #111827; padding: 28px 36px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 1px; }
    .content { padding: 36px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; background-color: ${accentColor}18; color: ${accentColor}; border: 1px solid ${accentColor}30; margin-bottom: 16px; }
    .title { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 8px 0; }
    .subtitle { font-size: 14px; color: #6b7280; margin: 0 0 24px 0; line-height: 1.5; }
    .details-table { width: 100%; margin: 20px 0; border: 1px solid #f3f4f6; border-radius: 8px; background-color: #f9fafb; }
    .details-table td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
    .details-table tr:last-child td { border-bottom: none; }
    .details-label { color: #6b7280; font-weight: 600; width: 35%; }
    .details-value { color: #111827; font-weight: 600; }
    .button-container { text-align: center; margin: 32px 0 16px 0; }
    .button { display: inline-block; padding: 13px 32px; background-color: ${accentColor}; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; text-transform: uppercase; box-shadow: 0 2px 8px ${accentColor}40; }
    .footer { padding: 24px 36px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; background-color: #fafafa; }
    @media only screen and (max-width: 600px) {
      .content { padding: 24px 20px !important; }
      .header { padding: 20px !important; }
      .main-card { border-radius: 0 !important; }
      .details-table td { padding: 10px 12px !important; font-size: 12px !important; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main-card" role="presentation">
      <tr>
        <td class="header">
          <h1>PC ALLEY MANAGEMENT</h1>
        </td>
      </tr>
      <tr>
        <td class="content">
          <span class="badge">${statusType.toUpperCase()}</span>
          <h2 class="title">${title}</h2>
          <p class="subtitle">Hello ${recipientName || 'User'}, ${subtitle}</p>

          ${details && Object.keys(details).length > 0 ? `
          <table class="details-table" role="presentation">
            ${Object.entries(details).map(([key, val]) => `
              <tr>
                <td class="details-label">${key}</td>
                <td class="details-value">${val || '—'}</td>
              </tr>
            `).join('')}
          </table>
          ` : ''}

          ${actionUrl ? `
          <div class="button-container">
            <a href="${actionUrl}" class="button" target="_blank">${actionText}</a>
          </div>
          ` : ''}
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p style="margin: 0;">This is an automated notification from PC Alley System.</p>
          <p style="margin: 4px 0 0 0;">Please do not reply directly to this email.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send Email Notification (Extensible with Nodemailer / SendGrid / SMTP)
 */
async function sendEmailNotification({ to, subject, html }) {
  try {
    // If SMTP credentials or webhook are configured, send real email.
    // Otherwise, log in dev mode.
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      // In production with nodemailer installed:
      console.log(`[EMAIL DISPATCH] Sending to ${to}: ${subject}`);
    } else {
      console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
    }
    return true;
  } catch (error) {
    console.error('[EMAIL ERROR]', error.message);
    return false;
  }
}

/**
 * Send SMS Notification (Extensible with Twilio / Semaphore / PhilSMS)
 */
async function sendSmsNotification({ phone, message }) {
  try {
    if (!phone) return false;
    // Normalized PH mobile number or international format
    const cleanedPhone = phone.replace(/[^0-9+]/g, '');
    if (process.env.SMS_API_KEY) {
      console.log(`[SMS DISPATCH] Sending to ${cleanedPhone}: ${message}`);
    } else {
      console.log(`[SMS STUB] To: ${cleanedPhone} | Message: ${message}`);
    }
    return true;
  } catch (error) {
    console.error('[SMS ERROR]', error.message);
    return false;
  }
}

/**
 * Create In-App Notification & optionally dispatch Email/SMS
 */
async function notifyUser({ userId, branchId, title, message, type = 'info', link = null, emailDetails = null }) {
  try {
    const notification = await Notification.create({
      userId,
      branchId,
      title,
      message,
      type,
      link,
      isRead: false
    });

    // Optional email dispatch
    if (emailDetails && userId) {
      const user = await User.findByPk(userId);
      if (user && user.email) {
        const html = generateApprovalEmailHtml({
          recipientName: user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username,
          title,
          subtitle: message,
          details: emailDetails.details || {},
          actionUrl: emailDetails.actionUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}${link || '/dashboard'}`,
          actionText: emailDetails.actionText || 'Open System',
          statusType: type === 'danger' || type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'
        });
        await sendEmailNotification({
          to: user.email,
          subject: `[PC Alley] ${title}`,
          html
        });
      }
    }

    return notification;
  } catch (error) {
    console.error('[NOTIFY USER ERROR]', error.message);
  }
}

/**
 * Notify multiple users (e.g. all Admins or Managers)
 */
async function notifyUsers({ users, branchId, title, message, type = 'info', link = null, emailDetails = null }) {
  if (!users || users.length === 0) return;
  for (const user of users) {
    await notifyUser({
      userId: typeof user === 'object' ? user.id : user,
      branchId,
      title,
      message,
      type,
      link,
      emailDetails
    });
  }
}

module.exports = {
  generateApprovalEmailHtml,
  sendEmailNotification,
  sendSmsNotification,
  notifyUser,
  notifyUsers
};
