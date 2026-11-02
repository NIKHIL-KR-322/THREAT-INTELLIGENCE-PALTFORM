import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getMysqlPool } from "@/lib/db";
import { setSession } from "@/lib/session";
const schema=z.object({email:z.string().email(),password:z.string().min(1)});
export async function POST(req:Request){
  let body: z.infer<typeof schema>;
  try { body=schema.parse(await req.json()); }
  catch { return NextResponse.json({error:"Enter a valid email and password."},{status:400}); }
  try {
    const [rows]=await getMysqlPool().execute("SELECT id,email,password_hash,role,is_active FROM users WHERE email=? LIMIT 1",[body.email]);
    const user=(rows as {id:number;email:string;password_hash:string;role:string;is_active:number}[])[0];
    if(!user||!user.is_active||!(await bcrypt.compare(body.password,user.password_hash)))return NextResponse.json({error:"Invalid email or password."},{status:401});
    await setSession({id:user.id,email:user.email,role:user.role});
    return NextResponse.json({ok:true,role:user.role});
  } catch(e) {
    const code=(e as NodeJS.ErrnoException).code;
    if(code==="ER_ACCESS_DENIED_ERROR") return NextResponse.json({error:"MySQL rejected the configured credentials. Set MYSQL_PASSWORD in the project .env file to your MySQL root password, save it, then restart the app."},{status:503});
    if(code==="ER_BAD_DB_ERROR") return NextResponse.json({error:"The project database is not set up yet. Stop the app and run npm run db:create, npm run db:migrate, then npm run db:seed."},{status:503});
    if(code==="ECONNREFUSED") return NextResponse.json({error:"Cannot reach MySQL. Start the MySQL Server service, then try again."},{status:503});
    return NextResponse.json({error:"Login is temporarily unavailable. Check the MySQL connection and try again."},{status:503});
  }
}
