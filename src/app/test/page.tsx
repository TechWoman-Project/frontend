"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ConnectionStatus {
  isConnected: boolean;
  error?: string;
  timestamp?: string;
  version?: string;
  debugInfo?: Record<string, unknown>;
}

export default function TestPage() {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testConnection = async () => {
      try {
        setLoading(true);

        console.log("Testing Supabase connection...");
        console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log("Key exists:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

        // First check if environment variables are available
        if (
          !process.env.NEXT_PUBLIC_SUPABASE_URL ||
          !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ) {
          throw new Error(
            "Supabase environment variables are not configured properly"
          );
        }

        // Test the most basic operation - check if we can make any request
        console.log("Attempting to test connection...");

        // Try to get session (this should work even without tables)
        const { data: session, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          throw sessionError;
        }

        console.log("Session check successful:", session);

        setStatus({
          isConnected: true,
          timestamp: new Date().toISOString(),
          version: "Connection successful - Auth working",
          debugInfo: { session: !!session },
        });
      } catch (error: unknown) {
        console.error("Supabase connection error:", error);

        let errorMessage = "Failed to connect to Supabase";
        let debugInfo = {};

        if (error instanceof Error) {
          errorMessage = error.message;
          debugInfo = {
            name: error.name,
            message: error.message,
            stack: error.stack?.split("\n").slice(0, 3),
          };
        } else if (typeof error === "object" && error !== null) {
          errorMessage = JSON.stringify(error);
          debugInfo = error;
        }

        setStatus({
          isConnected: false,
          error: errorMessage,
          timestamp: new Date().toISOString(),
          debugInfo,
        });
      } finally {
        setLoading(false);
      }
    };

    testConnection();
  }, []);

  const testAuth = async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      console.log("Auth test:", { data, error });
      alert(
        `Auth test: ${
          error
            ? `Error: ${error.message}`
            : "Success - No user logged in (expected)"
        }`
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Auth test error:", error);
      alert(`Auth test failed: ${errorMessage}`);
    }
  };

  const testStorage = async () => {
    try {
      const { data, error } = await supabase.storage.listBuckets();
      console.log("Storage test:", { data, error });
      alert(
        `Storage test: ${
          error
            ? `Error: ${error.message}`
            : `Success - Found ${data?.length || 0} buckets`
        }`
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Storage test error:", error);
      alert(`Storage test failed: ${errorMessage}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Supabase Connection Test
          </h1>

          {/* Connection Status */}
          <div className="mb-8">
            <div
              className={`p-4 rounded-lg ${
                loading
                  ? "bg-yellow-50 border border-yellow-200"
                  : status.isConnected
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-center">
                <div
                  className={`w-3 h-3 rounded-full mr-3 ${
                    loading
                      ? "bg-yellow-400 animate-pulse"
                      : status.isConnected
                      ? "bg-green-400"
                      : "bg-red-400"
                  }`}
                ></div>
                <h2 className="text-lg font-semibold">
                  {loading
                    ? "Testing connection..."
                    : status.isConnected
                    ? "Connected to Supabase!"
                    : "Connection Failed"}
                </h2>
              </div>

              {status.timestamp && (
                <p className="text-sm text-gray-600 mt-2">
                  Last checked: {new Date(status.timestamp).toLocaleString()}
                </p>
              )}

              {status.error && (
                <p className="text-sm text-red-600 mt-2">
                  Error: {status.error}
                </p>
              )}

              {status.debugInfo && (
                <div className="mt-3 p-3 bg-gray-100 rounded text-xs">
                  <strong>Debug Info:</strong>
                  <pre className="mt-1 text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(status.debugInfo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Environment Variables */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">
              Environment Configuration
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div>
                <span className="font-medium">Supabase URL: </span>
                <span className="font-mono text-sm">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL
                    ? "✅ Configured"
                    : "❌ Missing"}
                </span>
              </div>
              <div>
                <span className="font-medium">Supabase Anon Key: </span>
                <span className="font-mono text-sm">
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                    ? "✅ Configured"
                    : "❌ Missing"}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}
              </div>
            </div>
          </div>

          {/* Test Actions */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Test Supabase Features</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={testAuth}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Test Authentication
              </button>

              <button
                onClick={testStorage}
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Test Storage
              </button>
            </div>
          </div>

          {/* API Information */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Next Steps:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • If connected successfully, you can start building with
                Supabase
              </li>
              <li>• Set up your database schema in the Supabase dashboard</li>
              <li>• Configure Row Level Security (RLS) for your tables</li>
              <li>
                • Test the Auth and Storage features using the buttons above
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
