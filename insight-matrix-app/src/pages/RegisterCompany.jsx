import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function RegisterCompany() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  // Combined registration state
  const [formData, setFormData] = useState({
    companyName: "",
    companyEmail: "",
    password: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getDomainFromEmail = (email) => {
    return email.split("@")[1];
  };

  const handleRegistration = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const domain = getDomainFromEmail(formData.companyEmail);

      // Sign up the owner first
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.signUp({
        email: formData.companyEmail, // Use the same email for company and owner
        password: formData.password,
      });

      if (authError) throw authError;

      // Insert into companies table
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .insert([
          { company_name: formData.companyName, company_domain: domain },
        ])
        .select();

      if (companyError) throw companyError;

      // Insert into users table
      const { error: userError } = await supabase.from("users").insert([
        {
          user_id: user.id,
          workspace_id: companyData[0].workspace_id,
          company_domain: domain,
          owner: true,
          email: formData.companyEmail,
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
          Register Your Company
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Create your company workspace and owner account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleRegistration} className="space-y-6">
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
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your Company Name"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="companyEmail"
                className="block text-sm font-medium text-gray-700"
              >
                Company Email
              </label>
              <div className="mt-1">
                <input
                  id="companyEmail"
                  name="companyEmail"
                  type="email"
                  required
                  value={formData.companyEmail}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="you@company.com"
                />
                <p className="mt-1 text-sm text-gray-500">
                  This email will be used for your owner account
                </p>
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
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Company & Account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
