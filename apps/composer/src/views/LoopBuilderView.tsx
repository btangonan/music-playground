// Loop Builder View - Primary workspace for creating loops
import React from 'react'
import { ChordGrid } from '../components/ChordGrid'

export function LoopBuilderView() {
  return (
    <div className="min-h-screen bg-[#8EE1FF] p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Bar */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-black/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 bg-[#FFD11A] rounded-lg font-semibold text-sm hover:bg-[#FFD11A]/90 transition-colors">
              ▶ Preview Loop
            </button>
            <button className="px-4 py-2 bg-white border border-black/10 rounded-lg font-semibold text-sm hover:bg-black/5 transition-colors">
              💾 Save to Pad
            </button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-black/55">BPM: 120</span>
            <button className="px-4 py-2 bg-white border border-black/10 rounded-lg font-semibold text-sm hover:bg-black/5 transition-colors">
              ⚙️ Settings
            </button>
          </div>
        </div>

        {/* Chord Grid */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-black/10">
          <ChordGrid />
        </div>

        {/* Icon Sequencer Placeholder */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-black/10 min-h-[200px] flex flex-col items-center justify-center text-center">
          <h3 className="text-lg font-semibold mb-2">Icon Sound Sequencer</h3>
          <p className="text-sm text-black/40">Coming in next slice</p>
        </div>

        {/* Navigation Hint */}
        <div className="text-center">
          <a href="/song" className="text-sm text-black/55 hover:text-black transition-colors underline">
            Switch to Song Arrangement →
          </a>
        </div>
      </div>
    </div>
  )
}
