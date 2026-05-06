import { NextRequest } from 'next/server'
import { escape, trim } from 'validator'

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}


export function sanitizeString(input: string): string {
  return escape(trim(input))
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = { ...obj }
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string') {
      result[key] = sanitizeString(result[key] as string)
    }
  }
  return result as T
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate deviceId format (should be alphanumeric or UUID)
 */
export function isValidDeviceId(deviceId: string): boolean {
  // Accept alphanumeric strings, hyphens, and underscores (6-50 chars)
  const deviceIdRegex = /^[a-zA-Z0-9_-]{6,50}$/
  return deviceIdRegex.test(deviceId)
}

/**
 * Validate temperature range (reasonable bounds: -50 to 150 Celsius)
 */
export function isValidTemperature(temp: number): boolean {
  return typeof temp === 'number' && temp >= -50 && temp <= 150
}

/**
 * Validate humidity range (0-100%)
 */
export function isValidHumidity(humidity: number): boolean {
  return typeof humidity === 'number' && humidity >= 0 && humidity <= 100
}

/**
 * Validate moisture range (0-100% or 0-1000 depending on sensor)
 */
export function isValidMoisture(moisture: number): boolean {
  return typeof moisture === 'number' && moisture >= 0 && moisture <= 1000
}

/**
 * Parse and validate query parameters
 */
export function getQueryParams(
  request: NextRequest,
  defaults: { page?: number; limit?: number; skip?: number } = {}
) {
  const searchParams = request.nextUrl.searchParams

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || defaults.page || 1)
  const limit = Math.min(
    1000,
    Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || defaults.limit || 50)
  )
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

/**
 * Validate login request body
 */
export function validateLoginRequest(body: unknown): ValidationResult {
  const b = body as Record<string, unknown>
  const errors: Record<string, string> = {}

  if (!b.email || typeof b.email !== 'string') {
    errors.email = 'Email is required'
  } else if (!isValidEmail(b.email)) {
    errors.email = 'Invalid email format'
  }

  if (!b.password || typeof b.password !== 'string') {
    errors.password = 'Password is required'
  } else if ((b.password as string).length < 6) {
    errors.password = 'Password must be at least 6 characters'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validate sensor data request body
 */
export function validateSensorDataRequest(body: unknown): ValidationResult {
  const b = body as Record<string, unknown>
  const errors: Record<string, string> = {}

  if (!b.deviceId || typeof b.deviceId !== 'string') {
    errors.deviceId = 'Device ID is required'
  } else if (!isValidDeviceId(b.deviceId)) {
    errors.deviceId = 'Invalid device ID format'
  }

  if (b.temperature === undefined || b.temperature === null) {
    errors.temperature = 'Temperature is required'
  } else if (!isValidTemperature(b.temperature as number)) {
    errors.temperature = 'Temperature out of valid range (-50°C to 150°C)'
  }

  if (b.humidity === undefined || b.humidity === null) {
    errors.humidity = 'Humidity is required'
  } else if (!isValidHumidity(b.humidity as number)) {
    errors.humidity = 'Humidity must be between 0 and 100'
  }

  if (b.moisture === undefined || b.moisture === null) {
    errors.moisture = 'Moisture is required'
  } else if (!isValidMoisture(b.moisture as number)) {
    errors.moisture = 'Moisture out of valid range'
  }

  // fanSpeed, energy, status, solarVoltage, weight are optional with validation
  if (b.fanSpeed !== undefined && b.fanSpeed !== null) {
    if (typeof b.fanSpeed !== 'number' || (b.fanSpeed as number) < 0 || (b.fanSpeed as number) > 100) {
      errors.fanSpeed = 'Fan speed must be between 0 and 100'
    }
  }

  if (b.energy !== undefined && b.energy !== null) {
    if (typeof b.energy !== 'number' || (b.energy as number) < 0) {
      errors.energy = 'Energy must be a positive number'
    }
  }

  if (b.status !== undefined && b.status !== null) {
    if (typeof b.status !== 'string' || !['running', 'idle', 'paused', 'error'].includes(b.status as string)) {
      errors.status = 'Status must be one of: running, idle, paused, error'
    }
  }

  if (b.solarVoltage !== undefined && b.solarVoltage !== null) {
    if (typeof b.solarVoltage !== 'number' || (b.solarVoltage as number) < 0) {
      errors.solarVoltage = 'Solar voltage must be a positive number'
    }
  }

  if (b.weight !== undefined && b.weight !== null) {
    if (typeof b.weight !== 'number' || (b.weight as number) < 0) {
      errors.weight = 'Weight must be a positive number'
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validate device registration request
 */
export function validateDeviceRequest(body: unknown): ValidationResult {
  const b = body as Record<string, unknown>
  const errors: Record<string, string> = {}

  if (!b.deviceId || typeof b.deviceId !== 'string') {
    errors.deviceId = 'Device ID is required'
  } else if (!isValidDeviceId(b.deviceId)) {
    errors.deviceId = 'Invalid device ID format'
  }

  if (b.location && typeof b.location !== 'string') {
    errors.location = 'Location must be a string'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
