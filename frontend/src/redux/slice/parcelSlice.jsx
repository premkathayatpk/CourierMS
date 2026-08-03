import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  parcel: [],
  loading: true,
};

const parcelSlice = createSlice({
  name: "parcel",
  initialState,
  reducers: {
    setParcel: (state, action) => {
      state.parcel = action.payload;
      state.loading = false;
    },

    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const { setParcel, setLoading } = parcelSlice.actions;
export default parcelSlice.reducer;
