import mysql, { type Pool } from "mysql2/promise";
import { MongoClient, type Db } from "mongodb";

const TARGET_DB = "threat_intel_platform_v2";
type DatabaseGlobals = typeof globalThis & {
  threatIntelMysqlPool?: Pool;
  threatIntelMongoClient?: MongoClient;
};
const databaseGlobals = globalThis as DatabaseGlobals;

export function getMysqlPool() {
  if (process.env.MYSQL_DATABASE !== TARGET_DB) throw new Error(`MYSQL_DATABASE must be ${TARGET_DB}.`);
  databaseGlobals.threatIntelMysqlPool ??= mysql.createPool({ host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: TARGET_DB, waitForConnections: true, connectionLimit: 10, namedPlaceholders: true });
  return databaseGlobals.threatIntelMysqlPool;
}
export async function getMongoDb(): Promise<Db> {
  if (process.env.MONGODB_DATABASE !== TARGET_DB) throw new Error(`MONGODB_DATABASE must be ${TARGET_DB}.`);
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  databaseGlobals.threatIntelMongoClient ??= new MongoClient(process.env.MONGODB_URI);
  await databaseGlobals.threatIntelMongoClient.connect();
  return databaseGlobals.threatIntelMongoClient.db(TARGET_DB);
}
