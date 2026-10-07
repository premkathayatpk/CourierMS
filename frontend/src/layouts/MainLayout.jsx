import Navbar from "../components/common/Navbar";
import AppRoute from "../routes/AppRoute";

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-ink-50">
      <Navbar />
      <div className="flex-1">
        <AppRoute />
      </div>
    </div>
  );
};

export default MainLayout;
