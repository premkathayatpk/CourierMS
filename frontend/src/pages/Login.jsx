import React, { useState } from "react";
import { BaseApi } from "../main";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${BaseApi}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data.message || "Login fail");
      }

      console.log("Login success:", data);
    } catch (error) {
      setError(error.message || "Login fail");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center px-4">
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl bg-white rounded-2xl flex flex-col px-5 py-8 gap-5 shadow-xl ">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Welcome Back</h1>
          <p className="text-xl text-gray-500  ">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 ">
          <div className=" flex flex-col  w-[100%] gap-2">
            <label className="text-xl" htmlFor="email">
              Email
            </label>
            <input
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              type="email"
              placeholder="Enter your email"
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              required
            />
          </div>
          <div className=" flex flex-col  w-[100%] gap-2">
            <label className="text-xl" htmlFor="password">
              Password
            </label>
            <input
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              type="password"
              placeholder="Enter your password"
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              required
            />
          </div>
          <div>
            <p className="text-blue-700 flex justify-end cursor-pointer">
              Forget Password?
            </p>
          </div>
          <button
            className="bg-blue-600 hover:bg-blue-700 duration-200 py-3 rounded-lg text-white font-semibold text-lg"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
          <p className="text-center text-gray-600">
            Don't have an account?{" "}
            <span
              className="text-blue-600 font-semibold hover:underline cursor-pointer"
              onClick={() => navigate("/register")}
            >
              Register
            </span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
