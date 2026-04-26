import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'


function ResultCard({ result, onDownloadReport, onAskAi }) {
	if (!result) return null

	const isDeepfake = result.verdict === 'DEEPFAKE'
	const chartData = [
		{ name: 'Visual', value: Number(result.visual_score || 0) * 100, fill: '#38bdf8' },
		{ name: 'Audio', value: Number(result.audio_score || 0) * 100, fill: '#2dd4bf' },
		{ name: 'Lip-Sync', value: Number(result.lip_sync_score || 0) * 100, fill: '#fbbf24' },
	]

	const timestamps = result.inconsistent_timestamps || []
	const metadata = result.video_metadata || {}

	return (
		<section className="mx-auto mt-8 w-full max-w-5xl rounded-3xl border border-slate-700/70 bg-slate-950/70 p-6">
			<header
				className={`rounded-2xl px-5 py-5 text-white ${
					isDeepfake ? 'bg-gradient-to-r from-red-600/80 to-rose-700/80' : 'bg-gradient-to-r from-emerald-600/70 to-teal-700/70'
				}`}
			>
				<div className="flex items-center gap-3">
					{isDeepfake ? <AlertTriangle /> : <ShieldCheck />}
					<h3 className="text-2xl font-bold">
						{isDeepfake ? <span className="glitch">DEEPFAKE DETECTED</span> : <span className="animate-pulse">AUTHENTIC VIDEO</span>}
					</h3>
				</div>
				<p className="mt-2 text-lg">Confidence: {(Number(result.confidence || 0) * 100).toFixed(2)}%</p>
			</header>

			<div className="mt-6 grid gap-6 lg:grid-cols-2">
				<article className="glass rounded-2xl p-4">
					<h4 className="mb-3 text-lg font-semibold text-slate-100">Score Breakdown</h4>
					<div className="h-64 w-full">
						<ResponsiveContainer>
							<RadialBarChart innerRadius="20%" outerRadius="95%" data={chartData} startAngle={180} endAngle={-180}>
								<PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
								<RadialBar minAngle={15} background clockWise dataKey="value" />
							</RadialBarChart>
						</ResponsiveContainer>
					</div>
				</article>

				<article className="glass rounded-2xl p-4">
					<h4 className="mb-3 text-lg font-semibold text-slate-100">Inconsistency Timeline</h4>
					<svg viewBox="0 0 1000 120" className="w-full">
						<line x1="40" y1="70" x2="960" y2="70" stroke="#64748b" strokeWidth="4" />
						{(timestamps.length ? timestamps : [0]).map((time, idx) => {
							const x = 70 + (idx * 850) / Math.max(1, timestamps.length - 1)
							return (
								<g key={`${time}-${idx}`}>
									<circle cx={x} cy="70" r="10" fill="#f87171" />
									<text x={x - 20} y="40" fill="#e2e8f0" fontSize="20">
										{time}s
									</text>
								</g>
							)
						})}
					</svg>
					{!timestamps.length ? <p className="text-sm text-slate-400">No major inconsistency markers detected.</p> : null}
				</article>
			</div>

			<article className="glass mt-6 rounded-2xl p-4">
				<h4 className="text-lg font-semibold text-slate-100">Video Metadata</h4>
				<div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
					<p>FPS: {metadata.fps ?? 0}</p>
					<p>Duration: {metadata.duration ?? 0}s</p>
					<p>Resolution: {metadata.width ?? 0} x {metadata.height ?? 0}</p>
					<p>Total Frames: {metadata.total_frames ?? 0}</p>
					<p>Analysis Time: {result.analysis_time_seconds ?? 0}s</p>
				</div>
			</article>

			<div className="mt-6 flex flex-wrap gap-3">
				<button
					type="button"
					onClick={onDownloadReport}
					className="rounded-full bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2 text-sm font-semibold text-white"
				>
					Download PDF Report
				</button>
				<button
					type="button"
					onClick={onAskAi}
					className="rounded-full border border-slate-500 px-5 py-2 text-sm font-semibold text-slate-200"
				>
					Ask AI Chatbot
				</button>
			</div>
		</section>
	)
}

export default ResultCard

