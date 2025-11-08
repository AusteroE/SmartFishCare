import nodemailer from 'nodemailer';

// Gmail SMTP Configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports (587 uses STARTTLS)
  auth: {
    user: process.env.SMTP_USER || process.env.FROM_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: false,
  },
};

// Create transporter with better error handling
const transporter = nodemailer.createTransport(emailConfig);

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter verification failed:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

export function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationEmail(
  email: string,
  username: string,
  token: string,
  otp: string
): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'Smart Fish Care System'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Verify Your Email - Smart Fish Care',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .otp-box { background-color: #fff; padding: 15px; border: 2px solid #4CAF50; border-radius: 5px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Smart Fish Care!</h1>
          </div>
          <div class="content">
            <p>Hello ${username},</p>
            <p>Thank you for signing up! Please verify your email address to complete your registration.</p>
            
            <div class="otp-box">
              <p>Your verification code is:</p>
              <div class="otp-code">${otp}</div>
              <p style="font-size: 12px; color: #666;">This code expires in 15 minutes</p>
            </div>
            
            <p>Or click the button below to verify your email:</p>
            <a href="${verificationUrl}" class="button">Verify Email</a>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Smart Fish Care System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully:', info.messageId);
    return true;
  } catch (error: any) {
    console.error('Email sending failed:', error);
    if (error.code === 'EAUTH') {
      console.error('Authentication failed. Please check your SMTP credentials.');
    }
    return false;
  }
}

export async function sendOTPEmail(
  email: string,
  username: string,
  otp: string
): Promise<boolean> {
  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'Smart Fish Care System'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
    to: email,
    subject: 'OTP Verification Code - Smart Fish Care',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7c5cff, #4cc9f0); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .otp-box { background-color: #fff; padding: 20px; border: 2px solid #7c5cff; border-radius: 10px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 36px; font-weight: bold; color: #7c5cff; letter-spacing: 8px; font-family: 'Courier New', monospace; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 OTP Verification</h1>
          </div>
          <div class="content">
            <p>Hello ${username},</p>
            <p>You have requested an OTP verification code. Use the code below to verify your email address:</p>
            
            <div class="otp-box">
              <p style="margin-bottom: 10px; font-weight: 600;">Your Verification Code:</p>
              <div class="otp-code">${otp}</div>
              <p style="font-size: 12px; color: #666; margin-top: 10px;">This code expires in 15 minutes</p>
            </div>
            
            <div class="warning">
              <p style="margin: 0;"><strong>Security Notice:</strong> Never share this code with anyone. Smart Fish Care will never ask for your verification code.</p>
            </div>
            
            <p>If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Smart Fish Care System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully:', info.messageId);
    return true;
  } catch (error: any) {
    console.error('OTP email sending failed:', error);
    if (error.code === 'EAUTH') {
      console.error('Authentication failed. Please check your SMTP credentials.');
    }
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  username: string,
  token: string
): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'Smart Fish Care System'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset Your Password - Smart Fish Care',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7c5cff, #4cc9f0); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #7c5cff, #4cc9f0); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
          .link-box { background-color: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin: 15px 0; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello ${username},</p>
            <p>We received a request to reset your password for your Smart Fish Care account.</p>
            
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <div class="link-box">
              <p style="margin: 0; color: #666;">${resetUrl}</p>
            </div>
            
            <div class="warning">
              <p style="margin: 0;"><strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Smart Fish Care System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', info.messageId);
    return true;
  } catch (error: any) {
    console.error('Password reset email sending failed:', error);
    if (error.code === 'EAUTH') {
      console.error('Authentication failed. Please check your SMTP credentials.');
    }
    return false;
  }
}