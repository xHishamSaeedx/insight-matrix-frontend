import React, { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Sphere,
  MeshDistortMaterial,
  Points,
  PointMaterial,
} from "@react-three/drei";
import {
  FaBrain,
  FaChartLine,
  FaRobot,
  FaClock,
  FaLightbulb,
  FaBug,
  FaComments,
  FaTasks,
} from "react-icons/fa";
import {
  MdMeetingRoom,
  MdInsights,
  MdCategory,
  MdTimeline,
} from "react-icons/md";
import * as random from "maath/random/dist/maath-random.esm";
import Navbar from "./Navbar";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

const StarBackground = (props) => {
  const ref = useRef();
  const [sphere] = useMemo(() => {
    const points = random.inSphere(new Float32Array(5000), { radius: 1.2 });
    return [points];
  }, []);

  useFrame((state, delta) => {
    ref.current.rotation.x -= delta / 10;
    ref.current.rotation.y -= delta / 15;
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points
        ref={ref}
        positions={sphere}
        stride={3}
        frustumCulled={false}
        {...props}
      >
        <PointMaterial
          transparent
          color="#8b5cf6"
          size={0.002}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
};

const AnimatedBackground = () => {
  return (
    <div className="w-full h-full absolute">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <Suspense fallback={null}>
          <StarBackground />
        </Suspense>
      </Canvas>
    </div>
  );
};

const fadeInUpVariant = {
  hidden: {
    opacity: 0,
    y: 30,
    transition: {
      type: "spring",
      damping: 30,
      stiffness: 100,
    },
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 100,
      duration: 0.8,
    },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const cardVariant = {
  hidden: {
    opacity: 0,
    y: 30,
    transition: {
      type: "spring",
      damping: 30,
      stiffness: 100,
    },
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 100,
    },
  },
};

const Home = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const features = [
    {
      icon: <MdMeetingRoom size={24} />,
      title: "Meeting & Call Analysis",
      description:
        "Upload meetings and customer calls in any format. Our AI automatically captures and categorizes key moments across all your conversations.",
    },
    {
      icon: <FaBrain size={24} />,
      title: "Smart Classification",
      description:
        "AI-powered classification system categorizes discussions into ideas, bugs, complaints, and feature requests, making information retrieval effortless.",
    },
    {
      icon: <FaChartLine size={24} />,
      title: "Analytics Dashboard",
      description:
        "Comprehensive visual insights into priority topics, sentiment scores, and trending concerns across meetings and customer interactions.",
    },
    {
      icon: <FaRobot size={24} />,
      title: "AI Voice Assistant",
      description:
        "Proactive AI assistant that conducts customer calls, gathers feedback, and provides instant insights while maintaining natural conversations.",
    },
  ];

  const problemPoints = [
    {
      icon: <MdTimeline size={32} />,
      title: "Manual Feedback Collection",
      description:
        "Teams struggle to consistently gather and track feedback from both internal meetings and customer interactions.",
    },
    {
      icon: <MdCategory size={32} />,
      title: "Complex Classification",
      description:
        "Manual classification of topics from various sources - meetings, customer calls, and feedback sessions becomes overwhelming.",
    },
    {
      icon: <FaTasks size={32} />,
      title: "Decision Paralysis",
      description:
        "Complex decision-making process when analyzing feedback from multiple channels and planning future improvements.",
    },
  ];

  const solutions = [
    {
      icon: <FaLightbulb size={32} />,
      title: "Automated Insights",
      description:
        "AI-powered voice assistant proactively calls customers, while our system automatically captures and categorizes feedback from all sources.",
    },
    {
      icon: <FaBug size={32} />,
      title: "Issue Management",
      description:
        "Track reported issues and feature requests with sentiment scores across both meetings and customer calls, with built-in progress tracking.",
    },
    {
      icon: <FaComments size={32} />,
      title: "Voice Analytics",
      description:
        "Advanced voice analysis helps understand customer sentiment, identify patterns, and extract actionable insights from every conversation.",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617]">
      <Navbar />
      <AnimatedBackground />

      {/* Hero Section */}
      <div className="relative">
        <section id="about" className="container mx-auto px-6 pt-32 pb-24">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUpVariant}
            className="text-center"
          >
            <h1 className="text-6xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-600 leading-normal">
              InsightMatrix
            </h1>
            <p className="text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Transform your meetings and customer calls into actionable
              intelligence. Our AI voice assistant proactively gathers feedback
              while our analytics engine turns conversations into strategic
              insights.
            </p>
            <div className="flex justify-center gap-4">
              {user ? (
                <Link to="/dashboard">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-white text-indigo-600 px-10 py-4 rounded-full font-semibold hover:shadow-lg transition duration-300 text-lg"
                  >
                    Go to Dashboard
                  </motion.button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-white text-indigo-600 px-10 py-4 rounded-full font-semibold hover:shadow-lg transition duration-300 text-lg"
                    >
                      Register Team
                    </motion.button>
                  </Link>
                  <Link to="/login">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="border-2 border-white text-white bg-transparent px-10 py-4 rounded-full font-semibold hover:bg-white hover:text-indigo-600 transition-all duration-300 text-lg"
                    >
                      Login
                    </motion.button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </section>

        {/* Problem Statement Section */}
        <section className="container mx-auto px-6 py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUpVariant}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-8 text-white">
              The Challenge
            </h2>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              In today's fast-paced business environment, meetings are crucial
              for communication and decision-making. However, managing and
              extracting value from multiple daily meetings across teams has
              become increasingly complex.
            </p>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {problemPoints.map((point, index) => (
              <motion.div
                key={index}
                variants={cardVariant}
                className="backdrop-blur-lg bg-white/5 p-8 rounded-2xl border border-white/10"
              >
                <div className="text-violet-400 mb-4">{point.icon}</div>
                <h3 className="text-xl font-semibold mb-4 text-white">
                  {point.title}
                </h3>
                <p className="text-gray-300">{point.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Features Grid */}
        <section
          id="features"
          className="container mx-auto px-6 py-24 bg-gradient-to-b from-transparent to-violet-900/10"
        >
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUpVariant}
            className="text-4xl font-bold text-center mb-16 text-white"
          >
            Powerful Features
          </motion.h2>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={cardVariant}
                whileHover={{
                  y: -5,
                  transition: { type: "spring", stiffness: 300 },
                }}
                className="backdrop-blur-lg bg-white/5 p-8 rounded-2xl hover:bg-white/10 transition duration-300 border border-white/10"
              >
                <div className="text-violet-400 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3 text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Solutions Section */}
        <section id="solutions" className="container mx-auto px-6 py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUpVariant}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-8 text-white">
              Smart Solutions
            </h2>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              InsightMatrix provides intelligent automation and analysis tools
              that transform how organizations handle meeting insights and
              decision-making.
            </p>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {solutions.map((solution, index) => (
              <motion.div
                key={index}
                variants={cardVariant}
                className="backdrop-blur-lg bg-white/5 p-8 rounded-2xl border border-white/10"
              >
                <div className="text-violet-400 mb-4">{solution.icon}</div>
                <h3 className="text-xl font-semibold mb-4 text-white">
                  {solution.title}
                </h3>
                <p className="text-gray-300">{solution.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* CTA Section */}
        <section
          id="contact"
          className="container mx-auto px-6 py-24 text-center"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUpVariant}
          >
            <h2 className="text-4xl font-bold mb-8 text-white">
              Ready to Transform Your Meetings?
            </h2>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Join forward-thinking companies using InsightMatrix to unlock the
              full potential of their meetings and streamline decision-making
              processes.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-10 py-4 rounded-full font-semibold hover:shadow-lg transition duration-300 text-lg"
            >
              Start Free Trial
            </motion.button>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default Home;
