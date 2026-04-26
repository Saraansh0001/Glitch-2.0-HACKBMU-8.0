import { useState } from 'react'

import { sendChatMessage } from '../utils/api'


export function useChatbot() {
	const [messages, setMessages] = useState([
		{
			role: 'assistant',
			content:
				'Hi, I am SatyaNetra AI. Ask me about deepfakes, your analysis results, or safety best practices.',
		},
	])
	const [isTyping, setIsTyping] = useState(false)
	const [error, setError] = useState('')

	const ask = async (text) => {
		if (!text?.trim()) return

		const userMessage = { role: 'user', content: text.trim() }
		const nextMessages = [...messages, userMessage]
		setMessages(nextMessages)
		setIsTyping(true)
		setError('')

		try {
			const historyPayload = nextMessages.map((item) => ({ role: item.role, content: item.content }))
			const response = await sendChatMessage(text.trim(), historyPayload)
			const aiText = response?.data?.response || 'I could not generate an answer right now.'
			setMessages((prev) => [...prev, { role: 'assistant', content: aiText }])
		} catch (requestError) {
			const fallback = requestError?.response?.data?.message || 'Chat service is currently unavailable.'
			setError(fallback)
			setMessages((prev) => [...prev, { role: 'assistant', content: fallback }])
		} finally {
			setIsTyping(false)
		}
	}

	return {
		messages,
		isTyping,
		error,
		ask,
	}
}

