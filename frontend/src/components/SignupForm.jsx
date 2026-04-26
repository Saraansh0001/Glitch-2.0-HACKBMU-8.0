import { motion as Motion } from 'framer-motion'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

import { supabase } from '../lib/supabaseClient'


const INPUT_CLS =
	'w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:border-cyan-400/60 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition'

const OCCUPATION_OPTIONS = ['Student', 'Professional', 'Researcher', 'Other']
const PURPOSE_OPTIONS = ['Education', 'Research', 'Media Verification', 'Personal Use']
const GENDER_OPTIONS = ['Male', 'Female', 'Other']

const TOGGLE_BTN = (active) =>
	`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
		active
			? 'border-cyan-400/60 bg-cyan-400/20 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
			: 'border-slate-700/60 bg-slate-900/50 text-slate-400 hover:border-slate-500 hover:text-slate-300'
	}`


function SignupForm({ onSuccess, onSwitchToLogin }) {
	const [form, setForm] = useState({
		name: '',
		email: '',
		password: '',
		age: '',
		gender: '',
		occupation: '',
		purpose: '',
	})
	const [showPassword, setShowPassword] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState('')

	const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

	const handleSubmit = async (e) => {
		e.preventDefault()
		setError('')

		if (!form.gender) { setError('Please select your gender.'); return }
		if (!form.occupation) { setError('Please select your occupation.'); return }
		if (!form.purpose) { setError('Please select your purpose.'); return }

		setIsLoading(true)
		try {
			const { data, error: signUpError } = await supabase.auth.signUp({
				email: form.email,
				password: form.password,
				options: { data: { name: form.name } },
			})
			if (signUpError) throw signUpError

			if (data.user) {
				await supabase.from('profiles').upsert({
					id: data.user.id,
					name: form.name,
					age: form.age ? parseInt(form.age, 10) : null,
					gender: form.gender,
					occupation: form.occupation,
					purpose: form.purpose,
				})
			}

			if (data.session) {
				toast.success('Account created! Welcome to SatyaNetra.')
			} else {
				toast.success('Account created! Check your email to confirm, then log in.')
			}
			onSuccess()
		} catch (err) {
			setError(err.message || 'Sign up failed. Please try again.')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label className="mb-1.5 block text-xs uppercase tracking-widest text-slate-400">Full Name</label>
				<input
					type="text"
					value={form.name}
					onChange={(e) => update('name', e.target.value)}
					placeholder="John Doe"
					className={INPUT_CLS}
				/>
			</div>

			<div>
				<label className="mb-1.5 block text-xs uppercase tracking-widest text-slate-400">Email</label>
				<input
					type="email"
					value={form.email}
					onChange={(e) => update('email', e.target.value)}
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
						value={form.password}
						onChange={(e) => update('password', e.target.value)}
						required
						minLength={6}
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

			<div className="grid grid-cols-2 gap-3">
				<div>
					<label className="mb-1.5 block text-xs uppercase tracking-widest text-slate-400">Age</label>
					<input
						type="number"
						value={form.age}
						onChange={(e) => update('age', e.target.value)}
						placeholder="22"
						min="13"
						max="120"
						className={INPUT_CLS}
					/>
				</div>
				<div>
					<label className="mb-1.5 block text-xs uppercase tracking-widest text-slate-400">Gender</label>
					<select
						value={form.gender}
						onChange={(e) => update('gender', e.target.value)}
						className={`${INPUT_CLS} appearance-none`}
					>
						<option value="">Select</option>
						{GENDER_OPTIONS.map((g) => (
							<option key={g} value={g} className="bg-slate-900">
								{g}
							</option>
						))}
					</select>
				</div>
			</div>

			<div>
				<label className="mb-2 block text-xs uppercase tracking-widest text-slate-400">Occupation</label>
				<div className="flex flex-wrap gap-2">
					{OCCUPATION_OPTIONS.map((opt) => (
						<button
							key={opt}
							type="button"
							onClick={() => update('occupation', opt)}
							className={TOGGLE_BTN(form.occupation === opt)}
						>
							{opt}
						</button>
					))}
				</div>
			</div>

			<div>
				<label className="mb-2 block text-xs uppercase tracking-widest text-slate-400">Purpose</label>
				<div className="flex flex-wrap gap-2">
					{PURPOSE_OPTIONS.map((opt) => (
						<button
							key={opt}
							type="button"
							onClick={() => update('purpose', opt)}
							className={TOGGLE_BTN(form.purpose === opt)}
						>
							{opt}
						</button>
					))}
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
				{isLoading ? 'Creating Account...' : 'Create Account'}
			</Motion.button>

			<p className="text-center text-sm text-slate-400">
				Already have an account?{' '}
				<button
					type="button"
					onClick={onSwitchToLogin}
					className="font-semibold text-cyan-300 hover:text-cyan-200 transition"
				>
					Login
				</button>
			</p>
		</form>
	)
}

export default SignupForm
