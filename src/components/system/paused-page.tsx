import type { ReactNode } from 'react'
import arrowIcon from '@/assets/errors/arrow-right.svg'
import serverIcon from '@/assets/errors/server.svg'
import sunsetIcon from '@/assets/errors/sea-and-sun.svg'
import { PAUSE_SCREEN, backAt, institutionPauseScreen, opensAt, type AppStatus } from '@/lib/app-status'

const STATUS_PAGE = 'status.hanet.muxp.art'

/**
 * La pantalla de cierre, igual a PausedScreen de la app (diseño "ERRORES DE
 * APP" de Figma): tarjeta rosa con ícono, título grande y explicación, una
 * nota y dos botones. "Cerrado por ahora" usa la tarjeta atardecer. Sin
 * acciones (compact), es la vista previa de la página Estado.
 */
export function PausedPage({ status, actions, compact = false }: { status: AppStatus; actions?: ReactNode; compact?: boolean }) {
  const kind = status.kind ?? 'maintenance'
  // Un solo liceo cerrado: su nombre en el texto, y la página de estado no ayuda ahí (el liceo sí).
  const institution = typeof status.institutionName === 'string'
  const copy = institution ? institutionPauseScreen(kind, status.institutionName ?? '') : PAUSE_SCREEN[kind]
  const sunset = kind === 'closed'
  return (
    <div className={`mx-auto flex w-full max-w-[480px] flex-col gap-3 ${compact ? 'p-3' : 'min-h-svh p-3 sm:py-10'}`}>
      <div
        className={`flex flex-col justify-between gap-10 rounded-[32px] p-8 text-(--hn-text-on-light) ${compact ? '' : 'flex-1'}`}
        style={{ background: sunset ? 'linear-gradient(-39deg, var(--hn-accent) 49.7%, var(--hn-sunset) 129.2%)' : 'var(--hn-accent)' }}
      >
        {kind === 'incident'
          ? <span aria-hidden="true" className="text-[36px] leading-none font-medium">:/</span>
          : <img src={sunset ? sunsetIcon : serverIcon} alt="" width={35} height={35} className="size-[35px]" />}
        <div className="flex flex-col gap-6">
          <h1 className={`${compact ? 'text-[34px]' : 'text-[44px]'} leading-[1.2] font-medium tracking-[-0.05em]`}>{copy.title}</h1>
          <hr className="border-(--hn-text-on-light) opacity-60" />
          <p className="text-base leading-normal font-medium">{status.message || copy.body}</p>
        </div>
      </div>
      <div className="rounded-[32px] bg-(--hn-accent) p-8 text-base leading-normal font-medium text-(--hn-text-on-light)">
        {institution ? (
          <>{status.until ? `${opensAt(status.until)} ` : ''}Si tienes dudas, pregunta en tu liceo.</>
        ) : (
          <>
            {status.until ? `${backAt(status.until)} ` : ''}
            Mantente al tanto de errores e interrupciones de la red HaNet en{' '}
            <a className="font-bold underline" href={`https://${STATUS_PAGE}`} target="_blank" rel="noreferrer">{STATUS_PAGE}</a>
          </>
        )}
      </div>
      {actions}
    </div>
  )
}

/** Los dos botones en píldora de la pantalla: el de la izquierda gris azulado, el de la derecha claro con flecha. */
export function PausedActions({ left, right }: { left: { label: string; onClick: () => void; disabled?: boolean }; right: { label: string; onClick: () => void } }) {
  return (
    <div className="flex gap-3 px-1">
      <button type="button" onClick={left.onClick} disabled={left.disabled} className="h-14 flex-128 rounded-full bg-(--hn-surface-raised) px-6 font-semibold text-(--hn-text-primary) disabled:opacity-60">
        {left.label}
      </button>
      <button type="button" onClick={right.onClick} className="flex h-14 flex-221 items-center justify-center gap-3 rounded-full bg-(--hn-control-active) px-6 font-semibold text-(--hn-text-on-light)">
        {right.label}
        <img src={arrowIcon} alt="" width={24} height={24} className="size-6" />
      </button>
    </div>
  )
}
