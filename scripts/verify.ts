import "dotenv/config";
import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";
import { assertTarget, TARGET } from "./db-config";
assertTarget();
const sql=await mysql.createConnection({host:process.env.MYSQL_HOST||"127.0.0.1",port:Number(process.env.MYSQL_PORT||3306),user:process.env.MYSQL_USER,password:process.env.MYSQL_PASSWORD,database:TARGET}); const mongo=new MongoClient(process.env.MONGODB_URI!);
try { const [r]=await sql.query("SELECT DATABASE() db"); if((r as {db:string}[])[0]?.db!==TARGET) throw new Error("MySQL target mismatch"); console.log("MySQL:",TARGET); await mongo.connect(); console.log("MongoDB:",mongo.db(TARGET).databaseName); console.log("Tables:",(await sql.query("SHOW TABLES"))[0]); console.log("Threat reports:",await mongo.db(TARGET).collection("threat_reports").countDocuments()); } finally { await sql.end(); await mongo.close(); }
