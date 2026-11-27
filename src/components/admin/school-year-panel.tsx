import { useState } from 'react'
import { Alert } from '@/components/arc/alert/alert'
import { Button } from '@/components/arc/button/button'
import { Input } from '@/components/arc/input/input'
import { describeError } from '@/lib/errors'
import { setInstitutionSchoolYear, type AdminInstitution, type SchoolYear } from '@/lib/hnt-admin'
import { updateInstitution } from '@/lib/use-institutions'

function dayText(day: string) {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year, month - 1, date, 12).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * El año escolar del liceo (setInstitutionSchoolYear): primer y último día
 * de clases y, si se quiere, el primer día del 2° semestre. Notas corta los
 * semestres ahí, el resumen del día no sale fuera del año escolar y el cierre
 * del liceo puede durar "hasta que empiecen las clases".
 */
export function SchoolYearPanel({ institution }: { institution: AdminInstitution }) {
  const saved = institution.schoolYear ?? null
  const [start, setStart] = useState(saved?.start ?? '')
  const [secondSemester, setSecondSemester] = useState(saved?.secondSemester ?? '')
  const [end, setEnd] = useState(saved?.end ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const endError = start && end && end <= start ? 'Tiene que ser después del primer día de clases.' : undefined
  const secondError = secondSemester && start && end && (secondSemester <= start || secondSemester > end) ? 'Tiene que quedar dentro del año escolar.' : undefined
  const changed = !saved || saved.start !== start || saved.end !== end || (saved.secondSemester ?? '') !== secondSemester
  const ready = !!start && !!end && !endError && !secondError

  async function save(next: SchoolYear | null) {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const schoolYear = await setInstitutionSchoolYear(institution.id, next)
      updateInstitution(institution.id, { schoolYear })
      if (!schoolYear) {
        setStart('')
        setSecondSemester('')
        setEnd('')
      }
      setDone(schoolYear ? 'Listo. Guardamos el año escolar.' : 'Quitamos las fechas del año escolar.')
    } catch (failure) {
      setError(describeError(failure, 'No pudimos guardar el año escolar. Inténtalo nuevamente.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-5 rounded-(--radius-surface) bg-(--surface) p-6 shadow-(--shadow-raised)">
      <div className="flex flex-col gap-1">
        <h2 className="text-(length:--text-lg) font-medium">Año escolar</h2>
        <p className="max-w-2xl text-(--text-secondary)">
          {saved
            ? `Del ${dayText(saved.start)} al ${dayText(saved.end)}${saved.secondSemester ? `. El 2° semestre empieza el ${dayText(saved.secondSemester)}` : ''}.`
            : 'Todavía sin fechas. Mientras tanto, Notas corta los semestres el 1 de agosto.'}
        </p>
      </div>
      <div className="grid max-w-3xl gap-4 sm:grid-cols-3">
        <Input label="Primer día de clases" type="date" value={start} onChange={event => setStart(event.target.value)} />
        <Input label="Empieza el 2° semestre (opcional)" type="date" value={secondSemester} error={secondError} onChange={event => setSecondSemester(event.target.value)} />
        <Input label="Último día de clases" type="date" value={end} error={endError} onChange={event => setEnd(event.target.value)} />
      </div>
      <p className="max-w-2xl text-(length:--text-sm) text-(--text-secondary)">
        Notas corta los semestres en esa fecha, y el resumen del día no sale antes del primer día ni después del último. Las vacaciones de invierno y los feriados siguen en los cambios de día del Calendar.
      </p>
      <Alert tone="danger" title="No se guardó" open={!!error}>{error}</Alert>
      <Alert tone="success" title={done ?? ''} open={!!done} />
      <div className="flex flex-wrap gap-3">
        <Button loading={busy} disabled={!ready || !changed} onClick={() => void save({ start, end, secondSemester: secondSemester || null })}>
          {saved ? 'Guardar cambios' : 'Guardar año escolar'}
        </Button>
        {saved && <Button variant="secondary" disabled={busy} onClick={() => void save(null)}>Quitar las fechas</Button>}
      </div>
    </section>
  )
}
