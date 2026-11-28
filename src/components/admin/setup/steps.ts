import type { AdminInstitution } from '@/lib/hnt-admin'

// Pasos del asistente para preparar una institución nueva. Ninguno guarda su
// propio avance: un paso está hecho si el dato ya existe, así que se puede
// cerrar la pestaña y seguir otro día desde la institución.

export type SetupStepId = 'datos' | 'ano' | 'modulos' | 'marca' | 'nomina' | 'admin' | 'codigo' | 'abrir'

export type SetupStep = {
  id: SetupStepId
  label: string
  /** Se puede dejar para después sin que la institución quede a medias. */
  optional?: boolean
  done: (institution: AdminInstitution | undefined, extra?: SetupExtra) => boolean
}

/** Lo que no viene en la lista de instituciones: cuántas personas son (o serán) Admin. */
export type SetupExtra = { admins: number | null }

export const SETUP_STEPS: SetupStep[] = [
  { id: 'datos', label: 'Nombre y ciudad', done: institution => !!institution?.cityId },
  { id: 'ano', label: 'Año escolar', done: institution => !!institution?.schoolYear },
  { id: 'modulos', label: 'Módulos', done: institution => Array.isArray(institution?.modules) },
  { id: 'marca', label: 'Escudo y banner', optional: true, done: institution => !!institution?.logoUrl },
  { id: 'nomina', label: 'Nómina', done: institution => (institution?.rosterCount ?? 0) > 0 },
  { id: 'admin', label: 'Primer administrador', done: (_institution, extra) => (extra?.admins ?? 0) > 0 },
  { id: 'codigo', label: 'Código e inscripción', done: institution => !!institution?.hasInviteCode },
  { id: 'abrir', label: 'Revisar y abrir', done: institution => !!institution && !institution.closure?.active },
]

export function stepIndex(id: SetupStepId) {
  return SETUP_STEPS.findIndex(step => step.id === id)
}

export function isStepId(value: unknown): value is SetupStepId {
  return SETUP_STEPS.some(step => step.id === value)
}

/** Los pasos obligatorios que faltan, sin contar el de abrir. */
export function missingSteps(institution: AdminInstitution, extra?: SetupExtra) {
  return SETUP_STEPS.filter(step => step.id !== 'abrir' && !step.optional && !(step.id === 'admin' && extra?.admins == null) && !step.done(institution, extra))
}

/** El primer paso sin hacer, para retomar donde quedó. */
export function nextStep(institution: AdminInstitution | undefined, extra?: SetupExtra): SetupStepId {
  if (!institution) return 'datos'
  return SETUP_STEPS.find(step => !step.optional && !step.done(institution, extra))?.id ?? 'abrir'
}
