import nodemailer from 'nodemailer';
import { env } from '../../config/env';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const createTransporter = () => {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
};

export const sendEmail = async (options: SendMailOptions): Promise<void> => {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.log(
      `[DEV EMAIL LOG] To: ${options.to} | Subject: ${options.subject}\nContent: ${options.text || options.html}`
    );
    return;
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
};

export const sendVerificationEmail = async (
  email: string,
  fullName: string,
  otp: string
): Promise<void> => {
  const subject = 'Verify Your Email - Social App';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Welcome to Social App, ${fullName}!</h2>
      <p>Please use the following OTP code to verify your email address:</p>
      <h1 style="letter-spacing: 4px; color: #2563eb;">${otp}</h1>
      <p>This code will expire in ${env.OTP_EXPIRES_MINUTES} minutes.</p>
    </div>
  `;
  await sendEmail({ to: email, subject, html, text: `Your verification OTP is: ${otp}` });
};

export const sendPasswordResetEmail = async (
  email: string,
  fullName: string,
  otp: string,
  resetLink: string
): Promise<void> => {
  const subject = 'Password Reset Request - Social App';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Hello ${fullName},</h2>
      <p>We received a request to reset your password. You can reset your password using either the OTP code or the secure link below:</p>
      <p><strong>OTP Code:</strong></p>
      <h1 style="letter-spacing: 4px; color: #dc2626;">${otp}</h1>
      <p><strong>Or click the secure reset link:</strong></p>
      <p><a href="${resetLink}" style="color: #2563eb;">${resetLink}</a></p>
      <p>The OTP expires in ${env.OTP_EXPIRES_MINUTES} minutes and the link expires in ${env.RESET_TOKEN_EXPIRES_MINUTES} minutes.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
    </div>
  `;
  await sendEmail({
    to: email,
    subject,
    html,
    text: `Password Reset OTP: ${otp} | Secure Reset Link: ${resetLink}`,
  });
};

