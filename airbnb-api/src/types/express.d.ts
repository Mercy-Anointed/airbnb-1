import type { TokenPayload } from '../modules/auth/auth.service';

declare global {
  namespace Express {
    interface User extends TokenPayload {}
  }
}

export {};
