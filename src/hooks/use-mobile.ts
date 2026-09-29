import * as React from "react"

const MOBILE_BREAKPOINT = 768

function subscribe(callback: () => void) {
  const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  query.addEventListener("change", callback)
  return () => query.removeEventListener("change", callback)
}

function snapshot() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
}

function serverSnapshot() { return false }

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
