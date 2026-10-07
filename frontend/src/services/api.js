import { BaseApi } from "../config";
import { compressImage } from "../utils/image";

// Authentication uses the httpOnly "token" cookie set by the API, so the JWT
// is never readable from JavaScript. Drop tokens left behind by older builds.
try {
  localStorage.removeItem("token");
} catch {
  // storage unavailable (private mode) - nothing to clean up
}

export const apiFetch = async (endpoint, options = {}) => {
  // FormData sets its own multipart Content-Type (with boundary)
  const isForm = options.body instanceof FormData;
  const config = {
    ...options,
    credentials: "include",
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  };

  let response;
  try {
    response = await fetch(`${BaseApi}${endpoint}`, config);
  } catch {
    throw new Error("Cannot reach the server. Please check your connection.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || `Request failed with status ${response.status}`,
    );
    error.status = response.status;
    throw error;
  }

  return data;
};

// Compress an image in the browser and upload it as multipart field "image".
export const uploadImage = async (endpoint, file) => {
  const body = new FormData();
  body.append("image", await compressImage(file));
  return apiFetch(endpoint, { method: "PUT", body });
};
