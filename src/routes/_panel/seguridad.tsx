import { createFileRoute } from '@tanstack/react-router'
import { Download, KeyRound, Mail, Smartphone } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { encode } from 'uqr'
import { Alert } from '@/components/arc/alert/alert'
import { Badge } from '@/components/arc/badge/badge'
import { Button } from '@/components/arc/button/button'
import { CopyButton } from '@/components/arc/copy-button/copy-button'
import { Dialog, DialogContent } from '@/components/arc/dialog/dialog'
import { Input } from '@/components/arc/input/input'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { useAuth } from '@/lib/auth'
import { describeError } from '@/lib/errors'
import { confirmPanelTotp, disablePanelTotp, newPanelBackupCodes, startPanelTotp } from '@/lib/panel-auth'

export const Route = createFileRoute('/_panel/seguridad')({
  component: SecurityPage,
})

function formatDate(ms: number) {
  return new Date(ms).toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

function SecurityPage() {
  const { panel, refreshPanel, logout } = useAuth()
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [codes, setCodes] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function regenerate() {
    setBusy(true)
    setError(null)
    try {
      setCodes(await newPanelBackupCodes())
      await refreshPanel()
    } catch (failure) {
      setError(describeError(failure, 'No pudimos crear códigos nuevos. Inténtalo nuevamente.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-(length:--text-3xl) leading-(--leading-display) font-medium tracking-(--tracking-display)">Seguridad</h1>
        <p className="max-w-2xl text-(--text-secondary)">
          Cada vez que entras al panel, además de la contraseña te pedimos un código. Así, aunque alguien sepa tu contraseña, no puede entrar sin tu correo o tu teléfono.
        </p>
      </header>

      <section className="flex flex-col divide-y divide-(--border-subtle) overflow-hidden rounded-(--radius-surface) bg-(--surface) shadow-(--shadow-raised)">
        <Method
          icon={<Mail aria-hidden="true" className="size-5" />}
          title="Código por correo"
          badge={<Badge size="sm">Siempre disponible</Badge>}
          description={`Te enviamos 6 dígitos a ${panel?.email ?? 'tu correo'} cada vez que entras. Vencen en 10 minutos.`}
        />
        <Method
          icon={<Smartphone aria-hidden="true" className="size-5" />}
          title="App de autenticación"
          badge={panel?.totp ? <Badge tone="success" size="sm">Activada</Badge> : <Badge size="sm">Recomendada</Badge>}
          description={panel?.totp
            ? 'Al entrar, escribe el código que muestra tu app. Sirve sin internet y no depende del correo.'
            : 'Google Authenticator, Microsoft Authenticator, 1Password, Authy o cualquiera que use códigos de 6 dígitos. Es más rápido que esperar el correo.'}
          action={panel?.totp
            ? <Button variant="ghost" onClick={() => setRemoving(true)}>Quitar app</Button>
            : <Button onClick={() => setAdding(true)}>Agregar app</Button>}
        />
        {panel?.totp && (
          <Method
            icon={<KeyRound aria-hidden="true" className="size-5" />}
            title="Códigos de respaldo"
            badge={<Badge tone={panel.backupCodesLeft <= 2 ? 'warning' : 'neutral'} size="sm">{panel.backupCodesLeft} sin usar</Badge>}
            description="Para entrar si pierdes el teléfono. Cada uno sirve una vez. Crear códigos nuevos anula los anteriores."
            action={<Button variant="secondary" onClick={() => void regenerate()} loading={busy}>Crear nuevos</Button>}
          />
        )}
      </section>
      <Alert tone="danger" title="No se pudo completar" open={!!error}>{error}</Alert>

      <section className="flex flex-col gap-3 rounded-(--radius-surface) bg-(--surface) p-6 shadow-(--shadow-raised)">
        <h2 className="text-(length:--text-lg) font-medium">Esta sesión</h2>
        <p className="text-(--text-secondary)">
          {panel?.verifiedUntil
            ? `Confirmada hasta el ${formatDate(panel.verifiedUntil)}; después te volveremos a pedir el código.`
            : 'Confirmada con el segundo paso.'}
          {' '}Si entras desde otro navegador o vuelves a iniciar sesión, te lo pediremos de nuevo.
        </p>
        <p className="text-(length:--text-sm) text-(--text-muted)">
          Para cambiar la contraseña o cerrar sesión en todos tus dispositivos, usa la app: Configuraciones, Cuenta, Seguridad.
        </p>
        <Button variant="secondary" onClick={() => void logout()} className="self-start">Cerrar sesión</Button>
      </section>

      <AddAppDialog open={adding} onOpenChange={setAdding} onDone={async backup => { setCodes(backup); await refreshPanel() }} />
      <BackupCodesDialog codes={codes} onClose={() => setCodes(null)} />
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title="¿Quitar la app de autenticación?"
        description="Tus códigos de respaldo dejarán de servir. Para entrar al panel te pediremos un código por correo."
        confirmLabel="Quitar app"
        failure="No pudimos quitar la app. Inténtalo nuevamente."
        onConfirm={async () => { await disablePanelTotp(); await refreshPanel() }}
      />
    </div>
  )
}

function Method({ icon, title, badge, description, action }: { icon: ReactNode; title: string; badge?: ReactNode; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-(--accent-subtle) text-(--accent)">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-medium">{title}</h2>
          {badge}
        </div>
        <p className="text-(length:--text-sm) text-(--text-secondary)">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** El QR del secreto, con módulos oscuros sobre claro para que cualquier cámara lo lea. */
function QrCode({ value }: { value: string }) {
  const path = useMemo(() => {
    const { data, size } = encode(value, { ecc: 'M', border: 0 })
    let d = ''
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[y][x]) d += `M${x} ${y}h1v1h-1z`
    return { d, size }
  }, [value])
  return (
    <svg viewBox={`-2 -2 ${path.size + 4} ${path.size + 4}`} role="img" aria-label="Código QR para tu app de autenticación" className="size-48 rounded-(--radius-control) bg-(--hn-text-primary)">
      <path d={path.d} fill="var(--hn-text-on-light)" shapeRendering="crispEdges" />
    </svg>
  )
}

function AddAppDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (open: boolean) => void; onDone: (codes: string[]) => Promise<void> }) {
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requested, setRequested] = useState(false)

  if (open && !requested) {
    setRequested(true)
    setBusy(true)
    startPanelTotp()
      .then(result => setSetup(result))
      .catch(failure => setError(describeError(failure, 'No pudimos preparar el código QR. Inténtalo nuevamente.')))
      .finally(() => setBusy(false))
  }

  const close = (next: boolean) => {
    if (busy) return
    if (!next) {
      setSetup(null)
      setCode('')
      setError(null)
      setRequested(false)
    }
    onOpenChange(next)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const digits = code.replace(/\D/g, '')
    if (digits.length !== 6) return
    setBusy(true)
    setError(null)
    try {
      const codes = await confirmPanelTotp(digits)
      setBusy(false)
      close(false)
      await onDone(codes)
    } catch (failure) {
      setError(describeError(failure, 'No pudimos revisar el código. Inténtalo nuevamente.'))
      setCode('')
      setBusy(false)
    }
  }

  // El secreto en grupos de 4, más fácil de copiar a mano.
  const grouped = setup?.secret.match(/.{1,4}/g)?.join(' ') ?? ''

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent title="Agregar una app de autenticación" description="Escanea el código con tu app y escribe el primer código que te muestre.">
        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          {setup ? (
            <div className="flex flex-col items-center gap-4">
              <QrCode value={setup.uri} />
              <div className="flex w-full flex-col gap-2">
                <p className="text-(length:--text-sm) text-(--text-secondary)">¿No puedes escanear? Escribe esta clave en la app (tipo: basada en tiempo):</p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 rounded-(--radius-control) bg-(--surface-muted) px-3 py-2 font-mono text-(length:--text-sm) break-all">{grouped}</code>
                  <CopyButton value={setup.secret} label="Copiar clave" iconOnly />
                </div>
              </div>
            </div>
          ) : !error && <p className="text-(--text-secondary)">Preparando el código QR…</p>}
          <Input
            label="Código de la app"
            value={code}
            onChange={event => { setCode(event.target.value); if (error) setError(null) }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="font-mono tracking-[0.3em] tabular-nums"
            disabled={!setup || busy}
          />
          <Alert tone="danger" title="No se pudo completar" open={!!error}>{error}</Alert>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => close(false)} disabled={busy}>Cancelar</Button>
            <Button type="submit" loading={busy && !!setup} disabled={!setup || code.replace(/\D/g, '').length !== 6}>Activar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function BackupCodesDialog({ codes, onClose }: { codes: string[] | null; onClose: () => void }) {
  const [shown, setShown] = useState<string[] | null>(codes)
  if (codes && codes !== shown) setShown(codes)
  const text = (shown ?? []).join('\n')

  const download = () => {
    const blob = new Blob([`Códigos de respaldo del panel de HaNet\nCada uno sirve una sola vez.\n\n${text}\n`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'hanet-codigos-de-respaldo.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={!!codes} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent title="Guarda tus códigos de respaldo" description="Es la única vez que los vas a ver. Guárdalos en un lugar seguro, fuera del teléfono donde tienes la app.">
        <div className="flex flex-col gap-5">
          <ul className="grid grid-cols-2 gap-2 rounded-(--radius-control) bg-(--surface-muted) p-4 font-mono tabular-nums">
            {(shown ?? []).map(code => <li key={code}>{code}</li>)}
          </ul>
          <div className="flex flex-wrap justify-end gap-3">
            <CopyButton value={text} label="Copiar" />
            <Button variant="secondary" onClick={download}><Download aria-hidden="true" className="size-4" /> Descargar</Button>
            <Button onClick={onClose}>Ya los guardé</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
