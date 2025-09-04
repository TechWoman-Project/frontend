"use client";
import { useEffect, useState, useCallback, useRef, memo } from "react";
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
  const initialized = useRef(false);
  const [rtConnected, setRtConnected] = useState(false);

  // ---- VoteBar component (memoized) ----
  const VoteBar = memo(function VoteBar({
    option,
    totalVotes,
  }: {
    option: OpinionResultOption;
    totalVotes: number;
  }) {
    const pct = totalVotes ? (option.votes / totalVotes) * 100 : 0;
    // Smooth count animation (lightweight)
    const [displayVotes, setDisplayVotes] = useState(option.votes);
    const prevVotesRef = useRef(option.votes);
    useEffect(() => {
      if (option.votes === prevVotesRef.current) return;
      const start = prevVotesRef.current;
      const end = option.votes;
      const diff = end - start;
      const startTs = performance.now();
      const dur = 500;
      let raf: number;
      const step = (ts: number) => {
        const p = Math.min(1, (ts - startTs) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplayVotes(Math.round(start + diff * eased));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      prevVotesRef.current = option.votes;
      return () => cancelAnimationFrame(raf);
    }, [option.votes]);
    return (
      <div style={{ marginBottom: "0.6rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.85rem",
            marginBottom: 4,
          }}
        >
          <span>{option.text}</span>
          <span>
            {displayVotes} vote{displayVotes !== 1 ? "s" : ""} •{" "}
            {Math.round(pct)}%
          </span>
        </div>
        <div
          style={{
            background: "#2d1e40",
            borderRadius: 8,
            height: 12,
            overflow: "hidden",
            position: "relative",
          }}
          aria-label={`${option.text} ${Math.round(pct)}%`}
        >
          <div
            style={{
              width: pct + "%",
              background: "linear-gradient(90deg,#7c3aed,#6d28d9)",
              height: "100%",
              transition: "width 0.65s cubic-bezier(.4,0,.2,1)",
              boxShadow: "0 0 4px rgba(124,58,237,.6)",
            }}
          />
        </div>
      </div>
    );
  });

  const buildInitial = useCallback(async () => {
    try {
      setError(null);
      const { data: quizzes, error: qErr } = await supabase
        .from("quizzes")
        .select("id, question, status")
        .eq("status", "active")
        .eq("kind", "opinion")
        .order("created_at", { ascending: true });
      if (qErr) throw qErr;
      if (!quizzes?.length) {
        setResults([]);
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
    } catch (e) {
      console.error("Failed to fetch vote results", e);
      setError("Impossible de charger les résultats.");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOptionVotes = useCallback(
    (optionId: string, newVotes: number) => {
      setResults((prev) => {
        let touched = false;
        const next = prev.map((quiz) => {
          let optionChanged = false;
          const options = quiz.options.map((opt) => {
            if (opt.id === optionId) {
              optionChanged = true;
              touched = true;
              return { ...opt, votes: newVotes };
            }
            return opt;
          });
          if (optionChanged) {
            const totalVotes = options.reduce((s, o) => s + o.votes, 0);
            return { ...quiz, options, totalVotes };
          }
          return quiz;
        });
        if (touched) {
          setLastUpdate(new Date());
          setIsUpdating(true);
          setTimeout(() => setIsUpdating(false), 400);
        }
        return next;
      });
    },
    []
  );

  const addOrRefreshQuiz = useCallback(async (quizId: string) => {
    try {
      const { data: quizRow, error: qErr } = await supabase
        .from("quizzes")
        .select("id, question, status, kind")
        .eq("id", quizId)
        .single();
      if (
        qErr ||
        !quizRow ||
        quizRow.kind !== "opinion" ||
        quizRow.status !== "active"
      )
        return;
      const { data: opts } = await supabase
        .from("options")
        .select("id, text, votes_cached")
        .eq("quiz_id", quizRow.id)
        .order("order_index", { ascending: true });
      const options = (opts || []).map((o) => ({
        id: o.id,
        text: o.text,
        votes: o.votes_cached || 0,
      }));
      const totalVotes = options.reduce((s, o) => s + o.votes, 0);
      setResults((prev) => {
        const exists = prev.some((q) => q.quizId === quizRow.id);
        if (exists) {
          return prev.map((q) =>
            q.quizId === quizRow.id
              ? { ...q, opinion: quizRow.question, totalVotes, options }
              : q
          );
        }
        return [
          ...prev,
          {
            quizId: quizRow.id,
            opinion: quizRow.question,
            totalVotes,
            options,
          },
        ];
      });
    } catch (e) {
      console.error("Failed to add/refresh quiz", e);
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      buildInitial();
      initialized.current = true;
    }
  }, [buildInitial]);

  // real-time incremental updates
  useEffect(() => {
    let mounted = true;
    interface OptionRow {
      id: string;
      votes_cached?: number;
      quiz_id?: string;
    }
    interface QuizRow {
      id: string;
      question?: string;
      status?: string;
      kind?: string;
    }

    const channel = supabase
      .channel("vote_results_incremental")
      // Option votes change (trigger updates votes_cached)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "options" },
        (payload) => {
          if (!mounted) return;
          const row = payload.new as OptionRow | null;
          const newVotes = row?.votes_cached;
          const optionId = row?.id;
          if (optionId && typeof newVotes === "number") {
            updateOptionVotes(optionId, newVotes);
          }
        }
      )
      // New option added (add to quiz list)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "options" },
        (payload) => {
          if (!mounted) return;
          const row = payload.new as OptionRow | null;
          const quizId = row?.quiz_id;
          if (quizId) addOrRefreshQuiz(quizId);
        }
      )
      // Quiz status / creation changes
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quizzes" },
        (payload) => {
          if (!mounted) return;
          const newRow = payload.new as QuizRow | null;
          const oldRow = payload.old as QuizRow | null;
          const quizId = newRow?.id || oldRow?.id;
          if (quizId) addOrRefreshQuiz(quizId);
        }
      )
      .subscribe((status) => {
        // status can be: SUBSCRIBED | TIMED_OUT | CLOSED | CHANNEL_ERROR
        setRtConnected(status === "SUBSCRIBED");
      });
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [updateOptionVotes, addOrRefreshQuiz]);

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

  // Gate rendering until realtime connected
  if (!rtConnected) {
    return (
      <div className={styles.globalContainer}>
        <RealtimeStatus />
        <Logo />
        <div className={styles.content}>
          <div className={styles.questionContainer}>
            Connexion temps réel...
          </div>
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
            <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
              {r.opinion}
            </h2>
            {r.options.map((o) => (
              <VoteBar key={o.id} option={o} totalVotes={r.totalVotes} />
            ))}
            <div style={{ fontSize: "0.65rem", opacity: 0.65, marginTop: 4 }}>
              {r.totalVotes} vote{r.totalVotes !== 1 ? "s" : ""} au total
            </div>
          </div>
        ))}
      </div>
      <Footer />
    </div>
  );
}
