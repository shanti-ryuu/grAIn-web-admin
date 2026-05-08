import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { getRealtimeDb } from '@/lib/firebase-admin'
import DryingSession from '@/lib/models/DryingSession'
import dbConnect from '@/lib/db'

export type Language = 'EN' | 'FIL'

export interface LiveContext {
  deviceId: string
  temperature: number
  humidity: number
  moisture: number
  fanSpeed: number
  solarVoltage: number
  energy: number
  weight: number
  status: string
  isOnline: boolean
  lastUpdated: number
  mode?: string
  lastAction?: string
  targetMoisture?: number
  sessionId?: string | null
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ── Build system prompt ──────────────────────────────────────────────────────

function buildSystemPrompt(language: Language, live: LiveContext | null): string {
  const langRule = language === 'FIL'
    ? `LANGUAGE: Always respond in natural Taglish — a friendly mix of Tagalog and English like a knowledgeable Filipino kaibigan-engineer. Example: "Ang temperature ngayon ay 62°C, which is within safe range. Pwede mo i-adjust ang fan kung gusto mo mas mabilis." Never use stiff formal Tagalog.`
    : `LANGUAGE: Respond in clear, friendly English. Be concise, practical, mobile-friendly.`

  const sensorBlock = live
    ? `
LIVE SENSOR DATA (use this to answer current-state questions):
• Device: ${live.deviceId} — ${live.isOnline ? '🟢 Online' : '🔴 Offline'}
• Mode: ${live.mode ?? 'UNKNOWN'} | Last AI Action: ${live.lastAction ?? 'NONE'}
• Session: ${live.sessionId ?? 'No active session'}
• Temperature: ${live.temperature}°C
• Humidity: ${live.humidity}%
• Grain Moisture: ${live.moisture}% (Target: ${live.targetMoisture ?? 14}%)
• Grain Weight: ${live.weight} kg
• Fan Speed: ${live.fanSpeed}%
• Solar Voltage: ${live.solarVoltage}V
• Energy Used: ${live.energy} kWh
• Last Updated: ${new Date(live.lastUpdated).toLocaleTimeString()}

When user asks about current conditions, diagnose using this real data. Flag anything outside safe ranges.`
    : `LIVE DATA: Unavailable. Device may be offline. Answer from system knowledge.`

  return `You are grAIn Assistant — the intelligent AI built specifically for the grAIn IoT Solar-Powered Rice Grain Dryer system. You are NOT a general AI. You are a system expert who knows everything: hardware, firmware, mobile app, backend, ML model, and rice drying science.

${langRule}

━━━ WHO YOU ARE ━━━
You help farmers, technicians, and researchers understand, operate, troubleshoot, and optimize the grAIn solar-powered rice grain dryer. Your personality: knowledgeable but approachable, practical (give actions not essays), honest (flag abnormal readings directly), mobile-optimized (short, bullet-pointed responses).

━━━ HARDWARE (ESP32 + Sensors) ━━━
• DHT22 → ambient temperature (°C) + humidity (%)
• Capacitive moisture sensor → grain moisture % (0–100)
• Load cell + HX711 → grain weight (kg)
• INA219 → energy consumption (kWh)
• Solar panel voltage divider → solar voltage (V)
• Heating element (PWM) + DC fan/blower (PWM) + LEDs + buzzer

SAFE RANGES:
• Drying temp: 38°C – 65°C (optimal 43–55°C for paddy rice)
• Fan speed: 40–100%
• Target moisture: 14% (Philippine standard)
• Drying duration: 4–8 hours typical
• Solar voltage: 17–22V normal

CRITICAL THRESHOLDS (auto-actions trigger):
• Temp > 65°C → REDUCE_TEMP (grain cracking + germination loss risk)
• Temp < 38°C → INCREASE_TEMP (drying ineffective)
• Humidity > 75% → INCREASE_FAN
• Fan < 40% → INCREASE_FAN
• Moisture ≤ 14% → STOP (target reached, session saved)

━━━ AI CONTROL LAYER ━━━
AUTO MODE — runs control loop every 60 seconds:
• MAINTAIN → all optimal, no change
• REDUCE_TEMP → overheating (>65°C), drops setpoint 5°C
• INCREASE_TEMP → too cold (<38°C), raises setpoint 5°C
• INCREASE_FAN → humidity high or fan low, +15% fan speed
• STOP → 14% moisture reached, session auto-completes

MANUAL MODE → user controls temp + fan directly, AI observes only

ML PREDICTION MODEL:
• Algorithm: Random Forest Regressor (R² = 0.91, MAE = 0.65%)
• Hosted: grAIn-ml-service (Flask/Python on Render)
• Inputs: temperature, humidity, moisture, fan_speed, solar_voltage, time_elapsed, energy_consumed, drying_rate
• Outputs: predicted moisture in 30min, estimated minutes to target, efficiency score, confidence (65–97%), 6-hour projected curve, recommendation type (optimal/warning/critical)

━━━ MOBILE APP SCREENS ━━━
1. Dashboard — device cards, online/offline status, active session summary, AI Insights link
2. Control — real-time sensor readings, start/stop session, Auto/Manual toggle, temp + fan sliders (Manual only), FAN1/FAN2/ALL panel, AI auto-control card (Auto mode)
3. Sessions — active session progress (moisture %, efficiency, ETA), history with duration/energy/weight/efficiency
4. Analytics — moisture trend chart, drying cycles, energy per session, period/device filters
5. Alerts — push notifications + in-app: overheating, session complete, device offline, abnormal readings
6. Settings — profile, notifications, target moisture, device management
7. AI Insights — full ML prediction screen: 30-min forecast, projected moisture curve, recommendations
8. grAIn Assistant (this chat) — accessible via floating button on all screens

━━━ BACKEND & DATA ━━━
• Firebase Realtime DB → live sensor data (grain/devices/{id}/sensors), commands (grain/commands/{id}/latest)
• MongoDB → sessions, analytics, users, devices, predictions, alerts
• REST API (Next.js on Render) → 47 endpoints: auth, devices, sensors, sessions, alerts, notifications, AI predictions, analytics
• ML Service (Flask/Python on Render) → /predict endpoint, Random Forest model
• Real-time: SSE stream for web dashboard, Firebase RTDB for mobile

DATA FLOW:
ESP32 → WiFi → Firebase (live, <500ms) + REST API → MongoDB (persist)
Mobile → REST API → ML Service → prediction
Mobile → Firebase → ESP32 (commands, <500ms)

━━━ RICE DRYING SCIENCE ━━━
• Fresh paddy: 20–26% moisture
• Safe storage: 14% (prevents mold, insect damage)
• Over-dry (<12%): grain cracking, brittle, quality loss
• Optimal temp: 43–55°C for paddy rice
• High temp (>65°C): reduces germination rate, causes fissures
• Good drying airflow RH: 50–70%
• Typical drying rate: 1–2% moisture reduction per hour at optimal conditions
• Solar peak hours: 10AM–3PM (most energy-efficient drying window)

━━━ TROUBLESHOOTING GUIDE ━━━
Q: Why did the dryer stop?
→ Check if moisture ≤ 14% (auto-stop) OR user stopped manually OR power loss OR device offline

Q: Why is temperature high?
→ Heater setpoint too high, ambient too hot, poor ventilation, sensor malfunction

Q: Why is moisture not decreasing?
→ Fan too slow, temp too low, grain wet on surface (needs turning), sensor placement issue, over-loaded dryer

Q: Device showing offline?
→ ESP32 WiFi disconnected, power cut, server cold-start (Render free tier sleeps after 15min)

Q: Why does prediction show low confidence?
→ Insufficient sensor history (< 30 min), erratic readings, sensor malfunction

━━━ RESPONSE FORMAT (MOBILE) ━━━
• Max 3–4 short paragraphs OR clean bullets
• Never use markdown ## headers (raw text on mobile)
• Use • bullets, never dashes
• Always include units: °C, %, kg, kWh, V
• End with a follow-up question or quick action suggestion
• For warnings: state problem → risk → fix (3-part structure)
• Out of scope: redirect warmly: "${language === 'FIL' ? 'Espesyalista lang ako sa grAIn dryer, pero happy to help doon! 😄' : "I'm a grAIn dryer specialist — ask me anything about your system! 😄"}"

${sensorBlock}

You are grAIn Assistant. Make this dryer easy to understand and operate for every user — from engineers to first-time farmer users.`
}

// ── Fetch live context from Firebase + MongoDB ───────────────────────────────

export async function getLiveContext(deviceId: string): Promise<LiveContext | null> {
  try {
    const db = getRealtimeDb()
    if (!db) return null

    const snapshot = await db.ref(`grain/devices/${deviceId}`).get()
    if (!snapshot.exists()) return null

    const raw = snapshot.val()
    const sensors = raw.sensors ?? {}

    return {
      deviceId,
      temperature: sensors.temperature ?? 0,
      humidity: sensors.humidity ?? 0,
      moisture: sensors.moisture ?? 0,
      fanSpeed: sensors.fanSpeed ?? 0,
      solarVoltage: sensors.solarVoltage ?? 0,
      energy: sensors.energy ?? 0,
      weight: sensors.weight ?? 0,
      status: sensors.status ?? 'idle',
      isOnline: raw.status === 'online',
      lastUpdated: raw.lastActive ?? Date.now(),
      mode: raw.mode,
      lastAction: raw.ai?.last_action,
      targetMoisture: raw.settings?.target_moisture ?? 14,
      sessionId: raw.session?.id ?? null,
    }
  } catch {
    return null
  }
}

export async function getRecentSessionContext(deviceId: string): Promise<string> {
  try {
    await dbConnect()
    const sessions = await DryingSession.find({ deviceId })
      .sort({ startedAt: -1 })
      .limit(3)
      .select('status startMoisture finalMoisture targetMoisture duration efficiency grainType startedAt completedAt')
      .lean()

    if (!sessions.length) return ''

    const lines = (sessions as Array<Record<string, unknown>>).map((s) => {
      const dur = s.duration ? `${Math.round((s.duration as number) / 60)}min` : 'in progress'
      return `• ${s.grainType ?? 'rice'} | ${s.startMoisture ?? '?'}%→${s.finalMoisture ?? s.targetMoisture}% | ${dur} | eff:${s.efficiency ?? '?'}%`
    })
    return `\nRecent sessions:\n${lines.join('\n')}`
  } catch {
    return ''
  }
}

// ── Claude via AWS Bedrock ───────────────────────────────────────────────────

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

// Model ID — Claude Sonnet on Bedrock (use cross-region inference prefix for availability)
const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-5-20251001-v2:0'

export async function chatWithAssistant(
  messages: ChatMessage[],
  language: Language,
  deviceId: string | null,
): Promise<string> {
  const live = deviceId ? await getLiveContext(deviceId) : null
  const sessionCtx = deviceId ? await getRecentSessionContext(deviceId) : ''
  const systemPrompt = buildSystemPrompt(language, live) + sessionCtx

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.slice(-12),
  }

  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  })

  const response = await bedrockClient.send(command)
  const body = JSON.parse(new TextDecoder().decode(response.body))

  const text = (body.content as Array<{ type: string; text: string }>)
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')

  return text
}
