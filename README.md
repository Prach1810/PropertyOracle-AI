# PropertyOracle AI 🏠 🔍

**Agentic Intelligence for Real Estate Analysis**

PropertyOracle is an AI-powered agent that moves beyond simple summarization. It autonomously scrapes live real estate listings, cross-references them against an internal "Ground Truth" database (MongoDB), and uses Google Gemini to identify risks, unpermitted additions, and financial discrepancies that a human might miss.



## 🏗 Technical Architecture

The system follows an **Asynchronous Agentic Workflow**:

1.  **Frontend (React + TypeScript):** Dispatches a job to the backend and polls for status updates, ensuring the UI remains responsive during long-running AI tasks.
2.  **Orchestrator (Flask + Threading):** Manages job queues and spawns isolated agent threads.
3.  **The Agent (LangGraph):** A state machine that executes a cyclic workflow:
    * **Tool Usage:** Scrapes live web data (BeautifulSoup).
    * **RAG :** Queries MongoDB for tax records/historical data.
    * **Reasoning:** Uses Gemini 2 Flash to compare data sources and synthesize a brief.

## 🛠 Tech Stack

* **Frontend:** React, TypeScript, Tailwind CSS, Vite
* **Backend:** Python, Flask, Flask-CORS
* **AI & Logic:** LangGraph, LangChain, Google Gemini API, BeautifulSoup4
* **Data:** MongoDB (Ground Truth/Knowledge Base), Job Results

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
```

### 2. Backend Setup
```bash
cd frontend
# 1. Install dependencies
npm install

# 2. Ensure Tailwind CSS is generated
npm run dev

# 3. Open http://localhost:5173 to run the Agent
```

## Future Scope & Production Roadmap
To scale PropertyOracle from a prototype to a production-grade SaaS, the following architectural upgrades are planned:

1. Performance & Scalability
    - Redis Task Queue: Replace the current in-memory threading model (_job_store) with Celery + Redis. This allows the system to handle thousands of concurrent scrapes without blocking the web server.
    - Embedding Cache: Cache LLM responses and Vector Embeddings in Redis or pgvector. If a user analyzes "123 Main St" twice, the second result should be instant (O(1)).
2. Advanced AI Capabilities
    - Visual Analysis: Upgrade the scraper to capture listing images and use Gemini 1.5 Pro Vision to detect "flipped" conditions (e.g., identifying cheap laminate flooring vs. hardwood).
    - Legal Doc Parsing: Add a module to ingest PDF HOA documents and flag rental restrictions.
3. Robustness
    - Browser Automation: Replace requests with Playwright or Puppeteer to handle JavaScript-heavy sites (Zillow, Redfin) that block simple scrapers.
    - Proxy Rotation: Integrate a proxy network (e.g., BrightData) to prevent IP bans during high-volume scraping.