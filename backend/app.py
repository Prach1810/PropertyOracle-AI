# app.py
import uuid
import threading
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from agent import run_workflow_sync  # returns final state dict
from db import get_result, save_result
from agent import chat_with_brief

app = Flask(__name__)
CORS(app)

# Simple in-memory job store for demo; replace with Redis or DB in prod
_job_store = {}

def _background_job(job_id, address):
    try:
        initial_state = {"address": address, "raw_data": [], "discrepancies": [], "summary": ""}
        result = run_workflow_sync(initial_state)
        save_result(job_id, result)
        _job_store[job_id]["status"] = "complete"
    except Exception as e:
        _job_store[job_id]["status"] = "failed"
        _job_store[job_id]["error"] = str(e)

@app.route("/api/analyze", methods=["POST"])
def analyze():
    url = request.json.get("url")
    # Basic validation
    if not url or not (url.startswith("http://") or url.startswith("https://")):
        return jsonify({"error": "Invalid or missing URL"}), 400

    job_id = str(uuid.uuid4())
    _job_store[job_id] = {"status": "running", "created_at": time.time()}
    thread = threading.Thread(target=_background_job, args=(job_id, url), daemon=True)
    thread.start()

    return jsonify({"job_id": job_id, "status": "running"}), 202

@app.route("/api/result/<job_id>", methods=["GET"])
def get_result_endpoint(job_id):
    job = _job_store.get(job_id)
    if not job:
        return jsonify({"error": "job not found"}), 404
    if job["status"] != "complete":
        return jsonify({"status": job["status"], "error": job.get("error")}), 200
    result = get_result(job_id)
    return jsonify({"status": "complete", "data": result}), 200

@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Follow-up Q&A: expects { job_id, message }
    Uses stored brief + provenance + chat history to answer.
    """
    job_id = request.json.get("job_id")
    message = request.json.get("message", "").strip()
    if not job_id or not message:
        return jsonify({"error": "job_id and message required"}), 400

    state = get_result(job_id)
    if not state:
        return jsonify({"error": "result not found"}), 404

    # agent.chat_with_brief should use the LLM with context (brief + sources + history)
    answer = chat_with_brief(state, message)
    return jsonify({"answer": answer}), 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)
