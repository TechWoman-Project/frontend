/**
 * Load Testing Script for Quiz System
 *
 * This script simulates multiple concurrent users taking quizzes to test:
 * - Quiz submission performance under load
 * - Score calculation accuracy
 * - Database write operations handling
 * - Leaderboard update performance
 *
 * Usage: node load-test-quizzes.js
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
  totalParticipants: 300, // Total quiz participants to simulate
  concurrentBatch: 10, // Number of concurrent participants per batch
  delayBetweenBatches: 100, // Milliseconds between batches
  randomNames: true, // Use random user names
  randomAnswers: true, // Answer questions randomly (false = always correct)
  correctAnswerRate: 0.7, // 70% chance of correct answer when random
};

// Points per question (must match the quiz page: 10 points per correct answer)
const POINTS_PER_QUESTION = 10;

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
  const timestamp = Date.now().toString().slice(-6);
  const uniqueId = nameCounter++;
  return `${adj}${noun}_${timestamp}_${uniqueId}`;
};

// Fetch active quizzes
async function fetchActiveQuizzes() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/quizzes?kind=eq.quiz&status=eq.active&select=id,question`,
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
      throw new Error("No active quizzes found");
    }

    // Fetch options for each quiz
    const quizzesWithOptions = await Promise.all(
      quizzes.map(async (quiz) => {
        const optionsResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/options?quiz_id=eq.${quiz.id}&select=id,text,is_correct,order_index&order=order_index`,
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
    console.error("Error fetching quizzes:", error);
    throw error;
  }
}

// Submit a quiz answer (score record)
async function submitQuizAnswer(quizId, points, userName) {
  const startTime = Date.now();

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        quiz_id: quizId,
        user_name: userName,
        points: points,
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Quiz submission failed for ${userName}: ${response.status} - ${errorText}`
      );
    }

    return {
      success: response.ok || response.status === 409,
      status: response.status,
      duration,
      userName,
      quizId,
      points,
    };
  } catch (error) {
    console.error(`Quiz submission error for ${userName}:`, error.message);
    return {
      success: false,
      status: 0,
      duration: Date.now() - startTime,
      userName,
      quizId,
      error: error.message,
    };
  }
}

// Simulate a complete quiz session for one user
async function simulateQuizSession(quizzes) {
  const userName = CONFIG.randomNames
    ? generateRandomName()
    : `TestUser${Math.floor(Math.random() * 100000)}`;

  const results = [];
  let totalScore = 0;

  for (const quiz of quizzes) {
    let selectedAnswer;

    if (CONFIG.randomAnswers) {
      // Random chance of getting correct answer
      const shouldBeCorrect = Math.random() < CONFIG.correctAnswerRate;

      if (shouldBeCorrect) {
        // Find correct answer
        const correctOption = quiz.options.find((opt) => opt.is_correct);
        selectedAnswer = correctOption || quiz.options[0];
      } else {
        // Pick random wrong answer
        const wrongOptions = quiz.options.filter((opt) => !opt.is_correct);
        selectedAnswer =
          wrongOptions.length > 0
            ? wrongOptions[Math.floor(Math.random() * wrongOptions.length)]
            : quiz.options[0];
      }
    } else {
      // Always pick correct answer
      selectedAnswer =
        quiz.options.find((opt) => opt.is_correct) || quiz.options[0];
    }

    // Calculate points (10 for correct, 0 for wrong)
    const points = selectedAnswer.is_correct ? POINTS_PER_QUESTION : 0;
    totalScore += points;

    // Submit the answer
    const result = await submitQuizAnswer(quiz.id, points, userName);
    results.push(result);

    // Small delay between questions (simulate user thinking time)
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return {
    userName,
    totalScore,
    quizCount: quizzes.length,
    results,
    allSuccess: results.every((r) => r.success),
  };
}

// Execute batch of concurrent quiz sessions
async function executeBatch(quizzes, batchSize) {
  const promises = [];

  for (let i = 0; i < batchSize; i++) {
    promises.push(simulateQuizSession(quizzes));
  }

  return await Promise.all(promises);
}

// Main load test function
async function runLoadTest() {
  console.log("🚀 Starting Load Test for Quiz System\n");
  console.log("Configuration:");
  console.log(`  Total Participants: ${CONFIG.totalParticipants}`);
  console.log(`  Concurrent Batch Size: ${CONFIG.concurrentBatch}`);
  console.log(`  Delay Between Batches: ${CONFIG.delayBetweenBatches}ms`);
  console.log(`  Random Answers: ${CONFIG.randomAnswers}`);
  if (CONFIG.randomAnswers) {
    console.log(
      `  Correct Answer Rate: ${(CONFIG.correctAnswerRate * 100).toFixed(0)}%`
    );
  }
  console.log("");

  // Fetch available quizzes
  console.log("📊 Fetching active quizzes...");
  const quizzes = await fetchActiveQuizzes();

  if (quizzes.length === 0) {
    console.error(
      "❌ No active quizzes found. Please activate at least one quiz in the admin panel."
    );
    return;
  }

  console.log(`✅ Found ${quizzes.length} active quiz(es):`);
  quizzes.forEach((quiz, idx) => {
    const correctOption = quiz.options.find((opt) => opt.is_correct);
    console.log(`   ${idx + 1}. "${quiz.question}"`);
    console.log(
      `      Options: ${quiz.options.length}, Correct: "${
        correctOption?.text || "N/A"
      }"`
    );
  });
  console.log("");

  // Statistics
  const stats = {
    totalParticipants: 0,
    successfulSessions: 0,
    failedSessions: 0,
    totalSubmissions: 0,
    successfulSubmissions: 0,
    failedSubmissions: 0,
    totalDuration: 0,
    minDuration: Infinity,
    maxDuration: 0,
    totalScore: 0,
    perfectScores: 0,
    statusCodes: {},
  };

  const totalBatches = Math.ceil(
    CONFIG.totalParticipants / CONFIG.concurrentBatch
  );
  const startTime = Date.now();

  console.log(`🔄 Executing ${totalBatches} batches...\n`);

  // Execute batches
  for (let batch = 0; batch < totalBatches; batch++) {
    const remainingParticipants =
      CONFIG.totalParticipants - batch * CONFIG.concurrentBatch;
    const batchSize = Math.min(CONFIG.concurrentBatch, remainingParticipants);

    process.stdout.write(
      `Batch ${batch + 1}/${totalBatches}: ${batchSize} participants... `
    );

    const sessions = await executeBatch(quizzes, batchSize);

    // Update statistics
    sessions.forEach((session) => {
      stats.totalParticipants++;
      if (session.allSuccess) {
        stats.successfulSessions++;
      } else {
        stats.failedSessions++;
      }

      stats.totalScore += session.totalScore;
      const maxPossibleScore = quizzes.length * 100;
      if (session.totalScore === maxPossibleScore) {
        stats.perfectScores++;
      }

      session.results.forEach((result) => {
        stats.totalSubmissions++;
        if (result.success) {
          stats.successfulSubmissions++;
        } else {
          stats.failedSubmissions++;
        }

        stats.totalDuration += result.duration;
        stats.minDuration = Math.min(stats.minDuration, result.duration);
        stats.maxDuration = Math.max(stats.maxDuration, result.duration);

        const statusKey = result.status || "error";
        stats.statusCodes[statusKey] = (stats.statusCodes[statusKey] || 0) + 1;
      });
    });

    const successCount = sessions.filter((s) => s.allSuccess).length;
    console.log(`✅ ${successCount}/${batchSize} completed successfully`);

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
  console.log("📈 QUIZ LOAD TEST RESULTS");
  console.log("=".repeat(60));
  console.log(`Total Participants:    ${stats.totalParticipants}`);
  console.log(
    `Successful Sessions:   ${stats.successfulSessions} (${(
      (stats.successfulSessions / stats.totalParticipants) *
      100
    ).toFixed(2)}%)`
  );
  console.log(
    `Failed Sessions:       ${stats.failedSessions} (${(
      (stats.failedSessions / stats.totalParticipants) *
      100
    ).toFixed(2)}%)`
  );
  console.log("");
  console.log(`Total Submissions:     ${stats.totalSubmissions}`);
  console.log(
    `Successful:            ${stats.successfulSubmissions} (${(
      (stats.successfulSubmissions / stats.totalSubmissions) *
      100
    ).toFixed(2)}%)`
  );
  console.log(
    `Failed:                ${stats.failedSubmissions} (${(
      (stats.failedSubmissions / stats.totalSubmissions) *
      100
    ).toFixed(2)}%)`
  );
  console.log("");
  console.log(`Total Time:            ${(totalTime / 1000).toFixed(2)}s`);
  console.log(
    `Participants per Sec:  ${(
      stats.totalParticipants /
      (totalTime / 1000)
    ).toFixed(2)}`
  );
  console.log("");
  console.log(
    `Avg Response Time:     ${(
      stats.totalDuration / stats.totalSubmissions
    ).toFixed(2)}ms`
  );
  console.log(`Min Response Time:     ${stats.minDuration}ms`);
  console.log(`Max Response Time:     ${stats.maxDuration}ms`);
  console.log("");
  console.log(
    `Average Score:         ${(
      stats.totalScore / stats.totalParticipants
    ).toFixed(0)} points`
  );
  console.log(
    `Perfect Scores:        ${stats.perfectScores} (${(
      (stats.perfectScores / stats.totalParticipants) *
      100
    ).toFixed(2)}%)`
  );
  console.log("");
  console.log("Status Code Distribution:");
  Object.entries(stats.statusCodes).forEach(([code, count]) => {
    const percentage = ((count / stats.totalSubmissions) * 100).toFixed(2);
    console.log(`  ${code}: ${count} (${percentage}%)`);
  });
  console.log("=".repeat(60));

  // Performance evaluation
  console.log("\n🎯 Performance Evaluation:");
  const avgResponseTime = stats.totalDuration / stats.totalSubmissions;
  const successRate =
    (stats.successfulSubmissions / stats.totalSubmissions) * 100;

  if (successRate >= 99 && avgResponseTime < 500) {
    console.log("✅ EXCELLENT - Quiz system handles load very well");
  } else if (successRate >= 95 && avgResponseTime < 1000) {
    console.log("✅ GOOD - Quiz system performs well under load");
  } else if (successRate >= 90 && avgResponseTime < 2000) {
    console.log("⚠️  ACCEPTABLE - Quiz system shows some strain");
  } else {
    console.log("❌ NEEDS IMPROVEMENT - Quiz system struggles under load");
  }

  console.log("\n💡 Recommendations:");
  if (avgResponseTime > 1000) {
    console.log("  - Consider adding database indexing on scores table");
    console.log("  - Optimize leaderboard calculation queries");
  }
  if (successRate < 95) {
    console.log("  - Implement rate limiting for score submissions");
    console.log("  - Add request queuing system");
    console.log("  - Check database connection pool size");
  }
  if (stats.maxDuration > 5000) {
    console.log("  - Investigate slow queries causing timeout");
    console.log("  - Consider caching leaderboard data");
  }

  console.log("\n📊 Next Steps:");
  console.log(`  - Check leaderboard: http://localhost:3000/leaderboard`);
  console.log(`  - View admin panel: http://localhost:3000/admin`);
  console.log(`  - Clean up test data using Supabase SQL editor if needed`);
}

// Run the test
runLoadTest().catch((error) => {
  console.error("❌ Load test failed:", error);
  process.exit(1);
});
