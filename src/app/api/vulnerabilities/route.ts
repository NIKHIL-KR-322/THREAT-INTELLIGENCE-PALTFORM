import { NextResponse } from "next/server";
import { getMysqlPool } from "@/lib/db";
import { vulnerabilitySchema } from "@/lib/validation";
import { getSession } from "@/lib/session";
export async function GET(){try{const [rows]=await getMysqlPool().query("SELECT * FROM vulnerabilities ORDER BY created_at DESC");return NextResponse.json(rows);}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Database error"},{status:503});}}
export async function POST(req:Request){try{if(!(await getSession()))return NextResponse.json({error:"Login required."},{status:401});const d=vulnerabilitySchema.parse(await req.json());const [r]=await getMysqlPool().execute("INSERT INTO vulnerabilities(cve_id,vulnerability_name,severity,description,published_date) VALUES(?,?,?,?,?)",[d.cve_id.toUpperCase(),d.vulnerability_name,d.severity,d.description,d.published_date||null]);return NextResponse.json({id:(r as {insertId:number}).insertId,...d},{status:201});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Invalid vulnerability."},{status:400});}}
