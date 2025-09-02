"use client";
import { useEffect, useState } from "react";
import styles from "./quiz.module.css";
import Footer from "@/components/Footer";

interface AnswerOption {
  id: string;
  label: string;
  text: string;
}

const TOTAL_TIME = 60;

const answers: AnswerOption[] = [
  { id: "a", label: "A", text: "Answer 1" },
  { id: "b", label: "B", text: "Answer 2" },
  { id: "c", label: "C", text: "Answer 3" },
  { id: "d", label: "D", text: "Answer 4" },
];

export default function QuizPage() {
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  const progressPercent = ((TOTAL_TIME - timeLeft) / TOTAL_TIME) * 100;

  return (
    <div className={styles.globalContainer}>
      <header className={styles.logoHeader}>logo</header>
      <div className={styles.content}>
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
            <i className="fa-regular fa-hourglass" aria-hidden /> {timeLeft}s
          </div>
        </div>
        <div className={styles.questionContainer}>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Id, a porro.
          Alias dolorum nam obcaecati aperiam? Cumque, beatae iste suscipit
          illum maxime sint nam obcaecati nihil ex consequatur, dolores vitae!
        </div>
        <div className={styles.answers}>
          {answers.map((ans) => (
            <div
              key={ans.id}
              className={`${styles.answerBox} ${
                selected === ans.id ? styles.active : ""
              }`}
              onClick={() => setSelected(ans.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === " ") && setSelected(ans.id)
              }
              aria-pressed={selected === ans.id}
            >
              {ans.text}
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
