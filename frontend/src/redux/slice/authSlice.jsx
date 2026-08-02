import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  loading: false,
  isAuthenticated: false,
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLoading(state, action) {
      state.loading = action.payload;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.initialized = true;
      state.user = action.payload;
    },
    logout: (state) => {
      state.loading = false;
      state.initialized = true;
      state.isAuthenticated = false;
      state.user = null;
    },
  },
});

export const { setLoading, loginSuccess, logout } = authSlice.actions;

export default authSlice.reducer;
