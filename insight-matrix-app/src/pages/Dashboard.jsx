import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FaUserPlus,
  FaChartBar,
  FaUsers,
  FaSpinner,
  FaPlay,
  FaPhone,
} from "react-icons/fa";
import { supabase } from "../lib/supabase";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { marked } from "marked";
import DOMPurify from "dompurify";

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teamMembersCount, setTeamMembersCount] = useState(0);
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

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        // Get the user's data including owner status and company domain
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("owner, company_domain, workspace_id")
          .eq("user_id", session.user.id)
          .single();

        if (userError) throw userError;
        setIsOwner(userData.owner);
        setWorkspaceId(userData.workspace_id);

        // Get total team members count for the company
        const { data: teamData, error: teamError } = await supabase
          .from("users")
          .select("user_id")
          .eq("company_domain", userData.company_domain);

        if (teamError) throw teamError;
        setTeamMembersCount(teamData.length);

        // Fetch theme distribution
        await fetchThemeDistribution(userData.workspace_id);
      } catch (error) {
        console.error("Error initializing dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
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
        .eq("workspace_id", wsId);

      if (error) throw error;

      // Count occurrences of each theme
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
        .eq("workspace_id", workspaceId);

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
        .eq("workspace_id", workspaceId);

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
        .eq("workspace_id", workspaceId);

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
      // Prepare the data for analysis
      const insightData = Object.entries(themeDistribution).map(
        ([theme, count]) => ({
          theme,
          count,
        })
      );

      const prompt = `As a customer feedback analyst, analyze this theme distribution data and provide strategic insights. Format your response using this markdown structure:

# Customer Feedback Analysis Summary

## Top Themes Overview
${insightData.length > 0 ? "" : "*(No theme data available)*"}

## Key Patterns and Trends
- **Primary Focus Areas**: 
- **Notable Patterns**: 
- **Emerging Themes**: 

## Strategic Recommendations
1. 
2. 
3. 

## Detailed Theme Analysis
${JSON.stringify(insightData, null, 2)}

---
*Analysis generated based on ${insightData.length} themes*`;

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

      // Process the markdown
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
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || "";
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage =
              total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  const renderChart = () => {
    if (isLoadingThemes) {
      return (
        <div className="h-full flex items-center justify-center">
          <FaSpinner className="animate-spin text-3xl text-indigo-600" />
          <span className="ml-2 text-gray-600">Loading theme data...</span>
        </div>
      );
    }

    if (Object.keys(themeDistribution).length === 0) {
      return (
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-500">No theme data available</p>
        </div>
      );
    }

    return (
      <div className="h-full space-y-4">
        <div className="h-3/4">
          <Pie data={chartData} options={chartOptions} />
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Main content wrapper - pushes content below navbar */}
      <main className="pt-[64px]">
        {" "}
        {/* Height matches Navbar height */}
        {/* Page header */}
        <header className="bg-white shadow">
          <div className="container mx-auto px-6 py-4">
            <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
          </div>
        </header>
        {/* Page content */}
        <div className="container mx-auto px-6 py-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-semibold text-gray-700">Overview</h2>
            {loading ? (
              <div className="h-10 w-32 bg-gray-200 animate-pulse rounded-lg"></div>
            ) : (
              <div className="flex gap-4">
                <Link to="/analyze">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <FaChartBar className="text-lg" />
                    Analyze Meetings
                  </motion.button>
                </Link>
                <Link to="/call-customer">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FaPhone className="text-lg" />
                    Call Customer
                  </motion.button>
                </Link>
                {isOwner && (
                  <>
                    <Link to="/add-user">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <FaUserPlus className="text-lg" />
                        Add Users
                      </motion.button>
                    </Link>
                    <Link to="/view-users">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        <FaUsers className="text-lg" />
                        View Users
                      </motion.button>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Team Members Card */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Team Members</p>
                <h3 className="text-2xl font-bold text-gray-800">
                  {loading ? (
                    <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    teamMembersCount
                  )}
                </h3>
              </div>
              <FaUsers className="text-3xl text-indigo-600" />
            </div>
          </div>

          {/* Theme Distribution Chart */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-2">Theme Distribution</h2>
            <p className="text-gray-600 mb-6">
              Distribution of themes across AI calls and meeting conversations
            </p>
            <div style={{ height: "600px" }}>{renderChart()}</div>
          </div>

          {/* Theme Insights Explorer */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">
                  Theme Insights Explorer
                </h2>
                <p className="text-gray-600 mt-1">
                  Explore insights from both AI customer calls and team meetings
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
                      customer feedback and insights.
                    </p>
                  </div>
                )}

                {selectedFilterTheme && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-800 mb-2">
                        Insights for theme: {selectedFilterTheme}
                      </h3>
                    </div>
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
          </div>

          {/* AI-Powered Strategic Analysis */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">
                  AI-Powered Strategic Analysis
                </h2>
                <p className="text-gray-600 mt-1">
                  Comprehensive analysis of feedback patterns and
                  recommendations from both AI calls and meetings
                </p>
              </div>
              <button
                onClick={generateAIAnalysis}
                disabled={
                  isAnalyzing || Object.keys(themeDistribution).length === 0
                }
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  isAnalyzing || Object.keys(themeDistribution).length === 0
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
                    Click the button above to generate a comprehensive analysis
                    of your feedback themes from AI calls and meetings,
                    including key patterns and recommendations.
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
