import logging

import requests
from flask import Blueprint, current_app, jsonify, request

from app.utils.helpers import error_payload


logger = logging.getLogger(__name__)
chatbot_bp = Blueprint("chatbot", __name__)

SYSTEM_PROMPT = (
	"You are SatyaNetra's AI assistant. You are an expert on deepfakes, "
	"how they work, how to detect them, and the ethical implications. "
	"You also help users understand the analysis results. "
	"Be concise, informative, and friendly."
)

FAQ = {
	"what is a deepfake": (
		"A deepfake is AI-generated media where a face, voice, or expression is manipulated "
		"to look authentic."
	),
	"how does this detection work": (
		"SatyaNetra combines visual frame analysis (ResNet50 + LSTM), audio anomaly detection "
		"(YAMNet), and lip-sync consistency checks."
	),
	"what are the risks of deepfakes": (
		"Deepfakes can spread misinformation, impersonate people, and damage trust in digital media."
	),
	"explain my result": (
		"A higher confidence means more evidence of manipulation across visual, audio, and lip-sync signals."
	),
}


def _offline_response(message: str) -> str:
	lowered = (message or "").strip().lower()
	for key, value in FAQ.items():
		if key in lowered:
			return value
	return (
		"Gemini API key is not configured right now. I can still help with deepfake basics, "
		"detection signals, and interpreting SatyaNetra results."
	)


def _format_history(history: list) -> list:
	content_parts = []
	for item in history[-8:]:
		role = item.get("role", "user")
		text = item.get("content", "")
		if not text:
			continue
		mapped_role = "model" if role in {"assistant", "model"} else "user"
		content_parts.append({"role": mapped_role, "parts": [{"text": text}]})
	return content_parts


@chatbot_bp.route("/chat", methods=["POST"])
def chat():
	try:
		payload = request.get_json(silent=True) or {}
		message = (payload.get("message") or "").strip()
		history = payload.get("history") or []

		if not message:
			return jsonify(error_payload("Message is required.")), 400

		api_key = current_app.config.get("GEMINI_API_KEY", "").strip()
		if not api_key or api_key.lower() in {"your_gemini_api_key_here", "changeme", "none"}:
			return jsonify({"response": _offline_response(message), "sources": [], "mode": "offline"}), 200

		configured_model = (current_app.config.get("GEMINI_MODEL") or "gemini-flash-latest").strip()
		model_candidates = []
		for model_name in [configured_model, "gemini-flash-latest", "gemini-2.0-flash"]:
			if model_name and model_name not in model_candidates:
				model_candidates.append(model_name)

		body = {
			"system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
			"contents": _format_history(history) + [{"role": "user", "parts": [{"text": message}]}],
			"generationConfig": {
				"temperature": 0.4,
				"maxOutputTokens": 300,
			},
		}

		response = None
		for model_name in model_candidates:
			endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
			candidate_response = requests.post(
				f"{endpoint}?key={api_key}",
				json=body,
				timeout=10,
			)
			if candidate_response.status_code < 400:
				response = candidate_response
				break
			logger.warning(
				"Gemini API error for model %s %s: %s",
				model_name,
				candidate_response.status_code,
				candidate_response.text,
			)

		if response is None:
			return jsonify({"response": _offline_response(message), "sources": [], "mode": "offline"}), 200

		data = response.json()
		candidates = data.get("candidates") or []
		if not candidates:
			return jsonify({"response": _offline_response(message), "sources": [], "mode": "offline"}), 200

		parts = candidates[0].get("content", {}).get("parts", [])
		text = "\n".join(part.get("text", "") for part in parts if part.get("text"))
		text = text.strip() or _offline_response(message)
		return jsonify({"response": text, "sources": [], "mode": "online"}), 200
	except requests.Timeout:
		return jsonify({"response": "Chat service timed out. Switching to offline guidance.", "sources": [], "mode": "offline"}), 200
	except Exception as exc:
		logger.exception("Unhandled error in /chat")
		return jsonify(error_payload("Chat failed.", str(exc))), 500

