import { animate, motion as Motion, useMotionValue, useMotionValueEvent } from 'framer-motion'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'


const HERO_TEXT = 'Unmask the Truth'


function AnimatedStat({ label, target, suffix }) {
	const count = useMotionValue(0)
	const [rounded, setRounded] = useState('0.0')

	useMotionValueEvent(count, 'change', (latest) => {
		setRounded(latest.toFixed(1))
	})

	useEffect(() => {
		const controls = animate(count, target, { duration: 2.2, ease: 'easeOut' })
		return () => controls.stop()
	}, [count, target])

	return (
		<div className="glass rounded-2xl px-4 py-3 text-center">
			<Motion.div className="text-2xl font-bold text-white">
				{rounded}
				{suffix}
			</Motion.div>
			<p className="text-xs uppercase tracking-[0.25em] text-slate-300">{label}</p>
		</div>
	)
}


function HeroSection() {
	const [displayText, setDisplayText] = useState('')
	const navigate = useNavigate()
	const { user, openAuthModal } = useAuth()

	useEffect(() => {
		let idx = 0
		const timer = setInterval(() => {
			idx += 1
			setDisplayText(HERO_TEXT.slice(0, idx))
			if (idx >= HERO_TEXT.length) clearInterval(timer)
		}, 90)
		return () => clearInterval(timer)
	}, [])

	const orbs = useMemo(
		() => [
			'left-[-120px] top-16 h-72 w-72 bg-sky-500/30',
			'right-[-80px] top-44 h-80 w-80 bg-teal-500/25',
			'left-1/3 bottom-[-120px] h-64 w-64 bg-amber-400/20',
		],
		[],
	)

	const handleAnalyzeClick = (e) => {
		e.preventDefault()
		if (user) {
			navigate('/detect')
		} else {
			openAuthModal()
		}
	}

	return (
		<section className="noise relative min-h-screen overflow-hidden px-6 pb-14 pt-36">
			<div className="pointer-events-none absolute inset-0 grid-bg" />
			{orbs.map((classes, idx) => (
				<div
					key={classes}
					className={`pointer-events-none absolute rounded-full blur-3xl animate-float ${classes}`}
					style={{ animationDelay: `${idx * 0.7}s` }}
				/>
			))}

			<div className="relative mx-auto flex w-full max-w-6xl flex-col items-center text-center">
				<Motion.div
					initial={{ opacity: 0, y: 14 }}
					animate={{ opacity: 1, y: 0 }}
					className="glass mb-6 inline-flex items-center gap-3 rounded-full px-4 py-2 text-sm"
				>
					<span className="h-2.5 w-2.5 rounded-full bg-brand-success animate-pulse" />
					AI-Powered Detection
				</Motion.div>

				<Motion.h1
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="max-w-4xl text-4xl font-bold leading-tight text-white md:text-6xl"
				>
					<span className="gradient-text">{displayText}</span>
					<span className="ml-1 animate-pulse text-sky-300">|</span>
				</Motion.h1>

				<Motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.22 }}
					className="mt-6 max-w-3xl text-base text-slate-300 md:text-lg"
				>
					SatyaNetra uses ResNet50 + LSTM neural networks to detect face-swap deepfakes with multi-modal
					analysis powered by visual, audio, and lip-sync intelligence.
				</Motion.p>

				<Motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.35 }}
					className="mt-9 flex flex-wrap items-center justify-center gap-4"
				>
					<button
						type="button"
						onClick={handleAnalyzeClick}
						className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-3 font-semibold text-white transition hover:shadow-[0_0_25px_rgba(14,165,233,0.5)] hover:scale-[1.02]"
					>
						Analyze Video
						<ArrowRight size={18} />
					</button>
					<Link
						to="/#how-it-works"
						className="rounded-full border border-slate-500/70 px-6 py-3 font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
					>
						See How It Works
					</Link>
				</Motion.div>

				<div className="mt-12 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
					<AnimatedStat label="Accuracy" target={99.2} suffix="%" />
					<AnimatedStat label="Analysis" target={30} suffix="s" />
					<AnimatedStat label="Modality" target={3} suffix=" AI" />
				</div>
			</div>

			<div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-400">
				<ChevronDown className="animate-bounce" />
			</div>
		</section>
	)
}

export default HeroSection
