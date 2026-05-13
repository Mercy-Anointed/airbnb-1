import { authService } from '../modules/auth/auth.service';
import { prismaMock } from './mocks/prisma.mock';
import { AppError } from '../middleware/error.middleware';
import bcrypt from 'bcryptjs';

// ─── AuthService Tests ────────────────────────────────────────────────────────
describe('AuthService', () => {

  // Clear all mock call history before each test
  // Without this, sendEmail called in 'register' test
  // bleeds into 'forgotPassword' test and fails the assertion
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Register ───────────────────────────────────────────────────────────────
  describe('register', () => {

    it('should throw 409 if email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        role: 'GUEST',
        googleId: null,
        avatar: null,
        isEmailVerified: false,
        emailVerificationToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.register({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123!',
          role: 'GUEST',
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw with status 409 on duplicate email', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        role: 'GUEST',
        googleId: null,
        avatar: null,
        isEmailVerified: false,
        emailVerificationToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      try {
        await authService.register({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123!',
          role: 'GUEST',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(409);
      }
    });

    it('should create user successfully with valid data', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'new-user-123',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedpassword',
        role: 'GUEST',
        googleId: null,
        avatar: null,
        isEmailVerified: false,
        emailVerificationToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prismaMock.refreshToken.create.mockResolvedValue({} as any);
      prismaMock.user.update.mockResolvedValue({} as any);

      const result = await authService.register({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        role: 'GUEST',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Login ───────────────────────────────────────────────────────────────────
  describe('login', () => {

    it('should throw 401 if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nobody@example.com', password: 'anything' })
      ).rejects.toThrow(AppError);
    });

    it('should throw 400 if user has no password (Google account)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'google@example.com',
        name: 'Google User',
        password: null,
        role: 'GUEST',
        googleId: 'google-id-123',
        avatar: null,
        isEmailVerified: true,
        emailVerificationToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      try {
        await authService.login({
          email: 'google@example.com',
          password: 'anything',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(400);
      }
    });

    it('should throw 401 if password is incorrect', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: await bcrypt.hash('CorrectPassword123!', 12),
        role: 'GUEST',
        googleId: null,
        avatar: null,
        isEmailVerified: false,
        emailVerificationToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'WrongPassword',
        })
      ).rejects.toThrow(AppError);
    });

    it('should return tokens on successful login', async () => {
      const plainPassword = 'CorrectPassword123!';
      const hashedPassword = await bcrypt.hash(plainPassword, 12);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        role: 'GUEST',
        googleId: null,
        avatar: null,
        isEmailVerified: false,
        emailVerificationToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prismaMock.refreshToken.create.mockResolvedValue({} as any);

      const result = await authService.login({
        email: 'test@example.com',
        password: plainPassword,
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).not.toHaveProperty('password');
    });
  });

  // ─── Forgot Password ───────────────────────────────────────────────────────
  describe('forgotPassword', () => {

    it('should return undefined silently if email does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.forgotPassword('nobody@example.com')
      ).resolves.toBeUndefined();

      // No email should be sent for non-existent users
      const { sendEmail } = require('../config/email');
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should delete existing reset tokens before creating a new one', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        role: 'GUEST',
        googleId: null,
        avatar: null,
        isEmailVerified: true,
        emailVerificationToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prismaMock.passwordReset.deleteMany.mockResolvedValue({ count: 1 });
      prismaMock.passwordReset.create.mockResolvedValue({} as any);

      await authService.forgotPassword('test@example.com');

      expect(prismaMock.passwordReset.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('should create a password reset token for valid email', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        role: 'GUEST',
        googleId: null,
        avatar: null,
        isEmailVerified: true,
        emailVerificationToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prismaMock.passwordReset.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.passwordReset.create.mockResolvedValue({} as any);

      await authService.forgotPassword('test@example.com');

      expect(prismaMock.passwordReset.create).toHaveBeenCalledTimes(1);

      const createCall = prismaMock.passwordReset.create.mock.calls[0][0];
      expect(createCall.data.userId).toBe('user-123');
      expect(createCall.data.expiresAt).toBeInstanceOf(Date);
      expect(createCall.data.expiresAt > new Date()).toBe(true);
    });

    it('should send a password reset email for valid email', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        role: 'GUEST',
        googleId: null,
        avatar: null,
        isEmailVerified: true,
        emailVerificationToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prismaMock.passwordReset.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.passwordReset.create.mockResolvedValue({} as any);

      const { sendEmail } = require('../config/email');
      sendEmail.mockClear();

      await authService.forgotPassword('test@example.com');

      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: expect.stringContaining('Reset'),
        })
      );
    });
  });

  // ─── Refresh Access Token ──────────────────────────────────────────────────
  describe('refreshAccessToken', () => {

    // Reusable secret — matches what your auth.service.ts uses
    // dotenv.config() in setup.ts ensures this is loaded correctly
    const SECRET = process.env.JWT_REFRESH_SECRET ||
      'your-super-secret-refresh-key-change-in-production';

    it('should throw 401 if token is invalid or tampered', async () => {
      await expect(
        authService.refreshAccessToken('this-is-not-a-valid-jwt')
      ).rejects.toThrow(AppError);
    });

    it('should throw 401 if token is not found in database', async () => {
      const jwt = require('jsonwebtoken');
      const validToken = jwt.sign(
        { userId: 'user-123' },
        SECRET,
        { expiresIn: '7d' }
      );

      prismaMock.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        authService.refreshAccessToken(validToken)
      ).rejects.toThrow(AppError);
    });

    it('should throw 401 if token is expired in database', async () => {
      const jwt = require('jsonwebtoken');
      const validToken = jwt.sign(
        { userId: 'user-123' },
        SECRET,
        { expiresIn: '7d' }
      );

      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'token-123',
        token: validToken,
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 1000), // 1 second in the past
        createdAt: new Date(),
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'GUEST',
        },
      } as any);

      prismaMock.refreshToken.delete.mockResolvedValue({} as any);

      await expect(
        authService.refreshAccessToken(validToken)
      ).rejects.toThrow(AppError);

      expect(prismaMock.refreshToken.delete).toHaveBeenCalledTimes(1);
    });

    it('should return new tokens and rotate the refresh token on success', async () => {
      const jwt = require('jsonwebtoken');

      // Sign the old token 2 seconds in the past
      // This guarantees the new token's iat timestamp will differ
      // JWT encodes time in whole seconds — same second = identical token
      const oldTokenPayload = {
        userId: 'user-123',
        iat: Math.floor(Date.now() / 1000) - 2, // 2 seconds ago
      };
      const validToken = jwt.sign(oldTokenPayload, SECRET, { expiresIn: '7d' });

      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'token-123',
        token: validToken,
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'GUEST',
        },
      } as any);

      prismaMock.refreshToken.delete.mockResolvedValue({} as any);
      prismaMock.refreshToken.create.mockResolvedValue({} as any);

      const result = await authService.refreshAccessToken(validToken);

      // Both tokens returned
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');

      // Old token deleted — rotation happened
      expect(prismaMock.refreshToken.delete).toHaveBeenCalledWith({
        where: { token: validToken },
      });

      // New token persisted
      expect(prismaMock.refreshToken.create).toHaveBeenCalledTimes(1);

      // New token is genuinely different — rotation is real
      expect(result.refreshToken).not.toBe(validToken);

    }, 10000); // 10s timeout — safety net
  });

});