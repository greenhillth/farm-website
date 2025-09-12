import Database from 'better-sqlite3';
import { resolve } from 'path';

// Use the same SQLite database as the weather service so both can run
// inside the same container. Prefer the WEATHER_DB_PATH env variable but
// fall back to DB_PATH or a sensible default.
const dbPath = resolve(process.env.WEATHER_DB_PATH || process.env.DB_PATH || 'weather.db');
const db = new Database(dbPath);

// Ensure paddock table exists. Feel free to extend schema elsewhere as needed.
db.exec(`CREATE TABLE IF NOT EXISTS paddock (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  farm TEXT,
  year TEXT,
  OM REAL,
  P1 REAL,
  K REAL,
  MG REAL,
  CA REAL,
  PH REAL,
  geometry TEXT
)`);

export default db;
