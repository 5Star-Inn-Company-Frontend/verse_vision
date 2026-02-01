import { useState } from 'react'

interface ObsConnectionModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ObsConnectionModal({ isOpen, onClose }: ObsConnectionModalProps) {
  const [obsTab, setObsTab] = useState<'window' | 'browser' | 'easyworship'>('window')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-lg w-full shadow-2xl relative flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-700 shrink-0">
          <h2 className="text-xl font-bold text-white">Connect to External Software</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="flex gap-4 border-b border-gray-700 mb-4 overflow-x-auto shrink-0">
            <button 
              onClick={() => setObsTab('window')}
              className={`pb-2 text-sm font-medium whitespace-nowrap ${obsTab === 'window' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
            >
              Window Capture
            </button>
            <button 
              onClick={() => setObsTab('browser')}
              className={`pb-2 text-sm font-medium whitespace-nowrap ${obsTab === 'browser' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
            >
              Browser Source
            </button>
            <button 
              onClick={() => setObsTab('easyworship')}
              className={`pb-2 text-sm font-medium whitespace-nowrap ${obsTab === 'easyworship' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
            >
              EasyWorship
            </button>
          </div>

          {obsTab === 'easyworship' && (
            <div className="space-y-4 text-gray-300 text-sm">
              <p>To use VerseVision with EasyWorship 7+, you can use the Web method or Chroma Key (Green Screen).</p>
              
              <h3 className="text-white font-medium mt-4">Method 1: Web (Best Quality)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>In EasyWorship, go to <strong>Media</strong> tab &rarr; <strong>Web</strong>.</li>
                <li>Click <strong>Add</strong>.</li>
                <li>Enter URL: <code className="bg-gray-800 px-1 rounded">{window.location.origin}/program?bg=transparent</code></li>
                <li>Drag this Web item onto your schedule or live output.</li>
              </ol>

              <h3 className="text-white font-medium mt-4">Method 2: Green Screen (Compatible)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Open the Program Window with Green Background: <br/>
                  <a 
                     href="#" 
                     onClick={(e) => { e.preventDefault(); window.open('/program?bg=green', '_blank', 'width=1920,height=1080,menubar=no,toolbar=no') }}
                     className="text-blue-400 hover:underline"
                  >
                    Open Green Screen Window
                  </a>
                </li>
                <li>In EasyWorship, add a <strong>Feed</strong> (if capturing screen) or use NDI Scan Converter to send this window as NDI.</li>
                <li>If using NDI, add the NDI source in EasyWorship.</li>
                <li>Right-click the source &rarr; <strong>Properties</strong> &rarr; Enable <strong>Chroma Key</strong>.</li>
                <li>Select the bright green color to remove it.</li>
              </ol>
            </div>
          )}

          {obsTab === 'window' && (
            <div className="space-y-4 text-gray-300 text-sm">
              <p>Follow these steps to bring VerseVision into OBS Studio:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Click the <span className="text-red-400 font-semibold">Go Live</span> button to open the Program Output window.
                </li>
                <li>
                  In OBS Studio, click the <span className="text-blue-400 font-semibold">+</span> icon under <strong>Sources</strong>.
                </li>
                <li>
                  Select <strong>Window Capture</strong>.
                </li>
                <li>
                  Name it "VerseVision" and click OK.
                </li>
                <li>
                  In the Window dropdown, select: <br/>
                  <code className="bg-gray-800 px-1 py-0.5 rounded text-white">[chrome.exe]: VerseVision - Program Output</code>
                </li>
                <li>
                  Click OK. You can now resize and position the layer as needed.
                </li>
              </ol>
              <div className="bg-gray-800 p-3 rounded border border-gray-700 mt-4">
                <p className="text-xs text-yellow-400 mb-1">💡 Pro Tip:</p>
                <p className="text-xs">
                  If the window is black in OBS, try toggling "Capture Method" to "Windows 10 (1903 and up)" in the Window Capture properties.
                </p>
              </div>
            </div>
          )}

          {obsTab === 'browser' && (
            <div className="space-y-4 text-gray-300 text-sm">
              <p>Use this method for the highest quality and transparency support:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  In OBS Studio, click the <span className="text-blue-400 font-semibold">+</span> icon under <strong>Sources</strong>.
                </li>
                <li>
                  Select <strong>Browser</strong>.
                </li>
                <li>
                  Name it "VerseVision Browser" and click OK.
                </li>
                <li>
                  In the URL field, paste this address:
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-gray-800 px-2 py-1 rounded text-white flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{window.location.origin}/program</code>
                    <button 
                      onClick={() => navigator.clipboard.writeText(window.location.origin + '/program')}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
                      title="Copy to clipboard"
                    >
                      Copy
                    </button>
                  </div>
                </li>
                <li>
                  Set Width to <strong>1920</strong> and Height to <strong>1080</strong>.
                </li>
                <li>
                  Check <strong>Control audio via OBS</strong> if you want to manage audio levels in OBS.
                </li>
                <li>
                  Click OK.
                </li>
              </ol>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
