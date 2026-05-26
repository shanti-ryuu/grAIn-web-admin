export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  errorCode?: string
  timestamp: string
}
