import { useEffect, useState } from 'react'
import { Book, Music, Monitor, Globe, Cloud, CheckCircle, Download, Settings, Smartphone } from 'lucide-react'

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('versevision-welcome-shown')
    if (!hasSeenWelcome) {
      setIsOpen(true)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem('versevision-welcome-shown', 'true')
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-8 py-6 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to VerseVision</h1>
          <p className="text-blue-100">Your professional scripture projection assistant is ready.</p>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-8">
          
          {/* Ready to Use Section */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-green-400 mb-4">
              <CheckCircle className="w-5 h-5" />
              Ready to Use Immediately
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <Book className="w-8 h-8 text-blue-400 mb-3" />
                <h4 className="font-medium text-white mb-1">Scripture Detection</h4>
                <p className="text-sm text-gray-400">Instantly detects and displays verses from audio.</p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <Music className="w-8 h-8 text-purple-400 mb-3" />
                <h4 className="font-medium text-white mb-1">Lyrics & Hymns</h4>
                <p className="text-sm text-gray-400">Project songs and manage playlists manually.</p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <Monitor className="w-8 h-8 text-orange-400 mb-3" />
                <h4 className="font-medium text-white mb-1">Go Live</h4>
                <p className="text-sm text-gray-400">Present on a second screen without borders.</p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <Smartphone className="w-8 h-8 text-pink-400 mb-3" />
                <h4 className="font-medium text-white mb-1">Cam Pairing</h4>
                <p className="text-sm text-gray-400">Use your mobile phone as a professional camera.</p>
              </div>
            </div>
          </div>

          {/* Needs Download Section */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-400 mb-4">
              <Download className="w-5 h-5" />
              Requires Internet & Setup
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <Globe className="w-8 h-8 text-cyan-400" />
                  <span className="text-xs font-mono bg-gray-900 px-2 py-1 rounded text-gray-400">~5-10 mins</span>
                </div>
                <h4 className="font-medium text-white mb-1">Translation Models</h4>
                <p className="text-sm text-gray-400">
                  Offline translation requires downloading language packs.
                </p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <Cloud className="w-8 h-8 text-sky-400" />
                  <span className="text-xs font-mono bg-gray-900 px-2 py-1 rounded text-gray-400">Account</span>
                </div>
                <h4 className="font-medium text-white mb-1">Cloud AI</h4>
                <p className="text-sm text-gray-400">
                  For highest accuracy, enable Cloud AI with your Verse Vision account. If you dont have an account already, just input your details and an account will be created for you.
                </p>
              </div>
            </div>
          </div>

          {/* How to Toggle */}
          <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-4 flex items-start gap-4">
            <Settings className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
            <div>
              <h4 className="font-medium text-white">Where to configure?</h4>
              <ul className="text-sm text-gray-300 mt-1 space-y-1 list-disc pl-4">
                <li>
                  <span className="font-bold text-white">Settings Panel:</span> Toggle AI Engines (Offline vs Cloud) & Login.
                </li>
                <li>
                  <span className="font-bold text-white">Utility Panel:</span> Toggle Overlays, Recording, and show/hide other panels.
                </li>
                <li>
                  <span className="font-bold text-white">Translation Panel:</span> Manage languages and models.
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 bg-gray-900 flex justify-end">
          <button 
            onClick={handleClose}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Get Started
          </button>
        </div>

      </div>
    </div>
  )
}
