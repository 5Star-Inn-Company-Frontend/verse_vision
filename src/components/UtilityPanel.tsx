import { useEffect, useState } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'
import { api } from '@/lib/api'
import HelpModal from './HelpModal'

export default function UtilityPanel() {
  const { 
    loadSettings, showScriptureOverlay, toggleScriptureOverlay, 
    recordingEnabled, setRecordingEnabled, startCountdown, stopCountdown, countdownEndAt,
    panelTranslationVisible, panelPairingVisible, panelCameraGridVisible,
    panelLyricsVisible, panelPlaylistVisible, panelSceneVisible,
    togglePanel,
    overlayBackgroundColor, overlayBackgroundImage, overlayTextScale, overlayFontFamily, updateOverlaySettings,
    overlayTextColor, cloudApiToken,
    userPlan, userPlanFeatures
  } = useOperatorStore()
  
  const [showHelp, setShowHelp] = useState(false)
  const [backgrounds, setBackgrounds] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateImage = async (prompt: string) => {
    if (!prompt.trim() || isGenerating) return

    if (!cloudApiToken) {
      alert('Please connect to the cloud first to use Image generation')
      return
    }

    if (userPlanFeatures && userPlanFeatures.image_generation_limit !== -1 && userPlanFeatures.image_generation_limit <= 0) {
      alert('You have reached your image generation limit. Please upgrade your plan.')
      return
    }

    setIsGenerating(true)
    
    try {
        const url = await api.generateAIBackground(prompt)
        if (url) {
            // Refresh backgrounds
            const newBackgrounds = await api.getBackgrounds()
            setBackgrounds(newBackgrounds)
            // Select the new one
            updateOverlaySettings({ overlayBackgroundImage: url })
        } else {
            alert('Failed to generate image. Please check settings (Cloud API Token) and try again.')
        }
    } catch (e) {
        console.error(e)
        alert('Error generating image')
    } finally {
        setIsGenerating(false)
    }
  }

  useEffect(() => {  
      void loadSettings() 
      api.getBackgrounds().then(setBackgrounds)
  }, [loadSettings])
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-100">Utilities</h3>
        <button 
          onClick={() => setShowHelp(true)}
          className="text-gray-400 hover:text-white transition-colors"
          title="Help"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </button>
      </div>

      <HelpModal 
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Utilities Panel Help"
        content={
          <div className="space-y-4">
            <p>This panel provides quick access to essential controls and customization options for the program output.</p>
            
            <div>
              <h4 className="font-semibold text-white mb-1">Quick Controls</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Scripture Overlay:</strong> Toggle this to show or hide the scripture display on the live program output. (Auto-hides Lyrics Overlay).</li>
                <li><strong>Recording:</strong> Start or stop recording the program output to your local device.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-1">Appearance Settings</h4>
              <p>Customize how overlays look on the screen:</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li><strong>Background:</strong> Choose from preset colors or pick a custom color for the overlay background.</li>
                <li><strong>Text Size:</strong> Adjust the scaling of the text to make it larger or smaller.</li>
                <li><strong>Font:</strong> Select different font styles to match your service's theme.</li>
              </ul>
            </div>
          </div>
        }
      />

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
            
            {/* Background Images */}
            <div className="mt-2">
                 <label className="text-xs text-gray-500 block mb-1">Image Backgrounds</label>

                 {/* AI Generation */}
                 <div className="mb-2">
                    <div className="flex gap-1">
                      <input 
                        type="text" 
                        placeholder="AI Generate (Enter prompt)..."
                        className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleGenerateImage(e.currentTarget.value)
                            e.currentTarget.value = ''
                          }
                        }}
                        disabled={isGenerating}
                      />
                    </div>
                    {isGenerating && <div className="text-[10px] text-blue-400 mt-1">Generating image...</div>}
                 </div>

                 {backgrounds.length > 0 && (
                 <div className="flex flex-wrap gap-1">
                    <button
                        onClick={() => updateOverlaySettings({ overlayBackgroundImage: null })}
                        className={`w-8 h-8 rounded border flex items-center justify-center bg-gray-800 ${!overlayBackgroundImage ? 'border-white' : 'border-gray-600'}`}
                        title="None (Use Color)"
                    >
                        <span className="text-[10px] text-gray-400">None</span>
                    </button>
                    {backgrounds.map((bg) => (
                        <button
                            key={bg}
                            onClick={() => updateOverlaySettings({ overlayBackgroundImage: bg })}
                            className={`w-8 h-8 rounded border bg-cover bg-center ${overlayBackgroundImage === bg ? 'border-white' : 'border-gray-600'}`}
                            style={{ backgroundImage: `url(${bg})` }}
                            title={bg.split('/').pop()}
                        />
                    ))}
                 </div>
                 )}
            </div>
          </div>

          {/* Text Color */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Text Color</label>
            <div className="flex gap-2 items-center">
                <div className="relative w-8 h-8 rounded overflow-hidden border border-gray-600" title="Text Color">
                    <input 
                    type="color" 
                    className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer p-0 border-0"
                    value={overlayTextColor || '#ffffff'}
                    onChange={(e) => updateOverlaySettings({ overlayTextColor: e.target.value })}
                    />
                </div>
                <div className="text-xs text-gray-400">{overlayTextColor || '#ffffff'}</div>
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
