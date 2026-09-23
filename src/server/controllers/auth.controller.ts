import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { getClient } from '../db/database.js';
import type { AuthRequest, AuthPayload } from '../middleware/auth.middleware.js';

const JWT_SECRET = process.env['JWT_SECRET'] || 'CHANGE_ME_BEFORE_PRODUCTION';
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] || 'CHANGE_ME_REFRESH_BEFORE_PRODUCTION';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

function generateTokens(payload: AuthPayload) {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  return { accessToken, refreshToken };
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const db = getClient();
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] });
  const user = result.rows[0] as unknown as { id: string; email: string; name: string; password_hash: string; role: string; portfolio_url: string | null } | undefined;

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcryptjs.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role as AuthPayload['role'],
  };

  const { accessToken, refreshToken } = generateTokens(payload);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  res.json({
    accessToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, portfolioUrl: user.portfolio_url },
  });
}

export function refresh(req: AuthRequest, res: Response): void {
  const token = req.cookies?.['refreshToken'];
  if (!token) {
    res.status(401).json({ error: 'Refresh token required' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as AuthPayload;
    const newPayload: AuthPayload = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
    const accessToken = jwt.sign(newPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}

export function logout(_req: AuthRequest, res: Response): void {
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ message: 'Logged out' });
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const db = getClient();
  const result = await db.execute({ sql: 'SELECT id, email, name, role, portfolio_url FROM users WHERE id = ?', args: [req.user.userId] });
  const user = result.rows[0] as unknown as { id: string; email: string; name: string; role: string; portfolio_url: string | null } | undefined;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user });
}
