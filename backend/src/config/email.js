import nodemailer from 'nodemailer';

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

const hasSmtpConfig = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;
if (hasSmtpConfig) {
  transporter = nodemailer.createTransport(smtpConfig);
}

/**
 * Sends a 6-digit OTP code to the user's email.
 * Falls back to logging to the console in local development if SMTP is not configured.
 * 
 * @param {string} email 
 * @param {string} name 
 * @param {string} otp 
 */
export const sendOtpEmail = async (email, name, otp) => {
  if (!transporter) {
    console.log('\n======================================================');
    console.log(`[EMAIL SIMULATOR] OTP code for ${name} (${email}): ${otp}`);
    console.log('Configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env to send real emails.');
    console.log('======================================================\n');
    return true;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || `"TaskFlow" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Your TaskFlow Verification Code: ${otp}`,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #F9F9FB; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; padding: 12px; background-color: #0F6E5C; border-radius: 12px; color: white; font-weight: bold; font-size: 20px;">TF</div>
          <h2 style="color: #0B0F19; font-size: 24px; margin-top: 15px; font-weight: 800;">Verify Your Email Address</h2>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 16px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);">
          <p style="color: #4E5D6C; font-size: 14px; line-height: 1.6;">Hi ${name},</p>
          <p style="color: #4E5D6C; font-size: 14px; line-height: 1.6;">Thank you for registering at TaskFlow! To complete your signup and log in, please enter the 6-digit verification code below. This code is valid for 10 minutes.</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: bold; color: #0F6E5C; letter-spacing: 6px; padding: 12px 24px; background-color: #F0Fdf4; border-radius: 12px; border: 1px dashed #0F6E5C;">${otp}</span>
          </div>
          <p style="color: #4E5D6C; font-size: 12px; line-height: 1.6; text-align: center; margin-top: 20px;">If you did not request this code, please ignore this email.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #94A3B8; font-size: 11px;">
          &copy; 2026 TaskFlow. All rights reserved.
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
    // Fallback in case of runtime SMTP errors
    console.log(`\n======================================================`);
    console.log(`[EMAIL SIMULATOR FALLBACK] OTP code for ${name} (${email}): ${otp}`);
    console.log(`======================================================\n`);
    return false;
  }
};
