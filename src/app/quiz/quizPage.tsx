"use client";
import { useEffect, useState } from "react";
import styles from "./quiz.module.css";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

interface QuizQuestion {
  id: number;
  question: string;
  // answers list
  options: string[];
  // indice of correct answer (0-based)
  correctIndex: number; // used to award points
  points: number; // points for right answer
  time?: number; // optional custom time for this question
}

const TOTAL_TIME = 60; // fallback total quiz time if per-question not specified

// You can extend / fetch these later; indices provide the correctness info ("indice").
const ANSWER_TIME = 100; // default time for answering questions
const QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question:
      "Lorsqu’on place un glaçon dans un verre d’eau, il flotte partiellement à la surface. On attend qu’il fonde complètement. Que se passe-t-il avec le niveau de l’eau dans le verre ?",
    options: [
      "Il monte",
      "Il descend",
      "Il reste le même",
      "On ne peut pas savoir",
    ],
    correctIndex: 1,
    points: 10,
    time: ANSWER_TIME,
  },
  {
    id: 2,
    question:
      "Quelle technologie est au coeur de l'entrainement des modèles IA de deep learning ?",
    options: ["GPU", "Routeur", "Imprimante 3D", "Scanner"],
    correctIndex: 0,
    points: 10,
    time: ANSWER_TIME,
  },
  {
    id: 3,
    question: "Quel protocole sécurise la communication web via chiffrement ?",
    options: ["FTP", "HTTP", "TLS", "SMTP"],
    correctIndex: 2,
    points: 15,
    time: ANSWER_TIME,
  },
];

export default function QuizPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(
    QUESTIONS[0].time ?? TOTAL_TIME
  );
  const [showResult, setShowResult] = useState(false);
  const [locked, setLocked] = useState(false); // lock after selection until next

  const currentQuestion = QUESTIONS[currentIndex];
  const perQuestionTime = currentQuestion.time ?? TOTAL_TIME;

  // Timer effect for per-question timer
  useEffect(() => {
    if (showResult) return;
    if (questionTimeLeft <= 0) {
      handleNext(false); // treat as unanswered
      return;
    }
    const id = setInterval(() => {
      setQuestionTimeLeft((t) => t - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [questionTimeLeft, showResult]);

  // Progress now represents remaining time (decreasing from 100% to 0%)
  const progressPercent = (questionTimeLeft / perQuestionTime) * 100;

  const handleSelect = (idx: number) => {
    if (locked) return;
    setSelectedIndex(idx);
    setLocked(true);
    // award points if correct
    if (idx === currentQuestion.correctIndex) {
      setScore((s) => s + currentQuestion.points);
    }
    // brief delay before auto advance (slightly longer on last question so user sees result highlight)
    const delay = currentIndex + 1 === QUESTIONS.length ? 1200 : 900;
    setTimeout(() => handleNext(true), delay);
  };

  const handleNext = (wasInteraction: boolean) => {
    setLocked(false);
    setSelectedIndex(null);
    if (currentIndex + 1 < QUESTIONS.length) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      const nxt = QUESTIONS[nextIndex];
      setQuestionTimeLeft(nxt.time ?? TOTAL_TIME);
    } else {
      setShowResult(true);
    }
  };

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
