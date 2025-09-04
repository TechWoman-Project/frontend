"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Quiz {
  id: string;
  question: string;
  kind: "quiz" | "opinion";
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
}

export default function AdminPage() {
  const [quizzes, setQuizzes] = useState<QuizWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<QuizWithOptions | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    question: "",
    kind: "quiz" as "quiz" | "opinion",
    status: "draft" as "draft" | "active" | "closed",
    starts_at: "",
    ends_at: "",
    options: ["", "", "", ""], // Start with 4 options
    correctOption: 0,
  });

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);

      // Fetch quizzes
      const { data: quizzesData, error: quizzesError } = await supabase
        .from("quizzes")
        .select("*")
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.question.trim()) {
      alert("Please enter a question");
      return;
    }

    const validOptions = formData.options.filter((opt) => opt.trim() !== "");
    if (validOptions.length < 2) {
      alert("Please provide at least 2 options");
      return;
    }

    if (
      formData.kind === "quiz" &&
      formData.correctOption >= validOptions.length
    ) {
      alert("Please select a valid correct answer");
      return;
    }

    try {
      setLoading(true);

      let quizData;

      if (editingQuiz) {
        // Update existing quiz
        const { data, error: quizError } = await supabase
          .from("quizzes")
          .update({
            question: formData.question,
            kind: formData.kind,
            status: formData.status,
            starts_at: formData.starts_at || null,
            ends_at: formData.ends_at || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingQuiz.id)
          .select()
          .single();

        if (quizError) throw quizError;
        quizData = data;

        // Delete existing options
        await supabase.from("options").delete().eq("quiz_id", editingQuiz.id);
      } else {
        // Create new quiz
        const { data, error: quizError } = await supabase
          .from("quizzes")
          .insert({
            question: formData.question,
            kind: formData.kind,
            status: formData.status,
            starts_at: formData.starts_at || null,
            ends_at: formData.ends_at || null,
          })
          .select()
          .single();

        if (quizError) throw quizError;
        quizData = data;
      }

      // Insert options
      const optionsToInsert = validOptions.map((optionText, index) => ({
        quiz_id: quizData.id,
        text: optionText,
        order_index: index,
        is_correct:
          formData.kind === "quiz" ? index === formData.correctOption : false,
      }));

      const { error: optionsError } = await supabase
        .from("options")
        .insert(optionsToInsert);

      if (optionsError) throw optionsError;

      // Reset form
      setFormData({
        question: "",
        kind: "quiz",
        status: "draft",
        starts_at: "",
        ends_at: "",
        options: ["", "", "", ""],
        correctOption: 0,
      });

      setShowCreateForm(false);
      setEditingQuiz(null);
      await fetchQuizzes();

      alert(
        editingQuiz
          ? "Quiz updated successfully!"
          : "Quiz created successfully!"
      );
    } catch (error) {
      console.error("Error saving quiz:", error);
      alert("Failed to save quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (quiz: QuizWithOptions) => {
    setEditingQuiz(quiz);
    setFormData({
      question: quiz.question,
      kind: quiz.kind || "quiz",
      status: quiz.status,
      starts_at: quiz.starts_at?.slice(0, 16) || "", // Format for datetime-local input
      ends_at: quiz.ends_at?.slice(0, 16) || "",
      options: [
        ...quiz.options.map((opt) => opt.text),
        ...Array(Math.max(0, 4 - quiz.options.length)).fill(""),
      ],
      correctOption: quiz.options.findIndex((opt) => opt.is_correct) || 0,
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (quizId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this quiz? This will also delete all votes."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from("quizzes")
        .delete()
        .eq("id", quizId);

      if (error) throw error;

      await fetchQuizzes();
      alert("Quiz deleted successfully!");
    } catch (error) {
      console.error("Error deleting quiz:", error);
      alert("Failed to delete quiz");
    } finally {
      setLoading(false);
    }
  };

  const updateOptionText = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, ""],
    });
  };

  const removeOption = (index: number) => {
    if (formData.options.length <= 2) {
      alert("Quiz must have at least 2 options");
      return;
    }

    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      options: newOptions,
      correctOption:
        formData.correctOption >= index
          ? Math.max(0, formData.correctOption - 1)
          : formData.correctOption,
    });
  };

  if (loading && quizzes.length === 0) {
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-gray-600 mt-2">
                Manage quiz questions and opinion polls
              </p>
            </div>
            <button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setEditingQuiz(null);
                setFormData({
                  question: "",
                  status: "draft",
                  starts_at: "",
                  ends_at: "",
                  options: ["", "", "", ""],
                  correctOption: 0,
                  kind: "quiz",
                });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              {showCreateForm
                ? "Cancel"
                : `Create New ${formData.kind === "quiz" ? "Quiz" : "Opinion"}`}
            </button>
          </div>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-6">
              {editingQuiz
                ? `Edit ${editingQuiz.kind === "quiz" ? "Quiz" : "Opinion"}`
                : `Create New ${formData.kind === "quiz" ? "Quiz" : "Opinion"}`}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Question */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question
                </label>
                <textarea
                  value={formData.question}
                  onChange={(e) =>
                    setFormData({ ...formData, question: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder={
                    formData.kind === "quiz"
                      ? "Enter your quiz question..."
                      : "Enter your opinion question..."
                  }
                  required
                />
              </div>

              {/* Type Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="kind"
                      value="quiz"
                      checked={formData.kind === "quiz"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          kind: e.target.value as "quiz" | "opinion",
                        })
                      }
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2">Quiz (with correct answer)</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="kind"
                      value="opinion"
                      checked={formData.kind === "opinion"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          kind: e.target.value as "quiz" | "opinion",
                        })
                      }
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2">Opinion (voting only)</span>
                  </label>
                </div>
              </div>

              {/* Status and Timing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "draft" | "active" | "closed",
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) =>
                      setFormData({ ...formData, starts_at: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.ends_at}
                    onChange={(e) =>
                      setFormData({ ...formData, ends_at: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Options */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    {formData.kind === "quiz"
                      ? "Answer Options"
                      : "Voting Options"}
                  </label>
                  <button
                    type="button"
                    onClick={addOption}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add Option
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      {formData.kind === "quiz" && (
                        <input
                          type="radio"
                          name="correctOption"
                          checked={formData.correctOption === index}
                          onChange={() =>
                            setFormData({ ...formData, correctOption: index })
                          }
                          className="text-green-600 focus:ring-green-500"
                          title="Mark as correct answer"
                        />
                      )}
                      <input
                        type="text"
                        value={option}
                        onChange={(e) =>
                          updateOptionText(index, e.target.value)
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Option ${index + 1}`}
                      />
                      {formData.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="text-red-600 hover:text-red-700 px-2"
                          title="Remove option"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {formData.kind === "quiz" ? (
                  <p className="text-sm text-gray-500 mt-2">
                    Select the radio button next to the correct answer
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">
                    Opinion voting - no correct answer needed
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingQuiz(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading
                    ? "Saving..."
                    : editingQuiz
                    ? `Update ${
                        editingQuiz.kind === "quiz" ? "Quiz" : "Opinion"
                      }`
                    : `Create ${formData.kind === "quiz" ? "Quiz" : "Opinion"}`}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Quizzes List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              All Items ({quizzes.length})
            </h2>
          </div>

          {quizzes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No quizzes found. Create your first quiz to get started!
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {quiz.question}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            quiz.status === "active"
                              ? "bg-green-100 text-green-800"
                              : quiz.status === "draft"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {quiz.status}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            quiz.kind === "quiz"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {quiz.kind}
                        </span>
                      </div>

                      <div className="space-y-2 mb-3">
                        {quiz.options.map((option, index) => (
                          <div
                            key={option.id}
                            className="flex items-center space-x-2"
                          >
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                                option.is_correct
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {index + 1}
                            </span>
                            <span
                              className={
                                option.is_correct
                                  ? "font-medium text-green-700"
                                  : "text-gray-700"
                              }
                            >
                              {option.text}
                            </span>
                            <span className="text-sm text-gray-500">
                              ({option.votes_cached} votes)
                            </span>
                          </div>
                        ))}
                      </div>

                      <p className="text-sm text-gray-500">
                        Created: {new Date(quiz.created_at).toLocaleString()}
                        {quiz.starts_at && (
                          <>
                            {" "}
                            • Starts:{" "}
                            {new Date(quiz.starts_at).toLocaleString()}
                          </>
                        )}
                        {quiz.ends_at && (
                          <>
                            {" "}
                            • Ends: {new Date(quiz.ends_at).toLocaleString()}
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(quiz)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(quiz.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
