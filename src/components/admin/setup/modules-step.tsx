import { useState } from 'react'
import { Alert } from '@/components/arc/alert/alert'
import { Button } from '@/components/arc/button/button'
import { Switch } from '@/components/common/switch'
import { describeError } from '@/lib/errors'
import { MODULES, setInstitutionModules, type AdminInstitution, type ModuleId } from '@/lib/hnt-admin'
import { updateInstitution } from '@/lib/use-institutions'

/**
 * Elige los módulos de una vez y los guarda al seguir (el panel Módulos de la
 * institución, en cambio, guarda cada interruptor al tocarlo).
 */
export function ModulesStep({ institution, onDone }: { institution: AdminInstitution; onDone: () => void }) {
  const [picked, setPicked] = useState<ModuleId[]>(() => institution.modules ?? MODULES.map(module => module.id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(id: ModuleId, on: boolean) {
    let next = on ? [...picked, id] : picked.filter(item => item !== id)
    // Las encuestas viven dentro del Feed.
    if (id === 'feed' && !on) next = next.filter(item => item !== 'polls')
    if (id === 'polls' && on && !next.includes('feed')) next = [...next, 'feed']
    setPicked(next)
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      updateInstitution(institution.id, { modules: await setInstitutionModules(institution.id, picked) })
      onDone()
    } catch (failure) {
      setError(describeError(failure, 'No pudimos guardar los módulos.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col divide-y divide-(--border-subtle) overflow-hidden rounded-(--radius-panel) border border-(--border-subtle)">
        <li className="flex items-center gap-4 bg-(--surface-muted) px-5 py-4">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-medium">Base</span>
            <span className="text-(length:--text-sm) text-(--text-secondary)">Calendar, ClassHall y eventos del liceo. Siempre prendida.</span>
          </span>
        </li>
        {MODULES.map(module => {
          const on = picked.includes(module.id)
          return (
            <li key={module.id} className="flex items-center gap-4 px-5 py-4">
              <label htmlFor={`setup-modulo-${module.id}`} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5">
                <span className="font-medium">{module.name}</span>
                <span className="text-(length:--text-sm) text-(--text-secondary)">{module.description}</span>
              </label>
              <Switch id={`setup-modulo-${module.id}`} label={module.name} checked={on} disabled={busy} onChange={value => toggle(module.id, value)} />
            </li>
          )
        })}
      </ul>
      <Alert tone="danger" title="No se guardaron los módulos" open={!!error}>{error}</Alert>
      <Button onClick={() => void save()} loading={busy} className="self-start">Guardar y seguir</Button>
    </div>
  )
}
