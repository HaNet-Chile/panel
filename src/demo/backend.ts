// Backend falso del modo demo. Responde con la misma forma que las Cloud
// Functions reales. Los nombres y RUT son inventados.
import type { AdminInstitution, Member, MemberRole, RosterRow } from '@/lib/hnt-admin'
import { classhallCall } from './classhall'
import { eventsCall } from './events'

const now = Date.now()
const day = 86_400_000

const institutions: AdminInstitution[] = [
  { id: 'lch', name: 'LCH Temuco', fullName: 'Liceo Camilo Henríquez de Temuco', rosterCount: 1184, hasInviteCode: true, inviteUpdatedAt: now - 9 * day, logoUrl: null, bannerUrl: null, cityId: 'temuco', modules: ['feed', 'polls', 'alliances', 'electividad', 'grades'] },
  { id: 'insuco', name: 'Insuco Padre Las Casas', fullName: 'Instituto Comercial de Padre Las Casas', rosterCount: 742, hasInviteCode: true, inviteUpdatedAt: now - 30 * day, logoUrl: null, bannerUrl: null },
  { id: 'araucania', name: 'Colegio Araucanía Verde', fullName: 'Colegio Araucanía Verde', rosterCount: 315, hasInviteCode: false, inviteUpdatedAt: null, logoUrl: null, bannerUrl: null },
  { id: 'pehuen', name: 'Colegio Valle Pehuén', fullName: 'Colegio Valle Pehuén', rosterCount: 0, hasInviteCode: false, inviteUpdatedAt: null, logoUrl: null, bannerUrl: null, modules: ['feed'] },
]

const members: Record<string, Member[]> = {
  lch: [
    { rut: '21.345.678-9', fullName: 'Camila Rojas Fuentes', curso: 'Segundo Medio K', email: 'camila.rojas@liceo.cl', uid: 'u1', role: 'HNT' },
    { rut: '21.456.789-0', fullName: 'Tomás Herrera Soto', curso: 'Segundo Medio K', email: 'tomas.herrera@liceo.cl', uid: 'u2', role: 'Estudiante' },
    { rut: '21.567.890-1', fullName: 'Valentina Muñoz Lagos', curso: 'Segundo Medio K', email: 'valentina.munoz@liceo.cl', uid: 'u3', role: 'Directiva' },
    { rut: '21.678.901-2', fullName: 'Benjamín Castro Vera', curso: 'Tercero Medio A', email: 'benjamin.castro@liceo.cl', uid: null, role: null },
    { rut: '12.789.012-3', fullName: 'Paula Sepúlveda Ríos', curso: 'Docente', email: 'paula.sepulveda@liceo.cl', uid: 'u5', role: 'Profesor' },
    { rut: '21.890.123-4', fullName: 'Ignacio Pérez Díaz', curso: 'Tercero Medio A', email: 'ignacio.perez@liceo.cl', uid: 'u6', role: 'Estudiante', blocked: true },
    { rut: '21.901.234-5', fullName: 'Josefa Navarro Paredes', curso: 'Cuarto Medio B', email: 'josefa.navarro@liceo.cl', uid: 'u7', role: 'CEE' },
    { rut: '13.012.345-6', fullName: 'Rodrigo Álvarez Mella', curso: 'Docente', email: 'rodrigo.alvarez@liceo.cl', uid: 'u8', role: 'Admin' },
  ],
}

const WORDS = ['araucaria', 'volcán', 'lluvia', 'copihue', 'río', 'nieve', 'pewen', 'cerro', 'lago', 'brasa']
const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)]
const wait = () => new Promise(resolve => setTimeout(resolve, 350 + Math.random() * 300))

function findMember(uid: string) {
  for (const list of Object.values(members)) {
    const member = list.find(item => item.uid === uid)
    if (member) return member
  }
  throw Object.assign(new Error('No encontramos a esa persona.'), { code: 'functions/not-found' })
}

type Data = Record<string, unknown>

const demoPanel = { totp: false, backup: 0 }

