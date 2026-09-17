import type { AuthUser } from '../auth-user.js';

export type JwtUser = AuthUser & {
  userId: string;
};
