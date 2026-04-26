from io import BytesIO

from flask import Blueprint, jsonify, request, send_file

from app.utils.helpers import error_payload
from app.utils.report_generator import generate_pdf_report


report_bp = Blueprint("report", __name__)


@report_bp.route("/report", methods=["POST"])
def create_report():
	try:
		payload = request.get_json(silent=True) or {}
		analysis_result = payload.get("analysis") if "analysis" in payload else payload
		if not isinstance(analysis_result, dict) or not analysis_result:
			return jsonify(error_payload("Analysis payload is required.")), 400

		video_name = payload.get("video_name", "uploaded_video")
		pdf_bytes = generate_pdf_report(analysis_result, video_name)
		return send_file(
			BytesIO(pdf_bytes),
			mimetype="application/pdf",
			as_attachment=True,
			download_name=f"satyanetra_report_{video_name}.pdf",
		)
	except Exception as exc:
		return jsonify(error_payload("Report generation failed.", str(exc))), 500

