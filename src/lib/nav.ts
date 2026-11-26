import {
  Building2, CalendarCheck, Power, CalendarDays, ClipboardCheck, GraduationCap, LayoutDashboard, School, ShieldCheck, UsersRound,
  type LucideIcon,
} from 'lucide-react'
import type { PanelRole } from '@/lib/auth'

export type NavItem = {
  to: '/' | '/instituciones' | '/institucion' | '/directivas' | '/halls' | '/revisar' | '/eventos' | '/calendario' | '/seguridad' | '/estado'
  label: string
  icon: LucideIcon
  roles: PanelRole[]
  /** Solo si la cuenta tiene curso (el Calendar es por curso). */
  needsCourse?: boolean
}

/** Cada área del panel, en el orden del menú. Una cuenta ve las áreas de su rol. */
export type NavGroup = { label: string | null; items: NavItem[] }

export const STAFF_ROLES: PanelRole[] = ['HNT', 'Admin', 'Profesor', 'Directiva', 'CEE']

/** Los que pueden hacer Halls (TEACHER_ROLES de functions/classhall.js). */
export const TEACHER_ROLES: PanelRole[] = ['Profesor', 'Admin', 'HNT']

/** Publican eventos (INSTITUTION_EDITORS de functions/events.js); los de la ciudad, solo HNT. */
export const EVENT_ROLES: PanelRole[] = ['CEE', 'Admin', 'HNT']

/** Editan el Calendar del curso (canEditCourse de firestore.calendar.rules). */
export const CALENDAR_ROLES: PanelRole[] = ['Directiva', 'CEE', 'Admin', 'HNT']

export const navGroups: NavGroup[] = [
  { label: null, items: [{ to: '/', label: 'Inicio', icon: LayoutDashboard, roles: STAFF_ROLES }] },
  {
    label: 'HaNet Team',
    items: [
      { to: '/instituciones', label: 'Instituciones', icon: Building2, roles: ['HNT'] },
      { to: '/estado', label: 'Estado de HaNet', icon: Power, roles: ['HNT'] },
    ],
  },
  {
    label: 'Administración',
    items: [{ to: '/institucion', label: 'Mi institución', icon: School, roles: ['Admin'] }],
  },
  {
    label: 'Docente',
    items: [
      { to: '/halls', label: 'Mis Halls', icon: GraduationCap, roles: TEACHER_ROLES },
      { to: '/revisar', label: 'Por revisar', icon: ClipboardCheck, roles: TEACHER_ROLES },
    ],
  },
  {
    label: 'Comunidad',
    items: [
      { to: '/eventos', label: 'Eventos', icon: CalendarDays, roles: EVENT_ROLES },
      { to: '/directivas', label: 'Directivas de curso', icon: UsersRound, roles: ['CEE'] },
      { to: '/calendario', label: 'Calendar del curso', icon: CalendarCheck, roles: CALENDAR_ROLES, needsCourse: true },
    ],
  },
  {
    label: 'Cuenta',
    items: [{ to: '/seguridad', label: 'Seguridad', icon: ShieldCheck, roles: STAFF_ROLES }],
  },
]

/** Las áreas que ve una cuenta, sin las que le quedan vacías. */
export function navFor(role: PanelRole, courseId: string | null) {
  return navGroups
    .map(group => ({ ...group, items: group.items.filter(item => item.roles.includes(role) && (!item.needsCourse || !!courseId)) }))
    .filter(group => group.items.length > 0)
}
