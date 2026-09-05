# 🌸 SoulSelf — Mindful Digital Diary & AYRA AI Companion 💜

> **A tranquil, private digital diary and AI companion designed for personal reflection, emotional well-being, and mindful growth.**

---

## 🌐 Live Application & Cloud Run Deployment

| Property | Details |
| :--- | :--- |
| **Live Cloud Run URL** | [https://soulself-3szof4ofua-uc.a.run.app](https://soulself-3szof4ofua-uc.a.run.app) |
| **Cloud Run Service Name** | `soulself` |
| **GCP Region** | `us-central1` |
| **Public Access** | Enabled (`allUsers` invoker role) |
| **Challenge Label** | `dev-tutorial=cloud-run-ai-challenge` |
| **Deployment Status** | Active & Deployed |

---

## ✨ Overview

**SoulSelf** is an editorial personal journaling platform enriched with **AYRA**, a compassionate multi-mode AI companion powered by Google Gemini. SoulSelf combines creative self-expression (interactive stickers, ambient soundscapes, 3D memory globe) with intelligent reflection tools (automatic sentiment analysis, structured summaries, and crisis safety support).

---

## 🚀 Key Features

### 💜 AYRA — AI Companion
- **Multi-Mode Companion**: Choose from 5 distinct conversation modes:
  - 💬 **Just Talk**: Casual conversation and friendly company.
  - ☁️ **Let Me Vent**: Active listening without unsolicited advice.
  - 🌱 **Motivate Me**: Practical encouragement breaking tasks into 15-minute steps.
  - 🧠 **Help Me Think**: Structured brainstorming and clarifying choices.
  - 📖 **Reflect With Me**: Mindful reflection on daily experiences.
- **Real-Time Streaming**: Smooth real-time responses powered by Server-Sent Events (SSE).
- **Journal Memory Sync**: Optionally allow AYRA to reflect using insights from your recent private journal entries.
- **Reflect to Journal**: Automatically convert your conversation with AYRA into a structured private journal entry.
- **Built-in Safety Architecture**: Dedicated distress handling integrated with emergency numbers and Tele-MANAS (24x7 Mental Health Helpline).

### ✍️ Mindful Diary Writer
- **Rich Journaling Experience**: Customizable title, rich markdown content, mood selectors, weather tagging, and cover styling.
- **Interactive Sticker Board**: Drag, rotate, and scale playful stickers directly onto your diary page.
- **Ambient Soundscapes**: Soothing background audio options (gentle rain, running stream, forest breeze, ocean shore, piano waterfall).

### 🤖 Gemini AI Insights
- **Daily Reflection Cards**: AI-generated gentle observations analyzing patterns across recent entries.
- **Structured Summaries**: Extract key themes, wins, challenges, and actionable next steps.
- **Smart Category Suggestions**: Contextual category recommendations based on entry content and location.
- **Emotion & Sentiment Analysis**: Automatic sentiment tagger (Positive, Neutral, Negative, Mixed).

### 🌍 3D Memory Globe & Visual Inbox
- **Interactive 3D Globe**: Built with Three.js to visualize location-tagged memories across the world.
- **Photo & Memory Inbox**: Connect photos and memories into vivid, narrative journal stories.

### 🔒 Security & Privacy
- **User-Isolated Storage**: Dedicated Firestore security rules enforcing strict per-user UID data boundaries.
- **Secure Server Architecture**: Express backend verifying Firebase ID tokens before performing Gemini API transactions.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4 |
| **Icons & UI** | Lucide React, Motion (Framer Motion), Canvas Confetti |
| **3D & Canvas** | Three.js (`three`) |
| **Backend API** | Express.js, TypeScript (`tsx` runtime / `esbuild`) |
| **AI Models** | Google GenAI SDK (`@google/genai`), Gemini 3.7 / 2.5 Flash |
| **Auth & Database** | Firebase Authentication (Google Auth / Demo mode), Cloud Firestore |
| **Cloud Hosting** | Google Cloud Run (Containerized Docker deployment) |
| **Cloud Secrets** | Google Cloud Secret Manager (`@google-cloud/secret-manager`), `dotenv` |

---

## ☁️ Google Cloud Run Deployment & Challenge Label

The SoulSelf application is containerized with Docker and deployed to Google Cloud Run.

### Required Challenge Label
To satisfy automated verification for the Cloud Run AI Challenge, the service carries the following label:
```yaml
dev-tutorial: cloud-run-ai-challenge
```

### Applying or Updating the Label
```bash
gcloud run services update soulself \
  --region us-central1 \
  --update-labels dev-tutorial=cloud-run-ai-challenge
```

### Verifying the Label
```bash
gcloud run services describe soulself \
  --region us-central1 \
  --format="value(metadata.labels.dev-tutorial)"
```
*Expected Output:* `cloud-run-ai-challenge`

---

## 📂 Project Structure

```
soulself/
├── public/                     # Public assets
├── src/                        # React Frontend Source Code
│   ├── components/             # UI Components
│   │   ├── AyraChat.tsx        # AYRA AI Companion Chat Interface
│   │   ├── DiaryWriter.tsx     # Mindful Journal Writer & Sticker Canvas
│   │   ├── MemoryGlobe.tsx     # 3D Interactive Memory Globe (Three.js)
│   │   ├── AmbientSoundControl.tsx  # Ambient Audio Player
│   │   ├── GeminiReflectionCard.tsx # AI Insights Widget
│   │   └── ...
│   ├── context/                # AuthContext & React Contexts
│   ├── data/                   # Initial datasets, crisis resources & ambient sound lists
│   ├── lib/                    # Firebase SDK initialization & auth helpers
│   ├── services/               # Firestore & Gemini client-side API services
│   ├── types.ts                # TypeScript Data Interfaces & Enums
│   ├── App.tsx                 # Core App Shell & Views
│   └── main.tsx                # React Root Entrypoint
├── server.ts                   # Express Backend Server (Gemini API & Auth Middleware)
├── Dockerfile                  # Multi-stage Docker build configuration for Cloud Run
├── firebase-applet-config.json # Firebase Web App Configuration
├── firestore.rules             # Cloud Firestore Security Rules
├── .env.example                # Environment Variable Template
├── vite.config.ts              # Vite Bundler Configuration
└── package.json                # Project Dependencies & Scripts
```

---

## ⚙️ Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **pnpm**
- A **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Soniya2001/soulself.git
   cd soulself
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your Gemini API key:
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```env
   GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
   APP_URL="http://localhost:3000"
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs the Express backend server with integrated Vite dev middleware |
| `npm run build` | Builds the production bundle (Vite frontend + bundled Express server) |
| `npm run start` | Runs the compiled production server (`dist/server.cjs`) |
| `npm run lint` | Type checks the project with TypeScript (`tsc --noEmit`) |

---

## 🔒 Security & Data Governance

- **Private & Confidential**: Journal entries and AYRA chat conversations are stored exclusively in user-scoped Firestore collections (`/users/{userId}/...`).
- **Token Authorization**: Every API request to `/api/gemini/*` requires a valid Firebase Bearer ID Token.
- **Safety First**: AYRA includes safety detection for distress signals, immediately offering direct dial options for emergency services and Tele-MANAS (14416).

---

## 🌸 License

This project is created for personal journaling, mindfulness, and educational AI companion exploration.
