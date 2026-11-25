import { createFileRoute, redirect } from '@tanstack/react-router'
import { collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore'
import { CalendarCheck, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert } from '@/components/arc/alert/alert'
import { Badge } from '@/components/arc/badge/badge'
import { EmptyState } from '@/components/arc/empty-state/empty-state'
import { Skeleton } from '@/components/arc/skeleton/skeleton'
import { useAuth } from '@/lib/auth'
import { DEMO } from '@/lib/demo'
import { describeError } from '@/lib/errors'
import { calendarDb } from '@/lib/firebase'
import { CALENDAR_ROLES } from '@/lib/nav'

// El Calendar del curso, para leerlo en grande. Las reglas de hn-calendar
// dejan leer a quien tiene ese curso en sus claims; crear y editar sigue en
// la app (el panel no escribe en Firestore).
export const Route = createFileRoute('/_panel/calendario')({
  beforeLoad: ({ context }) => {
    const { role, courseId } = context.auth
    if (!role || !CALENDAR_ROLES.includes(role) || !courseId) throw redirect({ to: '/' })
  },
  component: CalendarPage,
})

type CourseEvent = {
  id: string
  title: string
  type: string
  subject: string
  location: string
  start: number
  verified: boolean
  cancelled: boolean
}

const day = 86_400_000

async function loadEvents(courseId: string): Promise<CourseEvent[]> {
  if (DEMO) {
    const now = Date.now()
    return [
      { id: 'd1', title: 'Prueba de funciones', type: 'Evaluación sumativa', subject: 'Matemática', location: 'Sala 12', start: now + day, verified: true, cancelled: false },
      { id: 'd2', title: 'Entrega del ensayo', type: 'Tarea', subject: 'Lengua y Literatura', location: 'ClassHall', start: now + 3 * day, verified: false, cancelled: false },
      { id: 'd3', title: 'Salida a terreno', type: 'Actividad', subject: 'Biología', location: 'Cerro Ñielol', start: now + 8 * day, verified: false, cancelled: false },
    ]
  }
  const since = Timestamp.fromMillis(Date.now() - day)
  const snapshot = await getDocs(query(collection(calendarDb, `HNC-LCH.${courseId}`), where('startDate', '>=', since), orderBy('startDate')))
  return snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      title: String(data.title ?? ''),
      type: String(data.type ?? ''),
      subject: String(data.subject ?? ''),
      location: String(data.location ?? ''),
      start: data.startDate instanceof Timestamp ? data.startDate.toMillis() : 0,
      verified: data.verified === true,
      cancelled: data.cancelled === true,
    }
  })
}

function dayLabel(ms: number) {
  const text = new Date(ms).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  return text.charAt(0).toLocaleUpperCase('es') + text.slice(1)
}

function CalendarPage() {
  const { courseId } = useAuth()
  const [events, setEvents] = useState<CourseEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [today] = useState(() => new Date().toDateString())

  useEffect(() => {
    if (!courseId) return
    let active = true
    loadEvents(courseId)
      .then(list => { if (active) setEvents(list) })
      .catch(failure => { if (active) setError(describeError(failure, 'No pudimos cargar el Calendar. Inténtalo nuevamente.')) })
    return () => { active = false }
  }, [courseId])

  const days = new Map<string, CourseEvent[]>()
  for (const event of events ?? []) {
    const key = new Date(event.start).toDateString()
    days.set(key, [...(days.get(key) ?? []), event])
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-(length:--text-3xl) leading-(--leading-display) font-medium tracking-(--tracking-display)">Calendar del curso</h1>
          {courseId && <Badge>{courseId}</Badge>}
        </div>
        <p className="text-(--text-secondary)">Lo que viene en el curso. Para agregar o cambiar algo, usa el Calendar de la app.</p>
      </header>

      {error && <Alert tone="danger" title="No pudimos cargar el Calendar">{error}</Alert>}
      {!events && !error && <Skeleton label="Cargando el Calendar" lines={5} />}
      {events && events.length === 0 && (
        <EmptyState icon={<CalendarCheck />} title="No hay nada agendado" description="Las evaluaciones, tareas y actividades del curso aparecerán aquí." />
      )}
      {[...days.entries()].map(([key, list]) => (
        <section key={key} className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-medium">
            {dayLabel(list[0].start)}
            {key === today && <Badge tone="info" size="sm">Hoy</Badge>}
          </h2>
          <ul className="flex flex-col divide-y divide-(--border-subtle) overflow-hidden rounded-(--radius-surface) bg-(--surface) shadow-(--shadow-raised)">
            {list.map(event => (
              <li key={event.id} className={`flex flex-col gap-1 px-5 py-4 ${event.cancelled ? 'opacity-60' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-medium ${event.cancelled ? 'line-through' : ''}`}>{event.title}</span>
                  <Badge size="sm">{event.type}</Badge>
                  {event.cancelled && <Badge tone="warning" size="sm">Cancelado</Badge>}
                  {event.verified && (
                    <span className="inline-flex items-center gap-1 text-(length:--text-sm) text-(--success)">
                      <CheckCircle2 aria-hidden="true" className="size-4" /> Confirmado por el docente
                    </span>
                  )}
                </div>
                <p className="text-(length:--text-sm) text-(--text-secondary)">
                  {[new Date(event.start).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }), event.subject, event.location].filter(Boolean).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
