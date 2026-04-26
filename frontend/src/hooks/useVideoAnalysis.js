import { useCallback, useMemo, useRef, useState } from 'react'

import { detectDeepfake } from '../utils/api'


const INITIAL = {
	phase: 'idle',
	uploadProgress: 0,
	analysisProgress: 0,
	activeStep: 0,
	error: '',
}

const ANALYSIS_STEPS = [
	'Extracting Frames',
	'Running ResNet50 Feature Extraction',
	'LSTM Temporal Analysis',
	'Audio Analysis (YAMNet)',
	'Lip-Sync Verification',
	'Generating Report',
]

const STEP_PROGRESS_MILESTONES = [12, 28, 44, 60, 76, 95]


export function useVideoAnalysis() {
	const [state, setState] = useState(INITIAL)
	const [result, setResult] = useState(null)
	const [selectedFile, setSelectedFile] = useState(null)
	const timerRef = useRef(null)
	const abortRef = useRef(null)
	const simulationStartedRef = useRef(false)

	const stopTimer = useCallback(() => {
		if (timerRef.current) {
			clearInterval(timerRef.current)
			timerRef.current = null
		}
	}, [])

	const runProgressSimulation = useCallback(() => {
		stopTimer()
		timerRef.current = setInterval(() => {
			setState((prev) => {
				if (prev.analysisProgress >= 95) {
					return prev
				}
				const nextProgress = Math.min(prev.analysisProgress + 3.2, 95)
				let stepIndex = 0
				for (let index = 0; index < STEP_PROGRESS_MILESTONES.length - 1; index += 1) {
					if (nextProgress >= STEP_PROGRESS_MILESTONES[index]) {
						stepIndex = index + 1
					}
				}
				return {
					...prev,
					analysisProgress: nextProgress,
					activeStep: stepIndex,
				}
			})
		}, 500)
	}, [stopTimer])

	const upload = useCallback(async (file) => {
		setSelectedFile(file)
		setResult(null)
		simulationStartedRef.current = false
		setState({
			phase: 'uploading',
			uploadProgress: 0,
			analysisProgress: 0,
			activeStep: 0,
			error: '',
		})

		const controller = new AbortController()
		abortRef.current = controller

		try {
			const response = await detectDeepfake(
				file,
				(event) => {
					const total = event.total || 1
					const progress = Math.round((event.loaded * 100) / total)
					setState((prev) => ({ ...prev, uploadProgress: progress }))
					if (progress > 10 && !simulationStartedRef.current) {
						simulationStartedRef.current = true
						setState((prev) => ({ ...prev, phase: 'analyzing' }))
						runProgressSimulation()
					}
				},
				controller.signal,
			)

			stopTimer()
			simulationStartedRef.current = false
			abortRef.current = null
			setResult(response.data)
			setState({
				phase: 'complete',
				uploadProgress: 100,
				analysisProgress: 100,
				activeStep: ANALYSIS_STEPS.length - 1,
				error: '',
			})
			localStorage.setItem('satyanetra:last-result', JSON.stringify(response.data))
			return response.data
		} catch (error) {
			stopTimer()
			simulationStartedRef.current = false
			abortRef.current = null
			const message = error?.response?.data?.message || error?.message || 'Analysis failed.'
			setState((prev) => ({ ...prev, phase: 'error', error: message }))
			throw error
		}
	}, [runProgressSimulation, stopTimer])

	const cancel = useCallback(() => {
		if (abortRef.current) {
			abortRef.current.abort()
			abortRef.current = null
		}
		stopTimer()
		simulationStartedRef.current = false
		setState((prev) => ({ ...prev, phase: 'idle', uploadProgress: 0, analysisProgress: 0, activeStep: 0 }))
	}, [stopTimer])

	const reset = useCallback(() => {
		stopTimer()
		abortRef.current = null
		simulationStartedRef.current = false
		setResult(null)
		setSelectedFile(null)
		setState(INITIAL)
	}, [stopTimer])

	const steps = useMemo(
		() => ANALYSIS_STEPS.map((label, index) => ({ label, complete: index < state.activeStep, active: index === state.activeStep })),
		[state.activeStep],
	)

	return {
		state,
		result,
		selectedFile,
		steps,
		upload,
		cancel,
		reset,
	}
}

