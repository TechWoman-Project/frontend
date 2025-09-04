"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RealtimeStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<string>("");

  useEffect(() => {
    const channel = supabase
      .channel("status_check")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        () => {
          setLastEvent(`Vote: ${new Date().toLocaleTimeString()}`);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "options" },
        () => {
          setLastEvent(`Option: ${new Date().toLocaleTimeString()}`);
        }
      )
      .subscribe((status) => {
        console.log("Realtime status:", status);
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        background: isConnected ? "#10b981" : "#ef4444",
        color: "white",
        padding: "8px 12px",
        borderRadius: "4px",
        fontSize: "12px",
              zIndex: 1000,
        display: "none",
      }}
    >
      Real-time: {isConnected ? "Connected" : "Disconnected"}
      {lastEvent && <div>Last: {lastEvent}</div>}
    </div>
  );
}
