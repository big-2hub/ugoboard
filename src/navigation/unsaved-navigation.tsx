import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react'

type LeaveRequestHandler = (destination: string) => boolean

type UnsavedNavigationContextValue = {
  attemptNavigation: (destination: string) => boolean
  registerLeaveRequestHandler: (handler: LeaveRequestHandler) => () => void
}

const UnsavedNavigationContext = createContext<UnsavedNavigationContextValue>({
  attemptNavigation: () => false,
  registerLeaveRequestHandler: () => () => undefined,
})

export function UnsavedNavigationProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<LeaveRequestHandler | undefined>(undefined)

  const registerLeaveRequestHandler = useCallback((handler: LeaveRequestHandler) => {
    handlerRef.current = handler
    return () => {
      if (handlerRef.current === handler) handlerRef.current = undefined
    }
  }, [])

  const attemptNavigation = useCallback((destination: string) =>
    handlerRef.current?.(destination) ?? false, [])

  return (
    <UnsavedNavigationContext.Provider value={{ attemptNavigation, registerLeaveRequestHandler }}>
      {children}
    </UnsavedNavigationContext.Provider>
  )
}

export const useUnsavedNavigation = () => useContext(UnsavedNavigationContext)
