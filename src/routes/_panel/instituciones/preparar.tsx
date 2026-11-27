import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Building2, Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { BrandingPanel } from '@/components/admin/branding-panel'
import { CodePanel } from '@/components/admin/code-panel'
import { RosterPanel } from '@/components/admin/roster-panel'
import { AdminStep, adminsOf, useSetupMembers } from '@/components/admin/setup/admin-step'
import { DatosStep } from '@/components/admin/setup/datos-step'
import { ModulesStep } from '@/components/admin/setup/modules-step'
import { OpenStep } from '@/components/admin/setup/open-step'
import { SETUP_STEPS, isStepId, nextStep, stepIndex, type SetupStepId } from '@/components/admin/setup/steps'
import { Alert } from '@/components/arc/alert/alert'
import { Button } from '@/components/arc/button/button'
import { EmptyState } from '@/components/arc/empty-state/empty-state'
import { Skeleton } from '@/components/arc/skeleton/skeleton'
import { useInstitutions } from '@/lib/use-institutions'

type Search = { id?: string; paso?: SetupStepId }

export const Route = createFileRoute('/_panel/instituciones/preparar')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    id: typeof search.id === 'string' && search.id ? search.id : undefined,
    paso: isStepId(search.paso) ? search.paso : undefined,
  }),
  component: SetupPage,
})

/** Lo que dice cada paso arriba de su contenido. */
const INTRO: Record<SetupStepId, string> = {
  datos: 'El nombre corto es el que se ve en la app. La ciudad da el clima del resumen del día.',
  ano: 'Inicio y fin de clases, y cuándo parte el 2° semestre.',
  modulos: 'La base viene siempre. Elige qué más usará el liceo: un módulo apagado deja de responder en la app.',
  marca: 'Se ven en el inicio de la app, al vincular la cuenta y en los correos. Puedes subirlos después.',
  nomina: 'Estudiantes, docentes y administración, con su correo institucional. Docentes y administración van con el curso "Docente". Se puede cargar por partes.',
  admin: 'Quién administrará el liceo desde el panel. Si todavía no se une a HaNet, el rol se le pone solo cuando se vincule con su correo institucional.',
  codigo: 'Con esta frase, las personas de la nómina se unen desde la app. Mándasela a la administración del liceo.',
  abrir: 'Revisa lo que quedó listo y abre HaNet al liceo.',
}

function SetupPage() {
  const { id, paso } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { institutions, loaded } = useInstitutions()
  const institution = id ? institutions.find(item => item.id === id) : undefined
  const members = useSetupMembers(institution?.id)?.members ?? null
  const extra = { admins: members ? adminsOf(members).length : null }

  const go = (step: SetupStepId, institutionId = id) => void navigate({ search: { id: institutionId, paso: step } })

  const back = (
    <Link to="/instituciones" className="inline-flex w-fit items-center gap-1.5 text-(length:--text-sm) text-(--text-secondary) transition-colors duration-(--duration-fast) hover:text-(--foreground)">
      <ArrowLeft aria-hidden="true" className="size-4" />
      Instituciones
    </Link>
  )

  if (id && !loaded) return <div className="flex flex-col gap-6">{back}<Skeleton label="Cargando institución" lines={4} /></div>
  if (id && !institution) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <EmptyState icon={<Building2 />} title="No encontramos esa institución" description="Puede que el link esté mal o que la hayan eliminado." />
      </div>
    )
  }

  const current: SetupStepId = institution ? paso ?? nextStep(institution, extra) : 'datos'
  const index = stepIndex(current)
  const step = SETUP_STEPS[index]
  const following = SETUP_STEPS[index + 1]?.id
  const previous = index > 0 ? SETUP_STEPS[index - 1].id : null

  let body: ReactNode
  // Pasos que traen su propio botón para guardar: abajo solo va "Seguir".
  let footer = true
  if (!institution) {
    body = <DatosStep institution={undefined} onDone={created => go('ano', created)} />
    footer = false
  } else {
    switch (current) {
      case 'datos':
        body = <DatosStep institution={institution} onDone={() => go('ano')} />
        footer = false
        break
      case 'ano':
        // Año escolar: SchoolYearPanel del hilo del cierre por liceo, al mezclar su rama.
        body = <Alert tone="info" title="Próximamente">El año escolar llega con el cierre por liceo.</Alert>
        break
      case 'modulos':
        body = <ModulesStep key={institution.id} institution={institution} onDone={() => go('marca')} />
        footer = false
        break
      case 'marca':
        body = <BrandingPanel institution={institution} />
        break
      case 'nomina':
        body = <RosterPanel institution={institution} heading={false} />
        break
      case 'admin':
        body = <AdminStep institution={institution} />
        break
      case 'codigo':
        body = <CodePanel institution={institution} heading={false} />
        break
      case 'abrir':
        body = <OpenStep institution={institution} onGo={go} />
        footer = false
        break
    }
  }

  const doneNow = step.done(institution, extra)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        {back}
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-(length:--text-3xl) leading-(--leading-display) font-medium tracking-(--tracking-display)">
            {institution ? `Preparar ${institution.name}` : 'Nueva institución'}
          </h1>
          <p className="text-(--text-secondary)">
            Paso {index + 1} de {SETUP_STEPS.length}. Se guarda en cada paso: puedes salir y seguir después desde la institución.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Pasos" className="lg:sticky lg:top-6 lg:self-start">
          {/* En el teléfono, una barra de avance; en el computador, la lista de pasos. */}
          <div className="flex gap-1 lg:hidden" aria-hidden="true">
            {SETUP_STEPS.map((item, position) => (
              <span key={item.id} className={`h-1 flex-1 rounded-full ${position <= index || item.done(institution, extra) ? 'bg-(--accent)' : 'bg-(--surface-muted)'}`} />
            ))}
          </div>
          <ol className="hidden flex-col gap-0.5 lg:flex">
            {SETUP_STEPS.map((item, position) => {
              const done = item.done(institution, extra)
              const active = item.id === current
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={!institution}
                    aria-current={active ? 'step' : undefined}
                    onClick={() => go(item.id)}
                    className={`flex w-full items-center gap-3 rounded-full px-3 py-2 text-left transition-colors duration-(--duration-fast) disabled:cursor-default ${active ? 'bg-(--surface-muted) text-(--foreground)' : 'text-(--text-secondary) enabled:hover:bg-(--surface-muted) enabled:hover:text-(--foreground)'}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-(length:--text-xs) tabular-nums ${done ? 'bg-(--accent) text-(--accent-foreground)' : active ? 'border border-(--foreground)' : 'border border-(--border)'}`}
                    >
                      {done ? <Check className="size-3.5" /> : position + 1}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{item.label}</span>
                      {item.optional && <span className="text-(length:--text-xs) text-(--text-muted)">Opcional</span>}
                    </span>
                    <span className="sr-only">{done ? ', listo' : ''}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        <section aria-labelledby="paso-actual" className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 id="paso-actual" className="text-(length:--text-xl) font-medium">{step.label}</h2>
            <p className="max-w-prose text-(--text-secondary)">{INTRO[current]}</p>
          </div>

          {body}

          {(footer || (previous && institution)) && (
            <div className="flex flex-wrap items-center gap-3 border-t border-(--border-subtle) pt-6">
              {previous && institution && <Button variant="ghost" onClick={() => go(previous)}>Atrás</Button>}
              {footer && following && (
                <Button variant={doneNow ? 'primary' : 'secondary'} onClick={() => go(following)} className="ml-auto">
                  {doneNow || step.optional ? 'Seguir' : 'Saltar por ahora'}
                </Button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
