import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function RegisterCompany() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  // Company registration state
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");

  // User registration state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const getDomainFromEmail = (email) => {
    return email.split("@")[1];
  };

  const handleCompanyRegistration = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const domain = getDomainFromEmail(companyEmail);

      // Insert into companies table
      const { error: companyError } = await supabase
        .from("companies")
        .insert([{ company_name: companyName, company_domain: domain }])
        .select();

      if (companyError) throw companyError;

      // Move to user registration step
      setStep(2);
      setEmail(companyEmail); // Pre-fill the email for the owner account
    } catch (error) {
      setError(error.message);
    }
  };

  const handleUserRegistration = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const domain = getDomainFromEmail(email);

      // Get workspace_id from companies table
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("workspace_id")
        .eq("company_domain", domain)
        .single();

      if (companyError) throw companyError;

      // Sign up the user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // Insert into users table
      const { error: userError } = await supabase.from("users").insert([
        {
          user_id: user.id,
          workspace_id: companyData.workspace_id,
          company_domain: domain,
          owner: true,
        },
      ]);

      if (userError) throw userError;

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          {step === 1 ? "Register Your Company" : "Create Owner Account"}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleCompanyRegistration}>
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="companyName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Company Name
                  </label>
                  <div className="mt-1">
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="companyEmail"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Company Email Domain
                  </label>
                  <div className="mt-1">
                    <input
                      id="companyEmail"
                      name="companyEmail"
                      type="email"
                      required
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="example@company.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Register Company
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleUserRegistration}>
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
