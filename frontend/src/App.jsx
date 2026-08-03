import useCurrentUser from "./customeHook/useCurrentUser";
import MainLayout from "./layouts/MainLayout";

const App = () => {
  useCurrentUser();
  
  return (
    <div>
      <MainLayout />
    </div>
  );
};

export default App;
