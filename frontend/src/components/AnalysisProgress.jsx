import { motion as Motion } from 'framer-motion'
import { AudioLines, Brain, CheckCircle2, FileText, Film, ScanFace, Waves } from 'lucide-react'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'


const STEP_ICONS = [Film, Brain, Waves, AudioLines, ScanFace, FileText]


function AnalysisProgress({ visible, progress, steps }) {
	if (!visible) return null

	return (
		<Motion.section
			initial={{ opacity: 0, y: 18 }}
			animate={{ opacity: 1, y: 0 }}
			className="scan-effect glass relative mx-auto mt-8 w-full max-w-5xl overflow-hidden rounded-3xl p-6"
		>
			<h3 className="text-center text-2xl font-semibold text-white">Analysis Pipeline Running</h3>
			<div className="mx-auto mt-6 h-32 w-32">
				<CircularProgressbar
					value={progress}
					text={`${Math.round(progress)}%`}
					styles={buildStyles({
						textColor: '#e2e8f0',
						pathColor: '#0ea5e9',
						trailColor: '#122033',
					})}
				/>
			</div>

			<div className="mt-6 grid gap-3 md:grid-cols-2">
				{steps.map((step, index) => {
					const Icon = STEP_ICONS[index] || Brain
					return (
						<article key={step.label} className="glass rounded-xl border border-slate-700/70 p-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Icon size={18} className="text-sky-300" />
									<p className="text-sm font-semibold text-slate-100">{step.label}</p>
								</div>
								{step.complete ? <CheckCircle2 size={17} className="text-emerald-400" /> : null}
							</div>
							<div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900/80">
								<div
									className={`h-full transition-all ${step.complete || step.active ? 'bg-gradient-to-r from-sky-500 to-teal-400' : 'bg-slate-800'}`}
									style={{ width: step.complete ? '100%' : step.active ? '70%' : '0%' }}
								/>
							</div>
						</article>
					)
				})}
			</div>
		</Motion.section>
	)
}

export default AnalysisProgress

