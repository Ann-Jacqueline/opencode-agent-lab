import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

// Resolve from the repository root so both `tsx watch` and the compiled
// `dist/src/index.js` entry point can find the schema.
const schemaPath = path.join(process.cwd(), "src", "db", "schema.sql");

if (config.databaseUrl !== ":memory:") {
  fs.mkdirSync(path.dirname(config.databaseUrl), { recursive: true });
}

export const db = new Database(config.databaseUrl);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(schemaPath, "utf8"));
