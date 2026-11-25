import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEMO } from '@/lib/demo'
import { describeError } from '@/lib/errors'
import { auth } from '@/lib/firebase'
import { endPanelSession, getPanelAuth, verifyPanelSignIn, type PanelAuthInfo, type SecondStepMethod } from '@/lib/panel-auth'

// Roles de HaNet que entran al panel (los mismos de functions/members.js).
// `Estudiante` no tiene acceso.
export type PanelRole = 'HNT' | 'Admin' | 'Profesor' | 'Directiva' | 'CEE'

export const PANEL_ROLES: PanelRole[] = ['HNT', 'Admin', 'Profesor', 'Directiva', 'CEE']

export const ROLE_LABEL: Record<PanelRole, string> = {
  HNT: 'Equipo HaNet',
  Admin: 'Administración',
  Profesor: 'Docente',
  Directiva: 'Directiva de curso',
  CEE: 'Centro de estudiantes',
}

/** Lo que el panel usa de la cuenta. En producción es el `User` de Firebase. */
export type PanelUser = Pick<User, 'uid' | 'email' | 'displayName'>

/**
 * El segundo paso de este inicio de sesión. `none`: la cuenta no tiene rol de
 * panel, así que no hay nada que confirmar. `needed`: falta el código.
 */
export type SecondStep = 'none' | 'needed' | 'verified'

export type AuthState = {
  user: PanelUser | null
  role: PanelRole | null
  courseId: string | null
  ready: boolean
  secondStep: SecondStep
  /** Métodos e institución de la cuenta. Null mientras no carga o si falló. */
  panel: PanelAuthInfo | null
  /** Por qué no se pudo leer el segundo paso (sin conexión, por ejemplo). */
  panelError: string | null
  login: (email: string, password: string) => Promise<void>
  confirmSecondStep: (method: SecondStepMethod, code: string) => Promise<void>
  /** Vuelve a leer los métodos (después de agregar o quitar la app). */
  refreshPanel: () => Promise<void>
  /** Solo en la demo: entrar con un rol sin cuenta. */
  loginAs?: (role: PanelRole) => void
  logout: () => Promise<void>
}

type Session = Pick<AuthState, 'user' | 'role' | 'courseId' | 'ready' | 'secondStep' | 'panel' | 'panelError'>

const AuthContext = createContext<AuthState | null>(null)

function readRole(value: unknown): PanelRole | null {
  return PANEL_ROLES.includes(value as PanelRole) ? (value as PanelRole) : null
}

const signedOut: Session = { user: null, role: null, courseId: null, ready: true, secondStep: 'none', panel: null, panelError: null }

async function readPanel(): Promise<Pick<Session, 'secondStep' | 'panel' | 'panelError'>> {
  try {
    const panel = await getPanelAuth()
    return { panel, secondStep: panel.verified ? 'verified' : 'needed', panelError: null }
  } catch (error) {
    return { panel: null, secondStep: 'needed', panelError: describeError(error, 'No pudimos revisar tu inicio de sesión. Inténtalo nuevamente.') }
  }
}

// Rol y curso vienen de los claims `role` y `courseId`, que sincroniza la
// función syncMyClaims del backend. El cliente nunca los decide.
function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Session>({ ...signedOut, ready: false })

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState(signedOut)
        return
      }
      const token = await user.getIdTokenResult()
      const courseId = typeof token.claims.courseId === 'string' ? token.claims.courseId : null
      const role = readRole(token.claims.role)
      // Sin rol de panel no hay segundo paso: el layout muestra "sin acceso".
      const panel = role ? await readPanel() : { secondStep: 'none' as const, panel: null, panelError: null }
      setState({ user, role, courseId, ready: true, ...panel })
    })
  }, [])

  const value: AuthState = {
    ...state,
    login: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password)
    },
    confirmSecondStep: async (method, code) => {
      await verifyPanelSignIn(method, code)
      const panel = await readPanel()
      setState(current => ({ ...current, ...panel }))
    },
    refreshPanel: async () => {
      const panel = await readPanel()
      setState(current => ({ ...current, ...panel }))
    },
    logout: async () => {
      // Que este inicio de sesión deje de contar como confirmado, aunque falle la red.
      if (state.secondStep === 'verified') await endPanelSession().catch(() => undefined)
      await signOut(auth)
    },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

const DEMO_NAMES: Record<PanelRole, string> = {
  HNT: 'Camila Rojas',
  Admin: 'Rodrigo Álvarez',
  Profesor: 'Paula Sepúlveda',
  Directiva: 'Valentina Muñoz',
  CEE: 'Josefa Navarro',
}

function demoSession(role: PanelRole): Session {
  const displayName = DEMO_NAMES[role]
  const email = `${displayName.split(' ')[0].toLowerCase()}@demo.hanet.muxp.art`
  const courseId = role === 'HNT' || role === 'Admin' || role === 'Profesor' ? null : 'Segundo Medio K'
  const panel: PanelAuthInfo = {
    verified: true,
    verifiedUntil: Date.now() + 7 * 86_400_000,
    totp: false,
    backupCodesLeft: 0,
    email: `${email.slice(0, 2)}****@demo.hanet.muxp.art`,
    institution: role === 'HNT' ? null : { id: 'lch', name: 'LCH Temuco' },
  }
  return { user: { uid: `demo-${role}`, email, displayName }, role, courseId, ready: true, secondStep: 'verified', panel, panelError: null }
}

function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Session>(() => demoSession('HNT'))
  const value: AuthState = {
    ...state,
    // Con correo y contraseña, la demo muestra el segundo paso (cualquier código sirve).
    login: async () => setState({ ...demoSession('HNT'), secondStep: 'needed' }),
    confirmSecondStep: async () => setState(current => ({ ...current, secondStep: 'verified' })),
    refreshPanel: async () => {
      const panel = (await getPanelAuth()) as PanelAuthInfo
      setState(current => ({ ...current, panel: { ...panel, institution: current.panel?.institution ?? null } }))
    },
    loginAs: role => setState(demoSession(role)),
    logout: async () => setState(signedOut),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const AuthProvider = DEMO ? DemoAuthProvider : FirebaseAuthProvider

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
