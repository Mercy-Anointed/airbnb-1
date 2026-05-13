# Auth Flow

This document captures the intended behavior of the active auth implementation. Git keeps the old code history; this file keeps the system reasoning readable.

## Registration

1. User submits name, email, password, and role.
2. Existing verified emails are rejected.
3. Existing unverified emails receive a fresh OTP instead of creating another account.
4. Passwords are hashed with bcrypt cost 12.
5. User is created as unverified.
6. A 6-digit OTP is generated with `crypto.randomInt`, stored with a 10-minute expiry, and emailed.
7. No access or refresh tokens are issued until email verification succeeds.

## Email Verification

1. User submits email and OTP.
2. The service rejects unknown users, already verified users, missing OTPs, and expired OTPs.
3. On success, the user is marked as verified and OTP fields are cleared.
4. A welcome email is sent.
5. Access and refresh tokens are issued.

## Login

1. Email and password are validated with a generic credentials error on failure.
2. Google-only accounts are directed to Google sign-in.
3. Unverified users are blocked and sent a fresh OTP.
4. A short-lived access token and long-lived refresh token are issued.
5. The refresh token is stored in the database so it can be revoked.

## Token Rotation

- Every refresh request must present a valid refresh token that also exists in the database.
- Expired refresh tokens are deleted and rejected.
- Successful refresh deletes the old refresh token immediately.
- A new refresh token is created and persisted before being returned.
- Reusing an old refresh token fails because the old database record no longer exists.

## Logout

- Logout deletes the presented refresh token from the database.
- Logout-all-devices deletes every refresh token for the user.
- Password changes and password resets call logout-all-devices so existing sessions must authenticate again.

## Password Reset

1. Reset requests never reveal whether the email exists.
2. Existing reset tokens for the user are removed.
3. A new random reset token is stored with a 1-hour expiry.
4. Reset validates token existence, unused status, and expiry.
5. Password is re-hashed with bcrypt cost 12.
6. Reset token is marked used.
7. All existing refresh tokens for the user are deleted.
