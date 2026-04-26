import { AnimatePresence, motion as Motion } from 'framer-motion'
import {
	AlertTriangle,
	ArrowDownUp,
	Calendar,
	CheckCircle2,
	ChevronDown,
	Clock,
	Film,
	Frown,
	ShieldCheck,
	Trash2,
} from 'lucide-react'
import { useMemo, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'


// ─── helpers ────────────────────────────────────────────────────────────────

function isDeepfakeRow(d) {
	return d.verdict != null ? d.verdict === 'DEEPFAKE' : (d.confidence ?? 0) >= 0.5
}

function scoreBar(value) {
	const pct = Math.round((value ?? 0) * 100)
	const color =
		pct >= 70 ? 'from-red-400 to-rose-500' : pct >= 40 ? 'from-amber-400 to-yellow-500' : 'from-emerald-400 to-teal-500'
	return (
		<div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
			<div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
		</div>
	)
}


// ─── sort dropdown ───────────────────────────────────────────────────────────

const SORT_OPTIONS = [
	{ value: 'newest', label: 'Most Recent' },
	{ value: 'oldest', label: 'Oldest First' },
	{ value: 'conf_desc', label: 'Highest Confidence' },
	{ value: 'conf_asc', label: 'Lowest Confidence' },
]

function SortDropdown({ value, onChange }) {
	const [open, setOpen] = useState(false)
	const ref = useRef(null)
	const selected = SORT_OPTIONS.find((o) => o.value === value)

	useEffect(() => {
		const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
		document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [])

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-100"
			>
				<ArrowDownUp size={14} className="text-cyan-400" />
				{selected?.label}
				<ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
			</button>

			<AnimatePresence>
				{open && (
					<Motion.div
						initial={{ opacity: 0, y: -6, scale: 0.97 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -6, scale: 0.97 }}
						transition={{ duration: 0.15 }}
						className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/95 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl"
					>
						{SORT_OPTIONS.map((opt) => (
							<button
								key={opt.value}
								type="button"
								onClick={() => { onChange(opt.value); setOpen(false) }}
								className={`flex w-full items-center px-4 py-2.5 text-sm transition hover:bg-slate-800 ${
									value === opt.value ? 'text-cyan-300 font-semibold' : 'text-slate-300'
								}`}
							>
								{value === opt.value && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-cyan-400" />}
								{opt.label}
							</button>
						))}
					</Motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}


// ─── filter tabs ─────────────────────────────────────────────────────────────

const FILTER_TABS = [
	{ value: 'all', label: 'All' },
	{ value: 'deepfake', label: 'Deepfake' },
	{ value: 'authentic', label: 'Authentic' },
]

function FilterTabs({ value, onChange, counts }) {
	return (
		<div className="flex gap-2">
			{FILTER_TABS.map((tab) => {
				const active = value === tab.value
				return (
					<button
						key={tab.value}
						type="button"
						onClick={() => onChange(tab.value)}
						className={`relative rounded-xl border px-4 py-2 text-sm font-semibold transition ${
							active
								? tab.value === 'deepfake'
									? 'border-red-400/50 bg-red-500/15 text-red-200 shadow-[0_0_14px_rgba(239,68,68,0.2)]'
									: tab.value === 'authentic'
										? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200 shadow-[0_0_14px_rgba(34,197,94,0.2)]'
										: 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.2)]'
								: 'border-slate-700/50 bg-slate-900/40 text-slate-400 hover:border-slate-600 hover:text-slate-300'
						}`}
					>
						{tab.label}
						<span
							className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
								active ? 'bg-white/15' : 'bg-slate-800'
							}`}
						>
							{counts[tab.value]}
						</span>
					</button>
				)
			})}
		</div>
	)
}


// ─── detection card ──────────────────────────────────────────────────────────

function DetectionCard({ detection, index, onDelete }) {
	const isDeepfake = isDeepfakeRow(detection)
	const date = new Date(detection.created_at)
	const [deleting, setDeleting] = useState(false)

	const handleDelete = async () => {
		setDeleting(true)
		const { error } = await supabase.from('detections').delete().eq('id', detection.id)
		if (error) {
			toast.error('Failed to delete entry.')
			setDeleting(false)
		} else {
			toast.success('Entry removed.')
			onDelete(detection.id)
		}
	}

	return (
		<Motion.article
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.97, y: -8 }}
			transition={{ duration: 0.28, delay: index * 0.05 }}
			className={`rounded-2xl border p-5 backdrop-blur-xl transition hover:scale-[1.005] ${
				isDeepfake
					? 'border-red-300/25 bg-red-500/5 hover:shadow-[0_0_28px_rgba(239,68,68,0.15)]'
					: 'border-emerald-300/25 bg-emerald-500/5 hover:shadow-[0_0_28px_rgba(34,197,94,0.15)]'
			}`}
		>
			{/* Header */}
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div className="flex min-w-0 items-center gap-2">
					<Film className="h-4 w-4 shrink-0 text-slate-400" />
					<p className="truncate font-semibold text-slate-100" title={detection.video_name}>
						{detection.video_name || 'Unknown file'}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<span
						className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
							isDeepfake
								? 'border border-red-300/30 bg-red-500/15 text-red-200'
								: 'border border-emerald-300/30 bg-emerald-500/15 text-emerald-200'
						}`}
					>
						{isDeepfake ? <AlertTriangle size={11} /> : <ShieldCheck size={11} />}
						{isDeepfake ? 'DEEPFAKE' : 'AUTHENTIC'}
					</span>
					<button
						type="button"
						onClick={handleDelete}
						disabled={deleting}
						className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/50 text-slate-500 transition hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
						aria-label="Delete entry"
					>
						<Trash2 size={13} />
					</button>
				</div>
			</div>

			{/* Scores */}
			<div className="mt-4 grid gap-3 sm:grid-cols-4">
				{[
					{ label: 'Confidence', value: detection.confidence },
					{ label: 'Visual', value: detection.visual_score },
					{ label: 'Audio', value: detection.audio_score },
					{ label: 'Lip-Sync', value: detection.lipsync_score },
				].map(({ label, value }) => (
					<div key={label}>
						<div className="flex items-center justify-between text-xs text-slate-400">
							<span>{label}</span>
							<span className="font-semibold text-slate-200">
								{value != null ? `${(value * 100).toFixed(1)}%` : 'N/A'}
							</span>
						</div>
						{value != null ? scoreBar(value) : <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-800" />}
					</div>
				))}
			</div>

			{/* Footer */}
			<div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
				<Calendar size={11} />
				{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
				<Clock size={11} className="ml-2" />
				{date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
			</div>
		</Motion.article>
	)
}


// ─── main page ───────────────────────────────────────────────────────────────

function History() {
	const { user } = useAuth()
	const [detections, setDetections] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState('')
	const [filter, setFilter] = useState('all')
	const [sort, setSort] = useState('newest')

	useEffect(() => {
		if (!user) return
		setIsLoading(true)
		supabase
			.from('detections')
			.select('*')
			.eq('user_id', user.id)
			.order('created_at', { ascending: false })
			.then(({ data, error: err }) => {
				if (err) setError(err.message)
				else setDetections(data || [])
				setIsLoading(false)
			})
	}, [user])

	const handleDelete = (id) => setDetections((prev) => prev.filter((d) => d.id !== id))

	// counts for tab badges
	const counts = useMemo(() => ({
		all: detections.length,
		deepfake: detections.filter(isDeepfakeRow).length,
		authentic: detections.filter((d) => !isDeepfakeRow(d)).length,
	}), [detections])

	// filtered + sorted list
	const displayed = useMemo(() => {
		let list = [...detections]

		if (filter === 'deepfake') list = list.filter(isDeepfakeRow)
		else if (filter === 'authentic') list = list.filter((d) => !isDeepfakeRow(d))

		switch (sort) {
			case 'oldest':
				list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
				break
			case 'conf_desc':
				list.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
				break
			case 'conf_asc':
				list.sort((a, b) => (a.confidence ?? 0) - (b.confidence ?? 0))
				break
			default: // newest
				list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
		}

		return list
	}, [detections, filter, sort])

	const totalScans = detections.length
	const deepfakeCount = counts.deepfake
	const avgConfidence =
		detections.length ? (detections.reduce((s, d) => s + (d.confidence ?? 0), 0) / detections.length) * 100 : 0

	return (
		<div className="noise relative min-h-screen overflow-hidden bg-[#020617] text-slate-100">
			<Navbar />

			<div className="pointer-events-none absolute inset-0 -z-10">
				<div className="absolute left-[-10%] top-24 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
				<div className="absolute right-[-10%] top-48 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
			</div>

			<main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-28 sm:px-6">
				{/* Header */}
				<Motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45 }}
					className="mb-8"
				>
					<div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-[0.18em] text-cyan-200 backdrop-blur-xl">
						<CheckCircle2 size={12} />
						DETECTION HISTORY
					</div>
					<h1 className="mt-4 bg-gradient-to-r from-cyan-200 via-cyan-300 to-sky-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
						My Scans
					</h1>
					<p className="mt-2 text-slate-400">All your past deepfake detection results, stored securely.</p>
				</Motion.div>

				{/* Stats */}
				{!isLoading && detections.length > 0 ? (
					<Motion.div
						initial={{ opacity: 0, y: 14 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, delay: 0.1 }}
						className="mb-7 grid gap-4 sm:grid-cols-3"
					>
						{[
							{ label: 'Total Scans', value: totalScans, color: 'text-cyan-200' },
							{ label: 'Deepfakes Found', value: deepfakeCount, color: 'text-red-300' },
							{ label: 'Avg Confidence', value: `${avgConfidence.toFixed(1)}%`, color: 'text-amber-300' },
						].map((s) => (
							<div key={s.label} className="rounded-2xl border border-cyan-300/20 bg-white/5 px-5 py-4 backdrop-blur-xl">
								<p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
								<p className="mt-0.5 text-sm text-slate-400">{s.label}</p>
							</div>
						))}
					</Motion.div>
				) : null}

				{/* Filter + Sort bar */}
				{!isLoading && detections.length > 0 ? (
					<Motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.35, delay: 0.15 }}
						className="mb-5 flex flex-wrap items-center justify-between gap-3"
					>
						<FilterTabs value={filter} onChange={setFilter} counts={counts} />
						<SortDropdown value={sort} onChange={setSort} />
					</Motion.div>
				) : null}

				{/* Results count */}
				{!isLoading && detections.length > 0 ? (
					<p className="mb-4 text-xs text-slate-500">
						Showing {displayed.length} of {totalScans} scan{totalScans !== 1 ? 's' : ''}
					</p>
				) : null}

				{/* Content */}
				{isLoading ? (
					<div className="flex items-center justify-center py-24">
						<div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
					</div>
				) : error ? (
					<div className="rounded-2xl border border-red-300/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
						{error}
					</div>
				) : detections.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
						<Frown className="h-12 w-12 text-slate-600" />
						<p className="text-lg font-semibold text-slate-400">No scans yet</p>
						<p className="text-sm text-slate-500">Run your first detection and it will appear here.</p>
					</div>
				) : displayed.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
						<Frown className="h-10 w-10 text-slate-600" />
						<p className="text-base font-semibold text-slate-400">No results for this filter</p>
					</div>
				) : (
					<div className="grid gap-4">
						<AnimatePresence>
							{displayed.map((d, i) => (
								<DetectionCard key={d.id} detection={d} index={i} onDelete={handleDelete} />
							))}
						</AnimatePresence>
					</div>
				)}
			</main>
		</div>
	)
}

export default History
