"use client";
import { useEffect, useState } from "react";
import styles from "./quiz.module.css";

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

interface UserResult {
  id: string;
  name: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  timeSpent: number;
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
  const [userName, setUserName] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(
    QUESTIONS[0].time ?? TOTAL_TIME
  );
  const [showResult, setShowResult] = useState(false);
  const [locked, setLocked] = useState(false); // lock after selection until next
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);

  const currentQuestion = QUESTIONS[currentIndex];
  const perQuestionTime = currentQuestion.time ?? TOTAL_TIME;

  // Timer effect for per-question timer
  useEffect(() => {
    if (showResult || !gameStarted) return;
    if (questionTimeLeft <= 0) {
      handleNext(false); // treat as unanswered
      return;
    }
    const id = setInterval(() => {
      setQuestionTimeLeft((t) => t - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [questionTimeLeft, showResult, gameStarted]);

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

  const startQuiz = () => {
    if (userName.trim().length < 2) {
      alert("Please enter your name (at least 2 characters)");
      return;
    }
    setGameStarted(true);
    setQuizStartTime(new Date());
  };

  const saveResult = () => {
    if (!quizStartTime) return;
    
    const endTime = new Date();
    const timeSpent = Math.floor((endTime.getTime() - quizStartTime.getTime()) / 1000);
    
    const result: UserResult = {
      id: Date.now().toString(),
      name: userName.trim(),
      score: score,
      totalQuestions: QUESTIONS.length,
      completedAt: endTime.toISOString(),
      timeSpent: timeSpent
    };
    
    // Save to localStorage
    localStorage.setItem(`quiz_result_${result.id}`, JSON.stringify(result));
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
      saveResult();
    }
  };

  return (
    <div className={styles.globalContainer}>
      <header className={styles.logoHeader}>
        <img
          src="/assets/logo.png"
          alt="Tech Women Logo"
          className={styles.logo}
        />
      </header>
      <div className={styles.content}>
        {/* Name Input Screen */}
        {!gameStarted && (
          <div className={styles.nameInputContainer}>
            <h2 className={styles.welcomeTitle}>Welcome to TechWoman Quiz! 🚀</h2>
            <p className={styles.welcomeDescription}>
              Test your knowledge and compete with your friends!
            </p>
            <div className={styles.nameInputSection}>
              <label htmlFor="userName" className={styles.nameLabel}>
                Enter your name:
              </label>
              <input
                id="userName"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name here..."
                className={styles.nameInput}
                maxLength={30}
                onKeyDown={(e) => e.key === 'Enter' && startQuiz()}
              />
              <button
                onClick={startQuiz}
                className={styles.startButton}
                disabled={userName.trim().length < 2}
              >
                Start Quiz 🎯
              </button>
            </div>
            <div className={styles.quizInfo}>
              <p>📝 {QUESTIONS.length} Questions</p>
              <p>⏱️ {ANSWER_TIME} seconds per question</p>
              <p>🏆 Compete for the highest score!</p>
            </div>
          </div>
        )}

        {/* Quiz Content */}
        {gameStarted && !showResult && (
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
                /> {questionTimeLeft}s
              </div>
            </div>
            <div className={styles.questionContainer}>
              {currentQuestion.question}
            </div>
            <div className={styles.answers}>
              {currentQuestion.options.map((text, idx) => {
                const isSelected = selectedIndex === idx;
                const isCorrect = locked && idx === currentQuestion.correctIndex;
                const isWrong = locked && isSelected && idx !== currentQuestion.correctIndex;
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
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelect(idx)}
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

        {/* Results Screen */}
        {showResult && (
          <div className={styles.resultBox}>
            <h2>🎉 Quiz Completed!</h2>
            <div className={styles.playerResult}>
              <p className={styles.playerName}>👤 {userName}</p>
              <p className={styles.finalScore}>Your score: {score} points</p>
              <p className={styles.maxScore}>Out of {QUESTIONS.length * 10} possible points</p>
            </div>
            <div className={styles.resultActions}>
              <button
                className={styles.restartBtn}
                onClick={() => {
                  setCurrentIndex(0);
                  setScore(0);
                  setSelectedIndex(null);
                  setShowResult(false);
                  setGameStarted(false);
                  setUserName("");
                  setQuestionTimeLeft(QUESTIONS[0].time ?? TOTAL_TIME);
                  setLocked(false);
                  setQuizStartTime(null);
                }}
              >
                🔄 Play Again
              </button>
              <a href="/result" className={styles.adminBtn}>
                📊 View All Results
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
