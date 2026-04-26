import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Eye, X } from 'lucide-react'
import { useState } from 'react'

import { useAuth } from '../context/AuthContext'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'


function AuthModal() {
	const { isAuthModalOpen, closeAuthModal } = useAuth()
	const [activeTab, setActiveTab] = useState('login')

	const handleSuccess = () => {
		closeAuthModal()
		setActiveTab('login')
	}

	return (
		<AnimatePresence>
			{isAuthModalOpen ? (
				<Motion.div
					key="overlay"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
					onClick={closeAuthModal}
					className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
				>
					<Motion.div
						key="modal"
						initial={{ opacity: 0, scale: 0.9, y: 24 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.9, y: 24 }}
						transition={{ type: 'spring', damping: 26, stiffness: 320 }}
						onClick={(e) => e.stopPropagation()}
						className="relative w-full max-w-md overflow-hidden rounded-3xl border border-cyan-300/25 bg-slate-950/95 shadow-[0_0_80px_rgba(14,165,233,0.3)] backdrop-blur-2xl"
					>
						{/* Glow accent */}
						<div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
						<div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />

						<div className="relative max-h-[90vh] overflow-y-auto p-6">
							{/* Close button */}
							<button
								type="button"
								onClick={closeAuthModal}
								className="absolute right-4 top-4 z-10 rounded-xl p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
								aria-label="Close"
							>
								<X size={18} />
							</button>

							{/* Header */}
							<div className="mb-6 text-center">
								<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/35 bg-cyan-400/15 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
									<Eye className="h-6 w-6 text-cyan-300" />
								</div>
								<h2 className="bg-gradient-to-r from-cyan-200 via-cyan-300 to-sky-400 bg-clip-text text-2xl font-bold text-transparent">
									SatyaNetra
								</h2>
								<p className="mt-1 text-sm text-slate-400">AI-Powered Deepfake Detection Platform</p>
							</div>

							{/* Tabs */}
							<div className="relative mb-6 flex rounded-2xl border border-slate-700/50 bg-slate-900/70 p-1">
								<Motion.div
									layout
									transition={{ type: 'spring', damping: 25, stiffness: 300 }}
									className="absolute inset-y-1 rounded-xl border border-cyan-300/30 bg-gradient-to-r from-cyan-500/25 to-sky-500/25"
									style={{
										left: activeTab === 'login' ? '4px' : '50%',
										right: activeTab === 'login' ? '50%' : '4px',
									}}
								/>
								<button
									type="button"
									onClick={() => setActiveTab('login')}
									className={`relative flex-1 rounded-xl py-2 text-sm font-semibold transition ${
										activeTab === 'login' ? 'text-cyan-100' : 'text-slate-400 hover:text-slate-300'
									}`}
								>
									Login
								</button>
								<button
									type="button"
									onClick={() => setActiveTab('signup')}
									className={`relative flex-1 rounded-xl py-2 text-sm font-semibold transition ${
										activeTab === 'signup' ? 'text-cyan-100' : 'text-slate-400 hover:text-slate-300'
									}`}
								>
									Sign Up
								</button>
							</div>

							{/* Form */}
							<AnimatePresence mode="wait">
								{activeTab === 'login' ? (
									<Motion.div
										key="login"
										initial={{ opacity: 0, x: -18 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: 18 }}
										transition={{ duration: 0.18 }}
									>
										<LoginForm
											onSuccess={handleSuccess}
											onSwitchToSignup={() => setActiveTab('signup')}
										/>
									</Motion.div>
								) : (
									<Motion.div
										key="signup"
										initial={{ opacity: 0, x: 18 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: -18 }}
										transition={{ duration: 0.18 }}
									>
										<SignupForm
											onSuccess={handleSuccess}
											onSwitchToLogin={() => setActiveTab('login')}
										/>
									</Motion.div>
								)}
							</AnimatePresence>
						</div>
					</Motion.div>
				</Motion.div>
			) : null}
		</AnimatePresence>
	)
}

export default AuthModal
