
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { loginSuccess, logout } from "../redux/slice/authSlice";

// import { loginSuccess, logout, setLoading } from "@/redux/slices/authSlice";

// import { getCurrentUser } from "@/services/authService";

export default function useAuth() {
  const dispatch = useDispatch();

  useEffect(() => {
    const loadUser = async () => {
      dispatch(setLoading(true));

      try {
        // const res = await getCurrentUser();

        dispatch(loginSuccess(res.data.data));
      } catch (error) {
        dispatch(logout());
      }
    };

    loadUser();
  }, [dispatch]);
}
