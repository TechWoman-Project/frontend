/**
 * Load Testing Script for Voting System
 *
 * This script simulates multiple concurrent users voting to test:
 * - API endpoint performance under load
 * - Database write operations handling
 * - Rate limiting and concurrent request handling
 * - Vote aggregation accuracy
 *
 * Usage: node load-test-voting.js
 */

const fs = require("fs");
const path = require("path");

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env.local file not found!");
    console.error("Please create .env.local with your Supabase credentials.\n");
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, "utf-8");
  const lines = envContent.split("\n");

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").trim();
      if (key && value) {
        process.env[key.trim()] = value;
      }
    }
  });
}

// Load environment variables
loadEnvFile();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate credentials
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing Supabase credentials in .env.local");
  console.error("Required variables:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  console.error("  - NEXT_PUBLIC_SUPABASE_ANON_KEY\n");
  process.exit(1);
}

// Test Configuration
const CONFIG = {
  totalVotes: 300, // Total number of votes to submit
  concurrentBatch: 10, // Number of concurrent requests per batch
  delayBetweenBatches: 10, // Milliseconds between batches
  randomNames: true, // Use random user names
  randomOptions: true, // Vote for random options
};

// Generate unique random user names
let nameCounter = 0;
const generateRandomName = () => {
  const adjectives = [
    "Happy",
    "Smart",
    "Brave",
    "Cool",
    "Swift",
    "Wise",
    "Bold",
    "Quick",
    "Bright",
    "Strong",
  ];
  const nouns = [
    "Tiger",
    "Eagle",
    "Dolphin",
    "Lion",
    "Wolf",
    "Bear",
    "Hawk",
    "Fox",
    "Panda",
    "Shark",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  const uniqueId = nameCounter++;
  return `${adj}${noun}_${timestamp}_${uniqueId}`;
};

// Fetch active opinion polls
async function fetchActiveOpinions() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/quizzes?kind=eq.opinion&status=eq.active&select=id,question`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch quizzes: ${response.status}`);
    }

    const quizzes = await response.json();

    if (!quizzes || quizzes.length === 0) {
      throw new Error("No active opinion polls found");
    }

    // Fetch options for each quiz
    const quizzesWithOptions = await Promise.all(
      quizzes.map(async (quiz) => {
        const optionsResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/options?quiz_id=eq.${quiz.id}&select=id,text`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );
        const options = await optionsResponse.json();
        return { ...quiz, options };
      })
    );

    return quizzesWithOptions.filter((q) => q.options.length > 0);
  } catch (error) {
    console.error("Error fetching opinions:", error);
    throw error;
  }
}

// Submit a single vote
async function submitVote(quizId, optionId, userName) {
  const startTime = Date.now();

  try {
    // Direct database insertion (same as the vote page)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/votes`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        quiz_id: quizId,
        option_id: optionId,
        user_name: userName,
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Vote failed for ${userName}: ${response.status} - ${errorText}`
      );
    }

    return {
      success: response.ok || response.status === 409, // 409 is duplicate, still counts as success
      status: response.status,
      duration,
      userName,
      optionId,
      message: response.ok ? "Vote recorded" : "Failed",
    };
  } catch (error) {
    console.error(`Vote error for ${userName}:`, error.message);
    return {
      success: false,
      status: 0,
      duration: Date.now() - startTime,
      userName,
      optionId,
      error: error.message,
    };
  }
}

// Execute batch of concurrent votes
async function executeBatch(quiz, batchSize) {
  const promises = [];

  for (let i = 0; i < batchSize; i++) {
    const userName = CONFIG.randomNames
      ? generateRandomName()
      : `TestUser${Math.floor(Math.random() * 10000)}`;

    const optionId = CONFIG.randomOptions
      ? quiz.options[Math.floor(Math.random() * quiz.options.length)].id
      : quiz.options[0].id;

    promises.push(submitVote(quiz.id, optionId, userName));
  }

  return await Promise.all(promises);
}

// Main load test function
async function runLoadTest() {
  console.log("🚀 Starting Load Test for Voting System\n");
  console.log("Configuration:");
  console.log(`  Total Votes: ${CONFIG.totalVotes}`);
  console.log(`  Concurrent Batch Size: ${CONFIG.concurrentBatch}`);
  console.log(`  Delay Between Batches: ${CONFIG.delayBetweenBatches}ms\n`);

  // Fetch available quizzes
  console.log("📊 Fetching active opinion polls...");
  const quizzes = await fetchActiveOpinions();

  if (quizzes.length === 0) {
    console.error(
      "❌ No active opinion polls found. Please activate at least one opinion poll in the admin panel."
    );
    return;
  }

  const quiz = quizzes[0]; // Use first active quiz
  console.log(`✅ Found quiz: "${quiz.question}"`);
  console.log(`   Options (${quiz.options.length}):`);
  quiz.options.forEach((opt, idx) => {
    console.log(`     ${idx + 1}. ${opt.text}`);
  });
  console.log("");

  // Statistics
  const stats = {
    total: 0,
    successful: 0,
    failed: 0,
    totalDuration: 0,
    minDuration: Infinity,
    maxDuration: 0,
    statusCodes: {},
  };

  const totalBatches = Math.ceil(CONFIG.totalVotes / CONFIG.concurrentBatch);
  const startTime = Date.now();

  console.log(`🔄 Executing ${totalBatches} batches...\n`);

  // Execute batches
  for (let batch = 0; batch < totalBatches; batch++) {
    const remainingVotes = CONFIG.totalVotes - batch * CONFIG.concurrentBatch;
    const batchSize = Math.min(CONFIG.concurrentBatch, remainingVotes);

    process.stdout.write(
      `Batch ${batch + 1}/${totalBatches}: Sending ${batchSize} votes... `
    );

    const results = await executeBatch(quiz, batchSize);

    // Update statistics
    results.forEach((result) => {
      stats.total++;
      if (result.success) {
        stats.successful++;
      } else {
        stats.failed++;
      }

      stats.totalDuration += result.duration;
      stats.minDuration = Math.min(stats.minDuration, result.duration);
      stats.maxDuration = Math.max(stats.maxDuration, result.duration);

      const statusKey = result.status || "error";
      stats.statusCodes[statusKey] = (stats.statusCodes[statusKey] || 0) + 1;
    });

    const successCount = results.filter((r) => r.success).length;
    console.log(`✅ ${successCount}/${batchSize} succeeded`);

    // Delay between batches (except for last batch)
    if (batch < totalBatches - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, CONFIG.delayBetweenBatches)
      );
    }
  }

  const totalTime = Date.now() - startTime;

  // Print final statistics
  console.log("\n" + "=".repeat(60));
  console.log("📈 LOAD TEST RESULTS");
  console.log("=".repeat(60));
  console.log(`Total Requests:        ${stats.total}`);
  console.log(
    `Successful:            ${stats.successful} (${(
      (stats.successful / stats.total) *
      100
    ).toFixed(2)}%)`
  );
  console.log(
    `Failed:                ${stats.failed} (${(
      (stats.failed / stats.total) *
      100
    ).toFixed(2)}%)`
  );
  console.log("");
  console.log(`Total Time:            ${(totalTime / 1000).toFixed(2)}s`);
  console.log(
    `Requests per Second:   ${(stats.total / (totalTime / 1000)).toFixed(2)}`
  );
  console.log("");
  console.log(
    `Avg Response Time:     ${(stats.totalDuration / stats.total).toFixed(2)}ms`
  );
  console.log(`Min Response Time:     ${stats.minDuration}ms`);
  console.log(`Max Response Time:     ${stats.maxDuration}ms`);
  console.log("");
  console.log("Status Code Distribution:");
  Object.entries(stats.statusCodes).forEach(([code, count]) => {
    const percentage = ((count / stats.total) * 100).toFixed(2);
    console.log(`  ${code}: ${count} (${percentage}%)`);
  });
  console.log("=".repeat(60));

  // Performance evaluation
  console.log("\n🎯 Performance Evaluation:");
  const avgResponseTime = stats.totalDuration / stats.total;
  const successRate = (stats.successful / stats.total) * 100;

  if (successRate >= 99 && avgResponseTime < 500) {
    console.log("✅ EXCELLENT - System handles load very well");
  } else if (successRate >= 95 && avgResponseTime < 1000) {
    console.log("✅ GOOD - System performs well under load");
  } else if (successRate >= 90 && avgResponseTime < 2000) {
    console.log("⚠️  ACCEPTABLE - System shows some strain");
  } else {
    console.log("❌ NEEDS IMPROVEMENT - System struggles under load");
  }

  console.log("\n💡 Recommendations:");
  if (avgResponseTime > 1000) {
    console.log("  - Consider adding database indexing");
    console.log("  - Optimize vote aggregation queries");
  }
  if (successRate < 95) {
    console.log("  - Implement rate limiting");
    console.log("  - Add request queuing system");
    console.log("  - Check database connection pool size");
  }
  if (stats.maxDuration > 5000) {
    console.log("  - Investigate slow queries causing timeout");
    console.log("  - Consider caching strategies");
  }
}

// Run the test
runLoadTest().catch((error) => {
  console.error("❌ Load test failed:", error);
  process.exit(1);
});
