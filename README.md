# 🖐️ Zero Trace

A real-time **multi-user collaborative hand tracking** experience in the browser — no installs, no plugins. Grant camera access, enter a room, and see your hands rendered live alongside other users.

🌐 **Live Demo:** [zero-trace-bice.vercel.app](https://zero-trace-bice.vercel.app/)

---

## ✨ Features

- **Real-time hand tracking** — detects hands via webcam directly in the browser
- **Multi-user rooms** — multiple users can join the same room and see each other's hand data live
- **Gesture recognition** — detects and displays active gestures
- **Spread tracking** — measures hand openness as a percentage
- **FPS counter** — live performance monitoring
- **5 visual themes** — Rainbow, Cyberpunk, Lava, Ocean, Galaxy
- **No account needed** — room-based entry with a passcode

---

## 🏗️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | HTML / CSS / JavaScript |
| Hand Tracking | MediaPipe / TensorFlow.js *(update as needed)* |
| Real-time Sync | WebSockets / Socket.io *(update as needed)* |
| Backend | Node.js + Express.js |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## ⚙️ Architecture

```
Browser (Camera Input)
        ↓
Hand Tracking (client-side ML)
        ↓
WebSocket → Backend (Render)
        ↓
Broadcast to all users in room
        ↓
Render hand overlays for each user
```

Frontend on Vercel connects to backend on Render via production API URLs — no localhost in production.

---

## 🚀 Local Setup

```bash
# Clone the repo
git clone https://github.com/techAsmita/Zero-Trace.git
cd Zero-Trace

# Install backend dependencies
cd server
npm install
npm start

# Open frontend
cd ../client
# Open index.html in browser or use Live Server
```

> Make sure to update the API URL in the frontend to point to `localhost` for local development.

---

## 📁 Project Structure

```
Zero-Trace/
├── client/          # Frontend — HTML, CSS, JS
├── server/          # Backend — Node.js + Express
└── README.md
```

---

## 👩‍💻 Author

**Asmita**  
B.E. Computer Engineering — Thapar Institute of Engineering and Technology  
[![LinkedIn](https://img.shields.io/badge/LinkedIn-techasmita-blue)](https://www.linkedin.com/in/techasmita/)
[![GitHub](https://img.shields.io/badge/GitHub-techAsmita-black)](https://github.com/techAsmita)
