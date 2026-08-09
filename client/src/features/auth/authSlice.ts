import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../services/api";
import toast from "react-hot-toast";

export const loginUser = createAsyncThunk(
  "auth/login",
  async (data: { email: string; password: string }) => {
    const res = await API.post("/users/login", data);
    return res.data.data;
  }
);

export const registerUser = createAsyncThunk(
  "auth/register",
  async (data: any) => {
    const res = await API.post("/users/register", data);
    return res.data.data;
  }
);

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async () => {
    const res = await API.get("/users/me");
    return res.data.user;
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    token: localStorage.getItem("token"),
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem("token");
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loginUser.fulfilled, (state, action: any) => {
      state.user = action.payload.user;
      console.log("Login successful, user data:", action.payload.user);
      state.token = action.payload.token;

      localStorage.setItem("token", action.payload.token);
    });
    builder.addCase(fetchCurrentUser.fulfilled, (state, action: any) => {
      state.user = action.payload;
    });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;