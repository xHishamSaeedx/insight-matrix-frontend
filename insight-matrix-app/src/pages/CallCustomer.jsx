import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FaSpinner,
  FaPhone,
  FaChartBar,
  FaArrowLeft,
  FaChevronRight,
} from "react-icons/fa";
import { supabase } from "../lib/supabase";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

ChartJS.register(ArcElement, Tooltip, Legend);

const CallCustomer = () => {
  const [loading, setLoading] = useState(true);
  const [themeDistribution, setThemeDistribution] = useState({});
  const [isLoadingThemes, setIsLoadingThemes] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [themeInsights, setThemeInsights] = useState([]);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [allThemes, setAllThemes] = useState([]);
  const [selectedFilterTheme, setSelectedFilterTheme] = useState("");
  const [filteredInsights, setFilteredInsights] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [isCallFormOpen, setIsCallFormOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isCallLoading, setIsCallLoading] = useState(false);
  const [callError, setCallError] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [calls, setCalls] = useState({}); // Grouped by vapi-call-id
  const [isLoadingCalls, setIsLoadingCalls] = useState(true);
  const [callsError, setCallsError] = useState(null);
  const [selectedCall, setSelectedCall] = useState(null);

  useEffect(() => {
    const initializePage = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("workspace_id")
          .eq("user_id", session.user.id)
          .single();

        if (userError) throw userError;
        setWorkspaceId(userData.workspace_id);

        // Fetch theme distribution for calls
        await fetchThemeDistribution(userData.workspace_id);
      } catch (error) {
        console.error("Error initializing page:", error);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, []);

  useEffect(() => {
    if (workspaceId) {
      fetchAllThemes();
    }
  }, [workspaceId]);

  const fetchThemeDistribution = async (wsId) => {
    setIsLoadingThemes(true);
    try {
      const { data, error } = await supabase
        .from("feedback_insights")
        .select("theme")
        .eq("workspace_id", wsId)
        .eq("source", "Calls"); // Filter for calls only

      if (error) throw error;

      const distribution = data.reduce((acc, curr) => {
        acc[curr.theme] = (acc[curr.theme] || 0) + 1;
        return acc;
      }, {});

      setThemeDistribution(distribution);
    } catch (error) {
      console.error("Error fetching theme distribution:", error);
    } finally {
      setIsLoadingThemes(false);
    }
  };

  const fetchThemeInsights = async (theme) => {
    try {
      const { data, error } = await supabase
        .from("feedback_insights")
        .select("*")
        .eq("theme", theme)
        .eq("workspace_id", workspaceId)
        .eq("source", "Calls"); // Filter for calls only

      if (error) throw error;

      setThemeInsights(data);
      setSelectedTheme(theme);
    } catch (error) {
      console.error("Error fetching theme insights:", error);
    }
  };

  const fetchAllThemes = async () => {
    try {
      const { data, error } = await supabase
        .from("feedback_insights")
        .select("theme")
        .eq("workspace_id", workspaceId)
        .eq("source", "Calls"); // Filter for calls only

      if (error) throw error;

      const uniqueThemes = [...new Set(data.map((item) => item.theme))];
      setAllThemes(uniqueThemes);
    } catch (error) {
      console.error("Error fetching themes:", error);
    }
  };

  const fetchInsightsByTheme = async (theme) => {
    try {
      const { data, error } = await supabase
        .from("feedback_insights")
        .select("*")
        .eq("theme", theme)
        .eq("workspace_id", workspaceId)
        .eq("source", "Calls"); // Filter for calls only

      if (error) throw error;
      setFilteredInsights(data);
      setSelectedFilterTheme(theme);
    } catch (error) {
      console.error("Error fetching insights by theme:", error);
    }
  };

  const generateAIAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Get all insights for deeper analysis
      const { data: allInsights, error: insightsError } = await supabase
        .from("feedback_insights")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("source", "Calls");

      if (insightsError) throw insightsError;

      const insightData = Object.entries(themeDistribution).map(
        ([theme, count]) => ({
          theme,
          count,
          insights: allInsights.filter((insight) => insight.theme === theme),
        })
      );

      const prompt = `As a customer call analyst, provide a comprehensive analysis of our customer calls data. Here's the data structure:

# Customer Call Analysis Summary

## Top Themes Overview
${insightData
  .map(({ theme, count }) => `- ${theme}: ${count} mentions`)
  .join("\n")}

## Key Patterns and Trends
- **Most Discussed Topics**: Analyze the most frequent themes
- **Customer Sentiment**: Analyze overall sentiment across calls
- **Urgent Areas**: Identify themes that need immediate attention
- **Positive Feedback**: Highlight areas receiving positive feedback

## Product Area Impact
${Array.from(new Set(allInsights.map((i) => i.product_area)))
  .map((area) => `- **${area}**: Impact analysis`)
  .join("\n")}

## Strategic Recommendations
1. Immediate Actions
2. Medium-term Improvements
3. Long-term Strategic Changes

## Customer Experience Insights
- **Pain Points**: Common frustrations or challenges
- **Success Stories**: Areas where customers express satisfaction
- **Feature Requests**: Common requests or suggestions

## Detailed Theme Analysis
${JSON.stringify(insightData, null, 2)}

Please provide specific, actionable insights based on this data.

---
*Analysis generated from ${allInsights.length} customer call insights across ${
        insightData.length
      } themes*`;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: import.meta.env.VITE_OPENAI_MODEL || "gpt-4-turbo-preview",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate analysis");

      const result = await response.json();
      const markdown = result.choices[0].message.content;

      marked.setOptions({
        gfm: true,
        breaks: true,
        headerIds: true,
        mangle: false,
        headerPrefix: "analysis-",
      });

      const sanitizedHtml = DOMPurify.sanitize(marked(markdown));
      setAiAnalysis(sanitizedHtml);
    } catch (error) {
      console.error("Error generating analysis:", error);
      setAnalysisError("Failed to generate AI analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const chartData = {
    labels: Object.keys(themeDistribution),
    datasets: [
      {
        data: Object.values(themeDistribution),
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
          "#FF9F40",
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
        ],
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || "";
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  const handleCallCustomer = async () => {
    setIsCallLoading(true);
    setCallError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      // Get workspace_id from users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("workspace_id")
        .eq("email", session.user.email)
        .single();

      if (userError) throw userError;

      // Get company name from companies table
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("company_name")
        .eq("workspace_id", userData.workspace_id)
        .single();

      if (companyError) throw companyError;

      // Make the call request
      const response = await fetch(
        "https://hook.eu2.make.com/wos5o19jx3tdp418vbwey0h5toii18jr",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workspace_id: userData.workspace_id,
            company_name: companyData.company_name,
            phone_number: phoneNumber,
            customer_name: customerName,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to initiate call");

      // Close form and reset fields on success
      setIsCallFormOpen(false);
      setPhoneNumber("");
      setCustomerName("");
    } catch (error) {
      console.error("Error initiating call:", error);
      setCallError("Failed to initiate call. Please try again.");
    } finally {
      setIsCallLoading(false);
    }
  };

  const fetchCalls = async () => {
    setIsLoadingCalls(true);
    setCallsError(null);

    try {
      // First get all calls
      const { data: callsData, error: callsError } = await supabase
        .from("Calls")
        .select("*")
        .order("created_at", { ascending: false });

      if (callsError) throw callsError;

      // Get all feedback insights referenced in calls
      const feedbackInsightIds = callsData.map(
        (call) => call.feedback_insight_id
      );

      const { data: insightsData, error: insightsError } = await supabase
        .from("feedback_insights")
        .select("*")
        .in("feedback_insights_id", feedbackInsightIds);

      if (insightsError) throw insightsError;

      // Group calls by vapi-call-id and include insights
      const groupedCalls = callsData.reduce((acc, call) => {
        const insights = insightsData.filter(
          (insight) => insight.feedback_insights_id === call.feedback_insight_id
        );

        if (!acc[call["vapi-call-id"]]) {
          acc[call["vapi-call-id"]] = {
            ...call,
            insights: insights,
            allCalls: [call],
          };
        } else {
          acc[call["vapi-call-id"]].insights.push(...insights);
          acc[call["vapi-call-id"]].allCalls.push(call);
        }
        return acc;
      }, {});

      setCalls(groupedCalls);
    } catch (error) {
      console.error("Error fetching calls:", error);
      setCallsError("Failed to load calls. Please try again.");
    } finally {
      setIsLoadingCalls(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="pt-[64px]">
        <header className="bg-white shadow">
          <div className="container mx-auto px-6 py-4">
            <h1 className="text-2xl font-semibold text-gray-800">
              Customer Call Analysis
            </h1>
          </div>
        </header>

        <div className="container mx-auto px-6 py-8">
          {/* Call Customer Button */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Call Customer</h2>
                <p className="text-gray-600 mt-1">
                  Start a new customer call for feedback and analysis
                </p>
              </div>
              <button
                onClick={() => setIsCallFormOpen(true)}
                className="px-6 py-3 rounded-lg flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"
              >
                <FaPhone className="text-sm" />
                Call Customer
              </button>
            </div>
          </div>

          {/* Call Form Modal */}
          <Transition appear show={isCallFormOpen} as={Fragment}>
            <Dialog
              as="div"
              className="relative z-10"
              onClose={() => setIsCallFormOpen(false)}
            >
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black bg-opacity-25" />
              </Transition.Child>

              <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                  >
                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-medium leading-6 text-gray-900"
                      >
                        Call Customer
                      </Dialog.Title>
                      <div className="mt-4">
                        {callError && (
                          <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-lg">
                            {callError}
                          </div>
                        )}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleCallCustomer();
                          }}
                        >
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">
                              Customer Name
                            </label>
                            <input
                              type="text"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              required
                            />
                          </div>
                          <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder="+1234567890"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              required
                            />
                          </div>
                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setIsCallFormOpen(false)}
                              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isCallLoading}
                              className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                                isCallLoading
                                  ? "bg-indigo-400 cursor-not-allowed"
                                  : "bg-indigo-600 hover:bg-indigo-700"
                              }`}
                            >
                              {isCallLoading ? (
                                <>
                                  <FaSpinner className="inline animate-spin mr-2" />
                                  Initiating Call...
                                </>
                              ) : (
                                "Start Call"
                              )}
                            </button>
                          </div>
                        </form>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>

          {/* Recent Calls Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">Recent Calls</h2>
                <p className="text-gray-600 mt-1">
                  Review past customer calls and their insights
                </p>
              </div>
              <button
                onClick={fetchCalls}
                disabled={isLoadingCalls}
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
              >
                {isLoadingCalls ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  "Refresh Calls"
                )}
              </button>
            </div>

            {callsError && (
              <div className="mb-6 p-4 bg-red-50 text-red-800 rounded-lg">
                {callsError}
              </div>
            )}

            {isLoadingCalls ? (
              <div className="flex items-center justify-center py-12">
                <FaSpinner className="animate-spin text-3xl text-indigo-600" />
                <span className="ml-2 text-gray-600">Loading calls...</span>
              </div>
            ) : Object.keys(calls).length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No calls found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedCall ? (
                  <>
                    <button
                      onClick={() => setSelectedCall(null)}
                      className="mb-4 text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-2"
                    >
                      <FaArrowLeft /> Back to all calls
                    </button>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              Call from{" "}
                              {new Date(
                                selectedCall.created_at
                              ).toLocaleString()}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Duration: {Math.floor(selectedCall.duration / 60)}
                              m {selectedCall.duration % 60}s
                            </p>
                          </div>
                          {selectedCall.recording_url && (
                            <a
                              href={selectedCall.recording_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                            >
                              Listen to Recording
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Summary
                          </h4>
                          <p className="text-gray-600">
                            {selectedCall.summary}
                          </p>
                        </div>

                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Transcript
                          </h4>
                          <div className="bg-gray-50 p-4 rounded-md">
                            <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono">
                              {selectedCall.transcript}
                            </pre>
                          </div>
                        </div>

                        {selectedCall.insights.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              Insights ({selectedCall.insights.length})
                            </h4>
                            <div className="grid gap-4">
                              {selectedCall.insights.map((insight, index) => (
                                <div
                                  key={index}
                                  className="bg-white p-4 rounded-lg border border-gray-100"
                                >
                                  <div className="flex gap-2 mb-2">
                                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                                      {insight.theme}
                                    </span>
                                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                      {insight.product_area}
                                    </span>
                                  </div>
                                  <p className="text-gray-800 mb-2">
                                    {insight.insight}
                                  </p>
                                  {insight.feature_recommendation && (
                                    <p className="text-sm text-gray-600 mt-2">
                                      <strong>Recommendation:</strong>{" "}
                                      {insight.feature_recommendation}
                                    </p>
                                  )}
                                  <div className="mt-2">
                                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                      {insight.feedback}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedCall.allCalls.length > 1 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-500">
                              This call generated {selectedCall.allCalls.length}{" "}
                              separate insights
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid gap-4">
                    {Object.entries(calls).map(([vapiCallId, callData]) => (
                      <div
                        key={vapiCallId}
                        onClick={() => setSelectedCall(callData)}
                        className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              Call from{" "}
                              {new Date(callData.created_at).toLocaleString()}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Duration: {Math.floor(callData.duration / 60)}m{" "}
                              {callData.duration % 60}s
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {callData.insights.length} insights generated
                            </p>
                          </div>
                          <div className="text-indigo-600">
                            <FaChevronRight />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Theme Distribution Chart */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Call Theme Distribution
                </h2>
                <p className="text-gray-600">
                  Distribution of themes across customer calls
                </p>
              </div>
            </div>
            <div style={{ height: "400px" }}>
              {isLoadingThemes ? (
                <div className="h-full flex items-center justify-center">
                  <FaSpinner className="animate-spin text-3xl text-indigo-600" />
                  <span className="ml-2 text-gray-600">
                    Loading theme data...
                  </span>
                </div>
              ) : Object.keys(themeDistribution).length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500">No call data available</p>
                </div>
              ) : (
                <Pie data={chartData} options={chartOptions} />
              )}
            </div>
          </div>

          {/* Generate Analysis Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">Generate AI Analysis</h2>
                <p className="text-gray-600 mt-1">
                  Generate comprehensive analysis of customer call patterns and
                  insights
                </p>
              </div>
              <button
                onClick={generateAIAnalysis}
                disabled={
                  isAnalyzing || Object.keys(themeDistribution).length === 0
                }
                className={`px-6 py-3 rounded-lg flex items-center gap-2 ${
                  isAnalyzing || Object.keys(themeDistribution).length === 0
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Analyzing Calls...
                  </>
                ) : (
                  <>
                    <FaChartBar className="text-sm" />
                    Generate Analysis
                  </>
                )}
              </button>
            </div>
            {Object.keys(themeDistribution).length === 0 && (
              <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
                No call data available. Please ensure there are analyzed calls
                before generating analysis.
              </div>
            )}
          </div>

          {/* Theme Insights Explorer */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Call Insights Explorer
            </h2>
            <div className="flex flex-col gap-4">
              <select
                value={selectedFilterTheme}
                onChange={(e) => fetchInsightsByTheme(e.target.value)}
                className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Select a theme</option>
                {allThemes.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>

              {selectedFilterTheme && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    Insights for theme: {selectedFilterTheme}
                  </h3>
                  <div className="grid gap-4">
                    {filteredInsights.map((insight, index) => (
                      <div
                        key={index}
                        className="bg-white p-6 rounded-lg shadow-sm border border-gray-100"
                      >
                        <p className="text-gray-800 text-lg mb-4">
                          {insight.insight}
                        </p>
                        <div className="flex gap-3">
                          <span className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                            {insight.product_area}
                          </span>
                          <span className="text-sm px-3 py-1 bg-green-100 text-green-800 rounded-full">
                            {insight.feedback}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Analysis Results */}
          {aiAnalysis && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">
                    AI-Powered Strategic Analysis
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Comprehensive analysis of customer call patterns and
                    recommendations
                  </p>
                </div>
              </div>

              {analysisError && (
                <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-4">
                  {analysisError}
                </div>
              )}

              <div
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: aiAnalysis }}
              />
              <style jsx global>{`
                .markdown-content h1 {
                  color: #1a202c;
                  font-size: 2.25rem;
                  font-weight: 800;
                  margin-bottom: 1.5rem;
                  border-bottom: 2px solid #e2e8f0;
                  padding-bottom: 0.5rem;
                }
                .markdown-content h2 {
                  color: #2d3748;
                  font-size: 1.5rem;
                  font-weight: 700;
                  margin-top: 2rem;
                  margin-bottom: 1rem;
                }
                .markdown-content h3 {
                  color: #4a5568;
                  font-size: 1.25rem;
                  font-weight: 600;
                  margin-top: 1.5rem;
                  margin-bottom: 0.75rem;
                }
                .markdown-content ul,
                .markdown-content ol {
                  margin-left: 1.5rem;
                  margin-bottom: 1rem;
                }
                .markdown-content li {
                  margin-bottom: 0.5rem;
                }
                .markdown-content strong {
                  color: #2d3748;
                  font-weight: 600;
                }
                .markdown-content blockquote {
                  border-left: 4px solid #e2e8f0;
                  padding-left: 1rem;
                  margin: 1.5rem 0;
                  color: #4a5568;
                }
                .markdown-content hr {
                  margin: 2rem 0;
                  border-color: #e2e8f0;
                }
              `}</style>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CallCustomer;
