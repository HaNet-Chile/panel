import { useCallback, useEffect, useState } from 'react'
import { call } from '@/lib/callable'

/**
 * "Cerrar HaNet al público" (hanetcl functions/app-status.js): HNT cierra
 * HaNet para todos menos el equipo, desde aquí (página Estado) o desde el
 * Panel HNT de la app. Mientras está cerrado, el panel muestra la pantalla de
 * cierre a quien no es HNT y las funciones rechazan sus llamadas.
 */
export type AppPauseKind = 'maintenance' | 'incident' | 'closed'
/** institutionName: cuando el cierre es de un solo liceo (abajo), para el texto de la pantalla. */
export type AppStatus = { open: boolean; kind: AppPauseKind | null; message: string | null; until: number | null; institutionName?: string | null }

/**
 * El cierre de un solo liceo (hanetcl functions/app-status.js), como lo
 * contesta getAppStatus con ?i=<institución>. `closed`: rige ahora.
 */
export type InstitutionClosureStatus = {
  closed: boolean
  kind: AppPauseKind | null
  message: string | null
  from: number | null
  until: number | null
  teachers: boolean
  name: string | null
}

/** Quién sigue entrando mientras su liceo está cerrado (exempt() en el backend). */
export function passesInstitutionClosure(role: string | null | undefined, closure: Pick<InstitutionClosureStatus, 'teachers'>) {
  return role === 'HNT' || role === 'Admin' || (role === 'Profesor' && closure.teachers)
}

/** El cierre de un liceo como lo dibuja la pantalla de cierre. */
export function closureAsStatus(closure: { kind: AppPauseKind | null; message: string | null; until: number | null; name: string | null }): AppStatus {
  return { open: false, kind: closure.kind ?? 'closed', message: closure.message, until: closure.until, institutionName: closure.name ?? '' }
}

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

// Lo mismo que InstitutionPausedScreen en la app, con el nombre del liceo.
export function institutionPauseScreen(kind: AppPauseKind, name: string) {
  const where = name || 'tu liceo'
  return {
    maintenance: { title: `Estamos preparando HaNet en ${where}.`, body: 'Tu liceo está dejando listos los cursos y las nóminas. Lo tuyo sigue guardado tal como lo dejaste.' },
    incident: { title: `Algo no anda bien en HaNet de ${where}.`, body: 'Tu liceo ya lo está revisando. Lo tuyo sigue guardado tal como lo dejaste.' },
    closed: { title: `HaNet está cerrado en ${where} por ahora.`, body: '¡No te preocupes, lo tuyo sigue guardado! Vuelve a abrir pronto.' },
  }[kind]
}

export type FetchedStatus = AppStatus & { institution?: InstitutionClosureStatus | null }

/**
 * El estado según el servidor, o null si no se pudo preguntar (entonces el
 * panel sigue como estaba). Con una institución, trae también su cierre.
 */
export async function fetchAppStatus(institutionId?: string | null): Promise<FetchedStatus | null> {
  if (import.meta.env.VITE_DEMO === '1') return { ...demoStatus, institution: null }
  try {
    const url = institutionId ? `${STATUS_URL}?i=${encodeURIComponent(institutionId)}` : STATUS_URL
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) })
    if (!response.ok) return null
    const data = await response.json() as FetchedStatus
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

/** El estado (con el cierre del liceo, si se da), que se vuelve a preguntar cada minuto mientras la página está abierta. */
export function useAppStatus(institutionId?: string | null) {
  const [status, setStatus] = useState<FetchedStatus | null>(null)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const next = await fetchAppStatus(institutionId)
    if (next) setStatus(next)
    setLoaded(true)
    return next
  }, [institutionId])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 60_000)
    return () => window.clearInterval(timer)
  }, [refresh])

  return { status, loaded, refresh, setStatus }
}

/** Cuándo abre el liceo de nuevo: la hora de hoy, o el día y la hora. */
export function opensAt(until: number) {
  const date = new Date(until)
  const time = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  if (date.toDateString() === new Date().toDateString()) return `Abre hoy a las ${time}.`
  return `Abre el ${date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}, a las ${time}.`
}

export function backAt(until: number) {
  const date = new Date(until)
  const time = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  if (date.toDateString() === new Date().toDateString()) return `Volvemos cerca de las ${time}.`
  return `Volvemos cerca del ${date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}, a las ${time}.`
}
