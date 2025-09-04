"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./leaderboard.module.css";
import Logo from "@/components/Logo";
import Link from "next/link";

interface LeaderboardEntry {
  user_name: string;
  total_score: number;
  quiz_count: number;
  avg_score: number; // retained for display
  rank: number;
  completed_at: string | null; // earliest completion timestamp
  tie_seq?: number; // fallback ordering when no timestamps
}

// Row shape returned by the scores + joined quizzes select
type JoinedQuiz = { question: string };
interface ScoreRow {
  user_name: string;
  points: number;
  quiz_id: string;
  quizzes: JoinedQuiz | JoinedQuiz[]; // Supabase may return object or array
  created_at?: string; // optional timestamp (depends on schema)
  // updated_at removed to eliminate dependency
}

interface AggregateUserData {
  total_score: number;
  quiz_count: number;
  quizzes: Set<string>;
  completed_at: string | null; // earliest
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // animationDelay removed (no list animation after simplification)

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all scores with quiz details (only for kind='quiz')
      // Try to fetch with created_at (for tie-breaker); if fails, retry without
      let scores: ScoreRow[] | null = null;
      let scoresError: unknown = null;
      {
        const { data, error } = await supabase
          .from("scores")
          .select(
            `
            user_name,
            points,
            quiz_id,
            created_at,
            quizzes!inner(question, kind)
          `
          )
          .eq("quizzes.kind", "quiz");
        scores = data;
        scoresError = error;
      }

      if (scoresError) {
        console.warn(
          "Primary scores query failed (maybe created_at missing). Retrying without timestamp...",
          scoresError
        );
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from("scores")
          .select(
            `
            user_name,
            points,
            quiz_id,
            quizzes!inner(question, kind)
          `
          )
          .eq("quizzes.kind", "quiz");
        if (fallbackErr) throw fallbackErr;
        scores = fallbackData;
      }

      if (!scores) throw new Error("Scores query returned null");

      if (!scores || scores.length === 0) {
        setError("Aucun score disponible pour le moment.");
        return;
      }

      // Aggregate scores by user
      const userScores = new Map<string, AggregateUserData>();

      (scores as unknown as ScoreRow[]).forEach((score) => {
        const ts = score.created_at || null;
        const existing: AggregateUserData = userScores.get(score.user_name) || {
          total_score: 0,
          quiz_count: 0,
          quizzes: new Set<string>(),
          completed_at: ts,
        };

        existing.total_score += score.points;
        existing.quizzes.add(score.quiz_id);
        existing.quiz_count = existing.quizzes.size;
        // Keep EARLIEST timestamp to represent who finished first
        if (ts) {
          if (
            !existing.completed_at ||
            new Date(ts) < new Date(existing.completed_at)
          ) {
            existing.completed_at = ts;
          }
        }

        userScores.set(score.user_name, existing);
      });

      // Convert to leaderboard entries and sort
      const entriesBase: LeaderboardEntry[] = Array.from(
        userScores.entries()
      ).map(([user_name, data], idx) => ({
        user_name,
        total_score: data.total_score,
        quiz_count: data.quiz_count,
        avg_score: Math.round((data.total_score / data.quiz_count) * 10) / 10,
        rank: 0,
        completed_at: data.completed_at,
        tie_seq: idx, // stable fallback
      }));

      const anyTimestamps = entriesBase.some((e) => e.completed_at);

      const entries: LeaderboardEntry[] = entriesBase
        .sort((a, b) => {
          // 1. Higher total score
          if (b.total_score !== a.total_score)
            return b.total_score - a.total_score;
          // 2. If we have timestamps, earlier completion wins
          if (anyTimestamps) {
            if (a.completed_at && b.completed_at) {
              const diff =
                new Date(a.completed_at).getTime() -
                new Date(b.completed_at).getTime();
              if (diff !== 0) return diff;
            } else if (a.completed_at && !b.completed_at) {
              return -1;
            } else if (!a.completed_at && b.completed_at) {
              return 1;
            }
          }
          // 3. Stable fallback: original sequence to avoid alphabetical bias
          return (a.tie_seq ?? 0) - (b.tie_seq ?? 0);
        })
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      setLeaderboard(entries);

      // (staggered animation removed in podium-only view)
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError("Erreur lors du chargement du classement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch once (no real-time subscription for performance)
    fetchLeaderboard();
  }, []);

  // Helpers removed (only top 3 podium displayed)

  if (loading) {
    return (
      <div className={styles.container}>
        <Logo />
        <div className={styles.content}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <h2>Chargement du classement...</h2>
          </div>
        </div>
        {/* <Footer /> */}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Logo />
        <div className={styles.content}>
          <div className={styles.errorContainer}>
            <h2>Oops!</h2>
            <p>{error}</p>
            <button onClick={fetchLeaderboard} className={styles.retryButton}>
              Réessayer
            </button>
          </div>
        </div>
        {/* <Footer /> */}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Logo />
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>🏆 Classement TechWoman</h1>
          <p className={styles.subtitle}>
            Découvrez les meilleurs participants au quiz
          </p>
        </div>
        {/* Podium Only */}
        <div className={`${styles.leaderboardContainer} ${styles.podiumOnly}`}>
          {leaderboard.length < 3 ? (
            <div className={styles.emptyState}>
              <h3>Pas assez de participants</h3>
              <p>
                Au moins 3 participants sont requis pour afficher le podium.
              </p>
              <Link href="/quiz" className={styles.quizButton}>
                Participer maintenant
              </Link>
            </div>
          ) : (
            <div className={styles.podiumContainer}>
              <div className={`${styles.podium} ${styles.podiumLarge}`}>
                {/* Second Place */}
                <div className={`${styles.podiumPlace} ${styles.secondPlace}`}>
                  <div className={styles.podiumUser}>
                    <div className={styles.podiumRank}>🥈</div>
                    <div className={styles.podiumName}>
                      {leaderboard[1]?.user_name}
                    </div>
                    <div className={styles.podiumScore}>
                      {leaderboard[1]?.total_score} pts
                    </div>
                  </div>
                  <div className={styles.podiumBar}></div>
                </div>
                {/* First Place */}
                <div className={`${styles.podiumPlace} ${styles.firstPlace}`}>
                  <div className={styles.crown}>👑</div>
                  <div className={styles.podiumUser}>
                    <div className={styles.podiumRank}>🥇</div>
                    <div className={styles.podiumName}>
                      {leaderboard[0]?.user_name}
                    </div>
                    <div className={styles.podiumScore}>
                      {leaderboard[0]?.total_score} pts
                    </div>
                  </div>
                  <div className={styles.podiumBar}></div>
                </div>
                {/* Third Place */}
                <div className={`${styles.podiumPlace} ${styles.thirdPlace}`}>
                  <div className={styles.podiumUser}>
                    <div className={styles.podiumRank}>🥉</div>
                    <div className={styles.podiumName}>
                      {leaderboard[2]?.user_name}
                    </div>
                    <div className={styles.podiumScore}>
                      {leaderboard[2]?.total_score} pts
                    </div>
                  </div>
                  <div className={styles.podiumBar}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}

        {/* <div className={styles.actionButtons}>
          <Link href="/quiz" className={styles.quizButton}>
            🎯 Participer au Quiz
          </Link>
          <Link href="/admin" className={styles.adminButton}>
            ⚙️ Administration
          </Link>
          <Link href="/" className={styles.homeButton}>
            🏠 Accueil
          </Link>
        </div> */}
      </div>

      {/* <Footer /> */}
    </div>
  );
}
