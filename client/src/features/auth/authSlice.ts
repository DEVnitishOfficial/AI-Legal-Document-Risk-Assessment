import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../services/api";
import { toApiFailure, type ApiFailure } from "../../services/apiError";

// Every thunk that a form waits on rejects with { message, status } — plain language plus the
// HTTP status — so the form can show the message and react to it (e.g. "not registered").
type Config = { rejectValue: ApiFailure };

export const loginUser = createAsyncThunk<any, { email: string; password: string }, Config>(
  "auth/login",
  async (data, { rejectWithValue }) => {
    try {
      const res = await API.post("/users/login", data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(toApiFailure(err));
    }
  }
);

export const registerUser = createAsyncThunk<any, any, Config>(
  "auth/register",
  async (data, { rejectWithValue }) => {
    try {
      const res = await API.post("/users/register", data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(toApiFailure(err));
    }
  }
);

export const sendOtp = createAsyncThunk<any, { phone: string }, Config>(
  "auth/sendOtp",
  async (data, { rejectWithValue }) => {
    try {
      const res = await API.post("/auth/otp/send", data);
      return res.data;
    } catch (err) {
      return rejectWithValue(toApiFailure(err));
    }
  }
);

export const verifyOtp = createAsyncThunk<any, { phone: string; code: string }, Config>(
  "auth/verifyOtp",
  async (data, { rejectWithValue }) => {
    try {
      const res = await API.post("/auth/otp/verify", data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(toApiFailure(err));
    }
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
    // True when the server stopped accepting the saved token, so /login can say why.
    sessionExpired: false,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.loggedOut = true;
      state.sessionExpired = false;
      localStorage.removeItem("token");
    },
    sessionExpired: (state) => {
      state.user = null;
      state.token = null;
      state.loggedOut = false;
      state.sessionExpired = true;
      localStorage.removeItem("token");
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loginUser.fulfilled, (state, action: any) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.loggedOut = false;
      state.sessionExpired = false;

      localStorage.setItem("token", action.payload.token);
    });
    builder.addCase(verifyOtp.fulfilled, (state, action: any) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.loggedOut = false;
      state.sessionExpired = false;

      localStorage.setItem("token", action.payload.token);
    });
    // Also covers Google login, which stores the token itself and then fetches the user.
    builder.addCase(fetchCurrentUser.fulfilled, (state, action: any) => {
      state.user = action.payload;
      state.loggedOut = false;
      state.sessionExpired = false;
    });
  },
});

export const { logout, sessionExpired } = authSlice.actions;
export default authSlice.reducer;
