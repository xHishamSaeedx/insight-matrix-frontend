import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FaUserPlus, FaChartBar, FaUsers } from "react-icons/fa";
import { supabase } from "../lib/supabase";

const Dashboard = () => {
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teamMembersCount, setTeamMembersCount] = useState(0);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Get the current user
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        // Get the user's data including owner status and company domain
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("owner, company_domain")
          .eq("user_id", session.user.id)
          .single();

        if (userError) throw userError;
        setIsOwner(userData.owner);

        // Get total team members count for the company
        const { data: teamData, error: teamError } = await supabase
          .from("users")
          .select("user_id")
          .eq("company_domain", userData.company_domain);

        if (teamError) throw teamError;
        setTeamMembersCount(teamData.length);
      } catch (error) {
        console.error("Error initializing dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, []);

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
          <div className="bg-white rounded-lg shadow p-6">
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
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
