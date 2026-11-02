import { NextResponse } from "next/server";
import { getMysqlPool } from "@/lib/db";
import { assetSchema } from "@/lib/validation";
import { getSession } from "@/lib/session";
export async function GET(){try{const [rows]=await getMysqlPool().query("SELECT * FROM assets ORDER BY created_at DESC");return NextResponse.json(rows);}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Database error"},{status:503});}}
export async function POST(req:Request){try{const session=await getSession();if(!session)return NextResponse.json({error:"Login required."},{status:401});const data=assetSchema.parse(await req.json());const [result]=await getMysqlPool().execute("INSERT INTO assets(asset_name,asset_type,ip_address,criticality,operating_system,description) VALUES(?,?,?,?,?,?)",[data.asset_name,data.asset_type,data.ip_address,data.criticality,data.operating_system||null,data.description||null]);return NextResponse.json({id:(result as {insertId:number}).insertId,...data},{status:201});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Invalid asset."},{status:400});}}
