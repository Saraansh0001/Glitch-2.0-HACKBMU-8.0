import Chatbot from '../components/Chatbot'
import Footer from '../components/Footer'
import HeroSection from '../components/HeroSection'
import HowItWorks from '../components/HowItWorks'
import Navbar from '../components/Navbar'
import Stats from '../components/Stats'


function Home() {
	return (
		<div>
			<Navbar />
			<HeroSection />
			<HowItWorks />
			<Stats />
			<Footer />
			<Chatbot />
		</div>
	)
}

export default Home

