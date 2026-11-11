import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables from backend directory or parent
dotenv.config();
if (!process.env.DATABASE_URL) {
  const parentEnv = path.resolve(process.cwd(), "..", ".env");
  if (fs.existsSync(parentEnv)) {
    dotenv.config({ path: parentEnv });
  }
}

const currentDir = typeof __dirname !== "undefined"
  ? __dirname
  : process.cwd();

// Find data directory priority: backend/data, process.cwd()/data, ../data
const candidateDataDirs = [
  path.resolve(currentDir, "data"),
  path.resolve(currentDir, "..", "data"),
  path.resolve(process.cwd(), "data"),
  path.resolve(process.cwd(), "..", "data")
];
export const DATA_DIR = candidateDataDirs.find(d => fs.existsSync(d)) || path.resolve(process.cwd(), "data");

export const ROOT_DIR = path.resolve(DATA_DIR, "..");
export const RULES_DIR = fs.existsSync(path.resolve(ROOT_DIR, "ml", "rules"))
  ? path.resolve(ROOT_DIR, "ml", "rules")
  : path.resolve(process.cwd(), "..", "ml", "rules");

export const RUNTIME_STATE_PATH = path.join(DATA_DIR, "runtime-state.json");
export const AUDIT_LOG_PATH = path.join(DATA_DIR, "session-audit.jsonl");
export const DB_PATH = path.join(DATA_DIR, "parliament.sqlite");

export const PORT = Number(process.env.PORT || 3000);
export const JWT_SECRET = process.env.JWT_SECRET || "sansad-parlisense-auth-secret-key-2026";
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
export const DATABASE_URL = process.env.DATABASE_URL || "";
export const FRONTEND_URL = process.env.FRONTEND_URL || "";


export function loadJSON<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`[CONFIG] Error reading ${filePath}:`, err);
  }
  return fallback;
}

export const rulesConfig = loadJSON<any>(path.join(RULES_DIR, "rules.json"), {
  thresholds: {
    speaking_time_warning_ratio: 0.85,
    speaking_time_max_default_seconds: 300,
    noise_normal_db: 60,
    noise_moderate_db: 75,
    noise_high_db: 82,
    agenda_similarity_min: 0.45,
    agenda_similarity_critical_offtopic: 0.25,
    emotion_heated_confidence_threshold: 0.70,
    offensive_confidence_threshold: 0.60
  }
});

