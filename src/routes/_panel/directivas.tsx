import { createFileRoute, redirect } from '@tanstack/react-router'
import { School } from 'lucide-react'
import { MembersPanel } from '@/components/admin/members-panel'
import { EmptyState } from '@/components/arc/empty-state/empty-state'
import { useAuth } from '@/lib/auth'

// El CEE nombra a la directiva de cada curso (Estudiante ⇄ Directiva). Ve
// nombre, curso y rol de quienes vincularon su HaNet ID; nunca RUT ni correo.
export const Route = createFileRoute('/_panel/directivas')({
  beforeLoad: ({ context }) => {
    if (context.auth.role !== 'CEE') throw redirect({ to: '/' })
  },
  component: DirectivasPage,
})

function DirectivasPage() {
  const { panel } = useAuth()
  const institution = panel?.institution
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-(length:--text-3xl) leading-(--leading-display) font-medium tracking-(--tracking-display)">Directivas de curso</h1>
        <p className="max-w-2xl text-(--text-secondary)">
          Toca a una persona para nombrarla Directiva de su curso o devolverla a Estudiante. La directiva publica en el Calendar de su curso desde la app.
        </p>
      </header>
      {institution
        ? <MembersPanel institution={institution} />
        : <EmptyState icon={<School />} title="Tu cuenta no está vinculada a una institución" description="Vincúlala desde la app con tu correo institucional." />}
    </div>
  )
}
