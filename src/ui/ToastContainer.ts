import { Toast, ToastNotificationService } from '@services/ToastNotificationService'

// ============================================================================
// TOAST CONTAINER - Displays async toast notifications
// ============================================================================
// Renders toast notifications for async operations (saves, etc.)

export class ToastContainer {
  private static readonly MAX_VISIBLE_TOASTS = 5 // Limit to prevent screen overflow
  private container: HTMLDivElement
  private unsubscribe: (() => void) | null = null
  private activeToasts = new Map<string, { element: HTMLDivElement; timeoutId: number }>()

  constructor(private toastNotificationService: ToastNotificationService) {
    this.container = this.createContainer()
  }

  /**
   * Create toast container element
   */
  private createContainer(): HTMLDivElement {
    const container = document.createElement('div')
    container.id = 'toast-container'
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `
    return container
  }

  /**
   * Mount toast container to DOM
   */
  mount(): void {
    document.body.appendChild(this.container)

    // Subscribe to toast notifications
    this.unsubscribe = this.toastNotificationService.subscribe((toast) => {
      this.showToast(toast)
    })
  }

  /**
   * Unmount toast container from DOM
   */
  unmount(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }

    // Clear all active toasts
    this.activeToasts.forEach(({ timeoutId }) => {
      clearTimeout(timeoutId)
    })
    this.activeToasts.clear()

    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
  }

  /**
   * Show a toast notification
   * If max toasts visible, removes oldest first to prevent screen overflow
   */
  private showToast(toast: Toast): void {
    // If max toasts visible, remove oldest first to prevent screen overflow
    if (this.activeToasts.size >= ToastContainer.MAX_VISIBLE_TOASTS) {
      const oldestId = Array.from(this.activeToasts.keys())[0]
      this.removeToast(oldestId)
    }

    const toastElement = this.createToastElement(toast)
    this.container.appendChild(toastElement)

    // Trigger animation (add class after element is in DOM)
    requestAnimationFrame(() => {
      toastElement.classList.add('toast-visible')
    })

    // Auto-remove after 4 seconds
    const timeoutId = window.setTimeout(() => {
      this.removeToast(toast.id)
    }, 4000)

    this.activeToasts.set(toast.id, { element: toastElement, timeoutId })
  }

  /**
   * Create toast element
   */
  private createToastElement(toast: Toast): HTMLDivElement {
    const element = document.createElement('div')
    element.className = 'toast'
    element.dataset.toastId = toast.id

    // Base styles
    element.style.cssText = `
      min-width: 250px;
      max-width: 350px;
      padding: 12px 16px;
      background: ${this.getBackgroundColor(toast.type)};
      color: white;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      pointer-events: auto;
      cursor: pointer;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
    `

    // Add type icon
    const icon = this.getIcon(toast.type)
    element.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 18px;">${icon}</span>
        <span>${toast.message}</span>
      </div>
    `

    // Click to dismiss
    element.addEventListener('click', () => {
      this.removeToast(toast.id)
    })

    return element
  }

  /**
   * Remove toast from DOM
   */
  private removeToast(toastId: string): void {
    const toast = this.activeToasts.get(toastId)
    if (!toast) return

    // Clear timeout
    clearTimeout(toast.timeoutId)

    // Animate out
    toast.element.style.opacity = '0'
    toast.element.style.transform = 'translateX(100%)'

    // Remove from DOM after animation
    setTimeout(() => {
      if (toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element)
      }
      this.activeToasts.delete(toastId)
    }, 300)
  }

  /**
   * Get background color for toast type
   */
  private getBackgroundColor(type: string): string {
    switch (type) {
      case 'success':
        return '#10b981' // Green
      case 'error':
        return '#ef4444' // Red
      case 'warning':
        return '#f59e0b' // Orange
      case 'info':
      default:
        return '#3b82f6' // Blue
    }
  }

  /**
   * Get icon for toast type
   */
  private getIcon(type: string): string {
    switch (type) {
      case 'success':
        return '✓'
      case 'error':
        return '✕'
      case 'warning':
        return '⚠'
      case 'info':
      default:
        return 'ℹ'
    }
  }
}
