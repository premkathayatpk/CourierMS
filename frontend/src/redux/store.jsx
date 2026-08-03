import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slice/userSlice";
import parcelReducer from "./slice/parcelSlice";
// import authReducer from "./slice/authSlice";

const store = configureStore({
  reducer: {
    // auth: authReducer,
    user: userReducer,
    parcel: parcelReducer,
  },
});

export default store;
