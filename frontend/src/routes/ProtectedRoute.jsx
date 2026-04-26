import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'


function ProtectedRoute({ children }) {
	const { user, isLoading, openAuthModal } = useAuth()

	useEffect(() => {
		if (!isLoading && !user) {
			openAuthModal()
		}
	}, [isLoading, user, openAuthModal])

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#020617]">
				<div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
			</div>
		)
	}

	if (!user) {
		return <Navigate to="/" replace />
	}

	return children
}

export default ProtectedRoute
