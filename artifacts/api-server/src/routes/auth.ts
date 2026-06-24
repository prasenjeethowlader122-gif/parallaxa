import { Router } from "express";
import { hash, compare } from "bcrypt-ts";
import { randomBytes } from "crypto";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

const router = Router();

const JWT_SECRET = process.env.AUTH_SECRET ?? "dev-secret-change-in-production";

function generateToken(user: { id: string; email: string; role: string; name?: string | null }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/auth/register", async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }


    const { name, email, password } = parsed.data;

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Email already in use." });
    }

    const hashed = await hash(password, 12);
    const verificationToken = randomBytes(32).toString("hex");

    const result = await pool.query(
      `INSERT INTO users (email, password, name, verification_token) VALUES ($1, $2, $3, $4) RETURNING *`,
      [email, hashed, name ?? null, verificationToken]
    );
    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) {
    req.log.error(e, "POST /auth/register");
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid email or password." });
    }


    const { email, password } = parsed.data;

    const result = await pool.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [email]);
    if (!result.rows[0]) return res.status(401).json({ error: "Invalid email or password." });

    const user = result.rows[0];
    const valid = await compare(password, user.password ?? "");
    if (!valid) return res.status(401).json({ error: "Invalid email or password." });

    const token = generateToken(user);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) {
    req.log.error(e, "POST /auth/login");
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/auth/session", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.json({ user: null });

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;


    const result = await pool.query("SELECT id, email, name, role FROM users WHERE id = $1", [decoded.id]);
    if (!result.rows[0]) return res.json({ user: null });

    res.json({ user: result.rows[0] });
  } catch {
    res.json({ user: null });
  }
});

router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });


    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000);

    const result = await pool.query(
      "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3 RETURNING id",
      [token, expires.toISOString(), email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No account found with that email." });
    }

    res.json({ success: "Password reset link sent." });
  } catch (e) {
    req.log.error(e, "POST /auth/forgot-password");
    res.status(500).json({ error: "Failed to send reset email" });
  }
});

router.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ error: "Invalid request." });
    }


    const check = await pool.query(
      "SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()",
      [token]
    );
    if (check.rows.length === 0) {
      return res.status(400).json({ error: "Token is invalid or expired." });
    }

    const hashed = await hash(password, 12);
    await pool.query(
      "UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2",
      [hashed, check.rows[0].id]
    );

    res.json({ success: "Password reset successfully." });
  } catch (e) {
    req.log.error(e, "POST /auth/reset-password");
    res.status(500).json({ error: "Reset failed" });
  }
});

export default router;
