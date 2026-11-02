import { NextResponse } from "next/server";
import { getMysqlPool } from "@/lib/db";
import { getSession } from "@/lib/session";
export async function GET(){if((await getSession())?.role!=="ADMIN")return NextResponse.json({error:"Administrator access required."},{status:403});try{const [rows]=await getMysqlPool().query("SELECT h.id,h.alert_id,h.old_status,h.new_status,h.changed_at,u.name changed_by FROM alert_status_audit h LEFT JOIN users u ON u.id=h.changed_by ORDER BY h.changed_at DESC LIMIT 200");return NextResponse.json(rows);}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Could not load audit history."},{status:503});}}
