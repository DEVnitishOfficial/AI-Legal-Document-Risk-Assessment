# 🎨 Frontend Setup & Authentication UI (Phase 1)

---

## 📌 Overview

This phase sets up the **frontend application** using modern technologies and builds the initial UI for authentication and landing page.

---

## ⚙️ Tech Stack

* React + TypeScript (Vite)
* Tailwind CSS
* Redux Toolkit
* React Router
* Lucide Icons

---

## 🏗️ Features Implemented

* Production-grade folder structure
* Routing setup
* Home page (landing UI)
* Login page
* Register page
* Google login UI (frontend only)

---

## 📁 Folder Structure

```
src/
├── components/
├── features/
├── pages/
├── services/
├── app/
├── routes/
```

---

## 🌐 Pages

### ➤ Home Page

* Hero section
* Features section
* Navigation bar

---

### ➤ Login Page

* Email/password login form
* Google login button (UI only)

---

### ➤ Register Page

* User registration form

---

## 🚀 Navigation

```
/           → Home
/login      → Login Page
/register   → Register Page
```

---

## ⚠️ Notes

* Google authentication not implemented yet
* Backend API integration not connected yet

---

## ✅ Result

* Clean UI setup
* Responsive layout
* Production-ready structure

---


# 🔗 Frontend-Backend Integration & Authentication (Phase 2)

---

## 📌 Overview

This phase connects the frontend with backend APIs and implements authentication using JWT and Google OAuth.

---

## 🔑 Features Implemented

* API integration using Axios
* Redux-based authentication state
* Login & Register API integration
* JWT token storage (localStorage)
* Protected routes
* Google login integration (OAuth)

---

## 🌐 API Integration

All API calls are handled using a centralized Axios instance with automatic token injection.

---

## 🔐 Authentication Flow

1. User logs in
2. Backend returns JWT token
3. Token stored in localStorage
4. Token attached to all API requests
5. Protected routes verified

---

## 🔒 Protected Routes

Users must be authenticated to access protected pages like dashboard.

---

## 🔑 Google OAuth

* Implemented using Google Cloud Platform
* Redirect-based login flow
* Backend handles authentication
* Frontend receives authenticated session

---

## ✅ Result

* Frontend fully connected to backend
* Authentication system working
* Google login enabled
* Secure route protection

---

# 🔐 Google OAuth Authentication

---

## 📌 Overview

This feature enables users to log in using their Google account.

---

## 🔑 Flow

1. User clicks "Continue with Google"
2. Redirected to Google login
3. Google returns user profile
4. Backend:

   * Finds or creates user
   * Generates JWT token
5. Redirects to frontend with token

---

## 🌐 Endpoints

```
GET /api/v1/auth/google
GET /api/v1/auth/google/callback
```

---

## Token Handling

* JWT generated after login
* Sent to frontend via redirect URL
* Stored in localStorage

---

## Result

* Google login fully working
* User auto-created if not exists
* JWT authentication integrated

---

