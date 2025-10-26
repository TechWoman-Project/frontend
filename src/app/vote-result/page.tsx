"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import styles from "../quiz/quiz.module.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RealtimeStatus from "@/components/RealtimeStatus";
import RealtimeTest from "@/components/RealtimeTest";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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

// Chart.js Bar Component
const VoteChart = ({
  options,
  totalVotes,
}: {
  options: OpinionResultOption[];
  totalVotes: number;
}) => {
  const chartRef = useRef<ChartJS<"bar"> | null>(null);

  // Memoize chart data to prevent unnecessary re-renders
  const chartData = useMemo(
    () => ({
      labels: options.map((option) => option.text),
      datasets: [
        {
          label: "Votes",
          data: options.map((option) => option.votes),
          backgroundColor: [
            "rgba(61, 17, 106, 1)",
            "rgba(61, 17, 106, 1)",
            "rgba(61, 17, 106, 1)",
          ],
          borderColor: [
            "rgba(61, 17, 106, 1)",
            "rgba(61, 17, 106, 1)",
            "rgba(61, 17, 106, 1)",
            "rgba(61, 17, 106, 1)",
            "rgba(61, 17, 106, 1)",
          ],
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    }),
    [options]
  );

  // Chart.js options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "white",
        bodyColor: "white",
        borderColor: "rgba(124, 58, 237, 0.8)",
        borderWidth: 1,
        callbacks: {
          label: function (context: { parsed: { y: number } }) {
            const votes = context.parsed.y;
            const percentage =
              totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            return `${votes} vote${votes !== 1 ? "s" : ""} (${percentage}%)`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
          stepSize: 1,
          callback: function (value: string | number) {
            return Number.isInteger(value) ? value : "";
          },
        },
        title: {
          display: true,
          text: "Number of Votes",
          color: "rgba(255, 255, 255, 0.7)",
          font: {
            size: 12,
          },
        },
      },
      x: {
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
          maxRotation: 45,
          minRotation: 0,
        },
      },
    },
    animation: {
      duration: 750,
      easing: "easeInOutQuart" as const,
    },
    interaction: {
      intersect: false,
      mode: "index" as const,
    },
  };

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.data = chartData;
      chartRef.current.update("active");
    }
  }, [chartData]);

  return (
    <div
      style={{
        height: "300px",
        marginBottom: "1rem",
        padding: "1rem",
        backgroundColor: "rgba(45, 30, 64, 0.3)",
        borderRadius: "12px",
        border: "1px solid rgba(124, 58, 237, 0.2)",
      }}
    >
      <Bar ref={chartRef} data={chartData} options={chartOptions} />
    </div>
  );
};

export default function VoteResultPage() {
  const [results, setResults] = useState<OpinionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isUpdating, setIsUpdating] = useState(false);
  const initialized = useRef(false);
  const [rtConnected, setRtConnected] = useState(false);

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

      // If quiz doesn't exist, has error, or wrong kind - remove it
      if (qErr || !quizRow || quizRow.kind !== "opinion") {
        setResults((prev) => prev.filter((q) => q.quizId !== quizId));
        return;
      }

      // If quiz is not active (draft or closed) - remove it from display
      if (quizRow.status !== "active") {
        setResults((prev) => prev.filter((q) => q.quizId !== quizId));
        return;
      }

      // Quiz is active - add or update it
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
          // Update existing quiz
          return prev.map((q) =>
            q.quizId === quizRow.id
              ? { ...q, opinion: quizRow.question, totalVotes, options }
              : q
          );
        }
        // Add new quiz
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
      setLastUpdate(new Date());
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 400);
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
        <Header />
        {/* <Logo /> */}
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
        <Header />
        {/* <Logo /> */}
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
        <Header />
        <RealtimeStatus />
        {/* <Logo /> */}
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
      <Header />
      <RealtimeStatus />
      <RealtimeTest />
      {/* <Logo /> */}
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
            <h2
              style={{
                fontSize: "2.5rem",
                textAlign: "center",
                marginBottom: "0.5rem",
              }}
            >
              {r.opinion}
            </h2>
            <VoteChart options={r.options} totalVotes={r.totalVotes} />
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
