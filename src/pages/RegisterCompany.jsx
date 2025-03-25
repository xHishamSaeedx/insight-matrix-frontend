import { useState } from "react";
import { supabase, supabaseAdmin } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

const RegisterCompany = () => {
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");

  const handleCompanyRegistration = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const domain = getDomainFromEmail(companyEmail);

      // Insert into companies table using admin client to bypass RLS
      const { error: companyError } = await supabaseAdmin
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

  return <div>{/* Render your form components here */}</div>;
};

export default RegisterCompany;
