import { motion as Motion } from 'framer-motion'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

import { supabase } from '../lib/supabaseClient'


const INPUT_CLS =
	'w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:border-cyan-400/60 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition'


function LoginForm({ onSuccess, onSwitchToSignup }) {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState('')

	const handleSubmit = async (e) => {
		e.preventDefault()
		setError('')
		setIsLoading(true)
		try {
			const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
			if (authError) throw authError
			toast.success('Welcome back! Login successful.')
			onSuccess()
		} catch (err) {
			setError(err.message || 'Login failed. Please check your credentials.')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label className="mb-1.5 block text-xs uppercase tracking-widest text-slate-400">Email</label>
				<input
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
					placeholder="you@example.com"
					className={INPUT_CLS}
				/>
			</div>

			<div>
				<label className="mb-1.5 block text-xs uppercase tracking-widest text-slate-400">Password</label>
				<div className="relative">
					<input
						type={showPassword ? 'text' : 'password'}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						placeholder="••••••••"
						className={`${INPUT_CLS} pr-10`}
					/>
					<button
						type="button"
						onClick={() => setShowPassword((v) => !v)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
						aria-label="Toggle password visibility"
					>
						{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
					</button>
				</div>
			</div>

			{error ? (
				<div className="rounded-xl border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
					{error}
				</div>
			) : null}

			<Motion.button
				type="submit"
				disabled={isLoading}
				whileHover={{ scale: 1.02, boxShadow: '0 0 28px rgba(34,211,238,0.45)' }}
				whileTap={{ scale: 0.98 }}
				className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-500 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_22px_rgba(34,211,238,0.3)] transition disabled:cursor-not-allowed disabled:opacity-60"
			>
				{isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
				{isLoading ? 'Signing in...' : 'Sign In'}
			</Motion.button>

			<p className="text-center text-sm text-slate-400">
				{"Don't have an account? "}
				<button
					type="button"
					onClick={onSwitchToSignup}
					className="font-semibold text-cyan-300 hover:text-cyan-200 transition"
				>
					Sign Up
				</button>
			</p>
		</form>
	)
}

export default LoginForm
