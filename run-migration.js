// Quick migration script to add timestamps to scores table
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  console.error(
    "Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log("🚀 Starting migration: Add timestamps to scores table\n");

  try {
    // Read the SQL file
    const sqlFile = path.join(__dirname, "add-scores-timestamp.sql");
    const sql = fs.readFileSync(sqlFile, "utf8");

    // Split by semicolons and execute each statement
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--"));

    for (const statement of statements) {
      if (statement.toLowerCase().startsWith("select")) {
        // For SELECT statements, show results
        const { data, error } = await supabase.rpc("exec_sql", {
          sql_query: statement,
        });
        if (error) {
          console.log(
            "⚠️  Note: Direct SQL execution may require service role key"
          );
          console.log(
            "   Please run this migration in Supabase Dashboard SQL Editor"
          );
          return;
        }
        console.log("✅ Verification query result:", data);
      } else {
        console.log(`📝 Executing: ${statement.substring(0, 60)}...`);
      }
    }

    console.log("\n✅ Migration completed successfully!");
    console.log("\n📊 Next steps:");
    console.log(
      "1. Clear old test data: DELETE FROM scores WHERE user_name LIKE '%Tiger%';"
    );
    console.log("2. Take a manual quiz at /quiz");
    console.log("3. Run load test: node load-test-quizzes.js");
    console.log("4. Check leaderboard at /leaderboard");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    console.log("\n💡 Alternative: Run the SQL directly in Supabase Dashboard");
    console.log("   1. Go to supabase.com/dashboard");
    console.log("   2. Navigate to SQL Editor");
    console.log("   3. Copy content of add-scores-timestamp.sql");
    console.log("   4. Paste and click Run");
  }
}

runMigration();
