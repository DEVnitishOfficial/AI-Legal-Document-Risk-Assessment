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

export const sendOtp = createAsyncThunk(
  "auth/sendOtp",
  async (data: { phone: string }) => {
    const res = await API.post("/auth/otp/send", data);
    return res.data;
  }
);

export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async (data: { phone: string; code: string }) => {
    const res = await API.post("/auth/otp/verify", data);
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
    // True only after an explicit logout (not on a fresh visit with no token),
    // so ProtectedRoute can send people home instead of to /login.
    loggedOut: false,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.loggedOut = true;
      localStorage.removeItem("token");
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loginUser.fulfilled, (state, action: any) => {
      state.user = action.payload.user;
      console.log("Login successful, user data:", action.payload.user);
      state.token = action.payload.token;
      state.loggedOut = false;

      localStorage.setItem("token", action.payload.token);
    });
    builder.addCase(verifyOtp.fulfilled, (state, action: any) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.loggedOut = false;

      localStorage.setItem("token", action.payload.token);
    });
    // Also covers Google login, which stores the token itself and then fetches the user.
    builder.addCase(fetchCurrentUser.fulfilled, (state, action: any) => {
      state.user = action.payload;
      state.loggedOut = false;
    });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;