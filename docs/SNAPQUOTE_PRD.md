# Product Requirements Document (PRD): SnapQuote AI

## 1. Executive Summary

**Product Name:** SnapQuote AI  
**Tagline:** "Point, Talk, and Get Paid. The AI Estimator for Contractors."  
**Target Audience:** General contractors, plumbers, electricians, landscapers, and independent tradespeople.  
**Core Value Proposition:** Eliminate the hours spent typing up quotes at night. SnapQuote allows contractors to capture job requirements via video, audio, text, or client document uploads, automatically generating a professional, editable, and sendable invoice in seconds.

## 2. Core Features & Workflows

### Phase 1: Multi-Modal Input Engine

Users can initiate a quote using whichever medium fits their current environment:

- **Video Walk-through (Primary Hook):** User points their camera at the job site and narrates the required work. The app extracts frames (1fps) and audio.
- **Audio Dictation:** "Hands-free" mode for driving or quick updates. User dictates the materials and labor required.
- **Document Upload:** User uploads a PDF or image of a client's "Scope of Work" or a handwritten note.
- **Text Input:** Standard manual text entry for quick, simple jobs.

### Phase 2: AI Generation Core

- **Model:** Google Gemini 1.5 Flash (or Pro for complex multi-page PDFs).
- **Processing:** The backend ingests the multi-modal input and applies a strict system prompt to structure the unstructured data.
- **Output:** A JSON object categorizing line items into Materials, Labor, Equipment, and Fees, complete with estimated costs based on the context provided.

### Phase 3: The "Dual-Mode" Editing Interface

Once the AI generates the initial draft invoice, the user enters the review screen.

- **Manual Editing:** Traditional tap-to-edit. Users can manually adjust prices, change quantities, or delete line items.
- **"Prompt-to-Edit" (Conversational UI):** A chat interface below the invoice. The user can type or use voice-to-text to say:
  - _"Bump all labor costs by 15%."_
  - _"Add a line item for $150 hazardous waste disposal."_
  - _"Change the tile material to premium ceramic at $8/sqft."_
    The AI dynamically updates the invoice state based on natural language commands.

### Phase 4: Finalization & Delivery

- **PDF Generation:** The JSON invoice is rendered into a beautifully styled PDF template featuring the contractor's logo and business details.
- **Export:** One-tap sharing via native OS sharing (Email, SMS/iMessage, WhatsApp).

## 3. Technical Architecture (MVP)

### Frontend (Mobile First)

- **Framework:** React Native with Expo (cross-platform iOS & Android).
- **Key Expo Modules:**
  - `expo-camera` (Video capture)
  - `expo-av` (Audio recording)
  - `expo-document-picker` (PDF/Image uploads)
  - `expo-print` & `expo-sharing` (PDF generation and native sharing)

### Backend & AI

- **BaaS & Database:** Firebase (Firestore for NoSQL invoice data, Firebase Auth for contractor login, Firebase Storage for video/audio/PDF uploads).
- **Main API / Middleware:** Dedicated Node.js server (e.g., Express or Fastify) deployed on a platform like Railway to securely handle payments, business logic, and route requests.
- **AI Microservice:** Rust engine (leveraging `claw-code-main`) to handle the heavy Gemini 1.5 Flash AI agent loops and "Prompt-to-Edit" logic.

* **AI Integration:** Google Gemini API (handles video frames, audio, images, and text seamlessly within a massive context window).

## 4. Monetization & Go-To-Market

- **Pricing Strategy:** Freemium model to drive high conversions.
  - _Free Tier:_ 3 AI-generated quotes per month (Proof of Concept).
  - _Pro Tier:_ $49 - $99/month for unlimited quotes, custom branding, and premium document parsing.
- **Acquisition Wedge:** "Stop doing paperwork at 9 PM. Get your evenings back."

## 5. Future Roadmap (Post-MVP)

- **CRM Integration:** Sync generated quotes to QuickBooks or Jobber.
- **Historical Pricing:** The AI learns the specific contractor's pricing habits over time (e.g., "John always charges $120/hr for plumbing").
- **Follow-up Automation:** AI drafts follow-up emails for quotes that haven't been accepted after 3 days.
