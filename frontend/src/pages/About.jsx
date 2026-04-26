import Footer from '../components/Footer'
import Navbar from '../components/Navbar'


function About() {
	return (
		<div>
			<Navbar />
			<section className="mx-auto max-w-5xl px-6 pb-10 pt-32">
				<div className="glass rounded-3xl p-8">
					<h1 className="text-4xl font-bold text-white">About SatyaNetra</h1>
					<p className="mt-4 text-slate-300">
						SatyaNetra is an AI-assisted deepfake detection platform designed for reliable, explainable,
						and practical media verification workflows.
					</p>
					<div className="mt-6 grid gap-4 sm:grid-cols-2">
						<article className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
							<h2 className="text-lg font-semibold text-slate-100">Mission</h2>
							<p className="mt-2 text-sm text-slate-300">
								Help users identify manipulated videos using multimodal evidence before misinformation spreads.
							</p>
						</article>
						<article className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
							<h2 className="text-lg font-semibold text-slate-100">Tech Stack</h2>
							<p className="mt-2 text-sm text-slate-300">
								React, Flask, TensorFlow, ResNet50, LSTM, YAMNet, and automated report generation.
							</p>
						</article>
					</div>
					<p className="mt-8 text-sm text-slate-400">Team: Veriface | Smart India Hackathon 2024</p>
				</div>
			</section>
			<Footer />
		</div>
	)
}

export default About

