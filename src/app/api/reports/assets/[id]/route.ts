import { NextResponse } from "next/server";
import { z } from "zod";
import { getMysqlPool, getMongoDb } from "@/lib/db";
import { getSession } from "@/lib/session";

const idSchema = z.coerce.number().int().positive();
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: "Please sign in to view reports." }, { status: 401 });
  const parsed = idSchema.safeParse((await context.params).id);
  if (!parsed.success) return NextResponse.json({ error: "Invalid asset ID." }, { status: 400 });
  try {
    const assetId = parsed.data; const pool = getMysqlPool();
    const [assetRows] = await pool.execute("SELECT id,asset_name,ip_address,asset_type,criticality,description,created_at,operating_system FROM assets WHERE id=?", [assetId]);
    const asset = (assetRows as Record<string, unknown>[])[0];
    if (!asset) return NextResponse.json({ error: "Asset not found." }, { status: 404 });

    const [scanRows] = await pool.execute("SELECT s.id,s.scan_name,s.scan_type,s.scan_profile,s.status,s.started_at,s.completed_at,s.created_at,COUNT(DISTINCT f.id) finding_count,GROUP_CONCAT(DISTINCT CONCAT(v.cve_id,': ',v.vulnerability_name) SEPARATOR '; ') finding_summary FROM scans s LEFT JOIN scan_findings f ON f.scan_id=s.id LEFT JOIN vulnerabilities v ON v.id=f.vulnerability_id WHERE s.asset_id=? GROUP BY s.id ORDER BY s.created_at DESC", [assetId]);
    const scans = scanRows as Record<string, unknown>[];
    const mongo = await getMongoDb();
    const scanIds = scans.map((s) => Number(s.id));
    const liveReports = scanIds.length ? await mongo.collection("scan_reports").find({ scan_id: { $in: scanIds } }).toArray() : [];
    const oldEvidence = scanIds.length ? await mongo.collection("scan_evidence").find({ scan_id: { $in: scanIds } }).toArray() : [];
    const enrichedScans = scans.map((scan) => {
      const id = Number(scan.id);
      const live = liveReports.find((r) => Number(r.scan_id) === id);
      const evidence = oldEvidence.filter((r) => Number(r.scan_id) === id);
      const checks = live?.report?.checks || [];
      return { ...scan, report_type: String(scan.scan_type).toLowerCase().includes("live") ? "Live HTTP" : "Simulated", live_report: live?.report || null, evidence, finding_count: Number(scan.finding_count || 0) + checks.length, finding_summary: [scan.finding_summary, ...checks.map((c: { title: string }) => c.title)].filter(Boolean).join("; ") || "No findings recorded" };
    });

    const [vulnRows] = await pool.execute("SELECT v.id vulnerability_id,v.cve_id,v.vulnerability_name,v.severity,v.description,av.association_status,av.notes,av.created_at linked_at FROM asset_vulnerabilities av JOIN vulnerabilities v ON v.id=av.vulnerability_id WHERE av.asset_id=? ORDER BY FIELD(v.severity,'Critical','High','Medium','Low'),v.cve_id", [assetId]);
    const [findingRows] = await pool.execute("SELECT f.id finding_id,f.scan_id,f.vulnerability_id,f.severity,f.finding_status,f.evidence_summary,f.is_simulated,f.created_at,v.cve_id,v.vulnerability_name FROM scan_findings f JOIN vulnerabilities v ON v.id=f.vulnerability_id WHERE f.asset_id=? ORDER BY f.created_at DESC", [assetId]);
    const vulns = (vulnRows as Record<string, unknown>[]).map((v) => ({ ...v, cvss_score: null, findings: (findingRows as Record<string, unknown>[]).filter((f) => Number(f.vulnerability_id) === Number(v.vulnerability_id)) }));

    const [corrRows] = await pool.execute("SELECT c.id correlation_id,c.vulnerability_id,c.scan_finding_id,c.threat_report_reference,c.match_type,c.match_reason,c.risk_score,c.risk_level,c.created_at,v.cve_id FROM correlation_results c JOIN vulnerabilities v ON v.id=c.vulnerability_id WHERE c.asset_id=? ORDER BY c.created_at DESC", [assetId]);
    const correlations = corrRows as Record<string, unknown>[];
    const cves = [...new Set(correlations.map((c) => String(c.cve_id)))];
    const threatReports = cves.length ? await mongo.collection("threat_reports").find({ cve_ids: { $in: cves } }).toArray() : [];
    const detailedCorrelations = correlations.map((c) => ({ ...c, match_confidence: String(c.match_type).toLowerCase().includes("exact") ? 1 : null, threat_report: threatReports.find((r) => String(r.report_id || r._id) === String(c.threat_report_reference)) || null }));

    const [alertRows] = await pool.execute("SELECT a.id alert_id,a.title,a.severity,a.risk_score,a.status,a.created_at,v.cve_id FROM alerts a JOIN vulnerabilities v ON v.id=a.vulnerability_id WHERE a.asset_id=? ORDER BY a.created_at DESC", [assetId]);
    const [ticketRows] = await pool.execute("SELECT t.id ticket_id,t.title,t.priority,t.status,t.created_at,t.updated_at,t.assigned_to,u.name assigned_analyst FROM tickets t JOIN alerts a ON a.id=t.alert_id LEFT JOIN users u ON u.id=t.assigned_to WHERE a.asset_id=? ORDER BY t.created_at DESC", [assetId]);
    const ticketIds = (ticketRows as { ticket_id: number }[]).map((t) => t.ticket_id);
    const notes = ticketIds.length ? await mongo.collection("investigation_notes").find({ ticket_id: { $in: ticketIds } }).sort({ created_at: -1 }).toArray() : [];
    const tickets = (ticketRows as Record<string, unknown>[]).map((t) => ({ ...t, notes: notes.filter((n) => Number(n.ticket_id) === Number(t.ticket_id)).map((n) => ({ note: n.note, created_at: n.created_at })) }));

    const [riskRows] = await pool.execute("SELECT max_risk FROM vw_asset_risk_summary WHERE id=?", [assetId]);
    const alertCount = (alertRows as unknown[]).length;
    return NextResponse.json({ asset: { ...asset, environment: null }, scans: enrichedScans, vulnerabilities: vulns, findings: findingRows, correlations: detailedCorrelations, alerts: alertRows, tickets, risk: { overall_score: Number((riskRows as { max_risk: number }[])[0]?.max_risk || 0), criticality: asset.criticality, total_alerts: alertCount, total_vulnerabilities: vulns.length, total_findings: (findingRows as unknown[]).length + enrichedScans.reduce((n, s) => n + (s.report_type === "Live HTTP" ? Number(s.finding_count) : 0), 0), total_scans: scans.length, open_tickets: tickets.filter((t) => ["Open", "In Progress"].includes(String(t.status))).length, resolved_tickets: tickets.filter((t) => ["Resolved", "Closed"].includes(String(t.status))).length } });
  } catch {
    return NextResponse.json({ error: "Asset report data could not be loaded." }, { status: 503 });
  }
}
