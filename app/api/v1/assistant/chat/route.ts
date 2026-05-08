import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'
import { chatWithAssistant } from '@/lib/utils/grain-assistant'
import type { Language, ChatMessage } from '@/lib/utils/grain-assistant'

export const POST = withAuth(async (request) => {
  const body = await request.json()
  const { messages, language, deviceId } = body as {
    messages: ChatMessage[]
    language: Language
    deviceId: string | null
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return errorResponse('messages array required', ErrorCodes.INVALID_INPUT, 400)
  }

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return errorResponse('AI service not configured — set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY', ErrorCodes.INTERNAL_ERROR, 503)
  }

  const reply = await chatWithAssistant(
    messages,
    (language ?? 'EN') as Language,
    deviceId ?? null,
  )

  return successResponse({ reply })
})
