import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { assertTarget, TARGET } from "./db-config";
assertTarget();
const conn = await mysql.createConnection({ host: process.env.MYSQL_HOST || "127.0.0.1", port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: TARGET, multipleStatements: true });
try { const [rows] = await conn.query("SELECT DATABASE() db"); if ((rows as {db:string}[])[0]?.db !== TARGET) throw new Error("Connected database verification failed."); await conn.query(await readFile(new URL("./schema.sql", import.meta.url), "utf8")); console.log(`Schema applied to ${TARGET}.`); } finally { await conn.end(); }
