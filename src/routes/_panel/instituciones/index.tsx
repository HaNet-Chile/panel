import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Building2, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Alert } from '@/components/arc/alert/alert'
import { Badge } from '@/components/arc/badge/badge'
import { Button } from '@/components/arc/button/button'
import { EmptyState } from '@/components/arc/empty-state/empty-state'
import { SearchField } from '@/components/arc/search-field/search-field'
import { Skeleton } from '@/components/arc/skeleton/skeleton'
import { InstitutionMark } from '@/components/admin/institution-mark'
import { plural } from '@/lib/hnt-admin'
import { reloadInstitutions, useInstitutions } from '@/lib/use-institutions'

export const Route = createFileRoute('/_panel/instituciones/')({
  component: InstitutionsPage,
})

function InstitutionsPage() {
  const { institutions, loading, loaded, error } = useInstitutions()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    if (!term) return institutions
    return institutions.filter(item => `${item.name} ${item.fullName}`.toLocaleLowerCase('es').includes(term))
  }, [institutions, search])

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-(length:--text-3xl) leading-(--leading-display) font-medium tracking-(--tracking-display)">Instituciones</h1>
          <p className="text-(--text-secondary)">Códigos de invitación, nóminas y roles de cada institución.</p>
        </div>
        <Button onClick={() => void navigate({ to: '/instituciones/preparar' })}>Nueva institución</Button>
      </div>

      <Alert tone="danger" title="No pudimos cargar las instituciones" open={!!error}>
        {error}{' '}
        <button type="button" className="font-medium text-(--foreground) underline underline-offset-2" onClick={() => void reloadInstitutions()}>Reintentar</button>
      </Alert>

      {!loaded && loading && <Skeleton label="Cargando instituciones" lines={4} avatar />}

      {loaded && institutions.length === 0 && (
        <EmptyState
          icon={<Building2 />}
          title="Todavía no hay instituciones"
          description="Crea la primera: el asistente te lleva por el código, la nómina y lo demás."
          action={<Button variant="secondary" onClick={() => void navigate({ to: '/instituciones/preparar' })}>Nueva institución</Button>}
        />
      )}

      {institutions.length > 0 && (
        <div className="flex flex-col gap-4">
          {institutions.length > 5 && (
            <SearchField label="Buscar institución" value={search} onValueChange={setSearch} placeholder="Nombre o nombre completo" />
          )}
          <ul className="flex flex-col overflow-hidden rounded-(--radius-surface) bg-(--surface) shadow-(--shadow-raised)">
            {filtered.map(institution => (
              <li key={institution.id} className="border-b border-(--border-subtle) last:border-b-0">
                <Link
                  to="/instituciones/$institutionId"
                  params={{ institutionId: institution.id }}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors duration-(--duration-fast) hover:bg-(--surface-muted)"
                >
                  <InstitutionMark institution={institution} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{institution.name}</span>
                    {!!institution.fullName && <span className="truncate text-(length:--text-sm) text-(--text-secondary)">{institution.fullName}</span>}
                  </span>
                  <span className="hidden items-center gap-2 sm:flex">
                    {institution.closure?.active && <Badge size="sm" tone="warning">Cerrada</Badge>}
                    {institution.rosterCount === 0 && <Badge size="sm">Nómina vacía</Badge>}
                    {!institution.hasInviteCode && <Badge size="sm">Sin código</Badge>}
                    {institution.rosterCount > 0 && <span className="w-28 text-right whitespace-nowrap text-(length:--text-sm) tabular-nums text-(--text-secondary)">{plural(institution.rosterCount, 'persona', 'personas')}</span>}
                  </span>
                  <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-(--text-muted) transition-transform duration-(--duration-fast) group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </Link>
              </li>
            ))}
          </ul>
          {filtered.length === 0 && <p className="text-(--text-secondary)">Ninguna institución coincide con esa búsqueda.</p>}
        </div>
      )}

    </div>
  )
}
