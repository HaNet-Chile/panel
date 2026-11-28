import { Eye } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '@/components/arc/alert/alert'
import { Badge } from '@/components/arc/badge/badge'
import { Button } from '@/components/arc/button/button'
import { Dialog, DialogContent } from '@/components/arc/dialog/dialog'
import { Input } from '@/components/arc/input/input'
import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { Textarea } from '@/components/arc/textarea/textarea'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Switch } from '@/components/common/switch'
import { PausedPage } from '@/components/system/paused-page'
import { PAUSE_MESSAGE_MAX, closureAsStatus, type AppPauseKind } from '@/lib/app-status'
import { describeError } from '@/lib/errors'
import { setInstitutionClosure, type AdminInstitution, type InstitutionClosure } from '@/lib/hnt-admin'
import { updateInstitution } from '@/lib/use-institutions'

const KIND_LABELS: Record<AppPauseKind, string> = {
  maintenance: 'Preparando el año',
  incident: 'Un problema',
  closed: 'Cerrado por ahora',
}

// <input type="datetime-local"> trabaja en la hora local, sin zona.
function toLocalInput(ms: number) {
  const date = new Date(ms)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromLocalInput(value: string) {
  if (!value) return null
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? NaN : ms
}

function when(ms: number) {
  return new Date(ms).toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

/** El primer día de clases a las 8:00, si todavía no llega. */
function classesStart(start: string | undefined, now: number) {
  if (!start) return null
  const [year, month, day] = start.split('-').map(Number)
  const ms = new Date(year, month - 1, day, 8, 0, 0, 0).getTime()
  return ms > now ? ms : null
}

function closureSummary(closure: InstitutionClosure | null | undefined) {
  if (!closure) return 'Abierto para todo el liceo.'
  if (closure.active) return closure.until ? `Cerrado ahora. Abre solo el ${when(closure.until)}.` : 'Cerrado ahora, hasta que alguien lo abra.'
  return `Se cierra el ${when(closure.from ?? 0)}${closure.until ? ` y abre solo el ${when(closure.until)}` : ''}.`
}

/**
 * Cerrar HaNet solo en este liceo (setInstitutionClosure), por ejemplo al
 * empezar el año mientras se arreglan nóminas y cursos. Ahora o desde una
 * fecha, hasta que alguien lo abra o hasta una fecha en que se abre solo.
 * Mientras está cerrado, HNT y la Administración del liceo siguen entrando;
 * los docentes, si se marca.
 */
export function ClosurePanel({ institution }: { institution: AdminInstitution }) {
  const current = institution.closure ?? null
  const [openedAt] = useState(() => Date.now())
  const classes = classesStart(institution.schoolYear?.start, openedAt)
  const [kind, setKind] = useState<AppPauseKind>(current?.kind ?? 'maintenance')
  const [message, setMessage] = useState(current?.message ?? '')
  const [from, setFrom] = useState(current?.from && current.from > openedAt ? toLocalInput(current.from) : '')
  const [untilMode, setUntilMode] = useState<'none' | 'classes' | 'date'>(current?.until ? (current.until === classes ? 'classes' : 'date') : 'none')
  const [until, setUntil] = useState(current?.until && current.until !== classes ? toLocalInput(current.until) : '')
  const [teachers, setTeachers] = useState(current?.teachers ?? false)
  const [confirm, setConfirm] = useState<'close' | 'open' | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const fromMs = fromLocalInput(from)
  const untilMs = untilMode === 'none' ? null : untilMode === 'classes' ? classes : fromLocalInput(until)
  const fromError = fromMs !== null && (Number.isNaN(fromMs) || fromMs < openedAt) ? 'Tiene que ser una hora que todavía no pasa. Vacío: ahora.' : undefined
  const untilError = untilMode === 'date' && (untilMs === null || Number.isNaN(untilMs) || untilMs <= Math.max(openedAt, fromMs ?? 0))
    ? 'Elige una hora después del cierre.'
    : undefined
  const invalid = !!fromError || !!untilError
  const draft = {
    closed: true as const,
    kind,
    message: message.trim() || null,
    from: fromError ? null : fromMs,
    until: untilError ? null : untilMs,
    teachers,
  }

  async function save(next: typeof draft | { closed: false }) {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const closure = await setInstitutionClosure(institution.id, next)
      updateInstitution(institution.id, { closure })
      setDone(!closure ? `HaNet quedó abierto en ${institution.name}.` : closure.active ? `Listo. HaNet quedó cerrado en ${institution.name}.` : `Listo. HaNet se cierra en ${institution.name} el ${when(closure.from ?? 0)}.`)
      return closure
    } catch (failure) {
      setError(describeError(failure, 'No pudimos cambiar el estado del liceo. Inténtalo nuevamente.'))
      return undefined
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-(--radius-surface) bg-(--surface) p-6 shadow-(--shadow-raised)">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-(length:--text-lg) font-medium">Ahora</h2>
          {!current ? <Badge tone="success" size="sm">Abierto</Badge>
            : current.active ? <Badge tone="danger" size="sm">Cerrado en el liceo</Badge>
            : <Badge tone="warning" size="sm">Cierre programado</Badge>}
        </div>
        <p className="text-(--text-secondary)">{closureSummary(current)}</p>
      </section>

      <section className="flex flex-col gap-5 rounded-(--radius-surface) bg-(--surface) p-6 shadow-(--shadow-raised)">
        <div className="flex flex-col gap-1">
          <h2 className="text-(length:--text-lg) font-medium">{current ? 'Cambiar el cierre' : 'Cerrar HaNet en este liceo'}</h2>
          <p className="max-w-2xl text-(--text-secondary)">
            Mientras está cerrado, estudiantes, directivas y CEE ven la pantalla de cierre en la app, la web y el panel, el servidor rechaza sus acciones y no les llegan avisos. El equipo HaNet y la Administración del liceo siguen entrando para dejar listos cursos y nóminas. Igual pueden crear su cuenta y vincularse.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-(length:--text-sm) font-medium">Qué pasa</span>
          <SegmentedControl
            label="Qué pasa"
            options={(Object.keys(KIND_LABELS) as AppPauseKind[]).map(value => ({ value, label: KIND_LABELS[value] }))}
            value={kind}
            onValueChange={value => setKind(value as AppPauseKind)}
            className="self-start"
          />
        </div>
        <Textarea
          label="Mensaje (opcional)"
          description={`Si lo escribes, reemplaza el texto de la pantalla. Hasta ${PAUSE_MESSAGE_MAX} caracteres.`}
          value={message}
          maxLength={PAUSE_MESSAGE_MAX}
          rows={3}
          onChange={event => setMessage(event.target.value)}
        />
        <Input
          label="Desde (opcional)"
          description="Vacío: se cierra al confirmar. En la hora de Chile."
          type="datetime-local"
          value={from}
          error={fromError}
          onChange={event => setFrom(event.target.value)}
          className="max-w-xs"
        />
        <div className="flex flex-col gap-2">
          <span className="text-(length:--text-sm) font-medium">Hasta</span>
          <SegmentedControl
            label="Hasta"
            options={[
              { value: 'none', label: 'Hasta que lo abran' },
              ...(classes ? [{ value: 'classes', label: 'Hasta que empiecen las clases' }] : []),
              { value: 'date', label: 'Hasta una fecha' },
            ]}
            value={untilMode}
            onValueChange={value => setUntilMode(value as typeof untilMode)}
            className="self-start"
          />
          {untilMode === 'date' && (
            <Input label="Abre solo el" type="datetime-local" value={until} error={untilError} onChange={event => setUntil(event.target.value)} className="max-w-xs" />
          )}
          {untilMode === 'classes' && classes && <p className="text-(length:--text-sm) text-(--text-secondary)">Abre solo el {when(classes)}, el primer día de clases.</p>}
        </div>
        <label htmlFor={`docentes-${institution.id}`} className="flex max-w-2xl cursor-pointer items-center gap-4 rounded-(--radius-control) bg-(--background) px-4 py-3">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-medium">Los docentes también entran</span>
            <span className="text-(length:--text-sm) text-(--text-secondary)">Para que armen sus Halls y evaluaciones mientras tanto.</span>
          </span>
          <Switch id={`docentes-${institution.id}`} label="Los docentes también entran" checked={teachers} disabled={busy} onChange={setTeachers} />
        </label>
        <Alert tone="danger" title="No se pudo completar" open={!!error}>{error}</Alert>
        <Alert tone="success" title={done ?? ''} open={!!done} />
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setPreviewing(true)}><Eye className="size-4" aria-hidden="true" /> Ver cómo se ve</Button>
          {current ? (
            <>
              <Button variant="secondary" loading={busy} disabled={invalid} onClick={() => void save(draft)}>Guardar cambios</Button>
              <Button onClick={() => setConfirm('open')} disabled={busy}>Abrir HaNet en el liceo</Button>
            </>
          ) : (
            <Button variant="danger" onClick={() => setConfirm('close')} disabled={busy || invalid}>{fromMs ? 'Programar el cierre' : 'Cerrar HaNet en el liceo'}</Button>
          )}
        </div>
      </section>

      <Dialog open={previewing} onOpenChange={setPreviewing}>
        <DialogContent title="Así lo ven" description="La pantalla que aparece en la app, la web y el panel para quien no puede entrar.">
          <div className="overflow-hidden rounded-(--radius-surface) bg-(--background)">
            <PausedPage status={closureAsStatus({ ...draft, name: institution.name })} compact />
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm === 'close'}
        onOpenChange={open => { if (!open) setConfirm(null) }}
        title={fromMs ? `¿Programar el cierre de HaNet en ${institution.name}?` : `¿Cerrar HaNet en ${institution.name}?`}
        description={teachers
          ? 'Estudiantes, directivas y CEE van a ver la pantalla de cierre y no les van a llegar avisos. La Administración y los docentes siguen entrando.'
          : 'Estudiantes, docentes, directivas y CEE van a ver la pantalla de cierre y no les van a llegar avisos. La Administración sigue entrando.'}
        confirmLabel={fromMs ? 'Programar' : 'Cerrar HaNet'}
        failure="No pudimos cerrar HaNet en el liceo. Inténtalo nuevamente."
        onConfirm={async () => {
          const closure = await setInstitutionClosure(institution.id, draft)
          updateInstitution(institution.id, { closure })
          setDone(closure?.active ? `Listo. HaNet quedó cerrado en ${institution.name}.` : `Listo. HaNet se cierra en ${institution.name} el ${when(closure?.from ?? 0)}.`)
        }}
      />
      <ConfirmDialog
        open={confirm === 'open'}
        onOpenChange={open => { if (!open) setConfirm(null) }}
        title={`¿Abrir HaNet en ${institution.name}?`}
        description="Todos los del liceo vuelven a entrar normal la próxima vez que abran HaNet o toquen Reintentar."
        confirmLabel="Abrir HaNet"
        tone="primary"
        failure="No pudimos abrir HaNet en el liceo. Inténtalo nuevamente."
        onConfirm={async () => {
          await setInstitutionClosure(institution.id, { closed: false })
          updateInstitution(institution.id, { closure: null })
          setDone(`HaNet quedó abierto en ${institution.name}.`)
        }}
      />
    </div>
  )
}
