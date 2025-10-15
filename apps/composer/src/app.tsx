import React from 'react'
import { ComposerGrid } from './components/ComposerGrid'
import { MacroStrip } from './components/MacroStrip'
import { Transport } from './components/Transport'
export default function App(){
  return (
    <div className="p-4 space-y-4">
      <Transport/>
      <MacroStrip/>
      <ComposerGrid/>
    </div>
  )
}
