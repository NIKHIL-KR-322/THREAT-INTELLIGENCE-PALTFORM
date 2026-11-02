import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
const cookieName = "tip_session";
function secret() { const value = process.env.SESSION_SECRET; if (!value || value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters."); return value; }
export function signSession(payload: string) { return createHmac("sha256", secret()).update(payload).digest("hex"); }
export async function setSession(user: { id: number; email: string; role: string }) {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString("base64url");
  const jar = await cookies(); jar.set(cookieName, `${payload}.${signSession(payload)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 8 * 60 * 60 });
}
export async function getSession() {
  const raw = (await cookies()).get(cookieName)?.value; if (!raw) return null;
  const [payload, signature] = raw.split("."); if (!payload || !signature) return null;
  const expected = Buffer.from(signSession(payload), "hex"), provided = Buffer.from(signature, "hex");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  try { const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { id: number; email: string; role: string; exp: number }; return data.exp > Date.now() ? data : null; } catch { return null; }
}
export async function clearSession() { (await cookies()).delete(cookieName); }
