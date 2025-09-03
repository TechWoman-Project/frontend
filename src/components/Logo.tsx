import styles from "@/app/quiz/quiz.module.css";

export default function Logo() {
  return (
    <>
      <header className={styles.logoHeader}>
        <img
          src="/assets/logo.png"
          alt="Tech Women Logo"
          className={styles.logo}
        />
      </header>
    </>
  );
}
