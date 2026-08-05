import React from "react";
import { useSelector } from "react-redux";

const Profile = () => {
  const { user, loading } = useSelector((state) => state.user);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-center text-gray-500">
        No user profile data available.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        <div className="bg-blue-600 px-6 py-8 text-white flex flex-col sm:flex-row items-center gap-4">
          <div className="w-20 h-20 bg-white text-blue-600 font-bold text-3xl rounded-full flex items-center justify-center shadow-md uppercase">
            {user.name ? user.name.charAt(0) : "U"}
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold">{user.name || "User Name"}</h1>
            <p className="text-blue-100 text-sm">{user.email}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-blue-500 text-xs font-semibold uppercase tracking-wider rounded-full">
              {user.role}
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Full Name
            </p>
            <p className="text-lg font-semibold text-gray-800 mt-1">
              {user.name || "N/A"}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Email Address
            </p>
            <p className="text-lg font-semibold text-gray-800 mt-1">
              {user.email || "N/A"}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Phone Number
            </p>
            <p className="text-lg font-semibold text-gray-800 mt-1">
              {user.phone || "Not provided"}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Account Role
            </p>
            <p className="text-lg font-semibold text-gray-800 mt-1 capitalize">
              {user.role || "N/A"}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 sm:col-span-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Member Since
            </p>
            <p className="text-lg font-semibold text-gray-800 mt-1">
              {user.createdAt
                ? new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "N/A"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
