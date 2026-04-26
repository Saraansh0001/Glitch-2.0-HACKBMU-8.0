import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { supabase } from '../lib/supabaseClient'


const AuthContext = createContext(null)


export function AuthProvider({ children }) {
	const [user, setUser] = useState(null)
	const [session, setSession] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session: s } }) => {
			setSession(s)
			setUser(s?.user ?? null)
			setIsLoading(false)
		})

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, s) => {
			setSession(s)
			setUser(s?.user ?? null)
			setIsLoading(false)
		})

		return () => subscription.unsubscribe()
	}, [])

	const openAuthModal = useCallback(() => setIsAuthModalOpen(true), [])
	const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), [])

	const signOut = useCallback(async () => {
		await supabase.auth.signOut()
	}, [])

	return (
		<AuthContext.Provider value={{ user, session, isLoading, isAuthModalOpen, openAuthModal, closeAuthModal, signOut }}>
			{children}
		</AuthContext.Provider>
	)
}


export function useAuth() {
	const context = useContext(AuthContext)
	if (!context) throw new Error('useAuth must be used within AuthProvider')
	return context
}
