import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { FaChartBar, FaSpinner, FaPlay, FaFolder } from "react-icons/fa";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import { marked } from "marked";
import DOMPurify from "dompurify";

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

const Analyze = () => {
  const [meetings, setMeetings] = useState([]);
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [clipUrls, setClipUrls] = useState({});
  const [clipFeedback, setClipFeedback] = useState({});
  const [themeDistribution, setThemeDistribution] = useState({});
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [themeInsights, setThemeInsights] = useState([]);
  const [allThemes, setAllThemes] = useState([]);
  const [filteredInsights, setFilteredInsights] = useState([]);
  const [selectedFilterTheme, setSelectedFilterTheme] = useState("");
  const [insightDistribution, setInsightDistribution] = useState({});
  const [loadingInsightDistribution, setLoadingInsightDistribution] =
    useState(false);
  const [selectedDistributionTheme, setSelectedDistributionTheme] =
    useState("all");
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  useEffect(() => {
    fetchUserWorkspace();
    fetchThemeDistribution();
    fetchAllThemes();
    fetchInsightDistribution();
  }, []);

  const fetchUserWorkspace = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // Get workspace_id from users table using email
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("workspace_id")
        .eq("email", session.user.email)
        .single();

      if (userError) throw userError;

      console.log("Found workspace_id:", userData.workspace_id); // Debug log
      setWorkspaceId(userData.workspace_id);

      // After getting workspace_id, fetch meetings
      await fetchMeetings(userData.workspace_id);
    } catch (error) {
      console.error("Error fetching workspace:", error);
    }
  };

  const fetchMeetings = async (wsId) => {
    try {
      console.log("Fetching meetings for workspace:", wsId); // Debug log

      // List all folders in the workspace directory
      const { data, error } = await supabase.storage
        .from("conversations")
        .list(wsId.toString()); // Convert to string in case it's a number

      if (error) {
        console.error("Storage list error:", error); // Debug log
        throw error;
      }

      console.log("Raw storage data:", data); // Debug log

      // Filter out non-directory items if any
      const meetingFolders =
        data?.filter(
          (item) =>
            item.metadata?.mimetype === "application/x-directory" ||
            !item.metadata?.mimetype // Include items without mimetype as they might be folders
        ) || [];

      console.log("Filtered meeting folders:", meetingFolders); // Debug log
      setMeetings(meetingFolders);
    } catch (error) {
      console.error("Error fetching meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClips = async (meetingTitle) => {
    try {
      setSelectedMeeting(meetingTitle);
      console.log("Fetching clips for meeting:", meetingTitle); // Debug log

      // List all clips in the meeting directory
      const { data, error } = await supabase.storage
        .from("conversations")
        .list(`${workspaceId}/${meetingTitle}`);

      if (error) {
        console.error("Clips list error:", error); // Debug log
        throw error;
      }

      console.log("Raw clips data:", data); // Debug log

      // Filter for audio/video files
      const clipFiles =
        data?.filter(
          (item) =>
            item.metadata?.mimetype?.startsWith("audio/") ||
            item.metadata?.mimetype?.startsWith("video/")
        ) || [];

      console.log("Filtered clips:", clipFiles); // Debug log
      setClips(clipFiles);
    } catch (error) {
      console.error("Error fetching clips:", error);
    }
  };

  const getClipUrl = async (meetingTitle, clipName) => {
    try {
      // Check if we already have a valid URL
      if (clipUrls[clipName] && clipUrls[clipName].expiry > Date.now()) {
        return clipUrls[clipName].url;
      }

      const { data, error } = await supabase.storage
        .from("conversations")
        .createSignedUrl(`${workspaceId}/${meetingTitle}/${clipName}`, 3600);

      if (error) throw error;

      // Store the URL with its expiry time
      setClipUrls((prev) => ({
        ...prev,
        [clipName]: {
          url: data.signedUrl,
          expiry: Date.now() + 3500000, // Slightly less than 1 hour in milliseconds
        },
      }));

      return data.signedUrl;
    } catch (error) {
      console.error("Error getting clip URL:", error);
      return null;
    }
  };

  const fetchFeedbackForClip = async (meetingTitle, clipName) => {
    try {
      const clipPath = `${workspaceId}/${meetingTitle}/${clipName}`;

      // First get the feedback entry - remove single() and handle multiple results
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedback")
        .select("feedback_insight_id, sentiment")
        .eq("clip_path", clipPath);

      if (feedbackError) throw feedbackError;

      // Handle no results
      if (!feedbackData || feedbackData.length === 0) {
        console.log("No feedback found for clip:", clipPath);
        return;
      }

      // Take the first feedback entry if multiple exist
      const feedback = feedbackData[0];

      // Then get the feedback insights
      const { data: insightData, error: insightError } = await supabase
        .from("feedback_insights")
        .select("theme, insight, product_area, feedback")
        .eq("feedback_insights_id", feedback.feedback_insight_id)
        .single();

      if (insightError) throw insightError;

      if (!insightData) {
        console.log(
          "No insights found for feedback_insight_id:",
          feedback.feedback_insight_id
        );
        return;
      }

      // Combine the data
      setClipFeedback((prev) => ({
        ...prev,
        [clipName]: {
          ...insightData,
          sentiment: feedback.sentiment,
        },
      }));
    } catch (error) {
      // More detailed error logging
      console.error("Error fetching feedback:", {
        error,
        clipPath: `${workspaceId}/${meetingTitle}/${clipName}`,
        details: error.message || "No error message available",
      });
    }
  };

  const fetchThemeDistribution = async () => {
    try {
      const { data, error } = await supabase
        .from("feedback_insights")
        .select("theme")
        .eq("source", "meeting");

      if (error) throw error;

      console.log("Raw feedback insights data:", data); // Debug log

      // Count occurrences of each theme
      const distribution = data.reduce((acc, curr) => {
        acc[curr.theme] = (acc[curr.theme] || 0) + 1;
        return acc;
      }, {});

      console.log("Theme distribution:", distribution); // Debug log
      setThemeDistribution(distribution);
    } catch (error) {
      console.error("Error fetching theme distribution:", error);
    }
  };

  const fetchThemeInsights = async (theme) => {
    try {
      const { data, error } = await supabase
        .from("feedback_insights")
        .select("*")
        .eq("source", "meeting")
        .eq("theme", theme);

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
        .eq("source", "meeting");

      if (error) throw error;

      // Get unique themes
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
        .eq("source", "meeting")
        .eq("theme", theme);

      if (error) throw error;
      setFilteredInsights(data);
      setSelectedFilterTheme(theme);
    } catch (error) {
      console.error("Error fetching insights by theme:", error);
    }
  };

  // Add this helper function to calculate sentiment score
  const calculateSentimentScore = (sentiments) => {
    const total =
      sentiments.POSITIVE + sentiments.NEGATIVE + sentiments.NEUTRAL;
    if (total === 0) return 0;

    // Weight: Positive = 1, Neutral = 0, Negative = -1
    const score = (sentiments.POSITIVE - sentiments.NEGATIVE) / total;
    return score;
  };

  // Update the fetchInsightDistribution function
  const fetchInsightDistribution = async () => {
    try {
      setLoadingInsightDistribution(true);

      const { data: insightsData, error: insightsError } = await supabase
        .from("feedback_insights")
        .select("feedback_insights_id, theme, insight")
        .eq("source", "meeting");

      if (insightsError) throw insightsError;

      const distributionData = {};

      for (const insight of insightsData) {
        const { data: feedbackData, error: countError } = await supabase
          .from("feedback")
          .select("sentiment")
          .eq("feedback_insight_id", insight.feedback_insights_id);

        if (countError) throw countError;

        const sentimentCounts = {
          POSITIVE: 0,
          NEGATIVE: 0,
          NEUTRAL: 0,
        };

        feedbackData.forEach((item) => {
          sentimentCounts[item.sentiment] =
            (sentimentCounts[item.sentiment] || 0) + 1;
        });

        // Calculate overall sentiment score
        const sentimentScore = calculateSentimentScore(sentimentCounts);

        distributionData[insight.insight] = {
          count: feedbackData.length,
          theme: insight.theme,
          sentiments: sentimentCounts,
          sentimentScore: sentimentScore,
          // Add sentiment classification based on score
          overallSentiment:
            sentimentScore > 0.3
              ? "Mostly Positive"
              : sentimentScore < -0.3
              ? "Mostly Negative"
              : "Mixed/Neutral",
        };
      }

      setInsightDistribution(distributionData);
    } catch (error) {
      console.error("Error fetching insight distribution:", error);
    } finally {
      setLoadingInsightDistribution(false);
    }
  };

  const generateAIAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Prepare the data for analysis
      const insightData = Object.entries(insightDistribution).map(
        ([insight, data]) => ({
          insight,
          count: data.count,
          sentiment: data.overallSentiment,
          sentimentScore: data.sentimentScore,
          theme: data.theme,
        })
      );

      const themeData = Object.entries(themeDistribution).map(
        ([theme, count]) => ({
          theme,
          count,
        })
      );

      const prompt = `As a customer feedback analyst, analyze this data and provide strategic insights. Format your response using this markdown structure:

# Customer Feedback Analysis Summary

## Top 3 Significant Themes
${themeData.length > 0 ? "" : "*(No theme data available)*"}

## Overall Sentiment Analysis
- **Positive Trends**: 
- **Areas of Concern**: 
- **Neutral Patterns**: 

## Key Recommendations
### Immediate Action Items
1. 
2. 
3. 

### Strategic Opportunities
1. 
2. 
3. 

### Areas to Maintain
1. 
2. 
3. 

## Detailed Analysis

### Theme Distribution Analysis
${JSON.stringify(themeData, null, 2)}

### Customer Sentiment Patterns
${JSON.stringify(insightData, null, 2)}

---
*Analysis generated based on ${insightData.length} insights across ${
        themeData.length
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
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate analysis");
      }

      const result = await response.json();
      const markdown = result.choices[0].message.content;

      // Process the markdown with custom options
      marked.setOptions({
        gfm: true, // GitHub Flavored Markdown
        breaks: true, // Convert line breaks to <br>
        headerIds: true, // Add IDs to headers
        mangle: false, // Don't escape HTML
        headerPrefix: "analysis-", // Prefix for header IDs
        highlight: function (code) {
          // Add syntax highlighting if needed
          return code;
        },
      });

      // Sanitize and set the processed markdown
      const sanitizedHtml = DOMPurify.sanitize(marked(markdown), {
        ADD_TAGS: [
          "h1",
          "h2",
          "h3",
          "ul",
          "ol",
          "li",
          "p",
          "strong",
          "em",
          "blockquote",
        ],
        ADD_ATTR: ["id", "class"],
      });

      setAiAnalysis(sanitizedHtml);
    } catch (error) {
      console.error("Error generating analysis:", error);
      setAnalysisError("Failed to generate AI analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (selectedMeeting && clips.length > 0) {
      clips.forEach((clip) => {
        getClipUrl(selectedMeeting, clip.name);
        fetchFeedbackForClip(selectedMeeting, clip.name);
      });
    }
  }, [clips, selectedMeeting]);

  // Add this useEffect to monitor themeDistribution changes
  useEffect(() => {
    console.log("Updated theme distribution:", themeDistribution);
    console.log("Chart data:", chartData);
  }, [themeDistribution]);

  // Add this chart data configuration
  const chartData = {
    labels: [
      "ideas",
      "problems",
      "complaints",
      "appreciations",
      "questions",
      "compete mentions",
      "pricing mentions",
      "customer support",
      "customer education",
      "needs triage",
    ],
    datasets: [
      {
        data: [
          themeDistribution["ideas"] || 0,
          themeDistribution["problems"] || 0,
          themeDistribution["complaints"] || 0,
          themeDistribution["appreciations"] || 0,
          themeDistribution["questions"] || 0,
          themeDistribution["compete mentions"] || 0,
          themeDistribution["pricing mentions"] || 0,
          themeDistribution["customer support"] || 0,
          themeDistribution["customer education"] || 0,
          themeDistribution["needs triage"] || 0,
        ],
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
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 2000,
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const clickedElement = elements[0];
        const theme = chartData.labels[clickedElement.index];
        fetchThemeInsights(theme);
      }
    },
    plugins: {
      legend: {
        position: "right",
        labels: {
          padding: 20,
          font: {
            size: 12,
          },
          color: "#333",
          cursor: "pointer",
        },
        onClick: (event, legendItem) => {
          const theme = chartData.labels[legendItem.index];
          fetchThemeInsights(theme);
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || "";
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage =
              total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%) - Click to view insights`;
          },
        },
      },
    },
  };

  const renderChart = () => {
    return (
      <div className="h-full space-y-4">
        <div className="h-3/4">
          <Pie
            data={chartData}
            options={chartOptions}
            fallback={<div>Could not load chart</div>}
          />
        </div>

        {selectedTheme && (
          <div className="h-1/4 overflow-auto">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-800">
                  Insights for theme: {selectedTheme}
                </h4>
                <button
                  onClick={() => setSelectedTheme(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
              <div className="space-y-2">
                {themeInsights.map((insight, index) => (
                  <div
                    key={index}
                    className="bg-white p-3 rounded-md shadow-sm border border-gray-100"
                  >
                    <p className="text-sm text-gray-600">{insight.insight}</p>
                    <div className="mt-2 flex gap-2">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {insight.product_area}
                      </span>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                        {insight.feedback}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Add new function to generate short labels
  const generateShortLabel = (text, index) => {
    return `Insight ${index + 1}`;
  };

  // Update the insightChartData to include sentiment data
  const insightChartData = {
    originalLabels: Object.keys(insightDistribution).filter(
      (key) =>
        selectedDistributionTheme === "all" ||
        insightDistribution[key].theme === selectedDistributionTheme
    ),
    labels: Object.keys(insightDistribution)
      .filter(
        (key) =>
          selectedDistributionTheme === "all" ||
          insightDistribution[key].theme === selectedDistributionTheme
      )
      .map((_, index) => generateShortLabel(_, index)),
    datasets: [
      {
        label: "Positive",
        data: Object.keys(insightDistribution)
          .filter(
            (key) =>
              selectedDistributionTheme === "all" ||
              insightDistribution[key].theme === selectedDistributionTheme
          )
          .map((key) => insightDistribution[key].sentiments.POSITIVE),
        backgroundColor: "rgba(34, 197, 94, 0.6)",
        borderColor: "rgba(255, 255, 255, 0.8)",
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: "Neutral",
        data: Object.keys(insightDistribution)
          .filter(
            (key) =>
              selectedDistributionTheme === "all" ||
              insightDistribution[key].theme === selectedDistributionTheme
          )
          .map((key) => insightDistribution[key].sentiments.NEUTRAL),
        backgroundColor: "rgba(234, 179, 8, 0.6)",
        borderColor: "rgba(255, 255, 255, 0.8)",
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: "Negative",
        data: Object.keys(insightDistribution)
          .filter(
            (key) =>
              selectedDistributionTheme === "all" ||
              insightDistribution[key].theme === selectedDistributionTheme
          )
          .map((key) => insightDistribution[key].sentiments.NEGATIVE),
        backgroundColor: "rgba(239, 68, 68, 0.6)",
        borderColor: "rgba(255, 255, 255, 0.8)",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  // Update the chart options to show stacked bars and better tooltips
  const insightChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        stacked: true,
        ticks: {
          stepSize: 1,
          font: {
            size: 11,
          },
        },
        grid: {
          drawBorder: false,
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        stacked: true,
        ticks: {
          maxRotation: 0,
          minRotation: 0,
          autoSkip: true,
          maxTicksLimit: 20,
          font: {
            size: 12,
          },
        },
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        titleColor: "#333",
        titleFont: {
          size: 12,
          weight: "bold",
        },
        bodyColor: "#666",
        bodyFont: {
          size: 11,
        },
        borderColor: "rgba(0, 0, 0, 0.1)",
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        callbacks: {
          title: (context) => {
            const index = context[0].dataIndex;
            return insightChartData.originalLabels[index];
          },
          label: (context) => {
            const insight = insightChartData.originalLabels[context.dataIndex];
            const dataset = context.dataset.label;
            const value = context.raw;
            const total = insightDistribution[insight].count;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${dataset}: ${value} (${percentage}%)`;
          },
          footer: (context) => {
            const insight =
              insightChartData.originalLabels[context[0].dataIndex];
            return `Total mentions: ${insightDistribution[insight].count}`;
          },
        },
      },
      legend: {
        display: true,
        position: "top",
        labels: {
          font: {
            size: 12,
          },
          usePointStyle: true,
          padding: 20,
        },
      },
    },
    animation: {
      duration: 500,
    },
    barThickness: "flex",
    maxBarThickness: 30,
    barPercentage: 0.8,
    categoryPercentage: 0.9,
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-800">
            Analyze Meetings
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Analytics Dashboard Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow p-6 mb-8"
        >
          <h2 className="text-xl font-semibold mb-6">Analytics Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div
              className="md:col-span-3 bg-white p-6 rounded-lg shadow-sm border border-gray-100"
              style={{ height: "600px" }}
            >
              <h3 className="font-medium text-gray-800 mb-4">
                Theme Distribution
              </h3>
              {Object.keys(themeDistribution).length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <FaSpinner className="animate-spin text-3xl text-indigo-600" />
                </div>
              ) : (
                renderChart()
              )}
            </div>
            <div className="space-y-4">
              <div className="bg-indigo-50 p-6 rounded-lg">
                <h3 className="font-medium text-indigo-800 mb-2">
                  Total Meetings
                </h3>
                <p className="text-3xl font-bold text-indigo-600">
                  {meetings.length}
                </p>
              </div>
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Total Clips</h3>
                <p className="text-3xl font-bold text-green-600">
                  {clips.length}
                </p>
              </div>
              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="font-medium text-purple-800 mb-2">
                  Insights Generated
                </h3>
                <p className="text-3xl font-bold text-purple-600">
                  {Object.keys(clipFeedback).length}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Add new Theme Insights Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Theme Insights Explorer</h2>
              <p className="text-gray-600 mt-1">
                Explore customer feedback insights grouped by themes
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
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
              </div>

              {!selectedFilterTheme && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <div className="mb-4">
                    <FaChartBar className="mx-auto text-4xl text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    Select a Theme to Explore Insights
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Choose a theme from the dropdown above to view related
                    customer feedback and insights. Each insight includes the
                    product area affected and the type of feedback received.
                  </p>
                </div>
              )}

              {selectedFilterTheme && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">
                      Insights for theme: {selectedFilterTheme}
                    </h3>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-100 mr-2"></div>
                        <span>
                          Product Area: The specific feature or section
                          discussed
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-green-100 mr-2"></div>
                        <span>
                          Feedback Type: Nature of the customer's input
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4">
                    {filteredInsights.map((insight, index) => (
                      <div
                        key={index}
                        className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:border-indigo-200 transition-colors"
                      >
                        <p className="text-gray-800 text-lg mb-4">
                          {insight.insight}
                        </p>
                        <div className="flex gap-3 flex-wrap">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-600 mr-2">
                              Product Area:
                            </span>
                            <span className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                              {insight.product_area}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-600 mr-2">
                              Feedback Type:
                            </span>
                            <span className="text-sm px-3 py-1 bg-green-100 text-green-800 rounded-full">
                              {insight.feedback}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Add this after the Analytics Dashboard section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Insights Distribution</h2>
              <p className="text-gray-600 mt-1">
                Frequency of each insight mentioned in customer feedback
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedDistributionTheme}
                onChange={(e) => setSelectedDistributionTheme(e.target.value)}
                className="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="all">All Themes</option>
                {allThemes.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-full">
            <div className="h-[300px]">
              <Bar data={insightChartData} options={insightChartOptions} />
            </div>

            <div className="mt-6 border-t border-gray-100 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Insight Reference
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-4">
                {insightChartData.originalLabels.map((label, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 text-sm py-2 border-b border-gray-50 last:border-b-0"
                  >
                    <span className="font-medium text-gray-700 whitespace-nowrap min-w-[80px]">
                      {generateShortLabel(label, index)}:
                    </span>
                    <div className="flex-1">
                      <span className="text-gray-600">{label}</span>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            insightDistribution[label].overallSentiment ===
                            "Mostly Positive"
                              ? "bg-green-100 text-green-800"
                              : insightDistribution[label].overallSentiment ===
                                "Mostly Negative"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {insightDistribution[label].overallSentiment}
                        </span>
                        <span className="text-xs text-gray-500">
                          Score:{" "}
                          {insightDistribution[label].sentimentScore.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({insightDistribution[label].sentiments.POSITIVE} 👍
                          {insightDistribution[label].sentiments.NEUTRAL} 😐
                          {insightDistribution[label].sentiments.NEGATIVE} 👎)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedDistributionTheme !== "all" && (
              <div className="mt-4 text-center text-sm text-gray-600">
                Showing insights for theme: {selectedDistributionTheme}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">
                AI-Powered Strategic Analysis
              </h2>
              <p className="text-gray-600 mt-1">
                Comprehensive analysis of customer feedback patterns and
                recommendations
              </p>
            </div>
            <button
              onClick={generateAIAnalysis}
              disabled={
                isAnalyzing || Object.keys(insightDistribution).length === 0
              }
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isAnalyzing || Object.keys(insightDistribution).length === 0
                  ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {isAnalyzing ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <FaPlay className="text-sm" />
                  Generate Analysis
                </>
              )}
            </button>
          </div>

          {analysisError && (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-4">
              {analysisError}
            </div>
          )}

          {!aiAnalysis && !isAnalyzing && (
            <div className="text-center py-12">
              <div className="bg-gray-50 rounded-lg p-8">
                <FaChartBar className="mx-auto text-4xl text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  Generate AI Analysis
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Click the button above to generate a comprehensive analysis of
                  your customer feedback, including key patterns,
                  recommendations, and action items.
                </p>
              </div>
            </div>
          )}

          {aiAnalysis && (
            <div className="prose prose-lg max-w-none">
              <div
                className="markdown-content space-y-6"
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
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center">
            <FaSpinner className="animate-spin text-3xl text-indigo-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Meetings List - Left Panel */}
            <div className="md:col-span-1 bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Meetings</h2>
              {meetings.length === 0 ? (
                <div className="text-center py-12">
                  <FaFolder className="mx-auto text-4xl text-gray-400 mb-4" />
                  <p className="text-gray-500">No meetings found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {meetings.map((meeting) => (
                    <motion.div
                      key={meeting.name}
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 rounded-lg cursor-pointer transition-colors ${
                        selectedMeeting === meeting.name
                          ? "bg-indigo-50 border-2 border-indigo-500"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                      onClick={() => fetchClips(meeting.name)}
                    >
                      <h3 className="font-medium text-gray-800">
                        {meeting.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(meeting.created_at).toLocaleDateString()}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Clips Panel - Right Panel */}
            <div className="md:col-span-2 bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                {selectedMeeting
                  ? `Clips - ${selectedMeeting}`
                  : "Select a meeting to view clips"}
              </h2>
              {selectedMeeting ? (
                clips.length === 0 ? (
                  <div className="text-center py-12">
                    <FaChartBar className="mx-auto text-4xl text-gray-400 mb-4" />
                    <p className="text-gray-500">
                      No clips found in this meeting
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {clips.map((clip) => (
                      <motion.div
                        key={clip.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-50 rounded-lg p-4"
                      >
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-medium text-gray-800">
                              {clip.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {(clip.metadata?.size / 1024 / 1024).toFixed(2)}{" "}
                              MB
                            </p>
                          </div>

                          {clipUrls[clip.name] && (
                            <div className="w-full">
                              {clip.metadata?.mimetype?.startsWith("video/") ? (
                                <video
                                  className="w-full rounded-lg"
                                  controls
                                  preload="metadata"
                                  src={clipUrls[clip.name].url}
                                >
                                  Your browser does not support the video
                                  element.
                                </video>
                              ) : (
                                <audio
                                  className="w-full"
                                  controls
                                  preload="metadata"
                                  src={clipUrls[clip.name].url}
                                >
                                  Your browser does not support the audio
                                  element.
                                </audio>
                              )}
                            </div>
                          )}

                          {clipFeedback[clip.name] && (
                            <div className="mt-4 space-y-2 bg-white p-4 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-700">
                                  Sentiment:
                                </span>
                                <span
                                  className={`px-3 py-1 rounded-full text-sm ${
                                    clipFeedback[clip.name].sentiment ===
                                    "positive"
                                      ? "bg-green-100 text-green-800"
                                      : clipFeedback[clip.name].sentiment ===
                                        "negative"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {clipFeedback[clip.name].sentiment}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">
                                  Theme:
                                </span>
                                <p className="text-gray-600">
                                  {clipFeedback[clip.name].theme}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">
                                  Product Area:
                                </span>
                                <p className="text-gray-600">
                                  {clipFeedback[clip.name].product_area}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">
                                  Insight:
                                </span>
                                <p className="text-gray-600">
                                  {clipFeedback[clip.name].insight}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">
                                  Feedback:
                                </span>
                                <p className="text-gray-600">
                                  {clipFeedback[clip.name].feedback}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <FaFolder className="mx-auto text-4xl text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    Select a meeting to view clips
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analyze;
