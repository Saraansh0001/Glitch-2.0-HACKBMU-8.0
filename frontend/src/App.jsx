import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import AppErrorBoundary from './components/AppErrorBoundary'
import AuthModal from './components/AuthModal'
import { AuthProvider } from './context/AuthContext'
import About from './pages/About'
import Detect from './pages/Detect'
import History from './pages/History'
import Home from './pages/Home'
import Report from './pages/Report'
import ProtectedRoute from './routes/ProtectedRoute'


function App() {
	return (
		<AppErrorBoundary>
			<BrowserRouter>
				<AuthProvider>
					<Toaster position="top-right" />
					<AuthModal />
					<Routes>
						<Route path="/" element={<Home />} />
						<Route
							path="/detect"
							element={
								<ProtectedRoute>
									<Detect />
								</ProtectedRoute>
							}
						/>
						<Route
						path="/history"
						element={
							<ProtectedRoute>
								<History />
							</ProtectedRoute>
						}
					/>
					<Route path="/report/:id" element={<Report />} />
						<Route path="/about" element={<About />} />
						<Route path="*" element={<Navigate to="/" replace />} />
					</Routes>
				</AuthProvider>
			</BrowserRouter>
		</AppErrorBoundary>
	)
}

export default App
