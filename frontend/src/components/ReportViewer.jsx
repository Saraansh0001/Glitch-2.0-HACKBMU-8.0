function ReportViewer({ result, onDownload }) {
	if (!result) {
		return (
			<div className="glass mx-auto mt-24 max-w-3xl rounded-2xl p-8 text-center text-slate-300">
				No report data available yet. Run detection first on the Detect page.
			</div>
		)
	}

	return (
		<section className="mx-auto mt-24 w-full max-w-4xl px-4">
			<div className="glass rounded-3xl p-7">
				<h1 className="text-3xl font-bold text-white">Report Summary</h1>
				<p className="mt-2 text-slate-300">Verdict: {result.verdict}</p>
				<p className="text-slate-300">Confidence: {(Number(result.confidence || 0) * 100).toFixed(2)}%</p>
				<p className="mt-4 text-sm text-slate-400">
					Download the forensic PDF for evidence-ready export and review.
				</p>
				<button
					type="button"
					onClick={onDownload}
					className="mt-6 rounded-full bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2 text-sm font-semibold text-white"
				>
					Download PDF Report
				</button>
			</div>
		</section>
	)
}

export default ReportViewer

