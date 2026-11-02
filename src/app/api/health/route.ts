import { NextResponse } from "next/server";
import { getMysqlPool,getMongoDb } from "@/lib/db";
export async function GET(){const out:{mysql:string;mongodb:string}={mysql:"disconnected",mongodb:"disconnected"};try{await getMysqlPool().query("SELECT 1");out.mysql="connected";}catch{}try{await (await getMongoDb()).command({ping:1});out.mongodb="connected";}catch{}return NextResponse.json(out);}
