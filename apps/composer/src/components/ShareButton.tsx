/**
 * Share button component with GitHub Gists integration
 * Displays share modal with copyable link
 */

import { useState } from 'react'
import { shareLoop, generateAppShareUrl, checkRateLimit, type ShareError } from '../services/sharing'
import type { Loop } from '@music/types/schemas'

interface ShareButtonProps {
  loop: Loop
  className?: string
}

export default function ShareButton({ loop, className = '' }: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [rateLimit, setRateLimit] = useState<{ remaining: number; limit: number } | null>(null)

  const handleShare = async () => {
    setIsSharing(true)
    setError(null)
    setShareUrl(null)
    setCopied(false)

    try {
      // Check rate limit first
      const limit = await checkRateLimit()
      setRateLimit({ remaining: limit.remaining, limit: limit.limit })

      if (limit.remaining === 0) {
        const resetTime = limit.reset.toLocaleTimeString()
        setError(`Rate limit exceeded. Try again after ${resetTime}`)
        setIsSharing(false)
        return
      }

      // Create gist
      const result = await shareLoop(loop)
      const appUrl = generateAppShareUrl(result.gistId)

      setShareUrl(appUrl)
      setShowModal(true)

      // Auto-copy to clipboard
      try {
        await navigator.clipboard.writeText(appUrl)
        setCopied(true)
      } catch {
        // Clipboard failed, user can still manually copy
      }
    } catch (err) {
      const shareError = err as ShareError
      setError(shareError.message)
    } finally {
      setIsSharing(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setError(null)
    setCopied(false)
  }

  return (
    <>
      {/* Share Button */}
      <button
        onClick={handleShare}
        disabled={isSharing}
        className={`share-button ${className}`}
        title="Share this loop"
      >
        {isSharing ? (
          <span className="share-spinner">⏳</span>
        ) : (
          <span className="share-icon">🔗</span>
        )}
        <span className="share-text">
          {isSharing ? 'Sharing...' : 'Share'}
        </span>
      </button>

      {/* Error Display (inline) */}
      {error && !showModal && (
        <div className="share-error">
          ⚠️ {error}
        </div>
      )}

      {/* Share Modal */}
      {showModal && shareUrl && (
        <div className="share-modal-overlay" onClick={closeModal}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <h2>🎵 Share "{loop.name}"</h2>
              <button onClick={closeModal} className="share-modal-close">×</button>
            </div>

            <div className="share-modal-content">
              <p className="share-modal-description">
                Anyone with this link can open your loop in Music Playground:
              </p>

              <div className="share-url-container">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="share-url-input"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={handleCopy}
                  className={`share-copy-button ${copied ? 'copied' : ''}`}
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>

              {rateLimit && (
                <p className="share-rate-limit">
                  {rateLimit.remaining}/{rateLimit.limit} shares remaining this hour
                </p>
              )}

              <div className="share-info">
                <p><strong>How it works:</strong></p>
                <ul>
                  <li>✅ Free forever (hosted on GitHub)</li>
                  <li>✅ Public link (anyone can view)</li>
                  <li>✅ Permanent (won't expire)</li>
                  <li>✅ Edit history (see changes on GitHub)</li>
                </ul>
              </div>
            </div>

            <div className="share-modal-footer">
              <button onClick={closeModal} className="share-modal-done">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .share-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .share-button:hover:not(:disabled) {
          background: #45a049;
          transform: translateY(-1px);
        }

        .share-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .share-icon, .share-spinner {
          font-size: 16px;
        }

        .share-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .share-error {
          margin-top: 8px;
          padding: 8px 12px;
          background: #ffebee;
          color: #c62828;
          border-radius: 4px;
          font-size: 13px;
        }

        .share-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .share-modal {
          background: white;
          border-radius: 12px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow: auto;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .share-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #eee;
        }

        .share-modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .share-modal-close {
          background: none;
          border: none;
          font-size: 32px;
          line-height: 1;
          color: #999;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
        }

        .share-modal-close:hover {
          color: #333;
        }

        .share-modal-content {
          padding: 20px;
        }

        .share-modal-description {
          margin: 0 0 16px 0;
          color: #666;
          font-size: 14px;
        }

        .share-url-container {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .share-url-input {
          flex: 1;
          padding: 10px 12px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 13px;
          font-family: monospace;
          background: #f5f5f5;
        }

        .share-url-input:focus {
          outline: none;
          border-color: #4CAF50;
          background: white;
        }

        .share-copy-button {
          padding: 10px 20px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .share-copy-button:hover {
          background: #45a049;
        }

        .share-copy-button.copied {
          background: #2196F3;
        }

        .share-rate-limit {
          margin: 0 0 16px 0;
          padding: 8px;
          background: #e3f2fd;
          border-radius: 4px;
          font-size: 12px;
          color: #1976d2;
          text-align: center;
        }

        .share-info {
          background: #f9f9f9;
          padding: 16px;
          border-radius: 6px;
          font-size: 13px;
        }

        .share-info p {
          margin: 0 0 8px 0;
          font-weight: 500;
        }

        .share-info ul {
          margin: 0;
          padding-left: 20px;
        }

        .share-info li {
          margin: 4px 0;
          color: #666;
        }

        .share-modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: flex-end;
        }

        .share-modal-done {
          padding: 10px 24px;
          background: #333;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }

        .share-modal-done:hover {
          background: #555;
        }
      `}</style>
    </>
  )
}
