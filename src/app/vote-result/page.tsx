"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import styles from "../quiz/quiz.module.css";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import RealtimeStatus from "@/components/RealtimeStatus";
import RealtimeTest from "@/components/RealtimeTest";

interface OpinionResultOption {
  id: string;
  text: string;
  votes: number;
}
interface OpinionResult {
  quizId: string;
  opinion: string;
  totalVotes: number;
  options: OpinionResultOption[];
}

export default function VoteResultPage() {
  const [results, setResults] = useState<OpinionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUpdating(true);

      // Fetch active opinions
      const { data: quizzes, error: qErr } = await supabase
        .from("quizzes")
        .select("id, question, status")
        .eq("status", "active")
        .eq("kind", "opinion")
        .order("created_at", { ascending: true });
      if (qErr) throw qErr;
      if (!quizzes?.length) {
        setResults([]);
        setLoading(false);
        return;
      }

      const assembled: OpinionResult[] = [];
      for (const quiz of quizzes) {
        const { data: opts, error: oErr } = await supabase
          .from("options")
          .select("id, text, votes_cached")
          .eq("quiz_id", quiz.id)
          .order("order_index", { ascending: true });
        if (oErr) throw oErr;
        const options = (opts || []).map((o) => ({
          id: o.id,
          text: o.text,
          votes: o.votes_cached || 0,
        }));
        const totalVotes = options.reduce((s, o) => s + o.votes, 0);
        assembled.push({
          quizId: quiz.id,
          opinion: quiz.question,
          totalVotes,
          options,
        });
      }
      setResults(assembled);
      setLastUpdate(new Date());

      // Brief visual feedback for updates
      setTimeout(() => setIsUpdating(false), 500);
    } catch (e) {
      console.error("Failed to fetch vote results", e);
      setError("Impossible de charger les résultats.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // real-time subscription on votes & options (votes_cached updated by trigger)
  useEffect(() => {
    let mounted = true;

    const channel = supabase
      .channel(`vote_results_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "votes",
        },
        (payload) => {
          console.log("✅ Real-time vote INSERT:", payload);
          if (mounted) {
            fetchResults();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "options",
        },
        (payload) => {
          console.log("✅ Real-time votes_cached UPDATE:", payload);
          if (mounted) {
            fetchResults();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quizzes",
        },
        (payload) => {
          console.log("✅ Real-time opinion quiz change:", payload);
          if (mounted) {
            fetchResults();
          }
        }
      )
      .subscribe((status, err) => {
        console.log("🔌 Real-time subscription status:", status);
        if (err) console.error("❌ Real-time error:", err);

        if (status === "SUBSCRIBED") {
          console.log("🎉 Successfully connected to real-time updates!");
        }
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchResults]);

  if (loading) {
    return (
      <div className={styles.globalContainer}>
        <Logo />
        <div className={styles.content}>
          <div className={styles.questionContainer}>
            Chargement des résultats...
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  if (error) {
    return (
      <div className={styles.globalContainer}>
        <Logo />
        <div className={styles.content}>
          <div className={styles.questionContainer}>{error}</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className={styles.globalContainer}>
      <RealtimeStatus />
      <RealtimeTest />
      <Logo />
      <div className={styles.content}>
        <div
          style={{
            textAlign: "center",
            fontSize: "0.8rem",
            color: "#666",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span>Dernière mise à jour: {lastUpdate.toLocaleTimeString()}</span>
          {isUpdating && (
            <div
              style={{
                width: "8px",
                height: "8px",
                backgroundColor: "#10b981",
                borderRadius: "50%",
                animation: "pulse 1s infinite",
              }}
            ></div>
          )}
        </div>
        {results.length === 0 && (
          <div className={styles.questionContainer}>Aucune opinion active.</div>
        )}
        {results.map((r) => (
          <div key={r.quizId} style={{ width: "100%", marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>
              {r.opinion}
            </h2>
            {r.options.map((o) => {
              const pct = r.totalVotes
                ? Math.round((o.votes / r.totalVotes) * 100)
                : 0;
              return (
                <div key={o.id} style={{ marginBottom: "0.6rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.85rem",
                      marginBottom: 4,
                    }}
                  >
                    <span>{o.text}</span>
                    <span>
                      {o.votes} vote{o.votes > 1 ? "s" : ""} • {pct}%
                    </span>
                  </div>
                  <div
                    style={{
                      background: "#2d1e40",
                      borderRadius: 8,
                      height: 10,
                      overflow: "hidden",
                    }}
                    aria-label={`${o.text} ${pct}%`}
                  >
                    <div
                      style={{
                        width: pct + "%",
                        background: "#7c3aed",
                        height: "100%",
                      }}
                    />
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: "0.7rem", opacity: 0.7, marginTop: 6 }}>
              {r.totalVotes} vote{r.totalVotes > 1 ? "s" : ""} au total
            </div>
          </div>
        ))}
      </div>
      <Footer />
    </div>
  );
}
