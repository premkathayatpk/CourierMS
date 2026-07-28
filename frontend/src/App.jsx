import React from "react";
import Navbar from "./components/layout/Navbar";
import AppRouter from "./routes/AppRouter";

const App = () => {
  return (
    <div>
      <Navbar />
      <AppRouter />
    </div>
  );
};

export default App;
