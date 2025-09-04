"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import styles from "../quiz/quiz.module.css"; // reuse quiz styling
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import RealtimeStatus from "@/components/RealtimeStatus";

interface Opinion {
  id: number; // sequential index for UI
  quizId: string; // maps to quizzes.id
  opinion: string; // quizzes.question (semantic rename)
  options: string[]; // people names
  optionIds: string[]; // parallel array of option UUIDs
}

export default function VotePage() {
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // Anonymous participant id (no prompt) persisted locally
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const hasInitialized = useRef(false);

  // Generate / load anonymous id (no user interaction)
  const initParticipant = useCallback(() => {
    let existing = localStorage.getItem("vote_anon_id");
    if (!existing) {
      const hasUUID =
        typeof crypto !== "undefined" &&
        typeof (crypto as Crypto).randomUUID === "function";
      const gen = hasUUID
        ? (crypto as Crypto).randomUUID()
        : "anon_" + Math.random().toString(36).slice(2, 11);
      existing = gen;
      localStorage.setItem("vote_anon_id", gen);
    }
    setParticipantId(existing);
  }, []);

  // Fetch (or refresh) opinions. When reset=true we treat it as a fresh session; otherwise we preserve progress.
  const fetchOpinions = useCallback(
    async (reset: boolean) => {
      try {
        if (reset) setLoading(true); // only show global loader on first load
        setFetchError(null);
        const { data: quizzes, error: qErr } = await supabase
          .from("quizzes")
          .select("id, question, status, created_at")
          .eq("status", "active")
          .eq("kind", "opinion")
          .order("created_at", { ascending: true });
        if (qErr) throw qErr;
        const built: Opinion[] = [];
        if (quizzes?.length) {
          for (let i = 0; i < quizzes.length; i++) {
            const quiz = quizzes[i];
            const { data: opts, error: oErr } = await supabase
              .from("options")
              .select("id, text, order_index")
              .eq("quiz_id", quiz.id)
              .order("order_index", { ascending: true });
            if (oErr) throw oErr;
            if (!opts || opts.length === 0) continue;
            built.push({
              id: built.length + 1,
              quizId: quiz.id,
              opinion: quiz.question,
              options: opts.map((o) => o.text),
              optionIds: opts.map((o) => o.id),
            });
          }
        }

        setOpinions(() => built);

        if (reset) {
          // Initial load: start from first
          setCurrentIndex(0);
          setSelectedIndex(null);
          setShowResult(false);
          setLocked(false);
        } else {
          // Refresh: preserve current quiz if still present
          setCurrentIndex((prevIdx) => {
            const prevQuizId = opinions[prevIdx]?.quizId;
            if (!prevQuizId) return 0;
            const newIdx = built.findIndex((o) => o.quizId === prevQuizId);
            return newIdx === -1 ? 0 : newIdx;
          });
          // Do not reset selectedIndex unless the selection no longer exists
          setSelectedIndex((prevSel) => {
            const currQuizId = opinions[currentIndex]?.quizId;
            const newQuizId =
              built[built.findIndex((o) => o.quizId === currQuizId)]?.quizId;
            if (!newQuizId || newQuizId !== currQuizId) return null;
            return prevSel;
          });
        }
      } catch (e) {
        console.error("Failed to fetch opinions", e);
        setFetchError("Impossible de charger les opinions.");
      } finally {
        if (reset) setLoading(false);
      }
    },
    [opinions, currentIndex]
  );

  // initial
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    initParticipant();
    fetchOpinions(true);
  }, [fetchOpinions, initParticipant]);

  // realtime - listen for changes to opinions (quizzes and options)
  useEffect(() => {
    const channel = supabase
      .channel(`opinions_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quizzes",
          filter: "kind=eq.opinion",
        },
        (payload) => {
          console.log("✅ Real-time opinion quiz change:", payload);
          fetchOpinions(false); // refresh without losing progress
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "options" },
        (payload) => {
          console.log("✅ Real-time option change:", payload);
          fetchOpinions(false); // refresh without resetting progress
        }
      )
      .subscribe((status, err) => {
        console.log("🔌 Opinions subscription status:", status);
        if (err) console.error("❌ Real-time error:", err);

        if (status === "SUBSCRIBED") {
          console.log("🎉 Connected to opinion updates!");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOpinions]);

  const current = opinions[currentIndex];

  const insertVote = async (quizId: string, optionId: string, user: string) => {
    try {
      const { error } = await supabase
        .from("votes")
        .insert({ quiz_id: quizId, option_id: optionId, user_name: user });
      if (error && error.code !== "23505")
        console.error("Vote insert error", error);
    } catch (e) {
      console.error("Vote failed", e);
    }
  };

  const handleSelect = async (idx: number) => {
    if (locked || !current || !participantId) return;
    setSelectedIndex(idx);
    setLocked(true);
    const optionId = current.optionIds[idx];
    await insertVote(current.quizId, optionId, participantId);
    const delay = currentIndex + 1 === opinions.length ? 1100 : 800;
    setTimeout(() => {
      if (currentIndex + 1 < opinions.length) {
        setCurrentIndex((i) => i + 1);
        setSelectedIndex(null);
        setLocked(false);
      } else {
        setShowResult(true);
      }
    }, delay);
  };

  // If participant id still initializing
  if (!participantId) {
    return (
      <div className={styles.globalContainer}>
        <RealtimeStatus />
        <Logo />
        <div className={styles.content}>
          <div className={styles.questionContainer}>Initialisation...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (loading || fetchError || opinions.length === 0) {
    return (
      <div className={styles.globalContainer}>
        <RealtimeStatus />
        <Logo />
        <div className={styles.content}>
          <div className={styles.questionContainer}>
            {fetchError ? fetchError : "Chargement des opinions..."}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className={styles.globalContainer}>
      <RealtimeStatus />
      <Logo />
      <div className={styles.content}>
        {!showResult && current && (
          <>
            <div className={styles.questionContainer}>{current.opinion}</div>
            <div className={styles.answers}>
              {current.options.map((text, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <div
                    key={idx}
                    className={[
                      styles.answerBox,
                      isSelected ? styles.active : "",
                      locked ? styles.locked : "",
                    ].join(" ")}
                    onClick={() => handleSelect(idx)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") && handleSelect(idx)
                    }
                    aria-pressed={isSelected}
                  >
                    {text}
                  </div>
                );
              })}
            </div>
          </>
        )}
        {showResult && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2rem",
              alignItems: "center",
            }}
          >
            <h1 style={{ fontSize: "2rem", fontWeight: "bold", textAlign: "center" }}>
              Merci pour votre participation
            </h1>
            {/* <button
              onClick={() => {
                setCurrentIndex(0);
                setShowResult(false);
                setSelectedIndex(null);
                setLocked(false);
              }}
              style={{
                background: "#3d116a",
                color: "#fff",
                border: "none",
                padding: "0.7rem 1.4rem",
                borderRadius: 14,
                cursor: "pointer",
              }}
            >
              Revoter
            </button> */}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
