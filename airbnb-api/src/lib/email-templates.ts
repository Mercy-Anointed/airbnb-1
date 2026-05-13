import { env } from '../config/env';

// ─── Welcome Email ────────────────────────────────────────────────────────────
export const welcomeEmailTemplate = (name: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Airbnb</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #FF5A5F; font-size: 32px; margin: 0;">airbnb</h1>
    </div>
    <h2 style="color: #333333; font-size: 24px;">Welcome, ${name}! 🎉</h2>
    <p style="color: #666666; font-size: 16px; line-height: 1.6;">
      Thank you for joining Airbnb. We're excited to have you as part of our community.
    </p>
    <p style="color: #666666; font-size: 16px; line-height: 1.6;">
      You can now browse thousands of unique properties and book your next adventure.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${env.CLIENT_URL}" 
         style="background-color: #FF5A5F; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
        Start Exploring
      </a>
    </div>
    <p style="color: #999999; font-size: 14px; text-align: center; margin-top: 30px;">
      If you have any questions, reply to this email and we'll help you out.
    </p>
  </div>
</body>
</html>
`;

// ─── Email Verification ───────────────────────────────────────────────────────
export const verificationEmailTemplate = (
  name: string,
  token: string
): string => {
  const verificationUrl = `${env.APP_URL}/api/v1/auth/verify-email?token=${token}`;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Your Email</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #FF5A5F; font-size: 32px; margin: 0;">airbnb</h1>
    </div>
    <h2 style="color: #333333;">Verify your email address</h2>
    <p style="color: #666666; font-size: 16px; line-height: 1.6;">
      Hi ${name}, please verify your email address by clicking the button below.
    </p>
    <p style="color: #666666; font-size: 16px; line-height: 1.6;">
      This link expires in <strong>24 hours</strong>.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}"
         style="background-color: #FF5A5F; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
        Verify Email Address
      </a>
    </div>
    <p style="color: #999999; font-size: 14px;">
      If you did not create an account, you can safely ignore this email.
    </p>
    <p style="color: #999999; font-size: 12px; word-break: break-all;">
      Or copy this link: ${verificationUrl}
    </p>
  </div>
</body>
</html>
`;
};

// ─── Password Reset ───────────────────────────────────────────────────────────
export const passwordResetEmailTemplate = (
  name: string,
  token: string
): string => {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #FF5A5F; font-size: 32px; margin: 0;">airbnb</h1>
    </div>
    <h2 style="color: #333333;">Reset your password</h2>
    <p style="color: #666666; font-size: 16px; line-height: 1.6;">
      Hi ${name}, we received a request to reset your password.
    </p>
    <p style="color: #666666; font-size: 16px; line-height: 1.6;">
      This link expires in <strong>1 hour</strong>.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}"
         style="background-color: #FF5A5F; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
        Reset Password
      </a>
    </div>
    <p style="color: #999999; font-size: 14px;">
      If you did not request a password reset, you can safely ignore this email.
      Your password will not be changed.
    </p>
    <p style="color: #999999; font-size: 12px; word-break: break-all;">
      Or copy this link: ${resetUrl}
    </p>
  </div>
</body>
</html>
`;
};

// ─── Booking Confirmation ─────────────────────────────────────────────────────
export const bookingConfirmationTemplate = (
  guestName: string,
  propertyTitle: string,
  checkIn: Date,
  checkOut: Date,
  totalPrice: number,
  bookingId: string
): string => {
  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Booking Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #FF5A5F; font-size: 32px; margin: 0;">airbnb</h1>
    </div>
    <h2 style="color: #333333;">Booking Confirmed! 🎊</h2>
    <p style="color: #666666; font-size: 16px;">
      Hi ${guestName}, your booking has been confirmed.
    </p>
    <div style="background-color: #f9f9f9; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #333333; margin-top: 0;">${propertyTitle}</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666666;">Check-in</td>
          <td style="padding: 8px 0; color: #333333; font-weight: bold;">${formatDate(checkIn)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666666;">Check-out</td>
          <td style="padding: 8px 0; color: #333333; font-weight: bold;">${formatDate(checkOut)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666666;">Total Price</td>
          <td style="padding: 8px 0; color: #FF5A5F; font-weight: bold; font-size: 18px;">
            ₦${totalPrice.toLocaleString()}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666666;">Booking ID</td>
          <td style="padding: 8px 0; color: #999999; font-size: 12px;">${bookingId}</td>
        </tr>
      </table>
    </div>
    <p style="color: #666666; font-size: 14px;">
      Please arrive at the property during check-in time. Contact your host if you need assistance.
    </p>
  </div>
</body>
</html>
`;
};

// ─── Booking Notification (for host) ─────────────────────────────────────────
export const bookingNotificationTemplate = (
  hostName: string,
  guestName: string,
  propertyTitle: string,
  checkIn: Date,
  checkOut: Date,
  totalPrice: number
): string => {
  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Booking</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #FF5A5F; font-size: 32px; margin: 0;">airbnb</h1>
    </div>
    <h2 style="color: #333333;">New Booking! 🏠</h2>
    <p style="color: #666666; font-size: 16px;">
      Hi ${hostName}, you have a new booking for <strong>${propertyTitle}</strong>.
    </p>
    <div style="background-color: #f9f9f9; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666666;">Guest</td>
          <td style="padding: 8px 0; color: #333333; font-weight: bold;">${guestName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666666;">Check-in</td>
          <td style="padding: 8px 0; color: #333333; font-weight: bold;">${formatDate(checkIn)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666666;">Check-out</td>
          <td style="padding: 8px 0; color: #333333; font-weight: bold;">${formatDate(checkOut)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666666;">Total Price</td>
          <td style="padding: 8px 0; color: #FF5A5F; font-weight: bold; font-size: 18px;">
            ₦${totalPrice.toLocaleString()}
          </td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>
`;
};

// ─── OTP Verification Email ───────────────────────────────────────────────────
export const otpEmailTemplate = (name: string, otp: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#FF385C;padding:36px 40px;text-align:center;">
              <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">airbnb</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">Verify your email address</p>
              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                Hi ${name}, use the code below to verify your email. It expires in <strong>10 minutes</strong>.
              </p>
              <div style="background:#f9fafb;border:2px dashed #FF385C;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;letter-spacing:1px;text-transform:uppercase;">Your verification code</p>
                <p style="margin:0;font-size:48px;font-weight:800;color:#FF385C;letter-spacing:12px;">${otp}</p>
              </div>
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you didn't create an account, you can safely ignore this email. Do not share this code with anyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Airbnb, Inc. · All rights reserved</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`