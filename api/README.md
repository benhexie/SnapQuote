# SnapQuote AI Backend

This directory contains the core backend microservices for SnapQuote AI.

## Architecture

1. **Node.js Main API (`/node_server`)**
   - The primary entry point for the mobile app.
   - Built with Express.js.
   - Responsibilities: Firebase Auth validation, Stripe subscription checks, orchestrating AI generation requests, real-time Firestore database setup.

2. **Rust AI Microservice (`/rust_engine`)**
   - A highly optimized internal engine built with Axum.
   - Responsibilities: Handling Google Gemini 1.5 Flash agent loops, downloading/processing large media from Firebase Storage (using tools like FFMPEG if needed), executing function calls (Tools) for "Prompt-to-Edit" workflows, and securely writing JSON outputs to Firestore.

## Getting Started

### Using Docker Compose (Recommended)

The easiest way to run the entire backend stack locally is with Docker Compose. This ensures the Rust container has FFMPEG pre-installed and networks them together automatically.

```bash
cd api
docker-compose up --build
```

### Running Locally (Without Docker)

#### Node.js API

```bash
cd api/node_server
npm install
node src/app.js
```

### Rust Engine

```bash
cd api/rust_engine
cargo run
```

_Note: Environment variables for Firebase Admin SDK and Gemini API (`GEMINI_API_KEY`) are required for full functionality._

## Setup Instructions

### 1. Firebase Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Enable **Authentication** (e.g., Email/Password or Google Sign-In) and **Firestore Database** in the left sidebar.
3. Generate a Service Account Key:
   - Go to **Project settings** (gear icon) > **Service accounts**.
   - Click **Generate new private key** and download the JSON file.
   - Open the downloaded JSON file and locate `project_id`, `client_email`, and `private_key`. You will use these values to configure your environment variables.
   - _Note: We use explicit environment variables instead of the JSON file directly so it can be securely deployed to cloud platforms like Railway without checking in sensitive files._

### 2. Google Gemini API Setup

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click **Create API key** (you can link it to your existing Google Cloud / Firebase project).
3. Copy the generated API key.

### 3. Environment Variables Setup

Copy the `.env.example` files to `.env` in both service directories and fill in the actual values.

**Node.js API** (`api/node_server/.env`):

```env
PORT=8080
RUST_AI_URL=http://localhost:3000/api/ai

# Firebase Admin Configuration
FIREBASE_PROJECT_ID=your_project_id_here
FIREBASE_CLIENT_EMAIL=your_client_email_here
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

**Rust Engine** (`api/rust_engine/.env`):

```env
PORT=3000
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Firebase Admin Configuration
FIREBASE_PROJECT_ID=your_project_id_here
FIREBASE_CLIENT_EMAIL=your_client_email_here
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```
