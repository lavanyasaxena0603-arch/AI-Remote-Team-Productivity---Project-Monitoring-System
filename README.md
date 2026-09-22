# AI Remote Team Productivity - Project Monitoring System

Welcome to the AI Remote Team Productivity & Project Monitoring System. This application serves as a centralized "Command Center" for orchestrating tasks, monitoring performance metrics, and leveraging specialized AI agents to optimize remote team productivity.

## Features

- **Futuristic UI & "Command Center" Dashboard:** A highly interactive, glassmorphism-inspired UI with particle animations and smooth micro-interactions.
- **Authentication System:** Secure sign-up and login workflows to isolate user sessions and project data.
- **Project Management:** Create, track, and monitor projects. A task modal allows for granular breakdown of each project.
- **AI Agent Overlays:** Specialized AI agent profiles (Strategist, Analyst, Optimizer, Risk Manager) that simulate monitoring operations, complete with capability lists and activity logs.
- **Live Metrics & Analytics:** Real-time visual updates for productivity, contributor heatmaps, and performance charts using Chart.js.
- **Robust Tech Stack:** A modern frontend powered by Vite and Hono, seamlessly proxying API requests to a Python Flask backend.

## Tech Stack

### Frontend
- **Vite & Hono**: Serves the application and proxies API requests efficiently.
- **Vanilla JS & CSS**: High performance, custom-styled frontend using direct DOM manipulation.
- **Chart.js**: powers the advanced analytics charts.

### Backend
- **Python Flask**: A lightweight but powerful backend server running on port `5001`.
- **SQLAlchemy (SQLite)**: Used for managing user profiles, projects, and task relationships.
- **Flask-CORS**: Handles Cross-Origin Resource Sharing.

---

## Getting Started

To run the application locally, you'll need to start both the frontend server and the backend server. 

### 1. Start the Backend (Flask)

The backend handles all the database transactions and authentication endpoints. It must run on port `5001`.

```bash
# Navigate to the backend directory
cd backend

# Install the necessary python dependencies
pip install flask flask-cors flask-sqlalchemy sqlalchemy

# Start the Flask server
python3 app.py
```
> The backend should now be running at `http://127.0.0.1:5001`

### 2. Start the Frontend (Vite)

The frontend uses Vite as the development server and proxies `/flask/*` requests directly to the backend.

```bash
# In a new terminal, navigate to the root directory
cd AI-Remote-Team-Productivity---Project-Monitoring-System

# Install the Node dependencies
npm install

# Start the Vite development server
npm run dev
```
> The frontend should now be running at `http://localhost:5173`

---

## Usage

1. Open your browser and navigate to `http://localhost:5173`.
2. Allow the "Booting Core Systems" sequence to load.
3. Once in the Command Center, click **"CREATE OPERATIVE PROFILE"** to sign up.
4. After signing up, you will be redirected to the main dashboard where you can create projects, view simulated AI operations, and track productivity.
