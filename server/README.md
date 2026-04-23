# 🚀 AI-Powered Legal Document Analyzer

### Backend Setup (Phase 0 + Phase 1)

---

## 📌 Overview

This project is an **AI-powered Legal Document Analyzer and Risk Assessment System**.
The goal is to help users understand complex legal documents by:

* Simplifying legal language
* Extracting important clauses
* Identifying potential risks

This README documents the **initial backend setup**, including:

* Project structure
* Dockerized PostgreSQL setup
* Node.js + TypeScript backend
* Database connection
* User insertion flow

---

## 🏗️ Project Structure

```bash
legal-ai-app/
│
├── client/        # Frontend (React - upcoming)
├── server/        # Backend (Node.js + TypeScript)
├── docs/          # Documentation
```

### Backend Structure

```bash
server/src/
│
├── config/            # Environment & DB config
├── modules/           # Feature-based modules
│   └── user/
│       ├── user.controller.ts
│       ├── user.service.ts
│       ├── user.repository.ts
│       └── user.routes.ts
│
├── common/
│   ├── middleware/    # Error handling middleware
│   ├── errors/        # Custom error classes
│
├── routes/            # Route aggregator
├── app.ts             # Express app setup
├── server.ts          # Entry point
```

---

## ⚙️ Tech Stack

* **Backend:** Node.js + Express + TypeScript
* **Database:** PostgreSQL
* **Containerization:** Docker
* **API Testing:** Postman

---

## 🐳 PostgreSQL Setup using Docker

### 📄 docker-compose.yml

```yaml
services:
  db:
    image: postgres:17-alpine
    container_name: postgres-dev
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

### 📄 .env (root folder)

```env
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=riskassessmentdb
```

---

### ▶️ Run PostgreSQL

```bash
docker-compose up -d
```

Verify:

```bash
docker ps
```

---

## 🗄️ Database Schema

Tables created manually using SQL: for visualization used DBeaver and created table manually using the Dbeaver tool

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  file_path TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE analyses (
  id SERIAL PRIMARY KEY,
  document_id INT UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
  summary TEXT,
  risk_level VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 Database Connection (Node.js)

### Install dependencies

```bash
npm install pg
npm install -D @types/pg
```

---

### 📄 src/config/db.ts

```ts
import { Pool } from "pg";
import { env } from "./env";

export const pool = new Pool({
  user: env.DB_USER,
  host: "localhost",
  database: env.DB_NAME,
  password: env.DB_PASSWORD,
  port: 5432,
});
```

---

## 🔐 Environment Configuration

### 📄 src/config/env.ts

```ts
import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: process.env.PORT || 5000,
  DB_USER: process.env.DB_USER!,
  DB_PASSWORD: process.env.DB_PASSWORD!,
  DB_NAME: process.env.DB_NAME!,
};
```

---

## 🧠 Backend Architecture

The backend follows **Clean Architecture (Layered Pattern)**:

```
Controller → Service → Repository → Database
```

### 🔹 Controller

Handles HTTP request/response

### 🔹 Service

Contains business logic

### 🔹 Repository

Handles database queries

---

## 👤 User Module Implementation

### 📄 Repository Layer

```ts
import { pool } from "../../config/db";

export const createUser = async (name: string, email: string, password: string) => {
  const query = `
    INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const result = await pool.query(query, [name, email, password]);
  return result.rows[0];
};

export const findUserByEmail = async (email: string) => {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );

  return result.rows[0];
};
```

---

### 📄 Service Layer

```ts
import * as userRepo from "./user.repository";
import { AppError } from "../../common/errors/AppError";

export const registerUser = async (data: any) => {
  const existing = await userRepo.findUserByEmail(data.email);

  if (existing) {
    throw new AppError("User already exists", 400);
  }

  return userRepo.createUser(data.name, data.email, data.password);
};
```

---

### 📄 Controller Layer

```ts
export const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};
```

---

## 🌐 API Endpoint

### ➤ Register User

```
POST /api/v1/users/register
```

### 📥 Request Body

```json
{
  "name": "Nitesh",
  "email": "nitesh@test.com",
  "password": "123456"
}
```

---

## ✅ Result

* User successfully inserted into PostgreSQL
* Data persisted in Docker container
* API tested via Postman

---

## 🧱 Key Concepts Learned

* Dockerized database setup
* PostgreSQL schema design
* Raw SQL queries using `pg`
* Clean architecture (Controller → Service → Repository)
* Environment-based configuration

---

## 🚀 Next Steps

* Password hashing (bcrypt)
* JWT authentication
* Login API
* Protected routes

# 🔐 Authentication System (Phase 2)

---

## 📌 Overview

This phase implements **secure authentication** using:

* bcrypt (password hashing)
* JWT (authentication tokens)
* Protected routes (middleware)

---

## 🔑 Features Implemented

* User Registration with hashed password
* User Login with token generation
* JWT-based authentication
* Protected API routes

---

## 📦 Dependencies

```bash
npm install bcrypt jsonwebtoken
```

---

## 🔐 Password Hashing

Passwords are securely hashed using bcrypt before storing in the database.

---

## 🔑 JWT Token

* Token generated on login
* Contains user ID and email
* Expires in 7 days

---

## 🌐 API Endpoints

### ➤ Register

```
POST /api/v1/users/register
```

---

### ➤ Login

```
POST /api/v1/users/login
```

---

### ➤ Get Current User (Protected)

```
GET /api/v1/users/me
```

Header:

```
Authorization: Bearer <token>
```

---

## 🔒 Authentication Flow

1. User registers → password hashed
2. User logs in → receives JWT
3. Token sent in request headers
4. Middleware verifies token
5. Access granted to protected routes

---

## ✅ Result

* Secure authentication system implemented
* Protected routes working
* Tokens validated successfully

---

## 🚀 Next Steps

* File upload system (PDF/DOCX)
* Document processing
* AI integration

---

# 📄 Document Upload & Processing (Phase 3)

---

## 📌 Overview

This phase implements the **document upload and processing system**, which is a core feature of the application.

Users can upload legal documents (PDF), which are:

* Stored on the server
* Saved in the database
* Processed to extract text

---

## 🔑 Features Implemented

* File upload using Multer
* PDF text extraction using pdf-parse
* Document storage in PostgreSQL
* Protected upload route (JWT required)

---

## 📦 Dependencies

```bash
npm install multer pdf-parse

use specific version to properly working: npm install pdf-parse@1.1.1
```

---

## 📁 File Storage

Uploaded files are stored locally:

```
/uploads
```

Each file is renamed with a unique timestamp to avoid conflicts.

---

## 🗄️ Database Integration

When a file is uploaded:

* A record is created in the `documents` table
* Linked to the user via `user_id`

---

## 📄 Text Extraction

PDF files are processed using `pdf-parse` to extract raw text.

This text will be used in future phases for:

* AI summarization
* Clause extraction
* Risk analysis

---

## 🌐 API Endpoint

### ➤ Upload Document (Protected)

```
POST /api/v1/documents/upload
```

### Headers

```
Authorization: Bearer <token>
```

### Body (form-data)

```
file: <PDF file>
```

---

## 🔄 Flow

1. User sends request with file
2. Middleware verifies JWT
3. File stored on server
4. Entry saved in database
5. Text extracted from PDF
6. Response returned with preview

---

## ✅ Result

* File successfully uploaded
* Stored locally
* Metadata saved in DB
* Text extracted successfully

---

## 🚀 Next Steps

* AI Integration (OpenAI)
* Document summarization
* Clause extraction
* Risk detection

---
