# PropertyOracle AI 🏠 🔍

**Agentic Intelligence for Real Estate Forensic Analysis**

PropertyOracle is an AI-powered agent that moves beyond simple summarization. It autonomously scrapes live real estate listings, cross-references them against an internal "Ground Truth" database (MongoDB), and uses Google Gemini to identify risks, unpermitted additions, and financial discrepancies that a human might miss.



## 🏗 Technical Architecture

The system follows an **Asynchronous Agentic Workflow**:

1.  **Frontend (React + TypeScript):** Dispatches a job to the backend and polls for status updates, ensuring the UI remains responsive during long-running AI tasks.
2.  **Orchestrator (Flask + Threading):** Manages job queues and spawns isolated agent threads.
3.  **The Agent (LangGraph):** A state machine that executes a cyclic workflow:
    * **Tool Usage:** Scrapes live web data (BeautifulSoup).
    * **RAG :** Queries MongoDB for tax records/historical data.
    * **Reasoning:** Uses Gemini 1.5 Flash to compare data sources and synthesize a brief.

## 🛠 Tech Stack

* **Frontend:** React, TypeScript, Tailwind CSS, Vite
* **Backend:** Python, Flask, Flask-CORS
* **AI & Logic:** LangGraph, LangChain, Google Gemini API
* **Data:** MongoDB (Ground Truth/Knowledge Base), BeautifulSoup (Scraper)

## 🚀 Getting Started

### Prerequisites
* Node.js & npm
* Python 3.10+
* MongoDB running locally on port 27017
* Google Gemini API Key

### 1. Backend Setup
```bash
cd backend
python3 -m venv myEnv
source myEnv/bin/activate
pip install -r requirements.txt

# Create .env file with:
# GOOGLE_API_KEY=your_key_here
# MONGO_URI=mongodb:

# Seed the database with "Ground Truth" data
python seed.py

# Run the Orchestrator
python app.py