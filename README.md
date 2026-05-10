# 🔬 Thompson NFA Converter

> An interactive, full-stack web application that visualizes **Thompson's Construction** — converting any regular expression into a Non-deterministic Finite Automaton (NFA) — complete with a secure authentication system and Google Sign-In.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone / Download](#1-clone--download)
  - [2. Setup NFA Backend](#2-setup-nfa-backend)
  - [3. Setup Auth Backend](#3-setup-auth-backend)
  - [4. Open the Frontend](#4-open-the-frontend)
- [API Reference](#-api-reference)
  - [NFA API (Port 3001)](#nfa-api-port-3001)
  - [Auth API (Port 5000)](#auth-api-port-5000)
- [Authentication Flow](#-authentication-flow)
- [Environment Variables](#-environment-variables)
- [Supported Regex Operators](#-supported-regex-operators)
- [Algorithm Details](#-algorithm-details)
- [Screenshots](#-screenshots)
- [License](#-license)

---

## 🧩 Overview

This project has two integrated parts:

| Part | Description |
|------|-------------|
| **NFA Converter** | Enter a regular expression → get a step-by-step visual NFA graph built using Thompson's Construction |
| **Auth System** | Secure login/register with JWT + bcrypt, plus Google OAuth2 Sign-In |

Users must be logged in to use the NFA Converter. Authentication state is managed via `localStorage` tokens and protected on the frontend.

---

## ✨ Features

### NFA Converter
- 🔁 Converts regex to NFA using Thompson's Construction algorithm
- 📊 Interactive graph visualization with step-by-step construction walkthrough
- ⚙️ Supports: concatenation, union `|`, Kleene star `*`, plus `+`, optional `?`, grouping `()`
- ✅ Input validation with descriptive error messages
- 🌙 Dark terminal-style UI with animated floating orbs

### Authentication System
- 🔐 Email/password registration & login
- 🔑 JWT-based stateless sessions (7-day expiry)
- 🔒 bcrypt password hashing (salt rounds: 12)
- 🌐 Google OAuth2 Sign-In (via Google Identity Services token client)
- 🛡️ Protected API routes with JWT middleware
- 🎨 Glassmorphism-style UI with Poppins font

---

## 📁 Project Structure

```
files/
│
├── index.html          # Main NFA Converter page (protected — requires login)
├── login.html          # Login / Register page
├── style.css           # Styles for the NFA Converter
├── auth-nfa.css        # Styles for the Login/Register page
├── script.js           # NFA Converter frontend logic
├── auth-nfa.js         # Auth frontend logic (login, register, Google Sign-In)
│
├── server.js           # NFA Express backend (Port 3001)
├── nfa.js              # Thompson's Construction core algorithm
├── package.json        # NFA backend dependencies
│
└── auth-system/
    ├── backend/
    │   ├── server.js               # Auth Express server (Port 5000)
    │   ├── .env                    # Environment variables (not committed)
    │   ├── package.json
    │   ├── config/
    │   │   └── db.js               # MongoDB connection
    │   ├── controllers/
    │   │   └── authController.js   # register / login / googleAuth logic
    │   ├── middleware/
    │   │   └── authMiddleware.js   # JWT verification middleware
    │   ├── models/
    │   │   └── User.js             # Mongoose User schema
    │   └── routes/
    │       ├── authRoutes.js       # /api/auth/*
    │       └── userRoutes.js       # /api/user/* (protected)
    └── frontend/
        ├── dashboard.html          # User dashboard (protected)
        └── styles.css
```

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| HTML5 / Vanilla JS | Core structure and logic |
| CSS3 | Custom styling, glassmorphism, animations |
| **Poppins** (Google Fonts) | UI typography |
| **JetBrains Mono** (Google Fonts) | Code/mono elements |
| Google Identity Services | OAuth2 Sign-In |

### NFA Backend (Port 3001)
| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.22 | HTTP server |
| cors | ^2.8 | Cross-origin requests |
| nodemon | ^3.0 | Dev auto-reload |

### Auth Backend (Port 5000)
| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18 | HTTP server |
| mongoose | ^8.0 | MongoDB ODM |
| bcryptjs | ^2.4 | Password hashing |
| jsonwebtoken | ^9.0 | JWT generation/verification |
| express-validator | ^7.0 | Input validation |
| google-auth-library | ^10.6 | Google OAuth2 |
| dotenv | ^16.3 | Environment variables |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ — [nodejs.org](https://nodejs.org)
- **MongoDB** (local) — [mongodb.com](https://www.mongodb.com/try/download/community) running on port `27017`
- A **Google Cloud Console** project with an OAuth 2.0 Client ID (for Google Sign-In)

---

### 1. Clone / Download

```bash
# If using git:
git clone <your-repo-url>
cd files
```

---

### 2. Setup NFA Backend

```bash
# From the project root (files/)
npm install
npm run dev
# ✅ NFA backend running at http://localhost:3001
```

---

### 3. Setup Auth Backend

```bash
cd auth-system/backend
npm install
```

Edit `.env` with your values (see [Environment Variables](#-environment-variables)), then:

```bash
npm run dev
# ✅ Auth server running on port 5000
# ✅ MongoDB Connected: localhost
```

---

### 4. Open the Frontend

Open `login.html` in your browser (via Live Server, http-server, or directly):

```bash
# Option A — VS Code Live Server (recommended)
# Right-click login.html → Open with Live Server

# Option B — http-server
npx http-server . -p 5500
# Then visit: http://localhost:5500/login.html

# Option C — Double-click login.html (works too, CORS is open in dev mode)
```

> **Both servers must be running** for full functionality:
> - NFA server on **port 3001**
> - Auth server on **port 5000**

---

## 📡 API Reference

### NFA API (Port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/convert` | Convert a regex string to NFA |
| `GET` | `/health` | Health check |

**POST `/convert`** — Request body:
```json
{ "regex": "a(b|c)*" }
```

Response:
```json
{
  "postfix": "abc|*.a",
  "withConcat": "a.(b|c)*",
  "graph": { "nodes": [...], "edges": [...], "startId": 0, "acceptId": 9 },
  "steps": [...]
}
```

---

### Auth API (Port 5000)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | Public | Create account |
| `POST` | `/api/auth/login` | Public | Login, receive JWT |
| `POST` | `/api/auth/google` | Public | Google OAuth Sign-In |
| `GET` | `/api/user/dashboard` | 🔒 JWT | Get user profile |

**POST `/api/auth/register`**
```json
{
  "name": "Ravi Kumar",
  "email": "ravi@example.com",
  "password": "MyPass123",
  "confirmPassword": "MyPass123"
}
```

**POST `/api/auth/login`**
```json
{
  "email": "ravi@example.com",
  "password": "MyPass123"
}
```

**POST `/api/auth/google`**
```json
{
  "googleId": "11234567890",
  "email": "ravi@gmail.com",
  "name": "Ravi Kumar",
  "picture": "https://..."
}
```

All successful responses return:
```json
{
  "success": true,
  "token": "<JWT>",
  "user": { "id": "...", "name": "...", "email": "..." }
}
```

---

## 🔐 Authentication Flow

```
User visits login.html
        │
        ├─── Email/Password Login
        │         └── POST /api/auth/login
        │                   └── bcrypt.compare() → JWT issued
        │
        └─── Google Sign-In
                  └── GIS Token Client popup
                            └── Fetch /oauth2/v3/userinfo (Google)
                                      └── POST /api/auth/google → JWT issued

JWT stored in localStorage (nfa_token)
        │
        └── index.html checks token on load
                  └── If missing → redirect to login.html
```

---

## ⚙️ Environment Variables

Create `auth-system/backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/auth_system_db

# JWT
JWT_SECRET=your_super_secret_key_change_this_in_production
JWT_EXPIRE=7d

# Google OAuth2
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
```

> ⚠️ **Never commit `.env` to version control.** Add it to `.gitignore`.

Also update `login.html` with your actual Google Client ID:
```html
<meta name="google-client-id" content="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com">
```

---

## 🔣 Supported Regex Operators

| Operator | Symbol | Example | Meaning |
|----------|--------|---------|---------|
| Concatenation | (implicit) | `ab` | a followed by b |
| Union / OR | `\|` | `a\|b` | a or b |
| Kleene Star | `*` | `a*` | zero or more a |
| Plus | `+` | `a+` | one or more a |
| Optional | `?` | `a?` | zero or one a |
| Grouping | `()` | `(ab)*` | group as unit |

---

## 🧠 Algorithm Details

Thompson's Construction works in three passes:

1. **Concatenation Insertion** — Inserts explicit `.` operators between adjacent atoms
2. **Shunting-Yard** — Converts infix regex to postfix notation, respecting operator precedence (`*` > `.` > `|`)
3. **NFA Construction** — Processes postfix token by token, using a stack of NFA fragments:
   - **Symbol**: 2 states, one labeled transition
   - **Concat** (`.`): ε-transition from accept of NFA₁ to start of NFA₂
   - **Union** (`|`): New start/accept, ε-transitions to/from both sub-NFAs
   - **Kleene** (`*`): New start/accept, loop back + skip ε-transitions
   - **Plus** (`+`): Like Kleene but no skip (must match at least once)
   - **Optional** (`?`): New start/accept, ε-skip or through sub-NFA

---

## 📸 Screenshots

> Open `login.html` in a browser to see the dark glassmorphism login/register UI,  
> then log in to access the interactive NFA graph converter at `index.html`.

---

## 📄 License

MIT License — Free to use, modify, and distribute.

---

<div align="center">

Built with ❤️ as an Engineering Project  
**Thompson NFA Converter + Auth System**

</div>
