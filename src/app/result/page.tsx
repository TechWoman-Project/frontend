"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./result.module.css";

interface UserResult {
  id: string;
  name: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  timeSpent: number;
}

export default function AdminResultsPage() {
  const [results, setResults] = useState<UserResult[]>([]);
  const [sortBy, setSortBy] = useState<"score" | "name" | "date">("score");

  useEffect(() => {
    // Get all user results from localStorage
    const allResults: UserResult[] = [];

    // Loop through localStorage to find all quiz results
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("quiz_result_")) {
        try {
          const result = JSON.parse(localStorage.getItem(key) || "");
          if (result && result.name && result.score !== undefined) {
            allResults.push(result);
          }
        } catch (error) {
          console.error("Error parsing result:", error);
        }
      }
    }

    setResults(allResults);
  }, []);

  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case "score":
        return b.score - a.score; // Highest score first
      case "name":
        return a.name.localeCompare(b.name);
      case "date":
        return (
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );
      default:
        return 0;
    }
  });

  const clearAllResults = () => {
    if (
      confirm(
        "Are you sure you want to clear all results? This cannot be undone."
      )
    ) {
      // Remove all quiz results from localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("quiz_result_")) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
      setResults([]);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const averageScore =
    results.length > 0
      ? (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(
          1
        )
      : 0;

  return (
    <div className={styles.adminContainer}>
      <div className={styles.header}>
        <h1>🏆 Quiz Results - Admin Panel</h1>
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{results.length}</span>
            <span className={styles.statLabel}>Total Players</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{averageScore}</span>
            <span className={styles.statLabel}>Average Score</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>
              {results.length > 0
                ? Math.max(...results.map((r) => r.score))
                : 0}
            </span>
            <span className={styles.statLabel}>Highest Score</span>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.sortControls}>
          <label>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "score" | "name" | "date")
            }
            className={styles.sortSelect}
          >
            <option value="score">Score (Highest first)</option>
            <option value="name">Name (A-Z)</option>
            <option value="date">Date (Newest first)</option>
          </select>
        </div>

        <button
          onClick={clearAllResults}
          className={styles.clearButton}
          disabled={results.length === 0}
        >
          Clear All Results
        </button>
      </div>

      {results.length === 0 ? (
        <div className={styles.noResults}>
          <p>📋 No quiz results yet!</p>
          <p>Share the quiz link with your friends to see their scores here.</p>
        </div>
      ) : (
        <div className={styles.resultsTable}>
          <div className={styles.tableHeader}>
            <div className={styles.headerCell}>Rank</div>
            <div className={styles.headerCell}>Name</div>
            <div className={styles.headerCell}>Score</div>
            <div className={styles.headerCell}>Time</div>
            <div className={styles.headerCell}>Date</div>
          </div>

          {sortedResults.map((result, index) => (
            <div key={result.id} className={styles.tableRow}>
              <div className={styles.rankCell}>
                {sortBy === "score" && (
                  <span className={styles.rank}>
                    {index === 0
                      ? "🥇"
                      : index === 1
                      ? "🥈"
                      : index === 2
                      ? "🥉"
                      : `#${index + 1}`}
                  </span>
                )}
                {sortBy !== "score" && (
                  <span className={styles.rank}>#{index + 1}</span>
                )}
              </div>
              <div className={styles.nameCell}>
                <span className={styles.playerName}>{result.name}</span>
              </div>
              <div className={styles.scoreCell}>
                <span className={styles.score}>{result.score}</span>
                <span className={styles.totalQuestions}>
                  / {result.totalQuestions * 10}
                </span>
              </div>
              <div className={styles.timeCell}>
                {formatTime(result.timeSpent)}
              </div>
              <div className={styles.dateCell}>
                {new Date(result.completedAt).toLocaleDateString()}
                <br />
                <small>
                  {new Date(result.completedAt).toLocaleTimeString()}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.backToQuiz}>
        <Link href="/" className={styles.backButton}>
          ← Back to Quiz
        </Link>
      </div>
    </div>
  );
}
