from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas


def _draw_score_bar(pdf, label: str, score: float, y: float):
	score = max(0.0, min(1.0, float(score)))
	pdf.setFillColor(colors.whitesmoke)
	pdf.drawString(2 * cm, y + 0.2 * cm, f"{label}: {score * 100:.1f}%")
	pdf.setFillColor(colors.HexColor("#2b2b34"))
	pdf.roundRect(7 * cm, y, 8 * cm, 0.45 * cm, 0.15 * cm, stroke=0, fill=1)
	pdf.setFillColor(colors.HexColor("#4f46e5"))
	pdf.roundRect(7 * cm, y, 8 * cm * score, 0.45 * cm, 0.15 * cm, stroke=0, fill=1)


def generate_pdf_report(analysis_result: dict, video_name: str) -> bytes:
	buffer = BytesIO()
	pdf = canvas.Canvas(buffer, pagesize=A4)
	width, height = A4

	verdict = analysis_result.get("verdict", "UNKNOWN")
	confidence = float(analysis_result.get("confidence", 0.0))
	visual_score = float(analysis_result.get("visual_score", 0.0))
	audio_score = float(analysis_result.get("audio_score", 0.0))
	lip_sync_score = float(analysis_result.get("lip_sync_score", 0.0))
	metadata = analysis_result.get("video_metadata", {}) or {}
	timestamps = analysis_result.get("inconsistent_timestamps", []) or []

	banner_color = colors.HexColor("#dc2626") if verdict == "DEEPFAKE" else colors.HexColor("#16a34a")

	pdf.setFillColor(colors.HexColor("#0f172a"))
	pdf.rect(0, 0, width, height, stroke=0, fill=1)

	pdf.setFillColor(banner_color)
	pdf.rect(0, height - 3.3 * cm, width, 3.3 * cm, stroke=0, fill=1)

	pdf.setFillColor(colors.white)
	pdf.setFont("Helvetica-Bold", 20)
	pdf.drawString(2 * cm, height - 1.8 * cm, "SatyaNetra Deepfake Analysis Report")

	pdf.setFont("Helvetica-Bold", 15)
	pdf.drawString(2 * cm, height - 2.8 * cm, f"Verdict: {verdict}")
	pdf.setFont("Helvetica", 11)
	pdf.drawString(11.5 * cm, height - 2.75 * cm, f"Confidence: {confidence * 100:.2f}%")

	pdf.setFillColor(colors.whitesmoke)
	pdf.setFont("Helvetica", 11)
	pdf.drawString(2 * cm, height - 4.2 * cm, f"Video File: {video_name}")
	pdf.drawString(2 * cm, height - 4.8 * cm, f"Analysis Time: {analysis_result.get('analysis_time_seconds', 0)}s")

	y_start = height - 6.2 * cm
	_draw_score_bar(pdf, "Visual Score", visual_score, y_start)
	_draw_score_bar(pdf, "Audio Score", audio_score, y_start - 0.9 * cm)
	_draw_score_bar(pdf, "Lip-Sync Score", lip_sync_score, y_start - 1.8 * cm)

	pdf.setFont("Helvetica-Bold", 12)
	pdf.setFillColor(colors.HexColor("#93c5fd"))
	pdf.drawString(2 * cm, height - 9.6 * cm, "Video Metadata")
	pdf.setFont("Helvetica", 10)
	pdf.setFillColor(colors.whitesmoke)

	meta_lines = [
		f"FPS: {metadata.get('fps', 0)}",
		f"Duration: {metadata.get('duration', 0)} seconds",
		f"Resolution: {metadata.get('width', 0)} x {metadata.get('height', 0)}",
		f"Total Frames: {metadata.get('total_frames', 0)}",
	]
	for idx, line in enumerate(meta_lines):
		pdf.drawString(2 * cm, height - (10.3 + idx * 0.55) * cm, line)

	pdf.setFont("Helvetica-Bold", 12)
	pdf.setFillColor(colors.HexColor("#fca5a5"))
	pdf.drawString(2 * cm, height - 13.2 * cm, "Inconsistency Timeline")
	pdf.setFont("Helvetica", 10)
	pdf.setFillColor(colors.whitesmoke)

	if timestamps:
		ts_text = ", ".join(str(ts) for ts in timestamps[:30])
		pdf.drawString(2 * cm, height - 13.9 * cm, f"Flagged timestamps (s): {ts_text}")
	else:
		pdf.drawString(2 * cm, height - 13.9 * cm, "No strong inconsistency timestamps flagged.")

	pdf.setFont("Helvetica-Oblique", 9)
	pdf.setFillColor(colors.HexColor("#94a3b8"))
	pdf.drawString(
		2 * cm,
		1.3 * cm,
		"Disclaimer: SatyaNetra is an assistive AI tool. Final forensic decisions require human review.",
	)

	pdf.showPage()
	pdf.save()

	data = buffer.getvalue()
	buffer.close()
	return data

