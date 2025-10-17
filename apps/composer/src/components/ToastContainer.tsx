/**
 * Toast container and individual toast item components
 * Handles rendering, animations, auto-dismiss, and accessibility
 */

import { useEffect, useState } from 'react'
import type { Toast, ToastType } from './ToastContext'

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

interface ToastItemProps {
  toast: Toast
  onDismiss: (id: string) => void
}

const typeStyles: Record<ToastType, string> = {
  success: 'bg-green-600 border-green-700',
  error: 'bg-red-600 border-red-700',
  info: 'bg-blue-600 border-blue-700',
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Auto-dismiss after duration (pausable on hover)
  useEffect(() => {
    if (isHovered) return

    const timer = setTimeout(() => {
      onDismiss(toast.id)
    }, toast.duration || 3000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onDismiss, isHovered])

  // Keyboard: Escape to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss(toast.id)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toast.id, onDismiss])

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={`
        flex items-center justify-between
        min-w-[300px] max-w-[500px]
        px-4 py-3 rounded-lg
        border-2 text-white
        shadow-lg
        animate-slide-in
        ${typeStyles[toast.type]}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="text-sm font-medium">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-4 text-white hover:text-gray-200 text-xl font-bold"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  )
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      aria-label="Notifications"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
