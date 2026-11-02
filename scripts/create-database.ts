import { rootConnection, TARGET } from "./db-config";
const conn = await rootConnection();
try { await conn.query(`CREATE DATABASE IF NOT EXISTS \`${TARGET}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`); console.log(`Created/verified new database ${TARGET}.`); } finally { await conn.end(); }
