import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BaseApi } from "../main";
import { setLoading, setUser } from "../redux/slice/userSlice";

const useCurrentUser = () => {
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  useEffect(() => {
    if (user) return;

    const fetchUser = async () => {
      try {
        const res = await fetch(`${BaseApi}/user/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          dispatch(clearUser());
          return;
        }

        const data = await res.json();
        // console.log(data.user);

        dispatch(setUser(data.user));
      } catch (error) {
        console.log("Error fertching current user", error);
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchUser();
  }, [dispatch, user]);
  return { user };
};

export default useCurrentUser;
