import { sql } from './index';
import { hash, compare } from 'bcrypt-ts';
import { randomBytes } from 'crypto';

export type User = {
  id: string;
  name: string | null;
  email: string;
  password: string | null;
  role: 'user' | 'admin';
  email_verified: Date | null;
  verification_token: string | null;
  reset_token: string | null;
  reset_token_expires: Date | null;
  created_at: Date;
};

// ── Queries ──────────────────────────────────────────────

export async function getUserByEmail(email: string): Promise < User | null > {
  const rows = await sql`
    SELECT * FROM users WHERE email = ${email} LIMIT 1
  `;
  return (rows[0] as User) ?? null;
}

export async function getUserById(id: string): Promise < User | null > {
  const rows = await sql`
    SELECT * FROM users WHERE id = ${id} LIMIT 1
  `;
  return (rows[0] as User) ?? null;
}

// ── Mutations ─────────────────────────────────────────────

export async function createUser(
  email: string,
  password: string,
  name ? : string
): Promise < User > {
  const hashed = await hash(password, 12);
  const verificationToken = randomBytes(32).toString('hex');
  
  const rows = await sql`
    INSERT INTO users (email, password, name, verification_token)
    VALUES (${email}, ${hashed}, ${name ?? null}, ${verificationToken})
    RETURNING *
  `;
  return rows[0] as User;
}

export async function verifyEmail(token: string): Promise < boolean > {
  const rows = await sql`
    UPDATE users
    SET email_verified = NOW(), verification_token = NULL
    WHERE verification_token = ${token} AND email_verified IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}

export async function createPasswordResetToken(
  email: string
): Promise < string | null > {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
  
  const rows = await sql`
    UPDATE users
    SET reset_token = ${token}, reset_token_expires = ${expires.toISOString()}
    WHERE email = ${email}
    RETURNING id
  `;
  return rows.length > 0 ? token : null;
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise < boolean > {
  const rows = await sql`
    SELECT id FROM users
    WHERE reset_token = ${token}
      AND reset_token_expires > NOW()
  `;
  if (rows.length === 0) return false;
  
  const hashed = await hash(newPassword, 12);
  await sql`
    UPDATE users
    SET password = ${hashed}, reset_token = NULL, reset_token_expires = NULL,
        updated_at = NOW()
    WHERE id = ${(rows[0] as any).id}
  `;
  return true;
}

export async function updateUserRole(
  userId: string,
  role: 'user' | 'admin'
): Promise < void > {
  await sql`
    UPDATE users SET role = ${role}, updated_at = NOW()
    WHERE id = ${userId}
  `;
}

export async function validatePassword(
  user: User,
  password: string
): Promise < boolean > {
  if (!user.password) return false;
  return compare(password, user.password);
}