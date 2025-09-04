"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import styles from "./quiz.module.css";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

interface QuizQuestion {
  id: number; // sequential for UI order
  quizId: string; // real Supabase quiz UUID
  question: string;
  options: string[]; // answers list
  correctIndex: number; // 0-based index of correct answer
  points: number; // points for right answer
  time?: number; // optional per-question time
}

const TOTAL_TIME = 60; // fallback total quiz time if per-question not specified
const ANSWER_TIME = 100; // keep original visual timing unless changed per question
const POINTS_PER_QUESTION = 10; // fixed score per correct answer

// NOTE: We remove mock data and will populate dynamically from Supabase while
// keeping the exact same UI/UX structure below.

export default function QuizPage() {
  // Dynamic questions state replaces static QUESTIONS constant
  const [QUESTIONS, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(TOTAL_TIME);
  const [showResult, setShowResult] = useState(false);
  const [locked, setLocked] = useState(false); // lock after selection until next
  const hasInitialized = useRef(false); // Track if initialization has been done

  // Fetch active quizzes + options and build QUESTIONS list preserving UI contract
  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const { data: quizzes, error: qErr } = await supabase
        .from("quizzes")
        .select("id, question, status, starts_at, ends_at, created_at")
        .eq("status", "active")
        .eq("kind", "quiz")
        .order("created_at", { ascending: true });
      if (qErr) throw qErr;
      const built: QuizQuestion[] = [];
      if (quizzes && quizzes.length) {
        for (let i = 0; i < quizzes.length; i++) {
          const quiz = quizzes[i];
          const { data: opts, error: oErr } = await supabase
            .from("options")
            .select("text,is_correct,order_index")
            .eq("quiz_id", quiz.id)
            .order("order_index", { ascending: true });
          if (oErr) throw oErr;
          if (!opts || opts.length < 2) continue; // need at least 2 options
          const correctIndex = Math.max(
            0,
            opts.findIndex((o) => o.is_correct)
          );
          built.push({
            id: built.length + 1, // sequential id for UI
            quizId: quiz.id,
            question: quiz.question,
            options: opts.map((o) => o.text),
            correctIndex: correctIndex >= 0 ? correctIndex : 0,
            points: POINTS_PER_QUESTION,
            time: ANSWER_TIME,
          });
        }
      }
      setQuestions(built);
      // Reset progression if data set changed
      setCurrentIndex(0);
      setSelectedIndex(null);
      setShowResult(false);
      setLocked(false);
      setScore(0);
      setQuestionTimeLeft(built[0]?.time ?? TOTAL_TIME);
    } catch (e) {
      console.error("Failed to fetch quizzes", e);
      setFetchError("Impossible de charger les quiz.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper functions for name validation
  const isValidFullName = (val: string) => {
    const parts = val.trim().split(/\s+/);
    return parts.length >= 2 && parts.every((p) => p.length >= 2);
  };

  const ensureUserName = useCallback(() => {
    let attempt: string | null = null;
    while (true) {
      attempt = window.prompt("Entrez votre nom complet (ex: Prénom Nom):");
      if (attempt === null) return false; // cancel
      const trimmed = attempt.trim();
      if (isValidFullName(trimmed)) {
        setUserName(trimmed);
        localStorage.setItem("quiz_username", trimmed);
        return true;
      }
      alert(
        "Veuillez entrer votre nom complet (au moins deux mots de 2 lettres)."
      );
    }
  }, []); // Remove userName dependency to prevent recreating the function

  // Initial load + username validation before quiz loads
  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeUser = async () => {
      const stored = localStorage.getItem("quiz_username");
      if (stored && isValidFullName(stored)) {
        setUserName(stored);
        await fetchQuestions();
      } else {
        // Clear invalid stored name and prompt for new one
        localStorage.removeItem("quiz_username");
        setLoading(false); // Stop loading to show name prompt
        // Automatically trigger the name prompt
        setTimeout(() => {
          if (ensureUserName()) {
            fetchQuestions();
          }
        }, 100); // Small delay to ensure component is mounted
      }
    };

    initializeUser();
  }, [fetchQuestions, ensureUserName]); // Include dependencies but use ref to prevent re-runs

  // Real-time subscription (quizzes & options) to keep questions in sync
  useEffect(() => {
    const channel = supabase
      .channel("realtime_quiz_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quizzes" },
        () => {
          fetchQuestions();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "options" },
        () => {
          fetchQuestions();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchQuestions]);

  // Guard: if still loading or no questions, mimic original UI container but empty
  const currentQuestion = QUESTIONS[currentIndex];
  const perQuestionTime = currentQuestion?.time ?? TOTAL_TIME;

  // Insert final score summary after quiz completion
  const insertFinalScore = useCallback(
    async (userName: string, totalScore: number) => {
      try {
        // Insert or update the total score for this user across all quizzes
        const { error } = await supabase.from("scores").upsert(
          {
            quiz_id: "quiz_session", // Use a session identifier since we're tracking total score
            user_name: userName,
            points: totalScore,
          },
          {
            onConflict: "quiz_id,user_name",
          }
        );

        if (error) {
          console.error("Error inserting final score:", error);
        }
      } catch (err) {
        console.error("Failed to insert final score:", err);
      }
    },
    []
  );

  // Timer effect for per-question timer (same behavior)
  const handleNext = useCallback(() => {
    setLocked(false);
    setSelectedIndex(null);
    if (currentIndex + 1 < QUESTIONS.length) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      const nxt = QUESTIONS[nextIndex];
      setQuestionTimeLeft(nxt?.time ?? TOTAL_TIME);
    } else {
      // Quiz completed - insert final score
      if (userName) {
        insertFinalScore(userName, score);
      }
      setShowResult(true);
    }
  }, [currentIndex, QUESTIONS, userName, score, insertFinalScore]);

  useEffect(() => {
    if (showResult || !currentQuestion) return;
    if (questionTimeLeft <= 0) {
      handleNext(); // unanswered auto-advance
      return;
    }
    const id = setInterval(() => setQuestionTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [questionTimeLeft, showResult, currentQuestion, handleNext]);

  const progressPercent = (questionTimeLeft / perQuestionTime) * 100;

  // Insert vote into database
  const insertVote = async (
    quizId: string,
    optionId: string,
    userName: string
  ) => {
    try {
      const { error } = await supabase.from("votes").insert({
        quiz_id: quizId,
        option_id: optionId,
        user_name: userName,
      });

      if (error && error.code !== "23505") {
        // Ignore duplicate vote constraint
        console.error("Error inserting vote:", error);
      }
    } catch (err) {
      console.error("Failed to insert vote:", err);
    }
  };

  const handleSelect = async (idx: number) => {
    if (locked || !currentQuestion || !userName) return;

    setSelectedIndex(idx);
    setLocked(true);

    // Get the actual option ID from database for vote insertion
    try {
      const { data: options, error } = await supabase
        .from("options")
        .select("id, is_correct")
        .eq("quiz_id", currentQuestion.quizId)
        .order("order_index");

      if (error) throw error;

      if (options && options[idx]) {
        // Insert vote into database (for tracking individual answers)
        await insertVote(currentQuestion.quizId, options[idx].id, userName);

        // Update local score if correct (will be saved at end)
        if (idx === currentQuestion.correctIndex) {
          setScore((s) => s + POINTS_PER_QUESTION);
        }
      }
    } catch (err) {
      console.error("Error handling vote:", err);
    }

    const delay = currentIndex + 1 === QUESTIONS.length ? 1200 : 900;
    setTimeout(() => handleNext(), delay);
  };

  // If no username, show name prompt before quiz loads
  if (!userName) {
    return (
      <div className={styles.globalContainer}>
        <Logo />
        <div className={styles.content}>
          <div className={styles.questionContainer}>
            Préparation du quiz... Veuillez entrer votre nom complet pour
            continuer.
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // If fetching or empty, we still render the same structure but with placeholders
  if (loading || fetchError || QUESTIONS.length === 0) {
    return (
      <div className={styles.globalContainer}>
        <Logo />
        <div className={styles.content}>
          <div className={styles.questionContainer}>
            {fetchError ? fetchError : "Chargement des questions..."}
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  // From here onward original UI (structure & classNames) is preserved.

  return (
    <div className={styles.globalContainer}>
      <Logo />
      <div className={styles.content}>
        {!showResult && (
          <>
            <div className={styles.progressContainer}>
              <div className={styles.progressBorder}>
                <div
                  className={styles.progressBar}
                  aria-label="Progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progressPercent)}
                  role="progressbar"
                >
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <div className={styles.progressText}>
                <img
                  src="/assets/timer.png"
                  alt="Timer"
                  className={styles.timerIcon}
                  aria-hidden
                />{" "}
                {questionTimeLeft}s
              </div>
            </div>
            {/* 
            <div className={styles.metaRow}>
              <span className={styles.metaBadge}>
                Question {currentIndex + 1}/{QUESTIONS.length}
              </span>
              <span className={styles.metaBadge}>Score: {score}</span>
              <span className={styles.metaBadge}>
                +{currentQuestion.points} pts
              </span>
            </div>
             */}
            <div className={styles.questionContainer}>
              {currentQuestion.question}
            </div>
            <div className={styles.answers}>
              {currentQuestion.options.map((text, idx) => {
                const isSelected = selectedIndex === idx;
                const isCorrect =
                  locked && idx === currentQuestion.correctIndex;
                const isWrong =
                  locked && isSelected && idx !== currentQuestion.correctIndex;
                return (
                  <div
                    key={idx}
                    className={[
                      styles.answerBox,
                      isSelected ? styles.active : "",
                      isCorrect ? styles.correct : "",
                      isWrong ? styles.wrong : "",
                    ].join(" ")}
                    onClick={() => handleSelect(idx)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") && handleSelect(idx)
                    }
                    aria-pressed={isSelected}
                    aria-label={
                      locked
                        ? isCorrect
                          ? `${text} (correct)`
                          : isWrong
                          ? `${text} (incorrect)`
                          : text
                        : text
                    }
                  >
                    {text}
                  </div>
                );
              })}
            </div>
          </>
        )}
        {/* this is about results */}
        {/* {showResult && (
          <div className={styles.resultBox}>
            <h2>Résultat</h2>
            <p>Votre score: {score} points</p>
            <button
              className={styles.restartBtn}
              onClick={() => {
                setCurrentIndex(0);
                setScore(0);
                setSelectedIndex(null);
                setShowResult(false);
                setQuestionTimeLeft(QUESTIONS[0].time ?? TOTAL_TIME);
                setLocked(false);
              }}
            >
              Recommencer
            </button>
          </div>
        )} */}
        {/* ================ */}
        {showResult && (
          <div
            className="flex justify-center items-center flex-col"
            style={{ gap: "2rem" }}
          >
            <div
              className="img"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <img
                src="/assets/bravo.png"
                alt="Description of image"
                width={"80%"}
              />
            </div>
            <div
              className="msg"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                width: "60%",
              }}
            >
              <div>
                <h1
                  style={{
                    textAlign: "center",
                    fontSize: "2rem",
                    fontWeight: "bold",
                  }}
                >
                  Vous avez fini
                </h1>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: "1rem",
                  width: "100%",
                }}
              >
                <button
                  onClick={() => {
                    window.location.href = "/";
                  }}
                  style={{
                    background: "#3d116a",
                    padding: "0.5rem 1rem",
                    border: "none",
                    borderRadius: "15px",
                    cursor: "pointer",
                    width: "100%",
                    color: "white",
                  }}
                >
                  Accueil
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
