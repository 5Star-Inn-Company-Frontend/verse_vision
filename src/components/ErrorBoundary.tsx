import React from 'react'

type Props = { children: React.ReactNode }
type State = { hasError: boolean }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(_error: Error): State {
    void _error
    return { hasError: true }
  }
  componentDidCatch(error: Error) {
    console.error('UI Error:', error)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-900 text-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-semibold">Something went wrong</div>
            <div className="text-xs opacity-70">Please refresh the page</div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
