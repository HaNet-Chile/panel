import { call } from '@/lib/callable'

// El segundo paso para entrar al panel (hanetcl functions/panel-auth.js).
// Después de la contraseña, cada inicio de sesión se confirma con un código
// del correo, de una app de autenticación o de respaldo. El backend lo ata a
// ese inicio de sesión: entrar de nuevo, desde donde sea, vuelve a pedirlo.

export type PanelAuthInfo = {
  verified: boolean
  verifiedUntil: number | null
  /** Tiene una app de autenticación. */
  totp: boolean
  backupCodesLeft: number
  /** El correo de la cuenta, con parte tapada ("pa****@liceo.cl"). */
  email: string | null
  institution: { id: string; name: string } | null
}

export type SecondStepMethod = 'email' | 'totp' | 'backup'

export function getPanelAuth() {
  return call<void, PanelAuthInfo>('getPanelAuth')(undefined)
}

export function sendPanelEmailCode() {
  return call<void, { sentTo: string | null; minutes: number; resendInSeconds: number }>('sendPanelEmailCode')(undefined)
}

export function verifyPanelSignIn(method: SecondStepMethod, code: string) {
  return call<{ method: SecondStepMethod; code: string }, { verified: true; verifiedUntil: number }>('verifyPanelSignIn')({ method, code })
}

export function startPanelTotp() {
  return call<void, { secret: string; uri: string }>('startPanelTotp')(undefined)
}

export async function confirmPanelTotp(code: string) {
  return (await call<{ code: string }, { backupCodes: string[] }>('confirmPanelTotp')({ code })).backupCodes
}

export async function disablePanelTotp() {
  await call('disablePanelTotp')(undefined)
}

export async function newPanelBackupCodes() {
  return (await call<void, { backupCodes: string[] }>('newPanelBackupCodes')(undefined)).backupCodes
}

export async function endPanelSession() {
  await call('endPanelSession')(undefined)
}
