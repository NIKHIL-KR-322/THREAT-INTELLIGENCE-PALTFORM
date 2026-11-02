import "dotenv/config";
import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { assertTarget, TARGET } from "./db-config";

assertTarget();
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
const sql = await mysql.createConnection({ host: process.env.MYSQL_HOST || "127.0.0.1", port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: TARGET });
const mongo = new MongoClient(process.env.MONGODB_URI);

try {
  const [dbRow] = await sql.query("SELECT DATABASE() db");
  if ((dbRow as {db:string}[])[0]?.db !== TARGET) throw new Error("Wrong MySQL database; seeding stopped.");
  await mongo.connect();
  const mdb = mongo.db(TARGET);

  const users = [
    { name: "Demo Admin", email: "admin@demo.local", role: "ADMIN", password: "DemoAdmin!2026" },
    { name: "Demo Analyst", email: "analyst@demo.local", role: "ANALYST", password: "DemoAnalyst!2026" },
  ];
  for (const u of users) await sql.execute("INSERT IGNORE INTO users(name,email,password_hash,role) VALUES(?,?,?,?)", [u.name,u.email,await bcrypt.hash(u.password,12),u.role]);
  const [adminRows] = await sql.execute("SELECT id FROM users WHERE email='admin@demo.local'");
  const adminId = (adminRows as {id:number}[])[0].id;

  await sql.execute("INSERT IGNORE INTO assets(asset_name,asset_type,ip_address,criticality,operating_system,description) VALUES(?,?,?,?,?,?)", ["WEB-SERVER-01","Web Server","192.168.1.100","Critical","Ubuntu Linux","ABC Technologies demo web server."]);
  await sql.execute("INSERT IGNORE INTO vulnerabilities(cve_id,vulnerability_name,severity,description,published_date) VALUES(?,?,?,?,?)", ["CVE-2021-44228","Log4Shell","Critical","Academic simulated Log4j vulnerability record.","2021-12-10"]);
  const [assetRows] = await sql.execute("SELECT id FROM assets WHERE asset_name='WEB-SERVER-01'");
  const [vulnRows] = await sql.execute("SELECT id FROM vulnerabilities WHERE cve_id='CVE-2021-44228'");
  const assetId=(assetRows as {id:number}[])[0].id, vulnId=(vulnRows as {id:number}[])[0].id;
  await sql.execute("INSERT IGNORE INTO asset_vulnerabilities(asset_id,vulnerability_id,association_status,notes) VALUES(?,?,'Unverified','Demo link; scan evidence can update this status.')",[assetId,vulnId]);

  for (const name of ["threat_reports","threat_indicators","attack_techniques","intelligence_feeds","scan_evidence","investigation_notes"]) await mdb.createCollection(name).catch(()=>undefined);
  await mdb.collection("threat_reports").updateOne({report_id:"DEMO-LOG4SHELL-001"},{$setOnInsert:{report_id:"DEMO-LOG4SHELL-001",title:"Log4Shell Exploitation Activity",summary:"Sample academic threat report.",description:"Simulated intelligence describing exploitation activity involving vulnerable Log4j applications.",category:"Vulnerability Exploitation",cve_ids:["CVE-2021-44228"],source:"Demo Intelligence Feed",published_at:new Date("2021-12-10"),is_demo:true,created_at:new Date()}},{upsert:true});
  await mdb.collection("threat_indicators").updateOne({type:"hostname",value:"log4shell-demo.invalid"},{$setOnInsert:{type:"hostname",value:"log4shell-demo.invalid",threat_name:"Academic Log4Shell Demo",confidence:30,description:"Reserved example indicator for classroom demonstration only.",tags:["demo","simulated"],created_at:new Date()}},{upsert:true});
  await mdb.collection("attack_techniques").updateOne({technique_id:"T1190-DEMO"},{$setOnInsert:{technique_id:"T1190-DEMO",name:"Exploit Public-Facing Application (Demo)",description:"Academic reference record; not a live detection.",is_demo:true,created_at:new Date()}},{upsert:true});
  await mdb.collection("intelligence_feeds").updateOne({feed_id:"FEED-DEMO"},{$setOnInsert:{feed_id:"FEED-DEMO",name:"Demo Intelligence Feed",source_type:"seeded_sample",is_active:false,last_checked_at:null,created_at:new Date()}},{upsert:true});

  const [scanRows] = await sql.execute("SELECT id FROM scans WHERE asset_id=? AND scan_name='WEB-SERVER-01 Demo Scan' ORDER BY id LIMIT 1",[assetId]);
  let scanId=(scanRows as {id:number}[])[0]?.id;
  if (!scanId) { const [r]=await sql.execute("INSERT INTO scans(asset_id,scan_name,scan_profile,scan_type,status,started_at,completed_at,created_by) VALUES(?,?,'Web Server Demo Scan','Simulated Vulnerability Scan','Completed',NOW(),NOW(),?)",[assetId,"WEB-SERVER-01 Demo Scan",adminId]); scanId=(r as {insertId:number}).insertId; }
  await sql.execute("INSERT IGNORE INTO scan_findings(scan_id,asset_id,vulnerability_id,severity,finding_status,evidence_summary,is_simulated) VALUES(?,?,?,'Critical','Open',?,TRUE)",[scanId,assetId,vulnId,"SIMULATED: deterministic demo evidence for CVE-2021-44228. No network scanning was performed."]);
  const [findingRows] = await sql.execute("SELECT id FROM scan_findings WHERE scan_id=? AND vulnerability_id=?",[scanId,vulnId]);
  const findingId=(findingRows as {id:number}[])[0].id;
  await sql.execute("UPDATE asset_vulnerabilities SET association_status='Confirmed',notes='Confirmed by labelled simulated demonstration evidence.' WHERE asset_id=? AND vulnerability_id=?",[assetId,vulnId]);
  await mdb.collection("scan_evidence").updateOne({scan_id:scanId,cve_id:"CVE-2021-44228"},{$setOnInsert:{scan_id:scanId,asset_id:assetId,vulnerability_id:vulnId,cve_id:"CVE-2021-44228",is_simulated:true,evidence_source:"Web Server Demo Scan",evidence_summary:"Simulated demonstration evidence; no network hosts were scanned.",created_at:new Date()}},{upsert:true});

  const [corrRows] = await sql.execute("SELECT id FROM correlation_results WHERE scan_finding_id=? AND threat_report_reference='DEMO-LOG4SHELL-001'",[findingId]);
  let corrId=(corrRows as {id:number}[])[0]?.id;
  if (!corrId) { const [r]=await sql.execute("INSERT INTO correlation_results(asset_id,vulnerability_id,scan_finding_id,threat_report_reference,match_type,match_reason,risk_score,risk_level) VALUES(?,?,?,'DEMO-LOG4SHELL-001','Exact CVE Match','The CVE identifier in the simulated scan finding matches the CVE identifier in the sample threat report.',93.33,'Critical')",[assetId,vulnId,findingId]); corrId=(r as {insertId:number}).insertId; }
  await sql.execute("INSERT IGNORE INTO alerts(correlation_id,asset_id,vulnerability_id,title,description,severity,risk_score) VALUES(?,?,?,'CVE-2021-44228 demo match on WEB-SERVER-01','Simulated scan finding matched the seeded sample threat report. This is demonstration data.','Critical',93.33)",[corrId,assetId,vulnId]);
  const [alertRows] = await sql.execute("SELECT id FROM alerts WHERE correlation_id=?",[corrId]);
  const alertId=(alertRows as {id:number}[])[0].id;
  const [ticketRows] = await sql.execute("SELECT id FROM tickets WHERE alert_id=? LIMIT 1",[alertId]);
  let ticketId=(ticketRows as {id:number}[])[0]?.id;
  if (!ticketId) {const [r]=await sql.execute("INSERT INTO tickets(alert_id,title,description,priority,assigned_to) VALUES(?,?,?,?,?)",[alertId,"Investigate Log4Shell demo finding","Review the labelled simulated finding on WEB-SERVER-01.","Critical",adminId]);ticketId=(r as {insertId:number}).insertId;}
  await mdb.collection("investigation_notes").updateOne({note_id:"DEMO-NOTE-001"},{$setOnInsert:{note_id:"DEMO-NOTE-001",ticket_id:ticketId,alert_id:alertId,note:"Sample analyst note: confirm this is a simulated record and document the follow-up steps.",author_id:adminId,created_at:new Date()}},{upsert:true});

  await mdb.collection("threat_reports").createIndex({title:"text",summary:"text",description:"text"});
  await mdb.collection("threat_reports").createIndex({cve_ids:1});
  await mdb.collection("threat_indicators").createIndex({type:1,value:1},{unique:true});
  await mdb.collection("scan_evidence").createIndex({scan_id:1,asset_id:1});
  await mdb.collection("investigation_notes").createIndex({ticket_id:1,created_at:-1});
  console.log(`Idempotent demo data ready in ${TARGET}. Scan and all linked records are explicitly labelled simulated/sample.`);
} finally { await sql.end(); await mongo.close(); }
