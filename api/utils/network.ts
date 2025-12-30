import os from 'os'

export function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces()
  
  // 1. Try to find a Wi-Fi adapter specifically
  const wifiInterfaceNames = Object.keys(interfaces).filter(name => 
    name.toLowerCase().includes('wi-fi') || 
    name.toLowerCase().includes('wlan') || 
    name.toLowerCase().includes('wireless')
  )

  for (const name of wifiInterfaceNames) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }

  // 2. Fallback: Find any valid IPv4 address (excluding internal)
  // We still collect all valid IPs to apply priority logic if Wi-Fi isn't found
  const results: string[] = []
  for (const name of Object.keys(interfaces)) {
    // Skip if we already checked this interface above (though it wouldn't have returned if we found one)
    if (wifiInterfaceNames.includes(name)) continue

    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        results.push(iface.address)
      }
    }
  }

  // Priority logic for fallback interfaces
  const p1 = results.find(ip => ip.startsWith('192.168.'))
  if (p1) return p1
  
  const p2 = results.find(ip => ip.startsWith('10.'))
  if (p2) return p2
  
  const p3 = results.find(ip => /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip))
  if (p3) return p3

  return results[0] || 'localhost'
}
