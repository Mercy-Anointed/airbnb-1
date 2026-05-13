import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset } from 'jest-mock-extended';

export const prismaMock = mockDeep<PrismaClient>();

// Reset all mocks before each test
// This lives here so it applies to every test automatically
afterEach(() => {
  mockReset(prismaMock);
});