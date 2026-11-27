import { useState } from 'react'
import { Alert } from '@/components/arc/alert/alert'
import { Button } from '@/components/arc/button/button'
import { Input } from '@/components/arc/input/input'
import { describeError } from '@/lib/errors'
import { setInstitutionName, type AdminInstitution } from '@/lib/hnt-admin'
import { updateInstitution } from '@/lib/use-institutions'

/**
 * Cambiar el nombre del liceo (setInstitutionName, solo HNT): el corto, que
 * se ve en el Inicio y los correos, y el completo. El id no cambia, así que
 * cuentas, Halls y Calendar siguen igual.
 */
export function NamePanel({ institution }: { institution: AdminInstitution }) {
  const [name, setName] = useState(institution.name)
  const [fullName, setFullName] = useState(institution.fullName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const changed = name.trim() !== institution.name || fullName.trim() !== institution.fullName
  const nameError = name.trim().length < 2 ? 'Escribe al menos 2 letras.' : undefined

  async function save() {
    setBusy(true)
    setError(null)
    setDone(false)
    try {
      updateInstitution(institution.id, await setInstitutionName(institution.id, name.trim(), fullName.trim()))
      setDone(true)
    } catch (failure) {
      setError(describeError(failure, 'No pudimos cambiar el nombre. Inténtalo nuevamente.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-5 rounded-(--radius-surface) bg-(--surface) p-6 shadow-(--shadow-raised)">
      <div className="flex flex-col gap-1">
        <h2 className="text-(length:--text-lg) font-medium">Nombre</h2>
        <p className="max-w-2xl text-(--text-secondary)">Se ve en el Inicio de la app, en los correos y en este panel. El código de invitación y las cuentas del liceo no cambian.</p>
      </div>
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <Input label="Nombre corto" placeholder="LCH Temuco" value={name} maxLength={40} error={changed ? nameError : undefined} onChange={event => setName(event.target.value)} />
        <Input label="Nombre completo (opcional)" placeholder="Liceo Camilo Henríquez de Temuco" value={fullName} maxLength={120} onChange={event => setFullName(event.target.value)} />
      </div>
      <Alert tone="danger" title="No se guardó" open={!!error}>{error}</Alert>
      <Alert tone="success" title="Listo. Cambiamos el nombre." open={done && !changed} />
      <Button className="self-start" loading={busy} disabled={!changed || !!nameError} onClick={() => void save()}>Guardar nombre</Button>
    </section>
  )
}
