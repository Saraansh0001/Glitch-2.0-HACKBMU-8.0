import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Eye, LogOut, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'


const NAV_ITEMS = [
	{ label: 'Home', href: '/' },
	{ label: 'Detect', href: '/detect' },
	{ label: 'How It Works', href: '/#how-it-works' },
	{ label: 'About', href: '/about' },
]


function Navbar() {
	const [isOpen, setIsOpen] = useState(false)
	const [scrolled, setScrolled] = useState(false)
	const location = useLocation()
	const navigate = useNavigate()
	const { user, signOut, openAuthModal } = useAuth()

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 12)
		window.addEventListener('scroll', onScroll)
		return () => window.removeEventListener('scroll', onScroll)
	}, [])

	useEffect(() => {
		if (location.hash === '#how-it-works') {
			const section = document.getElementById('how-it-works')
			if (section) {
				setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
			}
		}
	}, [location])

	const closeMenu = () => setIsOpen(false)

	const handleTryNow = () => {
		if (user) {
			navigate('/detect')
		} else {
			openAuthModal()
		}
		closeMenu()
	}

	const handleLogout = async () => {
		await signOut()
		toast.success('Logged out successfully.')
		navigate('/')
		closeMenu()
	}

	const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
	const initial = displayName.charAt(0).toUpperCase()

	return (
		<header className="fixed top-0 z-50 w-full px-4 py-4">
			<nav
				className={`mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 py-3 transition-all duration-300 ${
					scrolled ? 'glass-strong shadow-[0_12px_45px_rgba(14,165,233,0.2)]' : 'glass'
				}`}
			>
				<Link className="flex items-center gap-2" to="/" onClick={closeMenu}>
					<Eye className="h-8 w-8 text-brand-primary" />
					<span className="gradient-text text-xl font-bold tracking-wide">SatyaNetra</span>
				</Link>

				{/* Desktop nav */}
				<div className="hidden items-center gap-6 md:flex">
					{NAV_ITEMS.map((item) => (
						<Link
							key={item.label}
							to={item.href}
							onClick={closeMenu}
							className="text-sm font-semibold text-slate-200 transition hover:text-brand-primary"
						>
							{item.label}
						</Link>
					))}

					{user ? (
						<div className="flex items-center gap-3">
							<Link
								to="/history"
								onClick={closeMenu}
								className="text-sm font-semibold text-slate-200 transition hover:text-brand-primary"
							>
								My Scans
							</Link>
							<div className="flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-slate-900/60 px-3 py-1.5">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 text-xs font-bold text-slate-950">
									{initial}
								</div>
								<span className="max-w-[7rem] truncate text-sm font-medium text-slate-100">{displayName}</span>
							</div>
							<button
								type="button"
								onClick={handleLogout}
								className="flex items-center gap-1.5 rounded-full border border-slate-600/50 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-red-400/50 hover:text-red-300"
							>
								<LogOut size={14} />
								Logout
							</button>
						</div>
					) : (
						<button
							type="button"
							onClick={handleTryNow}
							className="rounded-full bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(14,165,233,0.48)]"
						>
							Try Now
						</button>
					)}
				</div>

				<button
					type="button"
					onClick={() => setIsOpen((prev) => !prev)}
					className="rounded-xl border border-slate-700 p-2 text-slate-100 md:hidden"
					aria-label="Toggle menu"
				>
					{isOpen ? <X size={20} /> : <Menu size={20} />}
				</button>
			</nav>

			{/* Mobile menu */}
			<AnimatePresence>
				{isOpen ? (
					<Motion.div
						initial={{ opacity: 0, y: -15 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -15 }}
						className="mx-auto mt-3 flex max-w-6xl flex-col gap-2 rounded-2xl border border-slate-700/60 bg-slate-950/95 p-4 md:hidden"
					>
						{NAV_ITEMS.map((item) => (
							<Link
								key={item.label}
								to={item.href}
								onClick={closeMenu}
								className="rounded-lg px-3 py-2 text-slate-200 transition hover:bg-slate-800"
							>
								{item.label}
							</Link>
						))}

						{user ? (
							<>
								<div className="flex items-center gap-2 rounded-lg border border-slate-700/50 px-3 py-2">
									<div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 text-xs font-bold text-slate-950">
										{initial}
									</div>
									<span className="truncate text-sm font-medium text-slate-100">{displayName}</span>
								</div>
								<Link
									to="/history"
									onClick={closeMenu}
									className="rounded-lg px-3 py-2 text-slate-200 transition hover:bg-slate-800"
								>
									My Scans
								</Link>
								<button
									type="button"
									onClick={handleLogout}
									className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-red-300 transition hover:bg-slate-800"
								>
									<LogOut size={14} />
									Logout
								</button>
							</>
						) : (
							<button
								type="button"
								onClick={handleTryNow}
								className="mt-1 rounded-full bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-center text-sm font-semibold text-white"
							>
								Try Now
							</button>
						)}
					</Motion.div>
				) : null}
			</AnimatePresence>
		</header>
	)
}

export default Navbar
