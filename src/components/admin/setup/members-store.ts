import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { describeError } from '@/lib/errors'
import { listMembers, type AdminInstitution, type Member } from '@/lib/hnt-admin'

// Quién será Admin del liceo. Si todavía no se une, el rol queda esperando en
// la nómina y se lo pone el backend al vincularse (adminSetPendingRole).

type Entry = { members: Member[]; error: string | null; rosterCount: number; truncated: boolean }
type Store = Map<string, Entry>
let store: Store = new Map()
const listeners = new Set<() => void>()

function put(institutionId: string, value: Entry) {
  store = new Map(store).set(institutionId, value)
  listeners.forEach(listener => listener())
}

const loading = new Set<string>()

/** rosterCount: el tamaño de la nómina al cargar, para volver a leerla si cambia. */
export async function loadSetupMembers(institutionId: string, rosterCount: number) {
  if (loading.has(institutionId)) return
  loading.add(institutionId)
  try {
    const result = await listMembers(institutionId)
    put(institutionId, { members: result.members, error: null, rosterCount, truncated: result.truncated })
  } catch (failure) {
    put(institutionId, { members: store.get(institutionId)?.members ?? [], error: describeError(failure, 'No pudimos cargar la nómina.'), rosterCount, truncated: store.get(institutionId)?.truncated ?? false })
  } finally {
    loading.delete(institutionId)
  }
}

/** Personas de la nómina para el asistente. Se vuelven a leer si la nómina cambió de tamaño. */
export function useSetupMembers(institution: AdminInstitution | undefined) {
  const institutionId = institution?.id
  const rosterCount = institution?.rosterCount ?? 0
  const snapshot = useSyncExternalStore(
    useCallback((listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }, []),
    () => store,
  )
  useEffect(() => {
    if (institutionId && store.get(institutionId)?.rosterCount !== rosterCount) void loadSetupMembers(institutionId, rosterCount)
  }, [institutionId, rosterCount])
  return institutionId ? snapshot.get(institutionId) ?? null : null
}

/** Quienes ya son Admin o lo serán al unirse. */
export function adminsOf(members: Member[]) {
  return members.filter(member => member.role === 'Admin' || member.pendingRole === 'Admin')
}

export const isStaffRow = (member: Member) => member.curso.trim().toLocaleLowerCase('es') === 'docente'
