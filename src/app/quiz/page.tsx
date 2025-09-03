"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Quiz {
  id: string;
  question: string;
  status: "draft" | "active" | "closed";
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

interface Option {
  id: string;
  quiz_id: string;
  text: string;
  order_index: number;
  votes_cached: number;
  is_correct: boolean;
}

interface QuizWithOptions extends Quiz {
  options: Option[];
  userVote?: string; // option_id if user has voted
}

export default function QuizPage() {
  const [quizzes, setQuizzes] = useState<QuizWithOptions[]>([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [votingLoading, setVotingLoading] = useState<string | null>(null);
  const [showResults, setShowResults] = useState<{ [key: string]: boolean }>(
    {}
  );

  const fetchActiveQuizzes = async () => {
    try {
      setLoading(true);

      // Fetch active quizzes
      const { data: quizzesData, error: quizzesError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (quizzesError) throw quizzesError;

      // Fetch options for each quiz
      const quizzesWithOptions: QuizWithOptions[] = [];

      for (const quiz of quizzesData || []) {
        const { data: optionsData, error: optionsError } = await supabase
          .from("options")
          .select("*")
          .eq("quiz_id", quiz.id)
          .order("order_index");

        if (optionsError) throw optionsError;

        quizzesWithOptions.push({
          ...quiz,
          options: optionsData || [],
        });
      }

      setQuizzes(quizzesWithOptions);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      alert("Failed to fetch quizzes");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserVotes = useCallback(async () => {
    if (!userName) return;

    try {
      const { data: votesData, error } = await supabase
        .from("votes")
        .select("quiz_id, option_id")
        .eq("user_name", userName);

      if (error) throw error;

      // Update quizzes with user votes
      setQuizzes((prevQuizzes) =>
        prevQuizzes.map((quiz) => ({
          ...quiz,
          userVote: votesData?.find((vote) => vote.quiz_id === quiz.id)
            ?.option_id,
        }))
      );
    } catch (error) {
      console.error("Error fetching user votes:", error);
    }
  }, [userName]);

  useEffect(() => {
    fetchActiveQuizzes();
    // Get username from localStorage if exists
    const savedUserName = localStorage.getItem("quiz_username");
    if (savedUserName) {
      setUserName(savedUserName);
    }
  }, []);

  useEffect(() => {
    if (userName) {
      localStorage.setItem("quiz_username", userName);
      fetchUserVotes();
    }
  }, [userName, fetchUserVotes]);

  const handleVote = async (quizId: string, optionId: string) => {
    if (!userName.trim()) {
      alert("Please enter your name first!");
      return;
    }

    try {
      setVotingLoading(quizId);

      const { error } = await supabase.from("votes").insert({
        quiz_id: quizId,
        option_id: optionId,
        user_name: userName.trim(),
      });

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation
          alert("You have already voted on this quiz!");
        } else {
          throw error;
        }
        return;
      }

      // Update local state
      setQuizzes((prevQuizzes) =>
        prevQuizzes.map((quiz) =>
          quiz.id === quizId
            ? {
                ...quiz,
                userVote: optionId,
                options: quiz.options.map((opt) =>
                  opt.id === optionId
                    ? { ...opt, votes_cached: opt.votes_cached + 1 }
                    : opt
                ),
              }
            : quiz
        )
      );

      alert("Vote submitted successfully!");
    } catch (error) {
      console.error("Error submitting vote:", error);
      alert("Failed to submit vote");
    } finally {
      setVotingLoading(null);
    }
  };

  const toggleResults = async (quizId: string) => {
    setShowResults((prev) => ({
      ...prev,
      [quizId]: !prev[quizId],
    }));

    // Refresh vote counts when showing results
    if (!showResults[quizId]) {
      try {
        const { data: optionsData, error } = await supabase
          .from("options")
          .select("*")
          .eq("quiz_id", quizId)
          .order("order_index");

        if (error) throw error;

        setQuizzes((prevQuizzes) =>
          prevQuizzes.map((quiz) =>
            quiz.id === quizId ? { ...quiz, options: optionsData || [] } : quiz
          )
        );
      } catch (error) {
        console.error("Error refreshing results:", error);
      }
    }
  };

  const getTotalVotes = (options: Option[]) => {
    return options.reduce((total, option) => total + option.votes_cached, 0);
  };

  const getVotePercentage = (votes: number, total: number) => {
    return total > 0 ? ((votes / total) * 100).toFixed(1) : "0";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              TechWoman Quiz
            </h1>
            <p className="text-gray-600 mb-6">
              Test your knowledge and see how you compare!
            </p>

            {/* User Name Input */}
            <div className="max-w-md mx-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your name to participate"
                maxLength={50}
              />
            </div>
          </div>
        </div>

        {/* Admin Link */}
        <div className="text-center mb-6">
          <Link
            href="/admin"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            → Admin Panel (Create Quizzes)
          </Link>
        </div>

        {/* Quizzes */}
        {quizzes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-gray-500">
              <h2 className="text-xl font-semibold mb-2">No Active Quizzes</h2>
              <p>
                There are no active quizzes at the moment. Check back later!
              </p>
              <Link
                href="/admin"
                className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Create a quiz →
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {quizzes.map((quiz) => {
              const totalVotes = getTotalVotes(quiz.options);
              const userHasVoted = !!quiz.userVote;

              return (
                <div
                  key={quiz.id}
                  className="bg-white rounded-lg shadow-lg p-6"
                >
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      {quiz.question}
                    </h2>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Total votes: {totalVotes}</span>
                      {userHasVoted && (
                        <span className="text-green-600 font-medium">
                          ✓ You voted
                        </span>
                      )}
                      <button
                        onClick={() => toggleResults(quiz.id)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {showResults[quiz.id] ? "Hide Results" : "Show Results"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {quiz.options.map((option) => {
                      const isSelected = quiz.userVote === option.id;
                      const percentage = getVotePercentage(
                        option.votes_cached,
                        totalVotes
                      );
                      const isCorrect = option.is_correct;

                      return (
                        <div key={option.id} className="relative">
                          <button
                            onClick={() => handleVote(quiz.id, option.id)}
                            disabled={
                              userHasVoted ||
                              votingLoading === quiz.id ||
                              !userName.trim()
                            }
                            className={`w-full p-4 text-left rounded-lg border-2 transition-all relative overflow-hidden ${
                              isSelected
                                ? "border-blue-500 bg-blue-50"
                                : userHasVoted
                                ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            } ${
                              showResults[quiz.id] && isCorrect
                                ? "ring-2 ring-green-500 border-green-500"
                                : ""
                            }`}
                          >
                            {/* Progress bar for results */}
                            {showResults[quiz.id] && (
                              <div
                                className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                                  isCorrect ? "bg-green-100" : "bg-gray-100"
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            )}

                            <div className="relative flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                    isSelected
                                      ? "border-blue-500 bg-blue-500 text-white"
                                      : "border-gray-300"
                                  }`}
                                >
                                  {isSelected && (
                                    <span className="text-xs">✓</span>
                                  )}
                                </div>
                                <span className="font-medium text-gray-900">
                                  {option.text}
                                </span>
                                {showResults[quiz.id] && isCorrect && (
                                  <span className="text-green-600 font-semibold text-sm">
                                    ✓ Correct
                                  </span>
                                )}
                              </div>

                              {showResults[quiz.id] && (
                                <div className="text-sm font-medium text-gray-700">
                                  {option.votes_cached} votes ({percentage}%)
                                </div>
                              )}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {votingLoading === quiz.id && (
                    <div className="mt-4 text-center text-blue-600">
                      <div className="inline-flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Submitting vote...
                      </div>
                    </div>
                  )}

                  {!userName.trim() && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-700">
                        Please enter your name above to vote on this quiz.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
