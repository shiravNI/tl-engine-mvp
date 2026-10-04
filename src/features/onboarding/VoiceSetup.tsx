import { useState } from 'react'
import { InterviewChatPage } from '@/features/onboarding/InterviewChatPage'
import { OnboardingMapPage } from '@/features/onboarding/OnboardingMapPage'

/** Voice setup, inside the app shell: a short welcome, then the interview
 * chat. `startInChat` skips the welcome for people coming back to finish. */
export function VoiceSetup({ startInChat = false }: { startInChat?: boolean }) {
  const [started, setStarted] = useState(startInChat)
  return started ? <InterviewChatPage embedded /> : <OnboardingMapPage onStart={() => setStarted(true)} />
}
