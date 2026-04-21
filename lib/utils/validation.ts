import { NextRequest } from 'next/server'

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
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
export function validateLoginRequest(body: any): ValidationResult {
  const errors: Record<string, string> = {}

  if (!body.email || typeof body.email !== 'string') {
    errors.email = 'Email is required'
  } else if (!isValidEmail(body.email)) {
    errors.email = 'Invalid email format'
  }

  if (!body.password || typeof body.password !== 'string') {
    errors.password = 'Password is required'
  } else if (body.password.length < 6) {
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
export function validateSensorDataRequest(body: any): ValidationResult {
  const errors: Record<string, string> = {}

  if (!body.deviceId || typeof body.deviceId !== 'string') {
    errors.deviceId = 'Device ID is required'
  } else if (!isValidDeviceId(body.deviceId)) {
    errors.deviceId = 'Invalid device ID format'
  }

  if (body.temperature === undefined || body.temperature === null) {
    errors.temperature = 'Temperature is required'
  } else if (!isValidTemperature(body.temperature)) {
    errors.temperature = 'Temperature out of valid range (-50°C to 150°C)'
  }

  if (body.humidity === undefined || body.humidity === null) {
    errors.humidity = 'Humidity is required'
  } else if (!isValidHumidity(body.humidity)) {
    errors.humidity = 'Humidity must be between 0 and 100'
  }

  if (body.moisture === undefined || body.moisture === null) {
    errors.moisture = 'Moisture is required'
  } else if (!isValidMoisture(body.moisture)) {
    errors.moisture = 'Moisture out of valid range'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validate device registration request
 */
export function validateDeviceRequest(body: any): ValidationResult {
  const errors: Record<string, string> = {}

  if (!body.deviceId || typeof body.deviceId !== 'string') {
    errors.deviceId = 'Device ID is required'
  } else if (!isValidDeviceId(body.deviceId)) {
    errors.deviceId = 'Invalid device ID format'
  }

  if (body.location && typeof body.location !== 'string') {
    errors.location = 'Location must be a string'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
