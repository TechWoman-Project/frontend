"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./leaderboard.module.css";
import Header from "@/components/Header";
import Link from "next/link";

interface LeaderboardEntry {
  user_name: string;
  total_score: number;
  quiz_count: number;
  avg_score: number;
  rank: number;
  completed_at: string | null;
  tie_seq?: number;
}

interface ScoreRow {
  user_name: string;
  points: number;
  quiz_id: string;
  quizzes: { question: string } | { question: string }[];
  created_at?: string;
}

interface AggregateUserData {
  total_score: number;
  quiz_count: number;
  quizzes: Set<string>;
  completed_at: string | null;
}

const TOP_WINNERS_COUNT = 5;
const MEDAL_EMOJIS = ["🥇", "2️⃣", "3️⃣", "4️⃣", "5️⃣"] as const;

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Attempt to fetch scores with created_at timestamp
      const { data: scores, error: scoresError } = await supabase
        .from("scores")
        .select(
          `user_name, points, quiz_id, created_at, quizzes!inner(question, kind)`
        )
        .eq("quizzes.kind", "quiz");

      // Fallback query without created_at if primary fails
      if (scoresError) {
        console.warn("Retrying without timestamp:", scoresError);
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from("scores")
          .select(`user_name, points, quiz_id, quizzes!inner(question, kind)`)
          .eq("quizzes.kind", "quiz");

        if (fallbackErr) throw fallbackErr;
        if (!fallbackData?.length) {
          setError("Aucun score disponible pour le moment.");
          return;
        }

        setLeaderboard(processScores(fallbackData));
        return;
      }

      if (!scores?.length) {
        setError("Aucun score disponible pour le moment.");
        return;
      }

      setLeaderboard(processScores(scores));
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError("Erreur lors du chargement du classement.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Extract processing logic for better testability and readability
  const processScores = (scores: ScoreRow[]): LeaderboardEntry[] => {
    const userScores = aggregateUserScores(scores);
    const entries = convertToLeaderboardEntries(userScores);
    return sortAndRankEntries(entries);
  };

  // Aggregate scores by user
  const aggregateUserScores = (
    scores: ScoreRow[]
  ): Map<string, AggregateUserData> => {
    const userScores = new Map<string, AggregateUserData>();

    scores.forEach((score) => {
      const existing = userScores.get(score.user_name);
      const timestamp = score.created_at || null;

      if (!existing) {
        userScores.set(score.user_name, {
          total_score: score.points,
          quiz_count: 1,
          quizzes: new Set([score.quiz_id]),
          completed_at: timestamp,
        });
        return;
      }

      existing.total_score += score.points;
      existing.quizzes.add(score.quiz_id);
      existing.quiz_count = existing.quizzes.size;

      // Track earliest completion time
      if (
        timestamp &&
        (!existing.completed_at ||
          new Date(timestamp) < new Date(existing.completed_at))
      ) {
        existing.completed_at = timestamp;
      }
    });

    return userScores;
  };

  // Convert aggregated data to leaderboard entries
  const convertToLeaderboardEntries = (
    userScores: Map<string, AggregateUserData>
  ): LeaderboardEntry[] => {
    return Array.from(userScores.entries()).map(([user_name, data], idx) => ({
      user_name,
      total_score: data.total_score,
      quiz_count: data.quiz_count,
      avg_score: Math.round((data.total_score / data.quiz_count) * 10) / 10,
      rank: 0,
      completed_at: data.completed_at,
      tie_seq: idx,
    }));
  };

  // Sort entries by score, completion time, and stable sequence
  const sortAndRankEntries = (
    entries: LeaderboardEntry[]
  ): LeaderboardEntry[] => {
    const hasTimestamps = entries.some((e) => e.completed_at);

    return entries
      .sort((a, b) => {
        // Primary: Higher score wins
        if (b.total_score !== a.total_score) {
          return b.total_score - a.total_score;
        }

        // Secondary: Earlier completion wins (if timestamps exist)
        if (hasTimestamps) {
          if (a.completed_at && b.completed_at) {
            const timeDiff =
              new Date(a.completed_at).getTime() -
              new Date(b.completed_at).getTime();
            if (timeDiff !== 0) return timeDiff;
          } else if (a.completed_at) return -1;
          else if (b.completed_at) return 1;
        }

        // Tertiary: Stable fallback
        return (a.tie_seq ?? 0) - (b.tie_seq ?? 0);
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Memoize top winners to avoid recalculation
  const topWinners = useMemo(
    () => leaderboard.slice(0, Math.min(TOP_WINNERS_COUNT, leaderboard.length)),
    [leaderboard]
  );

  const hasWinners = leaderboard.length > 0;

  // Shared container style
  const containerStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "12px 8px 60px",
  };

  if (loading) {
    return (
      <div className={styles.container} style={containerStyle}>
        <Header />
        <div className={styles.content}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner} />
            <h2>Chargement du classement...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container} style={containerStyle}>
        <Header />
        <div className={styles.content}>
          <div className={styles.errorContainer}>
            <h2>Oops!</h2>
            <p>{error}</p>
            <button onClick={fetchLeaderboard} className={styles.retryButton}>
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} style={containerStyle}>
      <Header />
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Classement TechWoman</h1>
          <p className={styles.subtitle}>
            Découvrez les meilleurs participants au quiz
          </p>
        </div>

        {/* Top 5 Leaderboard */}
        <div className={`${styles.leaderboardContainer} ${styles.podiumOnly}`}>
          {!hasWinners ? (
            <div className={styles.emptyState}>
              <h3>Aucun participant pour le moment</h3>
              <p>
                Soyez le premier à participer au quiz et apparaître dans le
                classement!
              </p>
              <Link href="/quiz" className={styles.quizButton}>
                Participer maintenant
              </Link>
            </div>
          ) : (
            <div className={styles.topFiveContainer}>
              {/* First Place */}
              <div className={styles.firstPlaceContainer}>
                <div className={styles.crown}>👑</div>
                <WinnerCard
                  entry={topWinners[0]}
                  rank={0}
                  styleClass={styles.firstPlace}
                />
              </div>

              {/* Remaining Winners (if any) */}
              {topWinners.length > 1 && (
                <div className={styles.otherWinnersGrid}>
                  {topWinners.slice(1).map((entry, idx) => (
                    <WinnerCard
                      key={entry.user_name}
                      entry={entry}
                      rank={idx + 1}
                      styleClass={styles[`${getPlaceName(idx + 1)}Place`]}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Extracted component for better reusability
interface WinnerCardProps {
  entry: LeaderboardEntry;
  rank: number;
  styleClass: string;
}

function WinnerCard({ entry, rank, styleClass }: WinnerCardProps) {
  return (
    <div className={`${styles.winnerCard} ${styleClass}`}>
      <div className={styles.winnerRank}>{MEDAL_EMOJIS[rank]}</div>
      <div className={styles.winnerName}>{entry.user_name}</div>
      <div className={styles.winnerScore}>{entry.total_score} pts</div>
    </div>
  );
}

// Helper function for place names
function getPlaceName(rank: number): string {
  const places = ["first", "second", "third", "fourth", "fifth"];
  return places[rank] || "";
}
