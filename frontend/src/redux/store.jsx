import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slice/userSlice";
import authReducer from "./slice/authSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
  },
});

export default store;
