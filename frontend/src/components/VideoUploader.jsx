import { motion as Motion } from 'framer-motion'
import { CheckCircle2, FileVideo, UploadCloud, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'


const MAX_SIZE = 500 * 1024 * 1024


function bytesToMb(size) {
	return `${(size / (1024 * 1024)).toFixed(2)} MB`
}


function VideoUploader({ state, selectedFile, onAnalyze, onCancel }) {
	const [duration, setDuration] = useState(null)
	const previewUrl = useMemo(
		() => (selectedFile ? URL.createObjectURL(selectedFile) : ''),
		[selectedFile],
	)

	useEffect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl)
			}
		}
	}, [previewUrl])

	const statusClass = useMemo(() => {
		if (state.phase === 'error') return 'border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
		if (state.phase === 'complete') return 'border-emerald-500/60 shadow-[0_0_30px_rgba(34,197,94,0.18)]'
		return 'border-sky-500/40'
	}, [state.phase])

	const onDrop = (acceptedFiles) => {
		const file = acceptedFiles?.[0]
		if (file) onAnalyze(file)
	}

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		maxFiles: 1,
		maxSize: MAX_SIZE,
		accept: {
			'video/mp4': ['.mp4'],
			'video/x-msvideo': ['.avi'],
			'video/quicktime': ['.mov'],
			'video/x-matroska': ['.mkv'],
			'video/webm': ['.webm'],
		},
	})

	return (
		<section className="mx-auto w-full max-w-4xl">
			<div
				{...getRootProps()}
				className={`scan-effect glass relative cursor-pointer rounded-3xl border-2 border-dashed p-8 transition ${statusClass} ${
					isDragActive ? 'scale-[1.01] bg-sky-500/10' : ''
				}`}
			>
				<input {...getInputProps()} />
				<div className="flex flex-col items-center text-center">
					<UploadCloud className="h-12 w-12 text-sky-300" />
					<h3 className="mt-4 text-xl font-semibold text-white">Drop your video here</h3>
					<p className="mt-1 text-sm text-slate-300">Accepted: MP4, AVI, MOV, MKV, WebM | Max size: 500MB</p>
				</div>
			</div>

			{selectedFile ? (
				<Motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass mt-5 rounded-2xl p-4">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-3">
							<FileVideo className="text-sky-300" />
							<div>
								<p className="font-semibold text-slate-100">{selectedFile.name}</p>
								<p className="text-sm text-slate-400">
									{bytesToMb(selectedFile.size)} {duration ? `| ${duration.toFixed(1)}s` : ''}
								</p>
							</div>
						</div>
						{previewUrl ? (
							<video
								src={previewUrl}
								onLoadStart={() => setDuration(null)}
								onLoadedMetadata={(event) => {
									const value = event.currentTarget.duration
									setDuration(Number.isFinite(value) ? value : null)
								}}
								className="h-20 w-36 rounded-lg object-cover"
								muted
								playsInline
							/>
						) : null}
					</div>

					<div className="mt-4">
						<div className="mb-1 flex items-center justify-between text-xs text-slate-300">
							<span>Upload Progress</span>
							<span>{state.uploadProgress}%</span>
						</div>
						<div className="h-2 overflow-hidden rounded-full bg-slate-800">
							<div
								className="h-full bg-gradient-to-r from-sky-500 to-teal-400 transition-all"
								style={{ width: `${state.uploadProgress}%` }}
							/>
						</div>
					</div>

					{state.phase === 'error' ? (
						<div className="mt-3 flex items-center gap-2 text-sm text-red-300">
							<XCircle size={18} />
							{state.error}
						</div>
					) : null}

					{state.phase === 'complete' ? (
						<div className="mt-3 flex items-center gap-2 text-sm text-emerald-300">
							<CheckCircle2 size={18} />
							Analysis completed successfully.
						</div>
					) : null}

					{(state.phase === 'uploading' || state.phase === 'analyzing') && (
						<button
							type="button"
							onClick={onCancel}
							className="mt-4 rounded-full border border-slate-500 px-4 py-2 text-sm text-slate-200 transition hover:border-red-400 hover:text-red-200"
						>
							Cancel Upload
						</button>
					)}
				</Motion.div>
			) : null}
		</section>
	)
}

export default VideoUploader

