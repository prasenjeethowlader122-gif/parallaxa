export type User = {
  id: string
  name: string | null
  email: string
  password: string | null
  role: 'user' | 'admin'
  email_verified: Date | null
  verification_token: string | null
  reset_token: string | null
  reset_token_expires: Date | null
  created_at: Date
}

export async function getUserByEmail(_email: string): Promise<User | null> { return null }
export async function getUserById(_id: string): Promise<User | null> { return null }
export async function createUser(_email: string, _password: string, _name?: string): Promise<User> {
  throw new Error('Use API server')
}
export async function verifyEmail(_token: string): Promise<boolean> { return false }
export async function validatePassword(_user: User, _password: string): Promise<boolean> { return false }
