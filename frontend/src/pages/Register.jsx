import React, { useState } from "react";
import { BaseApi } from "../main";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${BaseApi}/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          phone,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
        return;
      }

      console.log("Register success:", data);

      // Optional: Redirect to login after successful registration
      navigate("/");
    } catch (error) {
      setError(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">Create Account</h1>
          <p className="text-xl text-gray-500 mt-2">Register to get started</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-300 bg-red-100 px-4 py-3 text-red-600">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="flex flex-col gap-2">
            <label className="text-lg font-medium">Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <label className="text-lg font-medium">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label className="text-lg font-medium">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-2">
            <label className="text-lg font-medium">Phone Number</label>
            <input
              type="tel"
              placeholder="Enter your phone number"
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          {/* Role */}
          <div className="flex flex-col gap-2">
            <label className="text-lg font-medium">Role</label>
            <select
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="">Select Role</option>
              <option value="customer">Customer</option>
              <option value="driver">Driver</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Register Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 duration-200 py-3 rounded-lg text-white font-semibold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Account..." : "Register"}
          </button>

          {/* Login Link */}
          <p className="text-center text-gray-600">
            Already have an account?{" "}
            <span
              className="text-blue-600 font-semibold hover:underline cursor-pointer"
              onClick={() => navigate("/login")}
            >
              Login
            </span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
