import "dotenv/config";
import mysql from "mysql2/promise";
export const TARGET = "threat_intel_platform_v2";
export function assertTarget() { if (process.env.MYSQL_DATABASE !== TARGET || process.env.MONGODB_DATABASE !== TARGET) throw new Error(`Safety stop: set MYSQL_DATABASE and MONGODB_DATABASE to ${TARGET}.`); }
export async function rootConnection() { assertTarget(); return mysql.createConnection({ host: process.env.MYSQL_HOST || "127.0.0.1", port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, multipleStatements: true }); }
