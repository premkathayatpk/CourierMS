import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import ReduxProvider from "./redux/provider";

export const BaseApi = "http://localhost:8000/api";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ReduxProvider>
      <App />
    </ReduxProvider>
  </BrowserRouter>,
);
