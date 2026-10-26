# InterviewPulse

> Premium AI-powered real-time mock interview platform with live voice feedback using Google Gemini Live API.

---

## 🔒 Security & Environment Setup

This project uses server-side API proxying and WebSockets so that your API credentials (such as `GEMINI_API_KEY`) are **never exposed to the browser client**.

All private secrets, `.env` files, certificates, and local Firebase project keys are listed in `.gitignore` and must never be committed to Git.

### 1. Configure Environment Variables

Copy the template `.env.example` file to create your own local `.env`:

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# Required for real-time interview voice session & debrief evaluation
GEMINI_API_KEY=your_actual_gemini_api_key_here


> **Note:** Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **bun**

### Installation

```bash
npm install
```

*(The installation step will automatically initialize a local `firebase-applet-config.json` template if one does not already exist).*

### Running in Development

```bash
npm run dev
```

The application will start on `http://localhost:3000`.

### Production Build

```bash
npm run build
npm start
```

---

## 📦 Pushing to GitHub Safely

Follow these steps to initialize your Git repository and ensure no secrets are committed:

1. **Initialize Git and verify ignored files:**
   ```bash
   git init
   git status
   ```
   *Make sure `.env`, `firebase-applet-config.json`, and `node_modules` are NOT shown under Untracked files.*

2. **Stage your files:**
   ```bash
   git add .
   ```

3. **Check staged files for any stray secrets:**
   ```bash
   git status
   ```

4. **Commit and push to your remote GitHub repository:**
   ```bash
   git commit -m "feat: initial commit of InterviewPulse"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide Icons
- **Backend**: Node.js, Express, WebSocket (`ws`)
- **AI Models**: Google Gemini (`gemini-3.8-live` audio streaming over WebSocket, with fallback debrief models)
- **Data & Auth**: Firebase Firestore / Auth (optional MongoDB support)
