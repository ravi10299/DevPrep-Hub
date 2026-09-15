export type UserRole = 'ADMIN' | 'CONTRIBUTOR';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}
