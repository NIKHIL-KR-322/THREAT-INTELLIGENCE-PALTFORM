import { NextResponse } from "next/server";
import { isIP } from "node:net";
import { z } from "zod";
import { getMysqlPool, getMongoDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
const input = z.object({ asset_id: z.coerce.number().int().positive(), scan_name: z.string().min(2).max(160), scan_profile: z.enum(["Basic Asset Assessment", "Web Server Demo Scan", "Vulnerability Assessment Demo"]) });
type Check = { id: string; title: string; severity: "Low" | "Medium" | "High"; detail: string; recommendation: string };

function isPrivateTarget(ip: string) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
  }
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:") || normalized.startsWith("::ffff:127.");
}

async function inspectWeb(ip: string) {
  const url = new URL(`http://${ip.includes(":") ? `[${ip}]` : ip}:4173/`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, { method: "GET", redirect: "manual", signal: controller.signal, headers: { "User-Agent": "ThreatIntel-Classroom-Scanner/1.0" } });
    let body = "";
    if (response.body) {
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let bytes = 0;
      while (bytes < 256_000) { const part = await reader.read(); if (part.done) break; const chunk = part.value.subarray(0, 256_000 - bytes); bytes += chunk.byteLength; body += decoder.decode(chunk, { stream: true }); if (chunk.byteLength !== part.value.byteLength) break; }
      await reader.cancel().catch(() => undefined);
    }
    const headers = response.headers;
    const findings: Check[] = [];
    const hsts = headers.get("strict-transport-security");
    if (!hsts) findings.push({ id: "missing-hsts", title: "HTTP Strict Transport Security is missing", severity: "Medium", detail: "The response did not include a Strict-Transport-Security header. This HTTP-only check cannot assess HTTPS behavior.", recommendation: "Serve the site over HTTPS and configure HSTS after verifying all required subdomains support HTTPS." });
    if (!headers.get("content-security-policy")) findings.push({ id: "missing-csp", title: "Content Security Policy is missing", severity: "Medium", detail: "No Content-Security-Policy header was present on the homepage response.", recommendation: "Define a restrictive Content-Security-Policy and test it in report-only mode before enforcement." });
    if (!headers.get("x-content-type-options")) findings.push({ id: "missing-nosniff", title: "X-Content-Type-Options is missing", severity: "Low", detail: "The response did not include X-Content-Type-Options: nosniff.", recommendation: "Set X-Content-Type-Options: nosniff to prevent browser MIME-type sniffing." });
    if (!headers.get("x-frame-options") && !/frame-ancestors\s/i.test(headers.get("content-security-policy") || "")) findings.push({ id: "missing-framing-protection", title: "Clickjacking protection is not evident", severity: "Low", detail: "Neither X-Frame-Options nor a CSP frame-ancestors directive was observed.", recommendation: "Set a suitable frame-ancestors CSP directive (preferred) or X-Frame-Options." });
    const server = headers.get("server");
    if (server && /\d/.test(server)) findings.push({ id: "server-version-disclosed", title: "Server version appears in the Server header", severity: "Low", detail: `The response disclosed: ${server.slice(0, 120)}.`, recommendation: "Remove or minimize version details in server response headers." });
    const cookies = headers.getSetCookie();
    for (const cookie of cookies) {
      const name = cookie.split("=", 1)[0] || "cookie";
      if (!/;\s*httponly/i.test(cookie)) findings.push({ id: "cookie-no-httponly", title: `Cookie ${name} lacks HttpOnly`, severity: "Low", detail: "A Set-Cookie response did not include the HttpOnly attribute.", recommendation: "Set HttpOnly on session cookies that do not need JavaScript access." });
      if (!/;\s*samesite=/i.test(cookie)) findings.push({ id: "cookie-no-samesite", title: `Cookie ${name} lacks SameSite`, severity: "Low", detail: "A Set-Cookie response did not include the SameSite attribute.", recommendation: "Set an appropriate SameSite policy, commonly Lax for session cookies." });
    }
    if (/Index of \/|Directory listing for/i.test(body)) findings.push({ id: "directory-listing", title: "Possible directory listing on homepage", severity: "Medium", detail: "The response body resembles a directory listing. This is a heuristic and needs manual confirmation.", recommendation: "Disable directory indexing and ensure the web root does not expose unintended files." });
    return { target: url.origin, http_status: response.status, checked_at: new Date(), checks: findings, summary: { issues: findings.length, high: findings.filter((f) => f.severity === "High").length, medium: findings.filter((f) => f.severity === "Medium").length, low: findings.filter((f) => f.severity === "Low").length }, limitations: "Read-only GET of / on the registered private IP, port 4173. No port discovery, authentication testing, exploit attempts, or CVE verification. Findings are header/content observations and require review." };
  } finally { clearTimeout(timeout); }
}

export async function GET() {
  try {
    const pool = getMysqlPool();
    const [rows] = await pool.query("SELECT s.*,a.asset_name,a.ip_address FROM scans s JOIN assets a ON s.asset_id=a.id ORDER BY s.created_at DESC LIMIT 50");
    const scans = rows as { id: number; [key: string]: unknown }[];
    const db = await getMongoDb();
    const reports = await db.collection("scan_reports").find({ scan_id: { $in: scans.map((s) => s.id) } }).toArray();
    return NextResponse.json(scans.map((s) => ({ ...s, report: reports.find((r) => r.scan_id === s.id) || null })));
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Database unavailable" }, { status: 503 }); }
}

export async function POST(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Login required." }, { status: 401 });
  let conn;
  try {
    const d = input.parse(await req.json());
    const pool = getMysqlPool(); conn = await pool.getConnection();
    const [assets] = await conn.execute("SELECT id,asset_name,ip_address FROM assets WHERE id=?", [d.asset_id]);
    const asset = (assets as { id: number; asset_name: string; ip_address: string }[])[0];
    if (!asset) throw new Error("Selected asset does not exist.");
    if (!isPrivateTarget(asset.ip_address)) throw new Error("For safety, live checks are limited to registered private or loopback IP addresses. Use the included local demo server at 127.0.0.1.");
    const report = await inspectWeb(asset.ip_address);
    const [scanResult] = await conn.execute("INSERT INTO scans(asset_id,scan_name,scan_profile,scan_type,status,started_at,completed_at,created_by) VALUES(?,?,?,'Live Web Configuration Scan','Completed',NOW(),NOW(),?)", [d.asset_id, d.scan_name, d.scan_profile, (await getSession())!.id]);
    const scanId = (scanResult as { insertId: number }).insertId;
    const db = await getMongoDb();
    await db.collection("scan_reports").insertOne({ scan_id: scanId, asset_id: d.asset_id, asset_name: asset.asset_name, is_simulated: false, report });
    return NextResponse.json({ scan_id: scanId, status: "Completed", report }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Scan failed." }, { status: 400 }); }
  finally { conn?.release(); }
}
