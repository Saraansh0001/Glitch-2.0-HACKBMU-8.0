import { motion as Motion } from 'framer-motion'
import {
	AlertTriangle,
	AudioLines,
	Bot,
	BrainCircuit,
	Check,
	CheckCircle2,
	ChevronRight,
	Cpu,
	Download,
	FileSearch2,
	Film,
	Fingerprint,
	Lock,
	Radar,
	ShieldCheck,
	Sparkles,
	UploadCloud,
	Waves,
	X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

import Chatbot from '../components/Chatbot'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { useVideoAnalysis } from '../hooks/useVideoAnalysis'
import { supabase } from '../lib/supabaseClient'
import { downloadReport } from '../utils/api'


const MAX_UPLOAD_SIZE = 500 * 1024 * 1024

const ACCEPTED_VIDEO_TYPES = {
	'video/mp4': ['.mp4'],
	'video/x-msvideo': ['.avi'],
	'video/quicktime': ['.mov'],
	'video/x-matroska': ['.mkv'],
	'video/webm': ['.webm'],
}

const STATS = [
	{ label: 'Detection Accuracy', value: '99.8%', icon: ShieldCheck },
	{ label: 'Processing Latency', value: '0.4s', icon: Cpu },
	{ label: 'Encryption', value: 'AES-256', icon: Lock },
]

const PIPELINE = [
	{ label: 'Capture', icon: Film },
	{ label: 'Isolate', icon: Fingerprint },
	{ label: 'Neural Scan', icon: Radar, active: true },
	{ label: 'Verified', icon: CheckCircle2 },
]

const STEP_ICONS = [Film, BrainCircuit, Waves, AudioLines, Sparkles, FileSearch2]

const FEATURE_CARDS = [
	{
		title: 'Audio Biomarkers',
		description: 'Detects synthetic spectral signatures and phase anomalies in speech tracks.',
		background:
			'linear-gradient(180deg, rgba(2,6,23,0.2) 0%, rgba(2,6,23,0.88) 100%), radial-gradient(circle at 20% 20%, rgba(34,211,238,0.46), transparent 50%), radial-gradient(circle at 80% 10%, rgba(14,165,233,0.22), transparent 40%), linear-gradient(135deg, #0f172a 0%, #07203b 45%, #082f49 100%)',
	},
	{
		title: 'Facial Distortion',
		description: 'Tracks frame-level geometry drift, blend seams, and temporal warping artifacts.',
		background:
			'linear-gradient(180deg, rgba(2,6,23,0.25) 0%, rgba(2,6,23,0.9) 100%), radial-gradient(circle at 70% 25%, rgba(45,212,191,0.4), transparent 50%), radial-gradient(circle at 15% 80%, rgba(14,165,233,0.18), transparent 45%), linear-gradient(140deg, #0f172a 0%, #0a1f39 50%, #102a43 100%)',
	},
]

function bytesToMb(size) {
	return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

function scoreToPercent(score) {
	return `${(Number(score || 0) * 100).toFixed(2)}%`
}

function listToLabel(values) {
	if (!Array.isArray(values) || values.length === 0) {
		return 'visual'
	}
	return values.join(', ')
}

function Detect() {
	const { state, result, selectedFile, steps, upload, cancel, reset } = useVideoAnalysis()
	const { user } = useAuth()
	const [pendingFile, setPendingFile] = useState(null)

	// pendingFile (freshly browsed) takes priority over selectedFile (from last analysis)
	const workingFile = pendingFile || selectedFile
	const isBusy = state.phase === 'uploading' || state.phase === 'analyzing'
	const progressVisible = useMemo(() => isBusy, [isBusy])
	const modalityStatus = result?.modality_status || {}
	const audioFallback = Boolean(modalityStatus.audio_fallback)
	const lipFallback = Boolean(modalityStatus.lip_sync_fallback)
	const activeModalities = listToLabel(modalityStatus.active_modalities)

	const handleFileUpload = (file) => {
		if (!file) return
		setPendingFile(file)
		toast.success('Video ready for analysis.')
	}

	const handleClearFile = (e) => {
		e.stopPropagation()
		setPendingFile(null)
		reset()
	}

	const saveDetection = async (videoName, data) => {
		if (!user) return
		const ms = data.modality_status || {}
		try {
			await supabase.from('detections').insert({
				user_id: user.id,
				video_name: videoName,
				verdict: data.verdict ?? null,
				confidence: data.confidence ?? null,
				visual_score: data.visual_score ?? null,
				audio_score: ms.audio_fallback ? null : (data.audio_score ?? null),
				lipsync_score: ms.lip_sync_fallback ? null : (data.lip_sync_score ?? null),
			})
		} catch (err) {
			console.error('Failed to save detection result:', err)
		}
	}

	const handleAnalyze = async () => {
		const file = workingFile
		if (!file) {
			toast.error('Please select a video first.')
			return
		}

		try {
			const analysisResult = await upload(file)
			setPendingFile(null)
			toast.success('Analysis completed.')
			if (analysisResult) {
				saveDetection(file.name, analysisResult)
			}
		} catch (error) {
			const rawMessage =
				error?.response?.data?.message ||
				error?.response?.data?.details ||
				error?.message ||
				'Analysis failed. Please try another file.'
			const message =
				rawMessage === 'Network Error'
					? 'Local server is unreachable. Start the app with start_satyanetra_prod.bat and open http://localhost:5050.'
					: rawMessage
			toast.error(message)
		}
	}

	const handleDownloadReport = async () => {
		if (!result) return
		try {
			const response = await downloadReport(result)
			const blob = new Blob([response.data], { type: 'application/pdf' })
			const url = window.URL.createObjectURL(blob)
			const anchor = document.createElement('a')
			anchor.href = url
			anchor.download = `satyanetra_report_${Date.now()}.pdf`
			anchor.click()
			window.URL.revokeObjectURL(url)
			toast.success('Report downloaded.')
		} catch {
			toast.error('Failed to download report.')
		}
	}

	const handleAskAi = () => {
		toast('Open the chatbot at the bottom-right corner.')
	}

	const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
		accept: ACCEPTED_VIDEO_TYPES,
		maxFiles: 1,
		maxSize: MAX_UPLOAD_SIZE,
		multiple: false,
		noClick: true,
		noKeyboard: true,
		disabled: isBusy,
		onDropAccepted: (acceptedFiles) => {
			handleFileUpload(acceptedFiles[0])
		},
		onDropRejected: () => {
			toast.error('Unsupported file. Use MP4, AVI, MOV, MKV, or WebM under 500MB.')
		},
	})

	return (
		<div className="noise relative min-h-screen overflow-hidden bg-[#020617] text-slate-100">
			<Navbar />

			<div className="pointer-events-none absolute inset-0 -z-10">
				<div className="absolute left-[-12%] top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
				<div className="absolute right-[-12%] top-40 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />
				<div className="absolute bottom-0 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-teal-400/10 blur-3xl" />
			</div>

			<main className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
				<Motion.section
					initial={{ opacity: 0, y: 26 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.55, ease: 'easeOut' }}
					className="mx-auto max-w-3xl text-center"
				>
					<div className="mx-auto inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-cyan-200 backdrop-blur-xl">
						<span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.9)]" />
						SYSTEM STATUS: ACTIVE SCAN
					</div>
					<h1 className="mt-6 bg-gradient-to-r from-cyan-200 via-cyan-300 to-sky-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
						Deepfake Detection Studio
					</h1>
					<p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
						Forensic-grade visual, audio, and temporal verification pipeline for high-confidence media authentication.
					</p>
				</Motion.section>

				<Motion.section
					initial={{ opacity: 0, scale: 0.985, y: 22 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					{...getRootProps()}
					className={`relative mt-10 rounded-3xl border-2 border-dashed p-8 backdrop-blur-xl transition-all duration-300 sm:p-10 ${
						isDragActive
							? 'scale-[1.01] border-cyan-300 bg-white/10 shadow-[0_0_44px_rgba(34,211,238,0.45)]'
							: 'border-cyan-300/40 bg-white/5 shadow-[0_0_28px_rgba(34,211,238,0.2)] hover:scale-[1.01] hover:border-cyan-300/65 hover:shadow-[0_0_40px_rgba(34,211,238,0.38)]'
					}`}
				>
					<input {...getInputProps()} />
					<div className="absolute inset-0 rounded-3xl border border-white/10" />
					<div className="relative flex flex-col items-center text-center">
						<div className="flex h-20 w-20 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-400/10 text-cyan-200 shadow-[0_0_22px_rgba(34,211,238,0.35)]">
							<UploadCloud className="h-9 w-9" />
						</div>
						<h2 className="mt-6 text-2xl font-semibold text-white sm:text-3xl">Drop your video here</h2>
						<p className="mt-2 text-sm text-slate-300 sm:text-base">
							Accepted formats: MP4, AVI, MOV, MKV, WebM and max upload size of 500MB.
						</p>

						{workingFile ? (
							<div className="mt-5 flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-slate-950/55 px-4 py-3 text-left text-sm text-slate-200">
								<div className="min-w-0 flex-1">
									<p className="truncate font-semibold text-cyan-100">{workingFile.name}</p>
									<p className="mt-1 text-xs text-slate-400">{bytesToMb(workingFile.size)}</p>
								</div>
								<button
									type="button"
									onClick={handleClearFile}
									disabled={isBusy}
									className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-700/60 text-slate-400 transition hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30"
									aria-label="Remove selected file"
								>
									<X size={14} />
								</button>
							</div>
						) : null}

						<div className="mt-7 flex flex-wrap items-center justify-center gap-3">
							<Motion.button
								type="button"
								onClick={(event) => {
									event.stopPropagation()
									open()
								}}
								whileHover={{ scale: 1.03 }}
								whileTap={{ scale: 0.98 }}
								className="rounded-full border border-cyan-300/60 bg-cyan-400/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.22)] transition hover:shadow-[0_0_30px_rgba(34,211,238,0.45)]"
								disabled={isBusy}
							>
								Browse Files
							</Motion.button>
							<Motion.button
								type="button"
								onClick={(event) => {
									event.stopPropagation()
									handleAnalyze()
								}}
								whileHover={{ scale: 1.03 }}
								whileTap={{ scale: 0.98 }}
								className="rounded-full bg-gradient-to-r from-cyan-400 to-sky-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.42)] transition disabled:cursor-not-allowed disabled:opacity-50"
								disabled={!workingFile || isBusy}
							>
								{isBusy ? 'Running Neural Scan...' : 'Start Neural Scan'}
							</Motion.button>
							{isBusy ? (
								<button
									type="button"
									onClick={(event) => {
										event.stopPropagation()
										cancel()
									}}
									className="rounded-full border border-red-300/45 px-5 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-400/10"
								>
									Cancel Scan
								</button>
							) : null}
						</div>

						{state.phase === 'error' ? (
							<div className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-300/40 bg-red-500/10 px-4 py-2 text-sm text-red-100">
								<AlertTriangle className="h-4 w-4" />
								{state.error}
							</div>
						) : null}

						{state.phase === 'complete' ? (
							<div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
								<CheckCircle2 className="h-4 w-4" />
								Analysis completed successfully.
							</div>
						) : null}

						<div className="mt-7 grid w-full max-w-3xl gap-4 text-left sm:grid-cols-2">
							<div className="rounded-2xl border border-cyan-300/20 bg-slate-950/55 p-4">
								<div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
									<span>Upload Progress</span>
									<span>{state.uploadProgress}%</span>
								</div>
								<div className="h-2.5 overflow-hidden rounded-full bg-slate-900">
									<div
										className="h-full bg-gradient-to-r from-cyan-400 to-sky-400 transition-all"
										style={{ width: `${state.uploadProgress}%` }}
									/>
								</div>
							</div>
							<div className="rounded-2xl border border-cyan-300/20 bg-slate-950/55 p-4">
								<div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
									<span>Neural Analysis</span>
									<span>{Math.round(state.analysisProgress)}%</span>
								</div>
								<div className="h-2.5 overflow-hidden rounded-full bg-slate-900">
									<div
										className="h-full bg-gradient-to-r from-teal-300 via-cyan-300 to-sky-400 transition-all"
										style={{ width: `${state.analysisProgress}%` }}
									/>
								</div>
							</div>
						</div>
					</div>
				</Motion.section>

				<Motion.section
					initial={{ opacity: 0, y: 24 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, amount: 0.2 }}
					transition={{ duration: 0.45 }}
					className="mt-9 grid gap-4 md:grid-cols-3"
				>
					{STATS.map((item, index) => {
						const Icon = item.icon
						return (
							<Motion.article
								key={item.label}
								initial={{ opacity: 0, y: 14 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.35, delay: index * 0.08 }}
								whileHover={{ y: -5 }}
								className="rounded-2xl border border-cyan-300/30 bg-white/5 p-5 backdrop-blur-xl transition hover:shadow-[0_0_28px_rgba(34,211,238,0.28)]"
							>
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-400/10 text-cyan-200">
										<Icon className="h-5 w-5" />
									</div>
									<div>
										<p className="text-2xl font-bold text-cyan-100">{item.value}</p>
										<p className="text-sm text-slate-300">{item.label}</p>
									</div>
								</div>
							</Motion.article>
						)
					})}
				</Motion.section>

				<Motion.section
					initial={{ opacity: 0, y: 24 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, amount: 0.2 }}
					transition={{ duration: 0.45 }}
					className="mt-8 rounded-2xl border border-cyan-300/25 bg-white/5 p-6 backdrop-blur-xl"
				>
					<div className="mb-4 flex items-center justify-between">
						<h3 className="text-lg font-semibold text-white sm:text-xl">Forensic Pipeline</h3>
						<span className="text-xs uppercase tracking-[0.18em] text-cyan-200">Real-time workflow</span>
					</div>
					<div className="grid gap-4 sm:grid-cols-4">
						{PIPELINE.map((item, index) => {
							const Icon = item.icon
							return (
								<div key={item.label} className="relative flex items-center gap-3">
									<div
										className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm ${
											item.active
												? 'border-cyan-300 bg-cyan-400/20 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.5)]'
												: 'border-cyan-300/30 bg-slate-900/60 text-slate-200'
										}`}
									>
										<Icon className="h-4 w-4" />
									</div>
									<div className="min-w-0">
										<p className={`text-sm font-semibold ${item.active ? 'text-cyan-100' : 'text-slate-200'}`}>{item.label}</p>
									</div>
									{index < PIPELINE.length - 1 ? (
										<div className="absolute -right-2 top-1/2 hidden h-px w-4 -translate-y-1/2 bg-cyan-300/30 sm:block" />
									) : null}
								</div>
							)
						})}
					</div>
				</Motion.section>

				{progressVisible ? (
					<Motion.section
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						className="mt-8 rounded-2xl border border-cyan-300/25 bg-white/5 p-6 backdrop-blur-xl"
					>
						<div className="mb-5 flex flex-wrap items-center justify-between gap-2">
							<h3 className="text-lg font-semibold text-white sm:text-xl">Analysis in Progress</h3>
							<p className="text-sm text-cyan-200">{Math.round(state.analysisProgress)}% complete</p>
						</div>
						<div className="mb-5 h-2.5 overflow-hidden rounded-full bg-slate-900">
							<div
								className="h-full bg-gradient-to-r from-cyan-300 via-teal-300 to-sky-400 transition-all duration-500"
								style={{ width: `${state.analysisProgress}%` }}
							/>
						</div>
						<div className="grid gap-3 md:grid-cols-2">
							{steps.map((step, index) => {
								const Icon = STEP_ICONS[index] || Sparkles
								const isActive = step.active
								const isComplete = step.complete
								return (
									<div
										key={step.label}
										className={`rounded-xl border px-4 py-3 transition ${
											isActive
												? 'border-cyan-300/60 bg-cyan-400/10 shadow-[0_0_22px_rgba(34,211,238,0.25)]'
												: isComplete
													? 'border-emerald-300/35 bg-emerald-400/10'
													: 'border-cyan-300/20 bg-slate-950/45'
										}`}
									>
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-2">
												<Icon className={`h-4 w-4 ${isActive ? 'text-cyan-200' : 'text-slate-300'}`} />
												<p className="text-sm font-medium text-slate-100">{step.label}</p>
											</div>
											{isComplete ? <Check className="h-4 w-4 text-emerald-300" /> : null}
										</div>
									</div>
								)
							})}
						</div>
					</Motion.section>
				) : null}

				{result ? (
					<Motion.section
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="mt-8 rounded-3xl border border-cyan-300/30 bg-white/5 p-6 backdrop-blur-xl"
					>
						<div
							className={`rounded-2xl border px-5 py-5 ${
								result.verdict === 'DEEPFAKE'
									? 'border-red-300/40 bg-red-500/10'
									: 'border-emerald-300/40 bg-emerald-500/10'
							}`}
						>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div className="flex items-center gap-2">
									{result.verdict === 'DEEPFAKE' ? (
										<AlertTriangle className="h-5 w-5 text-red-200" />
									) : (
										<ShieldCheck className="h-5 w-5 text-emerald-200" />
									)}
									<h3 className="text-2xl font-bold text-white">
										{result.verdict === 'DEEPFAKE' ? 'Potential Deepfake Detected' : 'Authentic Video Signature'}
									</h3>
								</div>
								<p className="text-base font-semibold text-slate-100">Confidence: {scoreToPercent(result.confidence)}</p>
							</div>
						</div>

						<div className="mt-5 grid gap-4 md:grid-cols-3">
							<div className="rounded-2xl border border-cyan-300/25 bg-slate-950/50 p-4">
								<p className="text-xs uppercase tracking-[0.2em] text-slate-400">Visual Score</p>
								<p className="mt-2 text-2xl font-bold text-cyan-100">{scoreToPercent(result.visual_score)}</p>
							</div>
							<div className="rounded-2xl border border-cyan-300/25 bg-slate-950/50 p-4">
								<p className="text-xs uppercase tracking-[0.2em] text-slate-400">Audio Score</p>
								<p className="mt-2 text-2xl font-bold text-cyan-100">{audioFallback ? 'N/A' : scoreToPercent(result.audio_score)}</p>
								<p className="mt-1 text-xs text-slate-300">
									{audioFallback ? modalityStatus.audio_reason || 'Audio analysis unavailable.' : 'Audio track analyzed'}
								</p>
							</div>
							<div className="rounded-2xl border border-cyan-300/25 bg-slate-950/50 p-4">
								<p className="text-xs uppercase tracking-[0.2em] text-slate-400">Lip-Sync Score</p>
								<p className="mt-2 text-2xl font-bold text-cyan-100">{lipFallback ? 'N/A' : scoreToPercent(result.lip_sync_score)}</p>
								<p className="mt-1 text-xs text-slate-300">
									{lipFallback ? modalityStatus.lip_sync_reason || 'Lip-sync analysis unavailable.' : 'Mouth-motion timeline analyzed'}
								</p>
							</div>
						</div>

						<div className="mt-5 grid gap-5 lg:grid-cols-2">
							<div className="rounded-2xl border border-cyan-300/25 bg-slate-950/55 p-4">
								<h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Video Metadata</h4>
								<div className="mt-3 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
									<p>FPS: {result.video_metadata?.fps ?? 0}</p>
									<p>Duration: {result.video_metadata?.duration ?? 0}s</p>
									<p>
										Resolution: {result.video_metadata?.width ?? 0} x {result.video_metadata?.height ?? 0}
									</p>
									<p>Frames: {result.video_metadata?.total_frames ?? 0}</p>
									<p>Runtime: {result.analysis_time_seconds ?? 0}s</p>
									<p>Decision Threshold: {scoreToPercent(result.decision_threshold)}</p>
									<p>Visual Baseline Threshold: {scoreToPercent(result.visual_decision_threshold)}</p>
									<p>Active Modalities: {activeModalities}</p>
								</div>
							</div>
							<div className="rounded-2xl border border-cyan-300/25 bg-slate-950/55 p-4">
								<h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Inconsistency Timeline</h4>
								<div className="mt-3 flex flex-wrap gap-2">
									{(result.inconsistent_timestamps || []).length ? (
										(result.inconsistent_timestamps || []).map((time, index) => (
											<span
												key={`${time}-${index}`}
												className="rounded-full border border-red-300/30 bg-red-500/10 px-3 py-1 text-xs text-red-100"
											>
												{time}s
											</span>
										))
									) : (
										<p className="text-sm text-slate-300">No major inconsistency markers detected.</p>
									)}
								</div>
							</div>
						</div>

						<div className="mt-6 flex flex-wrap gap-3">
							<Motion.button
								type="button"
								onClick={handleDownloadReport}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 to-sky-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.38)]"
							>
								<Download className="h-4 w-4" />
								Download PDF Report
							</Motion.button>
							<Motion.button
								type="button"
								onClick={handleAskAi}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								className="inline-flex items-center gap-2 rounded-full border border-cyan-300/50 px-5 py-2.5 text-sm font-semibold text-cyan-100"
							>
								<Bot className="h-4 w-4" />
								Ask AI Chatbot
							</Motion.button>
						</div>
					</Motion.section>
				) : null}

				<Motion.section
					initial={{ opacity: 0, y: 24 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, amount: 0.2 }}
					transition={{ duration: 0.45 }}
					className="mt-9 grid gap-4 md:grid-cols-2"
				>
					{FEATURE_CARDS.map((item, index) => (
						<Motion.article
							key={item.title}
							initial={{ opacity: 0, y: 12 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.35, delay: index * 0.08 }}
							whileHover={{ scale: 1.01, y: -4 }}
							className="group relative overflow-hidden rounded-2xl border border-cyan-300/25 p-6"
							style={{ backgroundImage: item.background }}
						>
							<div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 group-hover:shadow-[inset_0_0_40px_rgba(34,211,238,0.25)]" />
							<div className="relative mt-20">
								<p className="text-xs uppercase tracking-[0.2em] text-cyan-100/90">Forensic Module</p>
								<h3 className="mt-2 text-2xl font-semibold text-white">{item.title}</h3>
								<p className="mt-2 text-sm text-slate-200">{item.description}</p>
								<div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cyan-200">
									Inspect Module
									<ChevronRight className="h-4 w-4" />
								</div>
							</div>
						</Motion.article>
					))}
				</Motion.section>
			</main>

			<footer className="border-t border-cyan-300/20 bg-slate-950/70 px-4 py-5 sm:px-6">
				<div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
					<p className="font-semibold text-cyan-100">SatyaNetra Forensic Engine</p>
					<div className="flex items-center gap-5">
						<a className="transition hover:text-cyan-200" href="/">
							Home
						</a>
						<a className="transition hover:text-cyan-200" href="/about">
							About
						</a>
						<a className="transition hover:text-cyan-200" href="/detect">
							Detect
						</a>
					</div>
				</div>
			</footer>

			<Motion.button
				type="button"
				onClick={handleAskAi}
				className="group fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/60 bg-cyan-400/25 text-cyan-100 shadow-[0_0_26px_rgba(34,211,238,0.5)] backdrop-blur-xl"
				animate={{
					scale: [1, 1.07, 1],
					boxShadow: [
						'0 0 22px rgba(34,211,238,0.45)',
						'0 0 34px rgba(34,211,238,0.8)',
						'0 0 22px rgba(34,211,238,0.45)',
					],
				}}
				transition={{ duration: 2.1, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
			>
				<Bot className="h-6 w-6" />
				<span className="pointer-events-none absolute right-16 whitespace-nowrap rounded-md border border-cyan-300/40 bg-slate-950/90 px-3 py-1 text-xs text-cyan-100 opacity-0 transition group-hover:opacity-100">
					Open AI Assistant
				</span>
			</Motion.button>

			<Chatbot />
		</div>
	)
}

export default Detect
