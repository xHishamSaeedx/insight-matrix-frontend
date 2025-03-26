import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FaUserPlus, FaChartBar, FaUsers, FaCog } from "react-icons/fa";
import { supabase } from "../lib/supabase";

const Dashboard = () => {
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOwnerStatus = async () => {
      try {
        // Get the current user
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        // Get the user's owner status from the users table
        const { data: userData, error } = await supabase
          .from("users")
          .select("owner")
          .eq("user_id", session.user.id)
          .single();

        if (error) throw error;
        setIsOwner(userData.owner);
      } catch (error) {
        console.error("Error checking owner status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkOwnerStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold text-gray-700">Overview</h2>
          {loading ? (
            <div className="h-10 w-32 bg-gray-200 animate-pulse rounded-lg"></div>
          ) : (
            isOwner && (
              <div className="flex gap-4">
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
              </div>
            )
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Analytics Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Total Meetings</p>
                <h3 className="text-2xl font-bold text-gray-800">24</h3>
              </div>
              <FaChartBar className="text-3xl text-indigo-600" />
            </div>
          </div>

          {/* Team Members Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Team Members</p>
                <h3 className="text-2xl font-bold text-gray-800">12</h3>
              </div>
              <FaUsers className="text-3xl text-indigo-600" />
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Settings</p>
                <h3 className="text-2xl font-bold text-gray-800">
                  <Link
                    to="/settings"
                    className="text-indigo-600 hover:text-indigo-700"
                  >
                    Manage
                  </Link>
                </h3>
              </div>
              <FaCog className="text-3xl text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Recent Meetings Section */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-700 mb-6">
            Recent Meetings
          </h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Meeting Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Weekly Sprint Planning
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Mar 25, 2024
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    8 members
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Analyzed
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
