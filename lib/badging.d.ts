export {}

declare global {
  interface Navigator {
    setAppBadge?(contents?: number): Promise<void>
    clearAppBadge?(): Promise<void>
  }
}
