"use client";
import Link from "next/link";
import Logo from "@/components/Logo";
import quizStyles from "@/app/quiz/quiz.module.css";
import Footer from "@/components/Footer";

// Start quiz landing page replicating structure from startQuizz.html
// Reuses styling from quiz.module.css to stay visually consistent.

export default function StartQuizzPage() {
  return (
    <div className={quizStyles.globalContainer}>
      <div
        className={quizStyles.content}
        style={{ justifyContent: "space-between" }}
      >
        <Logo />
        <div style={{ textAlign: "center" }}>
          <img
            src="/assets/quizTime.png"
            alt="Quiz Time"
            width={300}
            height={200}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            alignItems: "center",
          }}
        >
          <div>
            <Link
              href="/quiz"
              className={quizStyles.nextBtn}
              style={{ textDecoration: "none" }}
            >
              Commencer le Quiz
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
