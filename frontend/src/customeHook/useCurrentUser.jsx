import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { apiFetch } from "../services/api";
import { clearUser, setUser } from "../redux/slice/userSlice";

// Restores the session from the auth cookie once, when the app boots.
// Login/Register/Logout update the store themselves afterwards.
const useCurrentUser = () => {
  const { user, loading } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      try {
        const data = await apiFetch("/auth/session");
        if (!cancelled) {
          dispatch(data.success && data.user ? setUser(data.user) : clearUser());
        }
      } catch {
        // Not logged in or session expired
        if (!cancelled) dispatch(clearUser());
      }
    };

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return { user, loading };
};

export default useCurrentUser;
