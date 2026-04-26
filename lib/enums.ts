/**
 * Central repository for all TypeScript enums used throughout the application.
 * This ensures type safety, autocomplete support, and a single source of truth
 * for magic strings across models, API routes, and UI components.
 */

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
 * Error codes for API responses
 */
export const enum ErrorCodes {
  InvalidInput = 'INVALID_INPUT',
  Unauthorized = 'UNAUTHORIZED',
  Forbidden = 'FORBIDDEN',
  NotFound = 'NOT_FOUND',
  Conflict = 'CONFLICT',
  RateLimit = 'RATE_LIMIT',
  InternalError = 'INTERNAL_ERROR',
  InvalidCredentials = 'INVALID_CREDENTIALS',
  AccountInactive = 'ACCOUNT_INACTIVE',
  DeviceNotFound = 'DEVICE_NOT_FOUND',
  UserNotFound = 'USER_NOT_FOUND',
  ValidationError = 'VALIDATION_ERROR',
}
