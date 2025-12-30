import { useEffect, useState } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'
import { api, CLOUD } from '@/lib/api'

export default function SettingsPanel() {
  const { 
    autoApproveEnabled, autoApproveDelayMs, loadSettings, updateSettings, 
    iceServers, loadIceServers, updateIceServers, 
    scriptureDetectionEngine, setScriptureDetectionEngine,
    cloudApiToken, setCloudToken, userPlan, setUserPlan
  } = useOperatorStore()
  
  const [peers, setPeers] = useState<string[]>([])
  const [sessions, setSessions] = useState<Array<{ from: string; to: string; startedAt: number }>>([])
  const [iceText, setIceText] = useState('')
  
  // Login State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  useEffect(() => {
    void loadSettings()
    void loadIceServers()
  }, [loadSettings, loadIceServers])

  useEffect(() => {
    try { setIceText(JSON.stringify(iceServers, null, 2)) } catch { setIceText('[]') }
  }, [iceServers])

  const handleLogin = async () => {
    setIsLoggingIn(true)
    setLoginError(null)
    try {
      // Use Laravel backend URL
      const res = await fetch(`${CLOUD}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.message || 'Login failed')
      }
      
      // Handle different token formats
      const token = data.token || data.access_token || data.data?.token
      if (token) {
        await setCloudToken(token)
        if (data.user?.active_subscription?.plan?.slug) {
          setUserPlan(data.user.active_subscription.plan.slug)
        } else {
          setUserPlan('starter')
        }
        setEmail('')
        setPassword('')
      } else {
        throw new Error('No token received')
      }
    } catch (e: any) {
      setLoginError(e.message || 'Network error')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    await setCloudToken(null)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <h3 className="text-sm font-semibold text-gray-100 mb-2">Settings</h3>

      {/* Cloud Account Section */}
      <div className="mb-4 p-3 bg-gray-800/50 rounded border border-gray-700">
        <label className="text-xs font-semibold text-gray-300 block mb-2">Cloud Account</label>
        {cloudApiToken ? (
          <div className="flex items-center justify-between">
            <div className="text-xs text-green-400 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Connected ({userPlan} Plan)
            </div>
            <div className="flex gap-2">
              <button 
                onClick={async () => {
                  try {
                    const plans = await api.listPlans()
                    // Filter out current plan or lower (assuming price increases)
                    // For now, just show prompt to upgrade to Professional if not already
                    if (userPlan === 'professional') {
                      alert('You are already on the Professional plan. To get on Enterprise, kindly contact support.')
                      return
                    }

                    var target = plans.find(p => p.slug === 'professional') || plans.find(p => p.slug === 'standard')

                    if(userPlan === 'starter') {
                      target = plans.find(p => p.slug === 'standard')
                    }
                    
                  
                    if (!target) {
                      alert('No upgrade plans available.')
                      return
                    }

                    if (confirm(`Upgrade to ${target.name} for NGN ${target.price}?`)) {
                      const res = await api.initializeSubscription(target.slug)
                      if (res.authorization_url) {
                        window.open(res.authorization_url, '_blank')
                      } else if (res.message) {
                        alert(res.message)
                      }
                    }
                  } catch (e: any) {
                    alert(e.message || 'Upgrade failed')
                  }
                }}
                className="px-2 py-1 text-xs bg-blue-900/30 text-blue-200 border border-blue-900/50 hover:bg-blue-900/50 rounded transition-colors"
              >
                Upgrade
              </button>
              <button 
                onClick={handleLogout}
                className="px-2 py-1 text-xs bg-red-900/30 text-red-200 border border-red-900/50 hover:bg-red-900/50 rounded transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full text-xs bg-gray-900 border border-gray-700 rounded p-1.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full text-xs bg-gray-900 border border-gray-700 rounded p-1.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            {loginError && <div className="text-xs text-red-400">{loginError}</div>}
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded font-medium disabled:opacity-50 transition-colors"
            >
              {isLoggingIn ? 'Connecting...' : 'Connect to Cloud'}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <label className="text-xs text-gray-300">Detection Engine</label>
        <div className="flex bg-gray-800 rounded p-0.5">
          <button
            className={`px-2 py-1 text-[10px] rounded ${scriptureDetectionEngine === 'openai' ? 'bg-blue-600' : 'text-gray-400 hover:text-white'}`}
            onClick={() => {
               if (!cloudApiToken) {
                 alert('Please connect to the cloud first to use Online (OpenAI) detection')
                 return
               }
               if (userPlan === 'starter') {
                 alert('Online Detection is not available on the Starter plan. Please upgrade.')
                 return
               }
               setScriptureDetectionEngine('openai')
             }}
          >
            Online (AI)
          </button>
          <button
            className={`px-2 py-1 text-[10px] rounded ${scriptureDetectionEngine === 'offline' ? 'bg-blue-600' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setScriptureDetectionEngine('offline')}
          >
            Offline (Local)
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs text-gray-300">Auto-Approve</label>
        <button
          className={`px-2 py-1 text-xs rounded ${autoApproveEnabled ? 'bg-green-600' : 'bg-gray-700'} text-white`}
          onClick={() => updateSettings({ autoApproveEnabled: !autoApproveEnabled })}
        >
          {autoApproveEnabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-300">Auto-Approve Delay</label>
          <span className="text-xs text-gray-400">{((autoApproveDelayMs ?? 2000) / 1000).toFixed(1)}s</span>
        </div>
        <input
          type="range"
          min={500}
          max={5000}
          step={100}
          value={autoApproveDelayMs ?? 2000}
          onChange={(e) => updateSettings({ autoApproveDelayMs: Number(e.target.value) })}
          className="w-full"
        />
      </div>
      {/* <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-300">ICE Servers (JSON)</label>
          <button
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
            onClick={async () => {
              try {
                const parsed = JSON.parse(iceText) as RTCIceServer[]
                await updateIceServers(parsed)
              } catch (e) { void e }
            }}
          >
            Save
          </button>
        </div>
        <textarea
          value={iceText}
          onChange={(e) => setIceText(e.target.value)}
          className="w-full mt-2 h-24 text-xs bg-gray-800 text-gray-100 rounded p-2"
        />
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-300">Signaling Debug</label>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
              onClick={async () => {
                try {
                  const res = await fetch('/api/webrtc/peers')
                  const json = await res.json()
                  setPeers(json.data || [])
                } catch (e) { void e }
              }}
            >
              Refresh Peers
            </button>
            <button
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
              onClick={async () => {
                try {
                  const res = await fetch('/api/webrtc/sessions')
                  const json = await res.json()
                  setSessions(json.data || [])
                } catch (e) { void e }
              }}
            >
              Refresh Sessions
            </button>
          </div>
        </div>
        <div className="space-y-1">
          {peers.length === 0 && <div className="text-xs text-gray-500">No peers connected</div>}
          {peers.map((p) => (
            <div key={p} className="text-xs text-gray-400 font-mono">{p}</div>
          ))}
          {sessions.length > 0 && <div className="text-xs text-gray-300 mt-2 font-semibold">Active Sessions:</div>}
          {sessions.map((s, i) => (
            <div key={i} className="text-[10px] text-gray-400 font-mono">
              {s.from.substring(0, 6)}... -&gt; {s.to.substring(0, 6)}... ({Math.round((Date.now() - s.startedAt) / 1000)}s)
            </div>
          ))}
        </div>
      </div> */}
    </div>
  )
}
