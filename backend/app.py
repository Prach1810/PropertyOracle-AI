from flask import Flask, request, jsonify
from flask_cors import CORS
from agent import agent_executor

app = Flask(__name__)
CORS(app)

@app.route('/api/analyze', methods=['POST'])
def analyze():
    address = request.json.get('address')
    
    # Run the Agentic Workflow
    initial_state = {
        "address": address,
        "raw_data": [],
        "discrepancies": [],
        "summary": ""
    }
    
    result = agent_executor.invoke(initial_state)
    
    return jsonify({
        "status": "complete",
        "data": {
            "address": result["address"],
            "brief": result["summary"],
            "alerts": result["discrepancies"]
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)