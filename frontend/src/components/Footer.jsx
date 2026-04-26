import { Eye } from 'lucide-react'
import { Link } from 'react-router-dom'


const stack = ['React', 'Flask', 'TensorFlow', 'Python']


function Footer() {
	return (
		<footer className="mt-16 border-t border-slate-800/80 bg-slate-950/70 px-6 py-10">
			<div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
				<div>
					<div className="flex items-center gap-2">
						<Eye className="text-brand-primary" />
						<span className="gradient-text text-xl font-bold">SatyaNetra</span>
					</div>
					<p className="mt-3 text-sm text-slate-400">
						AI-powered deepfake detection platform for trusted media verification.
					</p>
				</div>

				<div>
					<h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Navigate</h4>
					<div className="flex flex-col gap-2 text-sm text-slate-400">
						<Link to="/">Home</Link>
						<Link to="/detect">Detect</Link>
						<Link to="/about">About</Link>
					</div>
				</div>

				<div>
					<h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Technology</h4>
					<div className="flex flex-wrap gap-2">
						{stack.map((item) => (
							<span key={item} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200">
								{item}
							</span>
						))}
					</div>
					<div className="mt-4 flex gap-4 text-sm text-slate-400">
						<a href="https://github.com" target="_blank" rel="noreferrer">
							GitHub
						</a>
						<a href="https://www.linkedin.com" target="_blank" rel="noreferrer">
							LinkedIn
						</a>
						<a href="https://x.com" target="_blank" rel="noreferrer">
							X
						</a>
					</div>
				</div>
			</div>
		</footer>
	)
}

export default Footer

