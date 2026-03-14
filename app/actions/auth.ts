'use server';

import { signIn, signOut } from '@/auth';
import {
  createUser,
  getUserByEmail,
  createPasswordResetToken,
  resetPassword,
  verifyEmail,
} from '@/lib/db/user';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }
  
  const { name, email, password } = parsed.data;
  const existing = await getUserByEmail(email);
  if (existing) return { error: 'Email already in use.' };
  
  const user = await createUser(email, password, name);
  
  // TODO: send verification email with user.verification_token
  
  redirect('/login?registered=true');
}

export async function loginAction(formData: FormData) {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/dashboard',
    });
  } catch (err) {
    if (err instanceof AuthError) {
      switch (err.type) {
        case 'CredentialsSignin':
          return { error: 'Invalid email or password.' };
        default:
          return { error: 'Something went wrong.' };
      }
    }
    throw err; // re-throw redirect
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' });
}

export async function forgotPasswordAction(formData: FormData) {
  const email = formData.get('email') as string;
  if (!email) return { error: 'Email is required.' };
  
  const token = await createPasswordResetToken(email);
  if (!token) return { error: 'No account found with that email.' };
  
  // TODO: send email with reset link: /reset-password?token=${token}
  return { success: 'Password reset link sent.' };
}

export async function resetPasswordAction(formData: FormData) {
  const token = formData.get('token') as string;
  const password = formData.get('password') as string;
  
  if (!token || !password || password.length < 8) {
    return { error: 'Invalid request.' };
  }
  
  const ok = await resetPassword(token, password);
  if (!ok) return { error: 'Token is invalid or expired.' };
  
  redirect('/login?reset=true');
}

export async function verifyEmailAction(token: string) {
  const ok = await verifyEmail(token);
  if (!ok) return { error: 'Invalid or already used verification link.' };
  return { success: 'Email verified. You can now log in.' };
}