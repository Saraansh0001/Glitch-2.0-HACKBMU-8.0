import { animate, motion as Motion, useInView, useMotionValue, useMotionValueEvent } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'


function CounterCard({ title, value, suffix, note }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const motionValue = useMotionValue(0)
  const [display, setDisplay] = useState('0')

  useMotionValueEvent(motionValue, 'change', (latest) => {
    setDisplay(latest.toFixed(0))
  })

  useEffect(() => {
    if (!inView) return undefined
    const controls = animate(motionValue, value, { duration: 1.8, ease: 'easeOut' })
    return () => controls.stop()
  }, [inView, motionValue, value])

  return (
    <Motion.article
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass rounded-2xl border border-slate-700/60 p-6"
    >
      <Motion.p className="text-4xl font-bold text-white">
        {display}
        {suffix}
      </Motion.p>
      <h3 className="mt-2 text-lg font-semibold text-slate-100">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{note}</p>
    </Motion.article>
  )
}


function Stats() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <h2 className="text-center text-3xl font-bold text-white">Deepfake Threat & Detection Snapshot</h2>
      <p className="mx-auto mt-3 max-w-3xl text-center text-slate-300">
        Public reporting and threat intelligence analyses show steep growth in synthetic media abuse.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CounterCard
          title="Deepfake Incidents"
          value={10}
          suffix="x"
          note="Estimated growth trend in 2024 from public cybersecurity reports."
        />
        <CounterCard title="Detection Accuracy" value={99} suffix="%" note="Target benchmark for curated evaluation sets." />
        <CounterCard title="Core Models" value={2} suffix="" note="ResNet50 + LSTM for visual-temporal detection." />
        <CounterCard title="Signal Sources" value={3} suffix="" note="Visual, Audio, and Lip-Sync consistency layers." />
      </div>
    </section>
  )
}

export default Stats
