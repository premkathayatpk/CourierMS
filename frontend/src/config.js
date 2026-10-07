// API base URL. Override per environment with VITE_API_URL in frontend/.env
export const BaseApi = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

// Uploaded images are served by the backend at <origin>/uploads/...
const FILES_ORIGIN = BaseApi.replace(/\/api$/, "");

// "/uploads/avatars/x.jpg" -> "http://localhost:8000/uploads/avatars/x.jpg"
export const fileUrl = (path) => (path ? `${FILES_ORIGIN}${path}` : "");
