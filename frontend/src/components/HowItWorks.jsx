import { motion as Motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'


const STEPS = [
	'Upload',
	'Audio Extraction',
	'Frame Extraction',
	'ResNet50',
	'Sequence Preparation',
	'LSTM',
	'Fully Connected',
	'Result',
]


function HowItWorks() {
	return (
		<section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
			<Motion.h2
				initial={{ opacity: 0, y: 16 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				className="text-center text-3xl font-bold text-white md:text-4xl"
			>
				SatyaNetra Process Flow
			</Motion.h2>
			<p className="mx-auto mt-4 max-w-3xl text-center text-slate-300">
				Multi-modal deepfake detection combines frame intelligence, temporal signals, and audio consistency checks.
			</p>

			<div className="mt-12 flex flex-wrap items-center justify-center gap-3">
				{STEPS.map((step, index) => (
					<div key={step} className="flex items-center">
						<Motion.div
							initial={{ opacity: 0, y: 12 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: index * 0.06 }}
							className="glass rounded-2xl border border-slate-700/70 px-4 py-3 text-sm font-semibold text-slate-100"
						>
							{step}
						</Motion.div>
						{index < STEPS.length - 1 ? <ArrowRight className="mx-2 text-slate-500" size={16} /> : null}
					</div>
				))}
			</div>
		</section>
	)
}

export default HowItWorks

