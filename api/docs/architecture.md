# SnapQuote AI Architecture & API Contracts

## 1. System Overview

SnapQuote AI uses a Core & Edge microservice architecture consisting of:
1. **Firebase (BaaS):** Client Auth, Firestore (JSON invoices), Firebase Storage (media).
2. **Node.js Main Server (Express/Fastify):** Primary API, handles Stripe payments, session validation, and orchestrates requests to the AI engine.
3. **Rust AI Microservice (Axum):** Highly optimized internal engine that handles Google Gemini 1.5 Flash agent loops, tool execution for prompt-to-edit, and output generation.

## 2. Architecture Flow

### Generating a New Quote
1. **Mobile App** authenticates via Firebase Auth.
2. **Mobile App** uploads video/audio/images to Firebase Storage and gets public/signed URLs.
3. **Mobile App** calls Node.js `POST /api/quotes/generate` with the media URLs and user prompt.
4. **Node.js Server** validates the Firebase Auth token, checks subscription status, and records the request.
5. **Node.js Server** makes an internal request to the **Rust Microservice** `POST /api/ai/process` with the media URLs and context.
6. **Rust Microservice**:
   - Downloads/processes media if necessary (e.g., extracts frames via FFMPEG).
   - Constructs the System Prompt and calls the Google Gemini 1.5 Flash API.
   - Parses the structured JSON output (Invoice Schema).
7. **Rust Microservice** writes the final JSON invoice back to Firestore (`/users/{userId}/invoices/{invoiceId}`).
8. **Rust Microservice** responds to Node.js with success/failure.
9. **Node.js Server** responds to the Mobile App, which listens to Firestore for real-time updates.

### Prompt-to-Edit
1. **Mobile App** calls Node.js `POST /api/quotes/edit` with the `invoiceId` and a natural language command (e.g., "Bump labor costs by 15%").
2. **Node.js Server** validates and forwards to **Rust Microservice** `POST /api/ai/edit`.
3. **Rust Microservice** fetches the current invoice from Firestore.
4. **Rust Microservice** calls Gemini with the current invoice state and the user's prompt, exposing Tools (function calling) like `update_line_item(id, new_price)`.
5. **Rust Microservice** executes the tools against the invoice state and saves the updated invoice to Firestore.

## 3. API Contracts

### A. Node.js -> Rust: Generate Quote
**Endpoint:** `POST http://rust-engine:3000/api/ai/process`

**Request Body:**
```json
{
  "user_id": "firebase_uid_123",
  "invoice_id": "firestore_doc_id_456",
  "media_urls": [
    "https://firebasestorage.googleapis.com/v0/b/..."
  ],
  "prompt": "Here is a video walk-through of the bathroom remodel.",
  "project_name": "Bathroom Remodel"
}
```

**Response:**
```json
{
  "status": "success",
  "invoice_id": "firestore_doc_id_456",
  "message": "Invoice generated and saved to Firestore"
}
```

### B. Node.js -> Rust: Prompt-to-Edit
**Endpoint:** `POST http://rust-engine:3000/api/ai/edit`

**Request Body:**
```json
{
  "user_id": "firebase_uid_123",
  "invoice_id": "firestore_doc_id_456",
  "prompt": "Change the tile material to premium ceramic at $8/sqft."
}
```

**Response:**
```json
{
  "status": "success",
  "invoice_id": "firestore_doc_id_456",
  "message": "Invoice updated and saved to Firestore"
}
```
