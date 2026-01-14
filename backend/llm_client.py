# llm_client.py
import os
import backoff
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

# Load environment variables (ensure GEMINI_API_KEY is in your .env)
load_dotenv()

# Initialize the Model once (efficient)
# using "gemini-1.5-flash" as it's fast and cheap for agents
_llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    temperature=0.2,
    max_retries=2,
)

def call_gemini_chat(system_prompt, user_prompt, max_tokens=512, temperature=0.2):
    """
    Executes a real call to Google Gemini.
    """
    try:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]
        
        # Invoke the model
        response = _llm.invoke(messages)
        
        # Return just the text content
        return response.content
        
    except Exception as e:
        print(f"LLM Call Failed: {e}")
        # Fallback if API fails, so the app doesn't crash
        return "Error: Unable to generate response from Gemini at this time."

# retry/backoff wrapper
@backoff.on_exception(backoff.expo, Exception, max_tries=3)
def safe_call_gemini_chat(system_prompt, user_prompt, max_tokens=512, temperature=0.2):
    return call_gemini_chat(system_prompt, user_prompt, max_tokens, temperature)