import { createFileRoute, redirect } from '@tanstack/react-router'
import { School } from 'lucide-react'
import { ClosurePanel } from '@/components/admin/closure-panel'
import { CodePanel } from '@/components/admin/code-panel'
import { InstitutionMark } from '@/components/admin/institution-mark'
import { MembersPanel } from '@/components/admin/members-panel'
import { ModulesPanel } from '@/components/admin/modules-panel'
import { RosterPanel } from '@/components/admin/roster-panel'
import { SchoolYearPanel } from '@/components/admin/school-year-panel'
import { Alert } from '@/components/arc/alert/alert'
import { EmptyState } from '@/components/arc/empty-state/empty-state'
import { Skeleton } from '@/components/arc/skeleton/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/arc/tabs/tabs'
import { plural } from '@/lib/hnt-admin'
import { useInstitutions } from '@/lib/use-institutions'

// Administración: el Admin maneja su propio liceo. adminListInstitutions le
// devuelve solo el suyo, y las funciones revisan que sea de su institución.
export const Route = createFileRoute('/_panel/institucion')({
  beforeLoad: ({ context }) => {
    if (context.auth.role !== 'Admin') throw redirect({ to: '/' })
  },
  component: MyInstitutionPage,
})

function MyInstitutionPage() {
  const { institutions, loaded, error } = useInstitutions()
  const institution = institutions[0]

  if (!loaded) {
    return error
      ? <Alert tone="danger" title="No pudimos cargar tu institución">{error}</Alert>
      : <Skeleton label="Cargando institución" lines={3} avatar />
  }
  if (!institution) {
    return (
      <EmptyState
        icon={<School />}
        title="Tu cuenta no está vinculada a una institución"
        description="Pide al equipo HaNet que revise tu vínculo escribiendo a muxp@muxp.art."
      />
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <InstitutionMark institution={institution} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate font-heading text-(length:--text-3xl) leading-(--leading-display) font-medium tracking-(--tracking-display)">{institution.name}</h1>
          <p className="truncate text-(--text-secondary)">
            {[institution.fullName, plural(institution.rosterCount, 'persona en la nómina', 'personas en la nómina')].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      <Tabs defaultValue="personas">
        <TabsList aria-label="Secciones de tu institución">
          <TabsTrigger value="personas">Personas y roles</TabsTrigger>
          <TabsTrigger value="nomina">Cargar nómina</TabsTrigger>
          <TabsTrigger value="codigo">Código de invitación</TabsTrigger>
          <TabsTrigger value="modulos">Módulos</TabsTrigger>
          <TabsTrigger value="ano">Año y cierre</TabsTrigger>
        </TabsList>
        <TabsContent value="personas"><MembersPanel institution={institution} /></TabsContent>
        <TabsContent value="nomina"><RosterPanel institution={institution} /></TabsContent>
        <TabsContent value="codigo"><CodePanel institution={institution} /></TabsContent>
        <TabsContent value="modulos"><ModulesPanel institution={institution} readOnly /></TabsContent>
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
