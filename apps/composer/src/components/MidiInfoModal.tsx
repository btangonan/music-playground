import { X } from 'lucide-react';

interface MidiInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: { name: string; bpm: number; iconCount: number; noteCount: number };
  currentBpm: number;
  onSyncBpm: () => void;
}

export default function MidiInfoModal({
  isOpen,
  onClose,
  metadata,
  currentBpm,
  onSyncBpm
}: MidiInfoModalProps) {
  if (!isOpen) return null;

  const bpmMismatch = currentBpm !== metadata.bpm;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-black rounded-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2
            style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '18px' }}
          >
            MIDI File Details
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* File name */}
          <div>
            <div
              className="text-[rgba(0,0,0,0.55)] mb-1"
              style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '12px' }}
            >
              FILE
            </div>
            <div
              className="truncate"
              style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '14px' }}
              title={metadata.name}
            >
              {metadata.name}
            </div>
          </div>

          {/* BPM */}
          <div>
            <div
              className="text-[rgba(0,0,0,0.55)] mb-1"
              style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '12px' }}
            >
              TEMPO
            </div>
            <div className="flex items-center gap-3">
              <span
                style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '14px' }}
              >
                {metadata.bpm} BPM
              </span>
              {bpmMismatch && (
                <button
                  onClick={onSyncBpm}
                  className="px-3 py-1 bg-[#FFD11A] hover:opacity-90 rounded-lg transition-opacity"
                  style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '12px' }}
                >
                  Sync to {metadata.bpm} BPM
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div>
            <div
              className="text-[rgba(0,0,0,0.55)] mb-1"
              style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '12px' }}
            >
              CONTENT
            </div>
            <div
              style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '14px' }}
            >
              {metadata.iconCount} icons placed ({metadata.noteCount} notes)
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-2 bg-white border border-[rgba(0,0,0,0.1)] hover:bg-[rgba(0,0,0,0.05)] rounded-xl transition-colors"
          style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '14px' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
