// ============================================================================
// TOAST NOTIFICATION SERVICE - Global async notification system
// ============================================================================
// Handles toast notifications for async operations (save success/failure, etc.)
// Separate from NotificationService which handles in-game contextual messages

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  timestamp: number
}

type ToastListener = (toast: Toast) => void

export class ToastNotificationService {
  private listeners: ToastListener[] = []
  private toastId = 0

  /**
   * Subscribe to toast notifications
   * Returns unsubscribe function
   */
  subscribe(listener: ToastListener): () => void {
    this.listeners.push(listener)

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Send toast notification to all subscribers
   */
  showToast(message: string, type: ToastType = 'info'): void {
    const toast: Toast = {
      id: `toast-${++this.toastId}`,
      message,
      type,
      timestamp: Date.now(),
    }

    // Notify all listeners
    this.listeners.forEach((listener) => {
      try {
        listener(toast)
      } catch (error) {
        console.error('Error in toast listener:', error)
      }
    })
  }

  /**
   * Convenience methods for specific types
   */
  success(message: string): void {
    this.showToast(message, 'success')
  }

  error(message: string): void {
    this.showToast(message, 'error')
  }

  warning(message: string): void {
    this.showToast(message, 'warning')
  }

  info(message: string): void {
    this.showToast(message, 'info')
  }
}
