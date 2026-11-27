import { useState, type FormEvent } from 'react'
import { Alert } from '@/components/arc/alert/alert'
import { Button } from '@/components/arc/button/button'
import { Input } from '@/components/arc/input/input'
import { Select } from '@/components/arc/select/select'
import { CITIES } from '@/lib/cities'
import { describeError } from '@/lib/errors'
import { createInstitution, setInstitutionCity, setInstitutionClosure, type AdminInstitution } from '@/lib/hnt-admin'
import { reloadInstitutions, updateInstitution } from '@/lib/use-institutions'

const CITY_OPTIONS = [...CITIES]
  .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  .map(city => ({ value: city.id, label: city.name }))

/** Primer paso: crea la institución. Si ya existe, solo cambia la ciudad. */
export function DatosStep({ institution, onDone }: { institution: AdminInstitution | undefined; onDone: (id: string) => void }) {
  return institution ? <EditCity institution={institution} onDone={() => onDone(institution.id)} /> : <CreateForm onDone={onDone} />
}

function CreateForm({ onDone }: { onDone: (id: string) => void }) {
  const [name, setName] = useState('')
  const [fullName, setFullName] = useState('')
  const [cityId, setCityId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim().length < 2) return setError('Escribe el nombre corto de la institución.')
    if (!cityId) return setError('Elige la ciudad del liceo.')
    setBusy(true)
    setError(null)
    let id: string
    try {
      id = await createInstitution(name.trim(), fullName.trim())
    } catch (failure) {
      setBusy(false)
      return setError(describeError(failure, 'No pudimos crear la institución.'))
    }
    // Ya existe: si algo de esto falla, el paso que corresponde queda sin
    // marcar (la ciudad aquí, el cierre en "Revisar y abrir") y se reintenta ahí.
    await Promise.allSettled([
      setInstitutionCity(id, cityId),
      // Nace cerrada mientras se prepara. Los docentes pueden entrar a armar sus Halls.
      setInstitutionClosure(id, {
        closed: true,
        kind: 'closed',
        message: `Estamos preparando HaNet para ${fullName.trim() || name.trim()}. Te avisamos cuando abra.`,
        until: null,
        teachers: true,
      }),
    ])
    await reloadInstitutions()
    setBusy(false)
    onDone(id)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nombre corto" value={name} onChange={event => setName(event.target.value)} placeholder="LCH Temuco" description="El que se ve en la app. Hasta 40 caracteres." maxLength={40} disabled={busy} autoFocus />
        <Input label="Nombre completo (opcional)" value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Liceo Camilo Henríquez de Temuco" maxLength={120} disabled={busy} />
      </div>
      <div className="sm:max-w-[calc(50%-0.5rem)]">
        <Select label="Ciudad" placeholder="Elige la ciudad" description="Para el clima del resumen del día." options={CITY_OPTIONS} value={cityId} onValueChange={setCityId} disabled={busy} />
      </div>
      <p className="text-(length:--text-sm) text-(--text-secondary)">
        La institución parte cerrada: mientras la preparas, solo el equipo HaNet y su administración pueden entrar. La abres en el último paso.
      </p>
      <Alert tone="danger" title="No se creó la institución" open={!!error}>{error}</Alert>
      <Button type="submit" loading={busy} className="self-start">Crear y seguir</Button>
    </form>
  )
}

function EditCity({ institution, onDone }: { institution: AdminInstitution; onDone: () => void }) {
  const [cityId, setCityId] = useState(institution.cityId ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const changed = cityId !== (institution.cityId ?? '')

  async function save() {
    if (!cityId) return setError('Elige la ciudad del liceo.')
    if (!changed) return onDone()
    setBusy(true)
    setError(null)
    try {
      updateInstitution(institution.id, { cityId: await setInstitutionCity(institution.id, cityId) })
      onDone()
    } catch (failure) {
      setError(describeError(failure, 'No pudimos guardar la ciudad.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* NOMBRE: NamePanel del hilo del cierre por liceo, al mezclar su rama. */}
      <dl className="flex flex-col gap-1">
        <dt className="text-(length:--text-sm) text-(--text-secondary)">Nombre</dt>
        <dd className="font-medium">{institution.name}{institution.fullName ? <span className="font-normal text-(--text-secondary)"> · {institution.fullName}</span> : null}</dd>
      </dl>
      <div className="sm:max-w-[calc(50%-0.5rem)]">
        <Select label="Ciudad" placeholder="Elige la ciudad" description="Para el clima del resumen del día." options={CITY_OPTIONS} value={cityId} onValueChange={setCityId} disabled={busy} />
      </div>
      <Alert tone="danger" title="No se guardó la ciudad" open={!!error}>{error}</Alert>
      <Button onClick={() => void save()} loading={busy} className="self-start">{changed ? 'Guardar y seguir' : 'Seguir'}</Button>
    </div>
  )
}
