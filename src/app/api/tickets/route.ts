import { NextResponse } from "next/server";
import { z } from "zod";
import { getMysqlPool, getMongoDb } from "@/lib/db";
import { getSession } from "@/lib/session";

const schema = z.object({
  alert_id: z.coerce.number().int().positive().optional(),
  ticket_id: z.coerce.number().int().positive().optional(),
  title: z.string().min(2).max(180).optional(),
  description: z.string().max(3000).optional(),
  priority: z.enum(["Critical", "High", "Medium", "Low"]).optional(),
  status: z.enum(["Open", "In Progress", "Resolved", "Closed"]).optional(),
  assigned_to: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
  note: z.string().min(2).max(2000).optional(),
});

export async function GET() {
  try {
    const pool = getMysqlPool();
    const [rows] = await pool.query(
      "SELECT t.id ticket_id,t.title,t.description,t.priority,t.status,t.created_at,t.assigned_to,a.id alert_id,asst.asset_name,u.name assigned_analyst FROM tickets t JOIN alerts a ON a.id=t.alert_id JOIN assets asst ON asst.id=a.asset_id LEFT JOIN users u ON u.id=t.assigned_to ORDER BY t.created_at DESC",
    );
    const [assignees] = await pool.query(
      "SELECT id,name,email,role FROM users WHERE is_active=TRUE ORDER BY CASE WHEN role='ANALYST' THEN 0 ELSE 1 END,name",
    );
    const notes = await (await getMongoDb()).collection("investigation_notes")
      .find({ ticket_id: { $in: (rows as { ticket_id: number }[]).map((row) => row.ticket_id) } })
      .sort({ created_at: -1 }).toArray();
    const tickets = (rows as { ticket_id: number }[]).map((ticket) => ({
      ...ticket,
      notes: notes.filter((note: { ticket_id: number; note: string; created_at: Date }) => note.ticket_id === ticket.ticket_id)
        .map((note: { ticket_id: number; note: string; created_at: Date }) => ({ note: note.note, created_at: note.created_at })),
    }));
    return NextResponse.json({ tickets, assignees });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Database unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  try {
    const data = schema.parse(await req.json());
    if (data.ticket_id) {
      const pool = getMysqlPool();
      if (data.status) await pool.execute("UPDATE tickets SET status=? WHERE id=?", [data.status, data.ticket_id]);
      if (data.assigned_to !== undefined) {
        if (data.assigned_to !== null) {
          const [users] = await pool.execute("SELECT id FROM users WHERE id=? AND is_active=TRUE", [data.assigned_to]);
          if (!(users as { id: number }[]).length) {
            return NextResponse.json({ error: "Choose an active administrator or analyst." }, { status: 400 });
          }
        }
        await pool.execute("UPDATE tickets SET assigned_to=? WHERE id=?", [data.assigned_to, data.ticket_id]);
      }
      if (data.note) {
        await (await getMongoDb()).collection("investigation_notes").insertOne({
          ticket_id: data.ticket_id,
          alert_id: data.alert_id || null,
          note: data.note,
          author_id: session.id,
          created_at: new Date(),
        });
      }
      return NextResponse.json({ ok: true });
    }
    if (!data.alert_id || !data.title || !data.priority) {
      return NextResponse.json({ error: "Alert, title, and priority are required." }, { status: 400 });
    }
    const [result] = await getMysqlPool().execute(
      "INSERT INTO tickets(alert_id,title,description,priority,assigned_to) VALUES(?,?,?,?,?)",
      [data.alert_id, data.title, data.description || "", data.priority, session.id],
    );
    return NextResponse.json({ id: (result as { insertId: number }).insertId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save ticket." }, { status: 400 });
  }
}
