import { createFileRoute } from '@tanstack/react-router'
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
import { PausedPage } from '@/components/system/paused-page'
import { describeError } from '@/lib/errors'
import { PAUSE_LABELS, PAUSE_MESSAGE_MAX, backAt, saveAppStatus, useAppStatus, type AppPauseKind, type AppStatus } from '@/lib/app-status'

export const Route = createFileRoute('/_panel/estado')({
  component: StatusPage,
})

// <input type="datetime-local"> trabaja en la hora local, sin zona.
function toLocalInput(ms: number) {
  const date = new Date(ms)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function StatusPage() {
  const { status, loaded, setStatus } = useAppStatus()
  const [kind, setKind] = useState<AppPauseKind>('maintenance')
  const [message, setMessage] = useState('')
  const [until, setUntil] = useState('')
  const [confirm, setConfirm] = useState<'close' | 'open' | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [filled, setFilled] = useState(false)

  const [openedAt] = useState(() => Date.now())

  // Al llegar el estado por primera vez, el formulario parte con lo que hay.
  if (status && !filled) {
    setFilled(true)
    if (!status.open) {
      setKind(status.kind ?? 'maintenance')
      setMessage(status.message ?? '')
      setUntil(status.until ? toLocalInput(status.until) : '')
    }
  }

  const closed = status?.open === false
  const untilMs = until ? new Date(until).getTime() : null
  const untilError = untilMs !== null && (Number.isNaN(untilMs) || untilMs < openedAt)
    ? 'Tiene que ser una hora que todavía no pasa.'
    : undefined
  const draft: AppStatus & { open: false; kind: AppPauseKind } = { open: false, kind, message: message.trim() || null, until: untilError ? null : untilMs }

  async function save(next: typeof draft | { open: true }) {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const result = await saveAppStatus(next)
      setStatus(result)
      setDone(result.open ? 'HaNet quedó abierto para todos.' : 'Listo. HaNet quedó cerrado al público.')
      if (result.open) {
        setMessage('')
        setUntil('')
      }
    } catch (failure) {
      setError(describeError(failure, 'No pudimos cambiar el estado de HaNet. Inténtalo nuevamente.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-(length:--text-3xl) leading-(--leading-display) font-medium tracking-(--tracking-display)">Estado de HaNet</h1>
        <p className="max-w-2xl text-(--text-secondary)">
          Cierra HaNet al público por mantención o por un problema. Mientras está cerrado, todos menos el equipo HaNet ven una pantalla de cierre en la app, la web y este panel, el servidor rechaza sus acciones y no salen notificaciones (salvo las alertas de seguridad).
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-(--radius-surface) bg-(--surface) p-6 shadow-(--shadow-raised)">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-(length:--text-lg) font-medium">Ahora</h2>
          {!loaded ? <Badge size="sm">Revisando…</Badge>
            : !status ? <Badge tone="warning" size="sm">Sin respuesta</Badge>
            : status.open ? <Badge tone="success" size="sm">Abierto para todos</Badge>
            : <Badge tone="danger" size="sm">Cerrado al público</Badge>}
        </div>
        <p className="text-(--text-secondary)">
          {!loaded ? 'Preguntando al servidor.'
            : !status ? 'No pudimos saber el estado. Revisa la conexión o que la función getAppStatus esté publicada.'
            : status.open ? 'Todos entran normal.'
            : `${PAUSE_LABELS[status.kind ?? 'maintenance']}.${status.message ? ` “${status.message}”` : ''}${status.until ? ` ${backAt(status.until)}` : ''} Solo el equipo HaNet puede entrar.`}
        </p>
      </section>

      <section className="flex flex-col gap-5 rounded-(--radius-surface) bg-(--surface) p-6 shadow-(--shadow-raised)">
        <h2 className="text-(length:--text-lg) font-medium">{closed ? 'Cambiar el aviso' : 'Cerrar HaNet al público'}</h2>
        <div className="flex flex-col gap-2">
          <span className="text-(length:--text-sm) font-medium">Qué pasa</span>
          <SegmentedControl
            label="Qué pasa"
            options={(Object.keys(PAUSE_LABELS) as AppPauseKind[]).map(value => ({ value, label: PAUSE_LABELS[value] }))}
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
          label="Cuándo vuelve (opcional)"
          description="Hora aproximada, en la hora de Chile. Vacío: sin hora."
          type="datetime-local"
          value={until}
          error={untilError}
          onChange={event => setUntil(event.target.value)}
          className="max-w-xs"
        />
        <Alert tone="danger" title="No se pudo completar" open={!!error}>{error}</Alert>
        <Alert tone="success" title={done ?? ''} open={!!done} />
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setPreviewing(true)}><Eye className="size-4" aria-hidden="true" /> Ver cómo se ve</Button>
          {closed ? (
            <>
              <Button variant="secondary" loading={busy} disabled={!!untilError} onClick={() => void save(draft)}>Guardar cambios</Button>
              <Button onClick={() => setConfirm('open')} disabled={busy}>Abrir HaNet</Button>
            </>
          ) : (
            <Button variant="danger" onClick={() => setConfirm('close')} disabled={busy || !loaded || !!untilError}>Cerrar HaNet al público</Button>
          )}
        </div>
      </section>

      <Dialog open={previewing} onOpenChange={setPreviewing}>
        <DialogContent title="Así lo ven" description="La pantalla que aparece en la app, la web y el panel para quien no es del equipo.">
          <div className="overflow-hidden rounded-(--radius-surface) bg-(--background)">
            <PausedPage status={draft} compact />
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm === 'close'}
        onOpenChange={open => { if (!open) setConfirm(null) }}
        title="¿Cerrar HaNet al público?"
        description="Todos menos el equipo HaNet van a ver la pantalla de cierre y el servidor va a rechazar sus acciones. Se puede abrir de nuevo desde aquí o desde el Panel HNT de la app."
        confirmLabel="Cerrar HaNet"
        failure="No pudimos cerrar HaNet. Inténtalo nuevamente."
        onConfirm={async () => {
          const result = await saveAppStatus(draft)
          setStatus(result)
          setDone('Listo. HaNet quedó cerrado al público.')
        }}
      />
      <ConfirmDialog
        open={confirm === 'open'}
        onOpenChange={open => { if (!open) setConfirm(null) }}
        title="¿Abrir HaNet para todos?"
        description="Todos vuelven a entrar normal la próxima vez que abran HaNet o toquen Reintentar."
        confirmLabel="Abrir HaNet"
        tone="primary"
        failure="No pudimos abrir HaNet. Inténtalo nuevamente."
        onConfirm={async () => {
          const result = await saveAppStatus({ open: true })
          setStatus(result)
          setMessage('')
          setUntil('')
          setDone('HaNet quedó abierto para todos.')
        }}
      />
    </div>
  )
}
