import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Building2 } from 'lucide-react'
import { BrandingPanel } from '@/components/admin/branding-panel'
import { ClosurePanel } from '@/components/admin/closure-panel'
import { CodePanel } from '@/components/admin/code-panel'
import { InstitutionMark } from '@/components/admin/institution-mark'
import { MembersPanel } from '@/components/admin/members-panel'
import { ModulesPanel } from '@/components/admin/modules-panel'
import { NamePanel } from '@/components/admin/name-panel'
import { RosterPanel } from '@/components/admin/roster-panel'
import { SchoolYearPanel } from '@/components/admin/school-year-panel'
import { Alert } from '@/components/arc/alert/alert'
import { Button } from '@/components/arc/button/button'
import { EmptyState } from '@/components/arc/empty-state/empty-state'
import { missingSteps } from '@/components/admin/setup/steps'
import { Skeleton } from '@/components/arc/skeleton/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/arc/tabs/tabs'
import { plural, type AdminInstitution } from '@/lib/hnt-admin'
import { useInstitutions } from '@/lib/use-institutions'

export const Route = createFileRoute('/_panel/instituciones/$institutionId')({
  component: InstitutionPage,
})

function InstitutionPage() {
  const { institutionId } = Route.useParams()
  const { institutions, loaded } = useInstitutions()
  const institution = institutions.find(item => item.id === institutionId)

  const back = (
    <Link to="/instituciones" className="inline-flex w-fit items-center gap-1.5 text-(length:--text-sm) text-(--text-secondary) transition-colors duration-(--duration-fast) hover:text-(--foreground)">
      <ArrowLeft aria-hidden="true" className="size-4" />
      Instituciones
    </Link>
  )

  if (!loaded) return <div className="flex flex-col gap-6">{back}<Skeleton label="Cargando institución" lines={3} avatar /></div>
  if (!institution) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <EmptyState icon={<Building2 />} title="No encontramos esa institución" description="Puede que el link esté mal o que la hayan eliminado." />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        {back}
        <div className="flex items-center gap-4">
          <InstitutionMark institution={institution} size="lg" />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="truncate font-heading text-(length:--text-3xl) leading-(--leading-display) font-medium tracking-(--tracking-display)">{institution.name}</h1>
            <p className="truncate text-(--text-secondary)">
              {[institution.fullName, plural(institution.rosterCount, 'persona en la nómina', 'personas en la nómina')].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </div>

      <SetupNotice institution={institution} />

      <Tabs defaultValue="personas">
        <TabsList aria-label="Secciones de la institución">
          <TabsTrigger value="personas">Personas y roles</TabsTrigger>
          <TabsTrigger value="nomina">Cargar nómina</TabsTrigger>
          <TabsTrigger value="codigo">Código de invitación</TabsTrigger>
          <TabsTrigger value="modulos">Módulos</TabsTrigger>
          <TabsTrigger value="marca">Nombre y escudo</TabsTrigger>
          <TabsTrigger value="ano">Año y cierre</TabsTrigger>
        </TabsList>
        <TabsContent value="personas"><MembersPanel institution={institution} /></TabsContent>
        <TabsContent value="nomina"><RosterPanel institution={institution} /></TabsContent>
        <TabsContent value="codigo"><CodePanel institution={institution} /></TabsContent>
        <TabsContent value="modulos"><ModulesPanel institution={institution} /></TabsContent>
        <TabsContent value="marca">
          <div className="flex flex-col gap-6">
            <NamePanel key={`${institution.name}|${institution.fullName}`} institution={institution} />
            <BrandingPanel institution={institution} />
          </div>
        </TabsContent>
        <TabsContent value="ano">
          <div className="flex flex-col gap-6">
            <SchoolYearPanel institution={institution} />
            <ClosurePanel key={institution.closure ? 'cerrado' : 'abierto'} institution={institution} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** Mientras falte algo del asistente (o siga cerrada para prepararla), un atajo para seguir. */
function SetupNotice({ institution }: { institution: AdminInstitution }) {
  const navigate = useNavigate()
  const missing = missingSteps(institution)
  const closed = !!institution.closure?.active
  if (missing.length === 0 && !closed) return null
  const title = missing.length === 0
    ? 'Lista para abrir'
    : missing.length === 1 ? 'Falta 1 paso para dejarla lista' : `Faltan ${missing.length} pasos para dejarla lista`
  return (
    <div className="flex flex-col gap-3">
      <Alert tone={missing.length ? 'info' : 'warning'} title={title}>
        {missing.length ? missing.map(step => step.label).join(', ') + '.' : ''}
        {closed ? ` HaNet sigue cerrado para ${institution.name}.` : ''}
      </Alert>
      <Button size="sm" variant="secondary" className="self-start" onClick={() => void navigate({ to: '/instituciones/preparar', search: { id: institution.id } })}>Continuar la preparación</Button>
    </div>
  )
}
