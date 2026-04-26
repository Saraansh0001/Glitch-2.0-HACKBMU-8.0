import { useMemo } from 'react'
import toast from 'react-hot-toast'

import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import ReportViewer from '../components/ReportViewer'
import { downloadReport } from '../utils/api'


function Report() {
	const lastResult = useMemo(() => {
		try {
			return JSON.parse(localStorage.getItem('satyanetra:last-result') || 'null')
		} catch {
			return null
		}
	}, [])

	const onDownload = async () => {
		if (!lastResult) return
		try {
			const response = await downloadReport(lastResult)
			const blob = new Blob([response.data], { type: 'application/pdf' })
			const url = window.URL.createObjectURL(blob)
			const anchor = document.createElement('a')
			anchor.href = url
			anchor.download = `satyanetra_report_${Date.now()}.pdf`
			anchor.click()
			window.URL.revokeObjectURL(url)
			toast.success('Report downloaded.')
		} catch {
			toast.error('Failed to generate report PDF.')
		}
	}

	return (
		<div>
			<Navbar />
			<ReportViewer result={lastResult} onDownload={onDownload} />
			<Footer />
		</div>
	)
}

export default Report

