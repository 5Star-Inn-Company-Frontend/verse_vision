# React + TypeScript + Vite

## Mobile Camera App Flow

1. Welcome Screen
- Beautiful gradient icon animation
- App introduction and value proposition
- Two main actions: `Connect to Platform` and `Settings`

2. QR Scanner Screen
- Animated scanning frame with corner guides
- Moving scan line animation
- Instructions for positioning QR code
- Simulated connection button for demo

3. Connecting Screen
- Loading state with spinning gear icon
- `Connecting to Platform` message
- Professional status animation

4. Connected Screen
- Success checkmark with scale-in animation
- Complete connection information card:
- Camera name
- Platform IP address
- Connection strength (WiFi)
- Battery level
- Video resolution
- Actions: `Start Camera Feed` and `Disconnect`

5. Camera Active Screen
- Full-screen camera view with overlays
- Top overlay:
- Pulsing `STREAMING` badge (red)
- Battery indicator (e.g., 87%)
- WiFi signal strength
- Center overlay:
- Rule of thirds grid for composition
- Bottom controls:
- Settings button
- Lock button (center, large, red)
- Flip camera button
- Stream info: Resolution, bitrate, duration

6. Lock Screen Mode
- Minimal power consumption interface
- Lock icon with fade-in animation
- Real-time statistics:
- Battery percentage (updates)
- Streaming duration (live timer)
- Message: `Camera continues streaming in background`
- Unlock button to return to camera view

7. Settings Screen
- Comprehensive settings organized in sections:
- Camera Settings:
- Resolution (e.g., 1080p)
- Frame Rate (e.g., 30 fps)
- Auto Exposure (toggle)
- Grid Overlay (toggle)
- Connection:
- Camera Name
- Connection Type (WiFi/USB)
- Platform Status
- Performance:
- Low Power Mode (toggle)
- Audio Streaming (toggle)
- Adaptive Bitrate (toggle)
- About:
- App Version
- Help & Support
- Privacy Policy

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  extends: [
    // other configs...
    // Enable lint rules for React
    reactX.configs['recommended-typescript'],
    // Enable lint rules for React DOM
    reactDom.configs.recommended,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```
