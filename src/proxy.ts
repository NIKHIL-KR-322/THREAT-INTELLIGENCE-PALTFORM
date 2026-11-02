import { createHmac,timingSafeEqual } from "node:crypto";
import { NextRequest,NextResponse } from "next/server";

export function proxy(request:NextRequest){
  const path=request.nextUrl.pathname;
  if(path==="/login"||path==="/api/auth/login"||path.startsWith("/_next/")||path==="/favicon.ico")return NextResponse.next();
  const secret=process.env.SESSION_SECRET;
  const raw=request.cookies.get("tip_session")?.value;
  let role="";let valid=false;
  if(secret&&secret.length>=32&&raw){const [payload,signature]=raw.split(".");if(payload&&signature){const expected=Buffer.from(createHmac("sha256",secret).update(payload).digest("hex"),"hex");const provided=Buffer.from(signature,"hex");if(expected.length===provided.length&&timingSafeEqual(expected,provided)){try{const data=JSON.parse(Buffer.from(payload,"base64url").toString()) as {exp:number;role:string};valid=data.exp>Date.now();role=data.role;}catch{valid=false;}}}}
  if(valid&&path.startsWith("/administration")&&role!=="ADMIN")return NextResponse.redirect(new URL("/",request.url));
  if(valid)return NextResponse.next();
  if(path.startsWith("/api/"))return NextResponse.json({error:"Please sign in first."},{status:401});
  return NextResponse.redirect(new URL("/login",request.url));
}
export const config={matcher:["/((?!.*\\..*).*)","/api/:path*"]};
