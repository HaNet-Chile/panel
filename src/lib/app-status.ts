import { useCallback, useEffect, useState } from 'react'
import { call } from '@/lib/callable'

/**
 * "Cerrar HaNet al público" (hanetcl functions/app-status.js): HNT cierra
 * HaNet para todos menos el equipo, desde aquí (página Estado) o desde el
 * Panel HNT de la app. Mientras está cerrado, el panel muestra la pantalla de
 * cierre a quien no es HNT y las funciones rechazan sus llamadas.
 */
export type AppPauseKind = 'maintenance' | 'incident' | 'closed'
export type AppStatus = { open: boolean; kind: AppPauseKind | null; message: string | null; until: number | null }

const STATUS_URL = 'https://southamerica-west1-hanet-edu.cloudfunctions.net/getAppStatus'
export const PAUSE_MESSAGE_MAX = 280

export const PAUSE_LABELS: Record<AppPauseKind, string> = {
  maintenance: 'Mantención',
  incident: 'Un problema',
  closed: 'Cerrado por ahora',
}

// Lo mismo que PausedScreen en la app.
export const PAUSE_SCREEN: Record<AppPauseKind, { title: string; body: string }> = {
  maintenance: { title: 'Estamos haciendo mantención.', body: 'HaNet vuelve en un rato. Lo tuyo sigue guardado tal como lo dejaste.' },
  incident: { title: 'Algo no anda bien en HaNet.', body: 'Ya lo estamos revisando. Lo tuyo sigue guardado tal como lo dejaste.' },
  closed: { title: 'HaNet está cerrado por ahora.', body: '¡No te preocupes, lo tuyo sigue guardado! Volvemos pronto.' },
}

let demoStatus: AppStatus = { open: true, kind: null, message: null, until: null }

/** El estado según el servidor, o null si no se pudo preguntar (entonces el panel sigue como estaba). */
export async function fetchAppStatus(): Promise<AppStatus | null> {
  if (import.meta.env.VITE_DEMO === '1') return demoStatus
  try {
    const response = await fetch(STATUS_URL, { cache: 'no-store', signal: AbortSignal.timeout(6000) })
    if (!response.ok) return null
    const data = await response.json() as AppStatus
    return typeof data.open === 'boolean' ? data : null
  } catch {
    return null
  }
}

type SaveInput = { open: true } | { open: false; kind: AppPauseKind; message: string | null; until: number | null }

export async function saveAppStatus(input: SaveInput): Promise<AppStatus> {
  if (import.meta.env.VITE_DEMO === '1') {
    demoStatus = input.open ? { open: true, kind: null, message: null, until: null } : { ...input }
    return demoStatus
  }
  return call<SaveInput, AppStatus>('setAppStatus')(input)
}

/** El estado, que se vuelve a preguntar cada minuto mientras la página está abierta. */
export function useAppStatus() {
  const [status, setStatus] = useState<AppStatus | null>(null)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const next = await fetchAppStatus()
    if (next) setStatus(next)
    setLoaded(true)
    return next
  }, [])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 60_000)
    return () => window.clearInterval(timer)
  }, [refresh])

  return { status, loaded, refresh, setStatus }
}

export function backAt(until: number) {
  const date = new Date(until)
  const time = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  if (date.toDateString() === new Date().toDateString()) return `Volvemos cerca de las ${time}.`
  return `Volvemos cerca del ${date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}, a las ${time}.`
}
