import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Alert } from '@/components/arc/alert/alert'
import { Badge } from '@/components/arc/badge/badge'
import { Button } from '@/components/arc/button/button'
import { SearchField } from '@/components/arc/search-field/search-field'
import { Skeleton } from '@/components/arc/skeleton/skeleton'
import { describeError } from '@/lib/errors'
import { listMembers, setMemberRole, setPendingRole, type AdminInstitution, type Member } from '@/lib/hnt-admin'

// Quién será Admin del liceo. Si todavía no se une, el rol queda esperando en
// la nómina y se lo pone el backend al vincularse (adminSetPendingRole).

type Entry = { members: Member[]; error: string | null; rosterCount: number }
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
    put(institutionId, { members: (await listMembers(institutionId)).members, error: null, rosterCount })
  } catch (failure) {
    put(institutionId, { members: store.get(institutionId)?.members ?? [], error: describeError(failure, 'No pudimos cargar la nómina.'), rosterCount })
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

const isStaffRow = (member: Member) => member.curso.trim().toLocaleLowerCase('es') === 'docente'

export function AdminStep({ institution }: { institution: AdminInstitution }) {
  const loaded = useSetupMembers(institution)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const members = useMemo(() => loaded?.members ?? [], [loaded])
  const admins = adminsOf(members)

  // Primero docentes y administración (curso "Docente"); con búsqueda, todos.
  const shown = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    const list = term
      ? members.filter(member => `${member.fullName} ${member.email ?? ''} ${member.curso}`.toLocaleLowerCase('es').includes(term))
      : members.filter(isStaffRow)
    return list.filter(member => !adminsOf([member]).length).slice(0, 30)
  }, [members, search])

  async function change(member: Member, admin: boolean) {
    setBusy(member.rut)
    setError(null)
    try {
      if (member.uid) await setMemberRole(member.uid, admin ? 'Admin' : 'Profesor')
      else await setPendingRole(institution.id, member.rut, admin ? 'Admin' : null)
      await loadSetupMembers(institution.id, institution.rosterCount)
    } catch (failure) {
      setError(describeError(failure, 'No pudimos guardar el rol.'))
    } finally {
      setBusy(null)
    }
  }

  if (!loaded) return <Skeleton label="Cargando la nómina" lines={4} avatar />
  if (loaded.error && members.length === 0) return <Alert tone="danger" title="No pudimos cargar la nómina">{loaded.error}</Alert>
  if (members.length === 0) {
    return <Alert tone="info" title="Primero carga la nómina">La persona que será Admin tiene que estar en la nómina, con su correo institucional.</Alert>
  }

  return (
    <div className="flex flex-col gap-5">
      {admins.length > 0 && (
        <ul className="flex flex-col divide-y divide-(--border-subtle) overflow-hidden rounded-(--radius-panel) border border-(--border-subtle)">
          {admins.map(member => (
            <li key={member.rut} className="flex items-center gap-4 px-5 py-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{member.fullName}</span>
                <span className="truncate text-(length:--text-sm) text-(--text-secondary)">{member.email}</span>
              </span>
              <Badge size="sm" tone={member.uid ? 'success' : 'info'}>{member.uid ? 'Admin' : 'Admin al unirse'}</Badge>
              <Button variant="ghost" size="sm" loading={busy === member.rut} disabled={!!busy} onClick={() => void change(member, false)}>Quitar</Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3">
        <SearchField label={admins.length ? 'Sumar otra persona' : 'Buscar en la nómina'} value={search} onValueChange={setSearch} placeholder="Nombre o correo" />
        {!search && <p className="text-(length:--text-sm) text-(--text-secondary)">Abajo están quienes tienen el curso "Docente". Busca para ver al resto de la nómina.</p>}
        {shown.length > 0 && (
          <ul className="flex flex-col divide-y divide-(--border-subtle) overflow-hidden rounded-(--radius-panel) border border-(--border-subtle)">
            {shown.map(member => (
              <li key={member.rut} className="flex items-center gap-4 px-5 py-3">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{member.fullName}</span>
                  <span className="truncate text-(length:--text-sm) text-(--text-secondary)">{[member.curso, member.email].filter(Boolean).join(' · ')}</span>
                </span>
                {member.uid && <span className="hidden text-(length:--text-sm) text-(--text-secondary) sm:inline">Ya se unió</span>}
                <Button variant="secondary" size="sm" loading={busy === member.rut} disabled={!!busy} onClick={() => void change(member, true)}>Hacer Admin</Button>
              </li>
            ))}
          </ul>
        )}
        {shown.length === 0 && <p className="text-(--text-secondary)">{search ? 'Nadie de la nómina coincide con esa búsqueda.' : 'Nadie tiene el curso "Docente". Busca a la persona por su nombre.'}</p>}
      </div>

      <Alert tone="danger" title="No se guardó" open={!!error}>{error}</Alert>
    </div>
  )
}
