import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
export async function GET(){const session=await getSession();return session?NextResponse.json({id:session.id,email:session.email,role:session.role}):NextResponse.json({error:"Please sign in first."},{status:401});}
