"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RealtimeTest() {
  const [events, setEvents] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("connecting");

  useEffect(() => {
    const channel = supabase
      .channel("test_channel", {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
        },
        (payload) => {
          const timestamp = new Date().toLocaleTimeString();
          setEvents((prev) => [
            ...prev.slice(-4),
            `${timestamp}: Vote ${payload.eventType} - ${JSON.stringify(
              payload.new || payload.old
            )}`,
          ]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "options",
        },
        (payload) => {
          const timestamp = new Date().toLocaleTimeString();
          setEvents((prev) => [
            ...prev.slice(-4),
            `${timestamp}: Option ${payload.eventType} - ${JSON.stringify(
              payload.new || payload.old
            )}`,
          ]);
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
          const timestamp = new Date().toLocaleTimeString();
          setEvents((prev) => [
            ...prev.slice(-4),
            `${timestamp}: Quiz ${payload.eventType} - ${JSON.stringify(
              payload.new || payload.old
            )}`,
          ]);
        }
      )
      .subscribe((status, err) => {
        console.log("Subscription status:", status, err);
        setConnectionStatus(status);
        if (status === "SUBSCRIBED") {
          setEvents((prev) => [
            ...prev,
            `${new Date().toLocaleTimeString()}: Connected to real-time`,
          ]);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const testInsertVote = async () => {
    try {
      // Get a random active opinion
      const { data: quizzes } = await supabase
        .from("quizzes")
        .select("id")
        .eq("status", "active")
        .eq("kind", "opinion")
        .limit(1);

      if (!quizzes || quizzes.length === 0) {
        alert("No active opinions found. Please create one first.");
        return;
      }

      const { data: options } = await supabase
        .from("options")
        .select("id")
        .eq("quiz_id", quizzes[0].id)
        .limit(1);

      if (!options || options.length === 0) {
        alert("No options found for this opinion.");
        return;
      }

      // Insert a test vote
      const { error } = await supabase.from("votes").insert({
        quiz_id: quizzes[0].id,
        option_id: options[0].id,
        participant_id: `test_${Date.now()}`,
      });

      if (error) {
        console.error("Test vote error:", error);
      } else {
        setEvents((prev) => [
          ...prev,
          `${new Date().toLocaleTimeString()}: Test vote inserted`,
        ]);
      }
    } catch (e) {
      console.error("Test failed:", e);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "10px",
        right: "10px",
        background: "white",
        border: "1px solid #ccc",
        padding: "16px",
        borderRadius: "8px",
        width: "400px",
        maxHeight: "300px",
        overflow: "auto",
        fontSize: "12px",
        zIndex: 1000,
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        display: "none",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
        Real-time Test Panel
      </div>
      <div style={{ marginBottom: "8px" }}>
        Status:{" "}
        <span
          style={{
            color: connectionStatus === "SUBSCRIBED" ? "green" : "red",
          }}
        >
          {connectionStatus}
        </span>
      </div>
      <button
        onClick={testInsertVote}
        style={{
          background: "#3b82f6",
          color: "white",
          border: "none",
          padding: "4px 8px",
          borderRadius: "4px",
          marginBottom: "8px",
          cursor: "pointer",
        }}
      >
        Insert Test Vote
      </button>
      <div
        style={{
          background: "#f9fafb",
          padding: "8px",
          borderRadius: "4px",
          maxHeight: "150px",
          overflow: "auto",
        }}
      >
        {events.length === 0 ? (
          <div style={{ color: "#6b7280" }}>No events yet...</div>
        ) : (
          events.map((event, i) => (
            <div key={i} style={{ marginBottom: "4px", fontSize: "11px" }}>
              {event}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
