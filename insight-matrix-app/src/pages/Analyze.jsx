import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { FaChartBar, FaSpinner, FaPlay, FaFolder } from "react-icons/fa";

const Analyze = () => {
  const [meetings, setMeetings] = useState([]);
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [clipUrls, setClipUrls] = useState({});

  useEffect(() => {
    fetchUserWorkspace();
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

  useEffect(() => {
    if (selectedMeeting && clips.length > 0) {
      clips.forEach((clip) => {
        getClipUrl(selectedMeeting, clip.name);
      });
    }
  }, [clips, selectedMeeting]);

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
                        <div className="space-y-3">
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
