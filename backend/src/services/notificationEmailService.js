// Service status email notification service (Finding F)
const sentEmails = [];

/**
 * Sends customer notification email when job status transitions
 * to 'in_progress' or 'ready_for_release'.
 */
const sendServiceStatusEmail = async ({ job, customer, branch, status }) => {
  try {
    const customerEmail = customer?.email || job?.customer_email;
    const customerName  = customer?.name  || job?.customer_name || 'Valued Customer';
    const jobNumber     = job?.job_number || 'N/A';
    const deviceType    = job?.device_type || 'Device';
    const serviceName   = job?.service_name || 'Repair Service';
    const branchName    = branch?.name || 'PC Alley Branch';
    const branchPhone   = branch?.phone || 'Contact Branch';

    if (!customerEmail) {
      console.warn(`[SERVICE_MAIL] Notification skipped: Customer email not present for Job ${jobNumber}`);
      return { success: false, reason: 'NO_CUSTOMER_EMAIL' };
    }

    let subject = '';
    let messageBody = '';

    if (status === 'in_progress') {
      subject = `[PC ALLEY] Service Started on Your ${deviceType} (Work Order: ${jobNumber})`;
      messageBody = `Dear ${customerName},\n\n` +
        `We are writing to let you know that work has officially begun on your ${deviceType} (${serviceName}) at our ${branchName}.\n\n` +
        `Work Order Reference: ${jobNumber}\n` +
        `Technician / Staff: ${job?.technician_name || 'Assigned Technical Specialist'}\n\n` +
        `We will notify you as soon as testing and service are complete and your device is ready for pickup.\n\n` +
        `Best regards,\n${branchName}\n${branchPhone}`;
    } else if (status === 'ready_for_release') {
      subject = `[PC ALLEY] Ready for Pickup: Your ${deviceType} (Work Order: ${jobNumber})`;
      messageBody = `Dear ${customerName},\n\n` +
        `Great news! Your ${deviceType} service (${serviceName}) is complete and thoroughly tested. It is now ready for pickup at our ${branchName}.\n\n` +
        `Work Order Reference: ${jobNumber}\n` +
        `Total Amount Due: ₱${parseFloat(job?.final_price || job?.estimated_price || 0).toLocaleString()}\n\n` +
        `Please present this work order reference when claiming your equipment.\n\n` +
        `Best regards,\n${branchName}\n${branchPhone}`;
    } else {
      return { success: false, reason: 'STATUS_DOES_NOT_TRIGGER_MAIL' };
    }

    const emailRecord = {
      to: customerEmail,
      customerName,
      jobNumber,
      status,
      subject,
      body: messageBody,
      sentAt: new Date()
    };

    sentEmails.push(emailRecord);
    console.log(`[SERVICE_MAIL] Successfully queued email to ${customerEmail} for Job ${jobNumber} [Status: ${status}]`);
    return { success: true, emailRecord };
  } catch (err) {
    console.error(`[SERVICE_MAIL_ERROR] Failed to send service status email:`, err.message);
    return { success: false, error: err.message };
  }
};

const getSentEmails = () => [...sentEmails];
const clearSentEmails = () => { sentEmails.length = 0; };

module.exports = {
  sendServiceStatusEmail,
  getSentEmails,
  clearSentEmails
};
