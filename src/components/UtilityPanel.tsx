import { useEffect } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'

export default function UtilityPanel() {
  const { 
    loadSettings, showScriptureOverlay, toggleScriptureOverlay, 
    recordingEnabled, setRecordingEnabled, startCountdown, stopCountdown, countdownEndAt,
    panelTranslationVisible, panelPairingVisible, panelCameraGridVisible,
    panelLyricsVisible, panelPlaylistVisible, panelSceneVisible,
    togglePanel,
    overlayBackgroundColor, overlayTextScale, overlayFontFamily, updateOverlaySettings
  } = useOperatorStore()
  useEffect(() => { void loadSettings() }, [loadSettings])
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <h3 className="text-sm font-semibold text-gray-100 mb-2">Utilities</h3>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-gray-300">Scripture Overlay</label>
        <button className={`px-2 py-1 text-xs rounded ${showScriptureOverlay ? 'bg-green-600' : 'bg-gray-700'} text-white`} onClick={() => toggleScriptureOverlay(!showScriptureOverlay)}>
          {showScriptureOverlay ? 'On' : 'Off'}
        </button>
      </div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-gray-300">Recording</label>
        <button className={`px-2 py-1 text-xs rounded ${recordingEnabled ? 'bg-red-600' : 'bg-gray-700'} text-white`} onClick={() => setRecordingEnabled(!recordingEnabled)}>
          {recordingEnabled ? 'REC' : 'Off'}
        </button>
      </div>
      
      <div className="mt-4 border-t border-gray-800 pt-2">
        <h4 className="text-xs font-semibold text-gray-400 mb-2">Appearance</h4>
        <div className="space-y-3">
          {/* Background Color */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Background</label>
            <div className="flex flex-wrap gap-1">
               <button 
                onClick={() => updateOverlaySettings({ overlayBackgroundColor: 'rgba(0,0,0,0.7)' })}
                className={`w-6 h-6 rounded border ${overlayBackgroundColor === 'rgba(0,0,0,0.7)' ? 'border-white' : 'border-gray-600'}`} 
                style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                title="Black (70%)"
               />
               <button 
                onClick={() => updateOverlaySettings({ overlayBackgroundColor: 'rgba(0,0,0,0.9)' })}
                className={`w-6 h-6 rounded border ${overlayBackgroundColor === 'rgba(0,0,0,0.9)' ? 'border-white' : 'border-gray-600'}`} 
                style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
                title="Black (90%)"
               />
               <button 
                onClick={() => updateOverlaySettings({ overlayBackgroundColor: 'rgba(30, 58, 138, 0.8)' })}
                className={`w-6 h-6 rounded border ${overlayBackgroundColor === 'rgba(30, 58, 138, 0.8)' ? 'border-white' : 'border-gray-600'}`} 
                style={{ backgroundColor: 'rgba(30, 58, 138, 0.8)' }}
                title="Blue"
               />
               <button 
                onClick={() => updateOverlaySettings({ overlayBackgroundColor: 'rgba(127, 29, 29, 0.8)' })}
                className={`w-6 h-6 rounded border ${overlayBackgroundColor === 'rgba(127, 29, 29, 0.8)' ? 'border-white' : 'border-gray-600'}`} 
                style={{ backgroundColor: 'rgba(127, 29, 29, 0.8)' }}
                title="Red"
               />
               <button 
                onClick={() => updateOverlaySettings({ overlayBackgroundColor: 'rgba(76, 29, 149, 0.8)' })}
                className={`w-6 h-6 rounded border ${overlayBackgroundColor === 'rgba(76, 29, 149, 0.8)' ? 'border-white' : 'border-gray-600'}`} 
                style={{ backgroundColor: 'rgba(76, 29, 149, 0.8)' }}
                title="Purple"
               />
               <button 
                onClick={() => updateOverlaySettings({ overlayBackgroundColor: 'rgba(13, 148, 136, 0.8)' })}
                className={`w-6 h-6 rounded border ${overlayBackgroundColor === 'rgba(13, 148, 136, 0.8)' ? 'border-white' : 'border-gray-600'}`} 
                style={{ backgroundColor: 'rgba(13, 148, 136, 0.8)' }}
                title="Teal"
               />
               <div className="relative w-6 h-6 rounded overflow-hidden border border-gray-600" title="Custom Color">
                 <input 
                   type="color" 
                   className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer p-0 border-0"
                   value={overlayBackgroundColor.startsWith('#') ? overlayBackgroundColor : '#000000'}
                   onChange={(e) => updateOverlaySettings({ overlayBackgroundColor: e.target.value })}
                 />
               </div>
            </div>
          </div>

          {/* Text Size */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Text Size: {Math.round(Number(overlayTextScale) * 100)}%</label>
            <div className="flex gap-1">
              <button 
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
                onClick={() => updateOverlaySettings({ overlayTextScale: Math.max(0.5, Number(overlayTextScale) - 0.1) })}
              >
                -
              </button>
              <button 
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
                onClick={() => updateOverlaySettings({ overlayTextScale: 1.0 })}
              >
                Reset
              </button>
              <button 
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
                onClick={() => updateOverlaySettings({ overlayTextScale: Math.min(3.0, Number(overlayTextScale) + 0.1) })}
              >
                +
              </button>
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Font</label>
            <select 
              className="w-full bg-gray-800 text-white text-xs border border-gray-700 rounded px-2 py-1 outline-none"
              value={overlayFontFamily}
              onChange={(e) => updateOverlaySettings({ overlayFontFamily: e.target.value })}
            >
              <option value="sans">Sans-Serif (Default)</option>
              <option value="serif">Serif</option>
              <option value="mono">Monospace</option>
              <option value="cursive">Handwriting</option>
              <option value="'Arial Black', sans-serif">Arial Black</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mt-4">
          <label className="text-xs text-gray-300">Countdown</label>
          <span className="text-[10px] text-gray-400">{countdownEndAt ? Math.max(0, Math.ceil((countdownEndAt - Date.now()) / 1000)) + 's' : 'stopped'}</span>
        </div>
        <div className="flex gap-2 mt-2">
          <button className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded" onClick={() => startCountdown(5 * 60 * 1000)}>Start 5m</button>
          <button className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded" onClick={() => startCountdown(2 * 60 * 1000)}>Start 2m</button>
          <button className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-800 text-white rounded" onClick={() => stopCountdown()}>Stop</button>
        </div>
      </div>
      
      <div className="mt-4 border-t border-gray-800 pt-2">
        <h4 className="text-xs font-semibold text-gray-400 mb-2">Panel Visibility</h4>
        <div className="grid grid-cols-2 gap-2">
          <button className={`px-2 py-1 text-xs rounded text-left truncate ${panelTranslationVisible ? 'bg-blue-900 text-blue-100 border border-blue-700' : 'bg-gray-800 text-gray-400 border border-gray-700'}`} onClick={() => togglePanel('translation')}>
             Translation
          </button>
          <button className={`px-2 py-1 text-xs rounded text-left truncate ${panelPairingVisible ? 'bg-blue-900 text-blue-100 border border-blue-700' : 'bg-gray-800 text-gray-400 border border-gray-700'}`} onClick={() => togglePanel('pairing')}>
             Cam Pairing
          </button>
          <button className={`px-2 py-1 text-xs rounded text-left truncate ${panelCameraGridVisible ? 'bg-blue-900 text-blue-100 border border-blue-700' : 'bg-gray-800 text-gray-400 border border-gray-700'}`} onClick={() => togglePanel('cameraGrid')}>
             Cam Grid
          </button>
          <button className={`px-2 py-1 text-xs rounded text-left truncate ${panelLyricsVisible ? 'bg-blue-900 text-blue-100 border border-blue-700' : 'bg-gray-800 text-gray-400 border border-gray-700'}`} onClick={() => togglePanel('lyrics')}>
             Hymns
          </button>
          <button className={`px-2 py-1 text-xs rounded text-left truncate ${panelPlaylistVisible ? 'bg-blue-900 text-blue-100 border border-blue-700' : 'bg-gray-800 text-gray-400 border border-gray-700'}`} onClick={() => togglePanel('playlist')}>
             Playlist
          </button>
          <button className={`px-2 py-1 text-xs rounded text-left truncate ${panelSceneVisible ? 'bg-blue-900 text-blue-100 border border-blue-700' : 'bg-gray-800 text-gray-400 border border-gray-700'}`} onClick={() => togglePanel('scene')}>
             Scene Presets
          </button>
        </div>
      </div>
    </div>
  )
}
