import { AnimatePresence, motion as Motion } from 'framer-motion'
import { BrainCircuit, Send, X } from 'lucide-react'
import { useState } from 'react'

import { useChatbot } from '../hooks/useChatbot'


const QUICK_QUESTIONS = [
	'What is a deepfake?',
	'How does this detection work?',
	'What are the risks of deepfakes?',
	'Explain my result',
]


function Chatbot() {
	const [open, setOpen] = useState(false)
	const [input, setInput] = useState('')
	const { messages, isTyping, ask } = useChatbot()

	const submit = async (text) => {
		const nextText = (text ?? input).trim()
		if (!nextText) return
		setInput('')
		await ask(nextText)
	}

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen((prev) => !prev)}
				className="fixed bottom-6 right-6 z-50 rounded-full bg-gradient-to-r from-sky-500 to-teal-500 p-4 text-white shadow-[0_0_30px_rgba(14,165,233,0.45)] animate-pulse-slow"
			>
				<BrainCircuit />
			</button>

			<AnimatePresence>
				{open ? (
					<Motion.div
						initial={{ opacity: 0, y: 28 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 28 }}
						className="fixed bottom-24 right-6 z-50 w-[92vw] max-w-[400px] rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl"
					>
						<header className="mb-3 flex items-center justify-between border-b border-slate-800 pb-3">
							<div>
								<h3 className="text-lg font-semibold text-white">SatyaNetra AI</h3>
								<p className="text-xs text-emerald-300">Online assistant</p>
							</div>
							<button type="button" onClick={() => setOpen(false)} className="text-slate-300">
								<X size={18} />
							</button>
						</header>

						<div className="mb-3 flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
							{messages.map((message, index) => (
								<div
									key={`${message.role}-${index}`}
									className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
										message.role === 'user'
											? 'ml-auto bg-gradient-to-r from-sky-500 to-teal-500 text-white'
											: 'glass text-slate-100'
									}`}
								>
									{message.content}
								</div>
							))}
							{isTyping ? (
								<div className="glass w-16 rounded-xl px-3 py-2 text-slate-200">
									<span className="inline-block animate-bounce">.</span>
									<span className="inline-block animate-bounce [animation-delay:120ms]">.</span>
									<span className="inline-block animate-bounce [animation-delay:220ms]">.</span>
								</div>
							) : null}
						</div>

						<div className="mb-3 grid grid-cols-2 gap-2">
							{QUICK_QUESTIONS.map((question) => (
								<button
									key={question}
									type="button"
									onClick={() => submit(question)}
									className="rounded-lg border border-slate-700 px-2 py-1 text-left text-xs text-slate-300 transition hover:border-sky-400"
								>
									{question}
								</button>
							))}
						</div>

						<div className="flex items-center gap-2">
							<input
								value={input}
								onChange={(event) => setInput(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === 'Enter') submit()
								}}
								className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
								placeholder="Ask about deepfakes..."
							/>
							<button
								type="button"
								onClick={() => submit()}
								className="rounded-xl bg-sky-500 p-2 text-white transition hover:bg-sky-400"
							>
								<Send size={16} />
							</button>
						</div>
					</Motion.div>
				) : null}
			</AnimatePresence>
		</>
	)
}

export default Chatbot

