# 🛠️ Zenvego - Developer & AI Agent Guidelines

If you are a developer or an AI coding agent assigned to work on Zenvego, **read this document before making any changes or installing any packages.**

This project is built under a **strict Zero Budget ($0) philosophy** to ensure it remains free to deploy and run indefinitely.

---

## 🚫 CRITICAL RULES (Do NOT Deviate)

### 1. Do NOT Install Unnecessary Packages
*   **Check `package.json` first:** All required tools for Routing, Maps, Icons, QR codes, Speech/Voice, Animations, Database client, and AI are already installed.
*   **Do NOT install extra UI libraries** (e.g., Material UI, Shadcn, Bootstrap). We are using Tailwind CSS (v4) and custom CSS inside `src/index.css` for styling.
*   **Do NOT install state libraries** (e.g., Redux, Zustand). React's built-in state, combined with the modular file structure, is fully sufficient.

### 2. Do NOT Implement Paid APIs (Use Existing Free Alternatives)
*   **Maps & GPS**: Do NOT download or use Mapbox GL JS or Google Maps SDK. We use **Leaflet.js** and **OpenStreetMap** (configured in `DeliveryActiveRoute.tsx`), which are 100% free and do not require API keys or billing info.
*   **Authentication**: Do NOT integrate Clerk, Auth0, or paid Firebase auth. We use **Supabase Auth** (configured in `LoginView.tsx`), which is free up to 50k monthly active users.
*   **SMS Verification**: Do NOT install Twilio or paid SMS packages. Use Supabase Magic Links (Email OTP) which are free.
*   **Speech & Voice**: Do NOT use Google Cloud Text-to-Speech or Azure Speech. We use the browser's native **Web Speech API** (`window.SpeechRecognition` / `window.speechSynthesis`), which runs locally inside the user's browser for $0 cost.
*   **QR Codes**: Do NOT call paid external QR generation APIs. We use local canvas-based rendering with `qrcode` and camera-based reading with `html5-qrcode`.

### 3. Do NOT Remove the Mock/Offline Fallback Systems
*   If the database is down or the tables do not exist, the app automatically falls back to a simulated database in `localStorage` (e.g. `orderBus.ts` and `App.tsx` product lists).
*   **Do NOT replace these fallbacks** with strict backend-only API calls. The local fallbacks must stay intact so the prototype is fully functional even if offline or disconnected from Supabase.

---

## 📦 What is Already Installed & Available

| Feature | Installed Package | File Reference |
| :--- | :--- | :--- |
| **Icons** | `lucide-react` | Anywhere in UI |
| **Animations** | `motion` | Anywhere in UI |
| **Maps & Routing** | `leaflet`, `react-leaflet` | `src/components/DeliveryActiveRoute.tsx` |
| **Database & Auth** | `@supabase/supabase-js` | `src/lib/supabase.ts` & `src/utils/orderBus.ts` |
| **AI Support Bot** | `@google/genai` | `src/App.tsx` (ZenBot engine) |
| **QR Generation** | `qrcode` | `src/components/QrCodeRenderer.tsx` |
| **QR Scanning** | `html5-qrcode` | `src/components/FarmerDashboard.tsx` |
| **Voice Commands** | Browser Web Speech API | `src/utils/speech.ts` |

---

## 🏗️ Future Backend Rules (When Building the Backend)
When transitioning this mock setup to a fully production-ready backend:
1.  **Do not create a separate Node.js server** unless absolutely necessary. Supabase allows you to write queries directly from the React client using Postgres Row-Level Security (RLS) policies.
2.  Use the pre-coded SQL schema outlined in `project_documentation.md` to create the `profiles`, `products`, and `orders` tables in your Supabase SQL editor.
3.  Ensure that all security policies (`SELECT`, `INSERT`, `UPDATE`) restrict reads and writes based on `auth.uid() = user_id`.
