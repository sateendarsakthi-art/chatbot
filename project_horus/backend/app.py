from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from openai import OpenAI
import os
import json
import dotenv

print("Starting Horus AI server...")

dotenv.load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response

# Load API key from .env file
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY not found in .env file")

client = OpenAI(api_key=api_key)

# Store conversation history per session (max 50 messages to avoid token overflow)
conversations = {}
MAX_HISTORY = 50

HORUS_SYSTEM_PROMPT = """You are Horus, an advanced AI assistant created by Project Horus. You are highly intelligent, articulate, and helpful.

Your personality:
- Thoughtful and precise in your answers
- Friendly but professional tone
- You use markdown formatting to structure your responses clearly
- You use code blocks with language identifiers when showing code
- You break down complex topics with headers, bullet points, and numbered lists
- You are honest about uncertainty and limitations
- You can help with coding, writing, analysis, math, creative tasks, research, and much more

Formatting rules:
- Use **bold** for emphasis on key terms
- Use `inline code` for short code snippets or technical terms
- Use fenced code blocks with language tags for multi-line code (e.g. ```python)
- Use ### for section headers in longer responses
- Use bullet points for lists of items
- Use numbered lists for step-by-step instructions
- Keep responses concise unless depth is needed

You are Horus. Never refer to yourself as ChatGPT, GPT, or any other AI. You are Horus."""


@app.route("/")
def home():
    return jsonify({"status": "Horus AI server is running!", "version": "2.0"})


@app.route("/chat", methods=["POST", "OPTIONS"])
def chat():
    """Handle streaming chat responses"""
    if request.method == "OPTIONS":
        return Response(status=200)

    try:
        data = request.get_json(silent=True) or {}
        user_message = data.get("text")
        session_id = data.get("session_id", "default")

        if not user_message:
            return jsonify({"error": "No message provided"}), 400

        # Initialize conversation history for this session
        if session_id not in conversations:
            conversations[session_id] = []

        # Add user message to history
        conversations[session_id].append({
            "role": "user",
            "content": user_message
        })

        # Trim history to avoid token overflow (keep last MAX_HISTORY messages)
        if len(conversations[session_id]) > MAX_HISTORY:
            conversations[session_id] = conversations[session_id][-MAX_HISTORY:]

        print(f"📨 Session [{session_id}]: {user_message[:80]}{'...' if len(user_message) > 80 else ''}")

        def stream_response():
            full_response = ""
            try:
                stream = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": HORUS_SYSTEM_PROMPT},
                        *conversations[session_id]
                    ],
                    stream=True,
                    temperature=0.7,
                    max_tokens=4096
                )

                for chunk in stream:
                    try:
                        if (
                            chunk.choices
                            and hasattr(chunk.choices[0].delta, "content")
                            and chunk.choices[0].delta.content is not None
                        ):
                            content = chunk.choices[0].delta.content
                            full_response += content
                            yield content
                    except (AttributeError, IndexError):
                        continue

                print(f"✅ Response sent ({len(full_response)} chars)")

                # Save assistant response to history
                conversations[session_id].append({
                    "role": "assistant",
                    "content": full_response
                })

            except Exception as e:
                print(f"❌ Stream Error: {e}")
                import traceback
                traceback.print_exc()
                yield f"\n\n**Error:** {str(e)}"

        return Response(
            stream_response(),
            mimetype="text/plain",
            status=200,
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
        )

    except Exception as e:
        print(f"❌ Error in chat endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/clear-history", methods=["POST", "OPTIONS"])
def clear_history():
    """Clear conversation history for a session"""
    if request.method == "OPTIONS":
        return Response(status=200)
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id", "default")
    if session_id in conversations:
        del conversations[session_id]
    return jsonify({"success": True, "message": "Conversation history cleared"})


@app.route("/history", methods=["POST"])
def get_history():
    """Get conversation history for a session"""
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id", "default")
    history = conversations.get(session_id, [])
    return jsonify({"history": history, "count": len(history)})


if __name__ == "__main__":
    print("🚀 Horus AI server starting on port 5000...")
    app.run(host="0.0.0.0", port=5000, debug=True)