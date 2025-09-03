"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./leaderboard.module.css";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import Link from "next/link";

interface LeaderboardEntry {
  user_name: string;
  total_score: number;
  quiz_count: number;
  avg_score: number;
  rank: number;
}

interface QuizScore {
  quiz_id: string;
  user_name: string;
  points: number;
  question: string;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animationDelay, setAnimationDelay] = useState(0);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all scores with quiz details
      const { data: scores, error: scoresError } = await supabase
        .from("scores")
        .select(
          `
          user_name,
          points,
          quiz_id,
          quizzes!inner(question)
        `
        )
        .order("points", { ascending: false });

      if (scoresError) throw scoresError;

      if (!scores || scores.length === 0) {
        setError("Aucun score disponible pour le moment.");
        return;
      }

      // Aggregate scores by user
      const userScores = new Map<
        string,
        {
          total_score: number;
          quiz_count: number;
          quizzes: Set<string>;
        }
      >();

      scores.forEach((score: QuizScore) => {
        const existing = userScores.get(score.user_name) || {
          total_score: 0,
          quiz_count: 0,
          quizzes: new Set(),
        };

        existing.total_score += score.points;
        existing.quizzes.add(score.quiz_id);
        existing.quiz_count = existing.quizzes.size;

        userScores.set(score.user_name, existing);
      });

      // Convert to leaderboard entries and sort
      const entries: LeaderboardEntry[] = Array.from(userScores.entries())
        .map(([user_name, data]) => ({
          user_name,
          total_score: data.total_score,
          quiz_count: data.quiz_count,
          avg_score: Math.round((data.total_score / data.quiz_count) * 10) / 10,
          rank: 0,
        }))
        .sort((a, b) => {
          // Sort by total score first, then by average score
          if (b.total_score !== a.total_score) {
            return b.total_score - a.total_score;
          }
          return b.avg_score - a.avg_score;
        })
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      setLeaderboard(entries);

      // Trigger staggered animation
      setTimeout(() => setAnimationDelay(100), 300);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError("Erreur lors du chargement du classement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    // Set up real-time subscription for score updates
    const channel = supabase
      .channel("leaderboard_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scores",
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `#${rank}`;
    }
  };

  const getRankClass = (rank: number) => {
    switch (rank) {
      case 1:
        return styles.goldRank;
      case 2:
        return styles.silverRank;
      case 3:
        return styles.bronzeRank;
      default:
        return styles.normalRank;
    }
  };

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
        <Footer />
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
        <Footer />
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

        {/* Stats Overview */}
        <div className={styles.statsContainer}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{leaderboard.length}</div>
            <div className={styles.statLabel}>Participants</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {leaderboard[0]?.total_score || 0}
            </div>
            <div className={styles.statLabel}>Meilleur Score</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {Math.round(
                leaderboard.reduce((sum, entry) => sum + entry.total_score, 0) /
                  leaderboard.length || 0
              )}
            </div>
            <div className={styles.statLabel}>Score Moyen</div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className={styles.leaderboardContainer}>
          {leaderboard.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>Aucun score disponible</h3>
              <p>Soyez le premier à participer au quiz!</p>
              <Link href="/quiz" className={styles.quizButton}>
                Commencer le Quiz
              </Link>
            </div>
          ) : (
            <>
              {/* Top 3 Podium */}
              {leaderboard.length >= 3 && (
                <div className={styles.podiumContainer}>
                  <div className={styles.podium}>
                    {/* Second Place */}
                    <div
                      className={`${styles.podiumPlace} ${styles.secondPlace}`}
                    >
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
                    <div
                      className={`${styles.podiumPlace} ${styles.firstPlace}`}
                    >
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
                    <div
                      className={`${styles.podiumPlace} ${styles.thirdPlace}`}
                    >
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

              {/* Full Leaderboard List */}
              <div className={styles.leaderboardList}>
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.user_name}
                    className={`${styles.leaderboardItem} ${getRankClass(
                      entry.rank
                    )}`}
                    style={{
                      animationDelay: `${index * animationDelay}ms`,
                    }}
                  >
                    <div className={styles.rankSection}>
                      <span className={styles.rankIcon}>
                        {getRankIcon(entry.rank)}
                      </span>
                    </div>

                    <div className={styles.userSection}>
                      <div className={styles.userName}>{entry.user_name}</div>
                      <div className={styles.userStats}>
                        {entry.quiz_count} quiz{entry.quiz_count > 1 ? "s" : ""}{" "}
                        • Moyenne: {entry.avg_score} pts
                      </div>
                    </div>

                    <div className={styles.scoreSection}>
                      <div className={styles.totalScore}>
                        {entry.total_score}
                      </div>
                      <div className={styles.scoreLabel}>points</div>
                    </div>

                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{
                          width: `${
                            (entry.total_score /
                              (leaderboard[0]?.total_score || 1)) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <Link href="/quiz" className={styles.quizButton}>
            🎯 Participer au Quiz
          </Link>
          <Link href="/admin" className={styles.adminButton}>
            ⚙️ Administration
          </Link>
          <Link href="/" className={styles.homeButton}>
            🏠 Accueil
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
