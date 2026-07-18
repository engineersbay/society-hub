import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const url =
  process.env.DATABASE_URL ??
  "mysql://societyhub:societyhub@127.0.0.1:3307/societyhub";

const pool = mysql.createPool(url);

export const db = drizzle(pool, { schema, mode: "default" });
export type Db = typeof db;
