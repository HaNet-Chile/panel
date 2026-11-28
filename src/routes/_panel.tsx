import { createFileRoute, Link, Outlet, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Lock, LogOut } from 'lucide-react'
import { Avatar } from '@/components/arc/avatar/avatar'
import { Button } from '@/components/arc/button/button'
import { EmptyState } from '@/components/arc/empty-state/empty-state'
import { HanetLogo } from '@/components/brand/logo'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { ROLE_LABEL, useAuth } from '@/lib/auth'
import { navFor } from '@/lib/nav'
import { Alert } from '@/components/arc/alert/alert'
import { PausedActions, PausedPage } from '@/components/system/paused-page'
import { closureAsStatus, passesInstitutionClosure, useAppStatus } from '@/lib/app-status'

export const Route = createFileRoute('/_panel')({
  beforeLoad: ({ context }) => {
    // Sin el segundo paso, /login lo pide (las funciones de Administración también lo exigen).
    if (!context.auth.user || context.auth.secondStep === 'needed') throw redirect({ to: '/login' })
  },
  component: PanelLayout,
})

function PanelLayout() {
  const { user, role, courseId, logout, panel } = useAuth()
  const { status, refresh } = useAppStatus(role === 'HNT' ? null : panel?.institution?.id)
  const [retrying, setRetrying] = useState(false)

  if (!role) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4">
        <EmptyState
          icon={<Lock />}
          title="Tu cuenta no tiene acceso al panel"
          description={`${user?.email ?? 'Esta cuenta'} no tiene un rol de docente, directiva o equipo HaNet. El equipo HaNet asigna los roles desde el Panel HNT.`}
          action={
            <Button variant="secondary" onClick={logout}>
              Cerrar sesión
            </Button>
          }
        />
      </main>
    )
  }

  // HaNet cerrado al público (página Estado): solo el equipo HaNet sigue
  // entrando. Cerrado en el liceo: también su Administración (y sus docentes, si el cierre lo dice).
  const closedHere = status?.institution?.closed && !passesInstitutionClosure(role, status.institution) ? status.institution : null
  if (status && ((!status.open && role !== 'HNT') || closedHere)) {
    return (
      <main className="bg-(--background)">
        <PausedPage
          status={!status.open ? status : closureAsStatus(closedHere!)}
          actions={
            <PausedActions
              left={{
                label: retrying ? 'Probando…' : 'Reintentar',
                disabled: retrying,
                onClick: () => {
                  setRetrying(true)
                  void refresh().finally(() => setRetrying(false))
                },
              }}
              right={{ label: 'Cerrar sesión', onClick: () => void logout() }}
            />
          }
        />
      </main>
    )
  }

  const name = user?.displayName || user?.email || 'HaNet'

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-5 py-6">
          <HanetLogo />
        </SidebarHeader>
        <SidebarContent>
          {navFor(role, courseId).map(group => (
            <SidebarGroup key={group.label ?? 'inicio'}>
              {group.label && (
                <SidebarGroupLabel className="px-3 text-(length:--text-xs) font-medium tracking-wide text-(--text-muted) uppercase">{group.label}</SidebarGroupLabel>
              )}
              <SidebarMenu className="gap-1">
                {group.items.map(item => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      className="h-10 rounded-(--radius-control) px-3 text-(length:--text-sm) text-(--text-secondary) data-[status=active]:bg-sidebar-accent data-[status=active]:text-(--foreground) data-[status=active]:[&_svg]:text-(--accent)"
                      render={<Link to={item.to} activeOptions={{ exact: item.to === '/' }} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter className="gap-3 p-4">
          <div className="flex items-center gap-3 px-1">
            <Avatar name={name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-(length:--text-sm)">{user?.email}</p>
              <p className="text-(length:--text-xs) text-(--text-muted)">{ROLE_LABEL[role]}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="size-4" /> Cerrar sesión
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="hn-atmosphere min-w-0">
        <header className="flex h-14 items-center px-4 md:hidden">
          <SidebarTrigger aria-label="Abrir menú" />
        </header>
        <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-10 md:py-12">
          {status && !status.open && (
            <Alert tone="warning" title="HaNet está cerrado al público" className="mb-6">
              Tú entras por ser del equipo HaNet. <Link to="/estado" className="underline">Abrir o cambiar el aviso</Link>
            </Alert>
          )}
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