export async function demoCall(name: string, data: unknown): Promise<unknown> {
  await wait()
  const input = (data ?? {}) as Data
  switch (name) {
    case 'adminListInstitutions':
      return { institutions: institutions.map(item => ({ ...item })) }
    case 'adminCreateInstitution': {
      const id = `demo-${institutions.length + 1}`
      institutions.push({ id, name: String(input.name), fullName: String(input.fullName), rosterCount: 0, hasInviteCode: false, inviteUpdatedAt: null, logoUrl: null, bannerUrl: null })
      return { id }
    }
    case 'adminRotateInviteCode': {
      const item = institutions.find(entry => entry.id === input.institutionId)
      if (item) Object.assign(item, { hasInviteCode: true, inviteUpdatedAt: Date.now() })
      return { words: [pick(), pick(), pick(), pick()] }
    }
    case 'adminImportRoster': {
      const rows = (input.rows as RosterRow[]) ?? []
      const rejected = rows.flatMap((row, index) => (!row.rut || !row.nombres ? [{ row: index + 1, reason: 'Falta el RUT o el nombre.' }] : []))
      const item = institutions.find(entry => entry.id === input.institutionId)
      const imported = rows.length - rejected.length
      if (item) item.rosterCount += imported
      const list = (members[String(input.institutionId)] ??= [])
      rows.filter(row => row.rut && row.nombres).forEach(row => list.push({ rut: row.rut, fullName: `${row.nombres} ${row.apellidos}`.trim(), curso: row.curso, email: row.email, uid: null, role: null }))
      return { imported, rejected, rejectedCount: rejected.length }
    }
    case 'setInstitutionModules': {
      const item = institutions.find(entry => entry.id === input.institutionId)
      if (item) item.modules = input.modules as AdminInstitution['modules']
      return { modules: input.modules }
    }
    // TEMPORAL hasta mezclar la rama del cierre por liceo.
    case 'setInstitutionClosure': {
      const item = institutions.find(entry => entry.id === input.institutionId)
      const closure = input.closed ? { kind: input.kind as 'closed', message: (input.message as string) ?? null, from: null, until: null, teachers: !!input.teachers, active: true } : null
      if (item) item.closure = closure
      return { closure }
    }
    case 'setInstitutionCity': {
      const item = institutions.find(entry => entry.id === input.institutionId)
      if (item) item.cityId = (input.cityId as string | null) ?? null
      return { cityId: input.cityId ?? null }
    }
    case 'adminSetInstitutionBranding': {
      const item = institutions.find(entry => entry.id === input.institutionId)
      if (item) item[input.kind === 'logo' ? 'logoUrl' : 'bannerUrl'] = (input.url as string | null) ?? null
      return { kind: input.kind, url: input.url }
    }
    case 'adminListMembers':
      return { members: (members[String(input.institutionId)] ?? []).map(item => ({ ...item })), truncated: false }
    case 'adminSetRole':
      findMember(String(input.uid)).role = input.role as MemberRole
      return {}
    case 'adminSetPendingRole': {
      const member = (members[String(input.institutionId)] ?? []).find(item => item.rut.replace(/[^0-9kK]/g, '').toUpperCase() === String(input.rut).replace(/[^0-9kK]/g, '').toUpperCase())
      if (!member) throw Object.assign(new Error('Esa persona no está en la nómina.'), { code: 'functions/not-found' })
      member.pendingRole = (input.role as MemberRole | null) ?? null
      return { pendingRole: member.pendingRole }
    }
    case 'adminSetBlocked':
      findMember(String(input.uid)).blocked = Boolean(input.blocked)
      return {}
    case 'adminUnlinkMember': {
      const member = findMember(String(input.uid))
      Object.assign(member, { uid: null, role: null, blocked: false })
      return {}
    }
    // Segundo paso del panel (panel-auth.js). La demo entra ya confirmada.
    case 'getPanelAuth':
      return { verified: true, verifiedUntil: Date.now() + 7 * day, totp: demoPanel.totp, backupCodesLeft: demoPanel.totp ? demoPanel.backup : 0, email: 'de****@demo.hanet.muxp.art', institution: null }
    case 'startPanelTotp':
      return { secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', uri: 'otpauth://totp/HaNet:demo?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=HaNet' }
    case 'confirmPanelTotp':
    case 'newPanelBackupCodes':
      demoPanel.totp = true
      demoPanel.backup = 10
      return { backupCodes: Array.from({ length: 10 }, (_, index) => `demo-${String(2345 + index * 111).slice(0, 4)}`) }
    case 'disablePanelTotp':
      demoPanel.totp = false
      return { totp: false }
    case 'sendPanelEmailCode':
      return { sentTo: 'ca****@demo.hanet.muxp.art', minutes: 10, resendInSeconds: 60 }
    case 'verifyPanelSignIn':
      return { verified: true, verifiedUntil: Date.now() + 7 * day }
    case 'endPanelSession':
      return { ended: true }
    default: {
      const result = classhallCall(name, input) ?? eventsCall(name, input)
      if (result !== undefined) return result
      throw Object.assign(new Error('La demo todavía no tiene esta función.'), { code: 'functions/unimplemented' })
    }
  }
}
