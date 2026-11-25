import { KeyRound, Mail, Smartphone } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Alert } from '@/components/arc/alert/alert'
import { Button } from '@/components/arc/button/button'
import { Input } from '@/components/arc/input/input'
import { useAuth } from '@/lib/auth'
import { describeError } from '@/lib/errors'
import { sendPanelEmailCode, type SecondStepMethod } from '@/lib/panel-auth'

const COPY: Record<SecondStepMethod, { label: string; hint: string; switchTo: string }> = {
  totp: {
    label: 'Código de tu app de autenticación',
    hint: 'Abre la app donde agregaste HaNet y escribe los 6 dígitos que muestra ahora.',
    switchTo: 'Usar la app de autenticación',
  },
  email: {
    label: 'Código del correo',
    hint: 'Revisa tu bandeja de entrada y la de spam. El código vence en 10 minutos.',
    switchTo: 'Recibir un código por correo',
  },
  backup: {
    label: 'Código de respaldo',
    hint: 'Uno de los 10 que guardaste al agregar la app. Cada uno sirve una sola vez.',
    switchTo: 'Usar un código de respaldo',
  },
}

const ICONS = { totp: Smartphone, email: Mail, backup: KeyRound }

/** Después de la contraseña: confirma este inicio de sesión con un código. */
export function SecondStep() {
  const { user, panel, panelError, confirmSecondStep, refreshPanel, logout } = useAuth()
  const [method, setMethod] = useState<SecondStepMethod>(panel?.totp ? 'totp' : 'email')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [wait, setWait] = useState(0)
  const [sending, setSending] = useState(false)
  const sentOnce = useRef(false)
  const input = useRef<HTMLInputElement>(null)

  const sendCode = async () => {
    setSending(true)
    setError(null)
    try {
      const result = await sendPanelEmailCode()
      setSentTo(result.sentTo)
      setWait(result.resendInSeconds)
    } catch (failure) {
      setError(describeError(failure, 'No pudimos enviar el código. Inténtalo nuevamente.'))
    } finally {
      setSending(false)
    }
  }

  // El correo sale solo la primera vez que se elige; después, con "Enviar otro".
  useEffect(() => {
    if (method !== 'email' || sentOnce.current || !panel) return
    sentOnce.current = true
    void sendCode()
  }, [method, panel])

  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait(seconds => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  useEffect(() => { input.current?.focus() }, [method])

  const clean = method === 'backup' ? code.toLowerCase().replace(/[^a-z0-9]/g, '') : code.replace(/\D/g, '')
  const complete = clean.length === (method === 'backup' ? 8 : 6)

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!complete || busy) return
    setBusy(true)
    setError(null)
    try {
      await confirmSecondStep(method, clean)
    } catch (failure) {
      setError(describeError(failure, 'No pudimos revisar el código. Inténtalo nuevamente.'))
      setCode('')
      setBusy(false)
      input.current?.focus()
    }
  }

  // Seis dígitos completos se envían solos, como en la app.
  useEffect(() => {
    if (method !== 'backup' && complete && !busy && !error) void submit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean])

  const choose = (next: SecondStepMethod) => {
    setMethod(next)
    setCode('')
    setError(null)
  }

  if (!panel) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="danger" title="No pudimos revisar tu inicio de sesión">{panelError}</Alert>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void refreshPanel()}>Reintentar</Button>
          <Button variant="ghost" onClick={() => void logout()}>Usar otra cuenta</Button>
        </div>
      </div>
    )
  }

  const others = (['totp', 'email', 'backup'] as const).filter(item => item !== method && (item === 'email' || panel.totp))
  const Icon = ICONS[method]
  const hint = method === 'email' && sentTo ? `Te lo enviamos a ${sentTo}. ${COPY.email.hint}` : COPY[method].hint

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-(--accent-subtle) text-(--accent)">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <h1 className="text-(length:--text-2xl) leading-tight font-medium tracking-tight">Confirma que eres tú</h1>
        <p className="text-(--text-secondary)">
          Cada vez que entras al panel te pedimos un código, además de la contraseña de {user?.email ?? 'tu cuenta'}.
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Input
          ref={input}
          label={COPY[method].label}
          description={hint}
          value={code}
          onChange={event => { setCode(event.target.value); if (error) setError(null) }}
          inputMode={method === 'backup' ? 'text' : 'numeric'}
          autoComplete="one-time-code"
          maxLength={method === 'backup' ? 9 : 6}
          placeholder={method === 'backup' ? 'abcd-2345' : '000000'}
          className="font-mono tracking-[0.3em] tabular-nums"
          disabled={busy}
        />
        <Alert tone="danger" title="No pudimos confirmar tu entrada" open={!!error}>{error}</Alert>
        <Button type="submit" size="lg" loading={busy} disabled={!complete}>Confirmar</Button>
        {method === 'email' && (
          <Button type="button" variant="ghost" onClick={() => void sendCode()} disabled={wait > 0 || sending} loading={sending}>
            {wait > 0 ? `Enviar otro código en ${wait} s` : 'Enviar otro código'}
          </Button>
        )}
      </form>
      <div className="flex flex-col gap-2 border-t border-(--border-subtle) pt-5">
        {others.map(item => (
          <button
            key={item}
            type="button"
            onClick={() => choose(item)}
            className="w-fit text-left text-(length:--text-sm) text-(--text-secondary) underline-offset-2 transition-colors duration-(--duration-fast) hover:text-(--foreground) hover:underline"
          >
            {COPY[item].switchTo}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void logout()}
          className="w-fit text-left text-(length:--text-sm) text-(--text-secondary) underline-offset-2 transition-colors duration-(--duration-fast) hover:text-(--foreground) hover:underline"
        >
          Usar otra cuenta
        </button>
      </div>
    </div>
  )
}
