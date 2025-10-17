// Song Arrangement View - Timeline for arranging loops into songs
import React from 'react'

export function SongArrangementView() {
  return (
    <div className="min-h-screen bg-[#8EE1FF] p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Bar */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-black/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="px-4 py-2 bg-white border border-black/10 rounded-lg font-semibold text-sm hover:bg-black/5 transition-colors">
              ◀ Back to Builder
            </a>
            <button className="px-4 py-2 bg-[#FFD11A] rounded-lg font-semibold text-sm hover:bg-[#FFD11A]/90 transition-colors">
              ▶ Play Song
            </button>
            <button className="px-4 py-2 bg-white border border-black/10 rounded-lg font-semibold text-sm hover:bg-black/5 transition-colors">
              ⏹ Stop
            </button>
          </div>
          <button className="px-4 py-2 bg-white border border-black/10 rounded-lg font-semibold text-sm hover:bg-black/5 transition-colors">
            💾 Export
          </button>
        </div>

        {/* Pad Bank Area */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-black/10">
          <h3 className="text-sm font-semibold mb-3">MPC Pad Bank</h3>
          <p className="text-xs text-black/55 mb-4">Click a pad to add its loop to the timeline</p>

          {/* 4×4 Pad Grid - Empty State */}
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 16 }, (_, i) => (
              <div
                key={i}
                className="aspect-square bg-white border-2 border-black/10 rounded-lg flex items-center justify-center text-black/30 text-sm font-medium hover:border-black/20 transition-colors cursor-not-allowed"
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Area - Empty State */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-black/10 min-h-[300px] flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-semibold mb-2">Song Timeline</h2>
          <p className="text-black/55 mb-8 max-w-md">
            Your song timeline will appear here. Create and save loops first, then arrange them into a song.
          </p>
          <div className="space-y-2 text-sm text-black/40">
            <p>• Create loops in the Loop Builder</p>
            <p>• Save loops to pads</p>
            <p>• Click pads to add them to the timeline</p>
            <p>• Drag to reorder loop blocks</p>
          </div>
        </div>
      </div>
    </div>
  )
}
