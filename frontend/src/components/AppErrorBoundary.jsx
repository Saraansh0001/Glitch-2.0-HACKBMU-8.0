import { Component } from 'react'


class AppErrorBoundary extends Component {
	constructor(props) {
		super(props)
		this.state = {
			hasError: false,
			errorMessage: '',
		}
	}

	static getDerivedStateFromError(error) {
		return {
			hasError: true,
			errorMessage: error?.message || 'Unknown frontend error.',
		}
	}

	componentDidCatch(error, errorInfo) {
		console.error('SatyaNetra frontend crash:', error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-10">
					<div className="glass w-full rounded-3xl border border-red-500/40 p-6 text-slate-100">
						<h1 className="text-2xl font-bold text-white">Frontend Error Detected</h1>
						<p className="mt-3 text-sm text-slate-300">
							The UI hit an unexpected runtime error. Use the button below to recover.
						</p>
						<p className="mt-3 rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs text-red-300">
							{this.state.errorMessage}
						</p>
						<button
							type="button"
							onClick={() => window.location.reload()}
							className="mt-5 rounded-full bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2 text-sm font-semibold text-white"
						>
							Reload Interface
						</button>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}

export default AppErrorBoundary
