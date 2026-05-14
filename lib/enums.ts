/**
 * User roles in the system
 */
export enum UserRole {
  Admin = 'admin',
  Farmer = 'farmer',
}

/**
 * User account status
 */
export enum UserStatus {
  Active = 'active',
  Inactive = 'inactive',
}

/**
 * Device connectivity status
 */
export enum DeviceStatus {
  Online = 'online',
  Offline = 'offline',
}

/**
 * Alert type/severity classification
 */
export enum AlertType {
  Critical = 'critical',
  Warning = 'warning',
  Info = 'info',
}

/**
 * Alert read status
 */
export enum AlertStatus {
  Read = 'read',
  Unread = 'unread',
}

/**
 * Command types for device control
 */
export enum CommandType {
  Start = 'START',
  Stop = 'STOP',
  FanControl = 'FAN_CONTROL',
  RelayControl = 'RELAY_CONTROL',
  StepperControl = 'STEPPER_CONTROL',
  HeaterControl = 'HEATER_CONTROL',
  Status = 'STATUS',
}

export enum FanTarget {
  Fan1 = 'FAN1',
  Fan2 = 'FAN2',
  All = 'ALL',
}

export enum FanAction {
  On = 'ON',
  Off = 'OFF',
}

/**
 * Command execution status
 */
export enum CommandStatus {
  Pending = 'pending',
  Executed = 'executed',
  Failed = 'failed',
  Error = 'error',
}

/**
 * Dryer operation mode
 */
export enum DryerMode {
  Auto = 'AUTO',
  Manual = 'MANUAL',
}

/**
 * Sensor data and dryer operational status
 */
export enum SensorDataStatus {
  Running = 'running',
  Idle = 'idle',
  Paused = 'paused',
  Error = 'error',
}

/**
 * Time period filters for analytics
 */
export enum AnalyticsPeriod {
  OneDay = '1d',
  SevenDays = '7d',
  ThirtyDays = '30d',
  NinetyDays = '90d',
}

/**
 * Error codes for API responses — single source of truth.
 * Re-exported from lib/utils/response.ts for backward compatibility.
 */
export const ErrorCodes = {
  INVALID_INPUT: 'INVALID_INPUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT: 'RATE_LIMIT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const

/**
 * bcrypt salt rounds — standardize across all hash calls.
 * register uses 12, users/route.ts uses 10; now统一 to 12.
 */
export const BCRYPT_ROUNDS = 12

/**
 * API version prefix — used for URL construction and middleware rewrites.
 */
export const API_VERSION = 'v1'
