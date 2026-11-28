import '@fontsource-variable/dm-sans/opsz.css'
import type { CSSProperties, ReactNode } from 'react'

// Carrusel "Bienvenidos a HaNet" para redes (4:5), recreado del Figma de muxp
// (archivo 16jIXkcIKhFJPnM38A7qUF, sección "Social new inst."). Se dibuja en
// 914 × 1142 como en Figma y se exporta a 1080 × 1350. Por liceo cambian solo
// el nombre corto y el escudo.

export const SLIDE_WIDTH = 914
export const SLIDE_HEIGHT = 1142

export type PromoData = { name: string; shield: string | null }

const W = SLIDE_WIDTH
const H = SLIDE_HEIGHT
const asset = (file: string) => `${import.meta.env.BASE_URL}promo/${file}`
const FONT = "'DM Sans Variable', 'DM Sans', sans-serif"
const OPSZ: CSSProperties = { fontFamily: FONT, fontVariationSettings: '"opsz" 14' }

function Abs({ style, children }: { style: CSSProperties; children?: ReactNode }) {
  return <div style={{ position: 'absolute', ...style }}>{children}</div>
}

function Img({ src, style }: { src: string; style?: CSSProperties }) {
  return <img alt="" src={asset(src)} draggable={false} style={{ position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%', maxWidth: 'none', ...style }} />
}

/** Una capa girada como las exporta Figma: caja exterior, caja interior centrada y girada, imagen con margen negativo. */
function Rotated({ left, top, width, height, transform, innerWidth, innerHeight, inset, src, center, blend }: {
  left: number; top: number; width: number; height: number; transform: string
  innerWidth: number; innerHeight: number; inset: string; src: string; center?: boolean; blend?: CSSProperties['mixBlendMode']
}) {
  return (
    <Abs style={{ left, top, width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: center ? 'translateX(-50%)' : undefined, mixBlendMode: blend }}>
      <div style={{ flex: 'none', transform }}>
        <div style={{ position: 'relative', width: innerWidth, height: innerHeight }}>
          <div style={{ position: 'absolute', inset }}>
            <Img src={src} style={{ position: 'static' }} />
          </div>
        </div>
      </div>
    </Abs>
  )
}

/** Fondo común: negro con la luz rosa abajo. `icon` agrega la H grande de fondo. */
function Background({ icon }: { icon?: 'tilted' | 'big' }) {
  return (
    <>
      <Rotated left={-677.85} top={H * 0.4 + 170.09} width={1867.289} height={1477.445} transform="rotate(-153.09deg) scaleY(-1)" innerWidth={1688} innerHeight={800} inset="-43.39% -20.56%" src="blob-30.svg" />
      <Rotated left={-863} top={114} width={2481.811} height={2351.929} transform="rotate(-146.7deg) scaleY(-1) skewX(-0.91deg)" innerWidth={1908.422} innerHeight={1577.081} inset="-22.01% -18.19%" src="blob-29.svg" />
      {icon === 'tilted' && <Rotated center blend="hard-light" left={W / 2 + 19.16} top={235} width={1184.315} height={1589.859} transform="rotate(-7.91deg)" innerWidth={991.797} innerHeight={1467.316} inset="-0.54% -0.35%" src="icon-big-1.svg" />}
      {icon === 'big' && <Rotated center left={W * 0.7 + 1.73} top={-99} width={2093.058} height={2454.903} transform="rotate(22.64deg)" innerWidth={1402.514} innerHeight={2074.952} inset="-0.39% -0.25%" src="icon-big.svg" />}
      <Rotated left={-705.83} top={175.19} width={2400.524} height={2094.971} transform="rotate(-153.09deg) scaleY(-1)" innerWidth={2020} innerHeight={1324} inset="-26.22% -17.18%" src="blob-28.svg" />
    </>
  )
}

function Logotype() {
  return <Abs style={{ left: 60, top: 60, width: 143, height: 54 }}><Img src="logotype.svg" /></Abs>
}

function NextButton({ left }: { left: number }) {
  return (
    <Abs style={{ left, top: H * 0.8 + 100.4, width: 126, height: 68, transform: 'rotate(180deg) scaleY(-1)', borderRadius: 360, background: 'var(--hn-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 56, height: 56 }}><Img src="arrow.svg" /></div>
    </Abs>
  )
}

/** Título de paso: número en círculo y título grande, centrados en y = 217,5. */
function StepTitle({ step, children }: { step: 1 | 2 | 3; children: ReactNode }) {
  return (
    <>
      <Abs style={{ left: 60, top: 195, width: 45, height: 45 }}><Img src={`step-${step}.svg`} /></Abs>
      <Abs style={{ ...OPSZ, left: 120, top: 217.5, transform: 'translateY(-50%)', fontSize: 96, fontWeight: 800, lineHeight: 0.783, letterSpacing: -8.64, whiteSpace: 'nowrap', color: 'var(--hn-text-primary)' }}>
        {children}
      </Abs>
    </>
  )
}

function Body({ width, tracking, children }: { width: number; tracking: number; children: ReactNode }) {
  return (
    <Abs style={{ ...OPSZ, left: 60, top: H * 0.2 + 45.6, width, fontSize: 36, fontWeight: 400, lineHeight: 0.941, letterSpacing: tracking, color: 'var(--hn-text-primary)' }}>
      {children}
    </Abs>
  )
}

/** Reemplaza las insignias de tiendas mientras HaNet no está en ellas. */
function WebPill({ style }: { style: CSSProperties }) {
  return (
    <Abs style={{ ...OPSZ, height: 52, padding: '0 24px', borderRadius: 360, background: 'var(--hn-surface)', color: 'var(--hn-text-primary)', fontSize: 24, fontWeight: 600, letterSpacing: -0.6, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', ...style }}>
      app.hanet.muxp.art
    </Abs>
  )
}

function Frame({ children }: { children: ReactNode }) {
  return <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', background: 'var(--hn-promo-ink)' }}>{children}</div>
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]?.toUpperCase()).join('')
}

function Welcome({ name, shield }: PromoData) {
  const hello = `¡Hola ${name}!`
  const helloSize = hello.length > 30 ? Math.max(28, Math.round(48 * 30 / hello.length)) : 48
  return (
    <Frame>
      <Background icon="tilted" />
      <Abs style={{ ...OPSZ, right: W - 854, top: 188, fontSize: helloSize, lineHeight: 'normal', letterSpacing: -3.36 * helloSize / 48, whiteSpace: 'nowrap', textAlign: 'right', color: 'var(--hn-text-primary)' }}>{hello}</Abs>
      <Abs style={{ ...OPSZ, right: W - 854, top: H * 0.2 + 21.6, fontSize: 128, fontWeight: 800, lineHeight: 0.783, letterSpacing: -11.52, whiteSpace: 'nowrap', textAlign: 'right', color: 'var(--hn-text-primary)' }}>
        <p style={{ margin: 0 }}>Bienvenidos</p>
        <p style={{ margin: 0 }}>a <span style={{ color: 'var(--hn-accent)' }}>HaNet</span></p>
      </Abs>
      <Abs style={{ ...OPSZ, right: W - 854, top: H * 0.4 + 15.2, width: 653, fontSize: 33, lineHeight: 0.941, letterSpacing: -2.64, textAlign: 'right', color: 'var(--hn-text-primary)' }}>
        La app para <b style={{ fontWeight: 700 }}>estudiantes</b> que te mantiene al día con tu institución.
      </Abs>
      <Abs style={{ left: 625, top: 577, width: 79, height: 117 }}><Img src="icon.svg" /></Abs>
      <Abs style={{ left: 732, top: 630, width: 9, height: 9 }}><Img src="x.svg" /></Abs>
      <Abs style={{ left: 769.29, top: 577, width: 84.74, height: 116.76, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {shield
          ? <img alt="" src={shield} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          : <span style={{ ...OPSZ, fontSize: 40, fontWeight: 800, color: 'var(--hn-text-primary)' }}>{initials(name)}</span>}
      </Abs>
      <WebPill style={{ right: W - 854, top: 771 }} />
      <Logotype />
      <NextButton left={728} />
      <Abs style={{ left: 25, top: 588, width: 453, height: 912 }}><Img src="phone-1a.webp" /></Abs>
      <Abs style={{ left: 222, top: 861, width: 453, height: 912, filter: 'drop-shadow(0 4px 4px rgba(0, 0, 0, 0.25))' }}><Img src="phone-1b.webp" /></Abs>
    </Frame>
  )
}

function Install({ name }: PromoData) {
  return (
    <Frame>
      <Background icon="big" />
      <Logotype />
      <Abs style={{ left: -466, top: H * 0.4 + 21.2, width: 1418, height: 942 }}><Img src="phones-2.webp" style={{ objectFit: 'cover' }} /></Abs>
      <NextButton left={728} />
      <StepTitle step={1}>Instala HaNet</StepTitle>
      <Body width={690} tracking={-2.88}>
        <p style={{ margin: 0 }}>Ahora <b style={{ fontWeight: 600 }}>{name} usa HaNet</b> para avisos, calendario de pruebas, material de clases, horarios y más.</p>
        <p style={{ margin: 0 }}>&nbsp;</p>
        <p style={{ margin: 0 }}>Entra a <b style={{ fontWeight: 700 }}>app.hanet.muxp.art</b> desde tu teléfono y agrégala a tu pantalla de inicio.</p>
      </Body>
    </Frame>
  )
}

function CreateId() {
  return (
    <Frame>
      <Background icon="big" />
      <Abs style={{ left: -165, top: H * 0.4 + 16.2, width: 1226, height: 872 }}><Img src="hand-3.webp" style={{ objectFit: 'cover' }} /></Abs>
      <Logotype />
      <NextButton left={728} />
      <Body width={714} tracking={-1.44}>
        <p style={{ margin: 0 }}>Ingresa tus datos y verifica tu correo. Después escribe el <b style={{ fontWeight: 700 }}>código de invitación de 4 palabras</b> de tu institución y confirma con tu correo institucional.</p>
        <p style={{ margin: 0 }}>(¡Nunca publiques el código en redes!)</p>
      </Body>
      <StepTitle step={2}>Crea tu HaNet ID</StepTitle>
      <Abs style={{ left: 565, top: 584, width: 289, height: 102 }}><Img src="code-pills.svg" /></Abs>
    </Frame>
  )
}

function Done({ name }: PromoData) {
  return (
    <Frame>
      <Background icon="big" />
      <Abs style={{ left: -144, top: H * 0.2 + 101.6, width: 1407.353, height: 1162.023, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ flex: 'none', transform: 'rotate(-11.1deg)' }}>
          <div style={{ position: 'relative', width: 1250, height: 939 }}><Img src="phones-4.webp" style={{ objectFit: 'cover' }} /></div>
        </div>
      </Abs>
      <Logotype />
      <NextButton left={60} />
      <Body width={736} tracking={-1.44}>
        <p style={{ margin: 0 }}>Ya puedes comenzar a descubrir todo lo que tiene {name} y HaNet para ti.</p>
        <p style={{ margin: 0 }}>&nbsp;</p>
        <p style={{ margin: 0 }}>¿Tienes dudas? Escríbenos en @hanetcl, muxp@muxp.art o entra a docs.hanet.muxp.art.</p>
        <p style={{ margin: 0 }}>&nbsp;</p>
        <p style={{ margin: 0 }}>¡Disfruta HaNet!</p>
      </Body>
      <StepTitle step={3}>¡Y listo!</StepTitle>
    </Frame>
  )
}

function Closing() {
  return (
    <Frame>
      <Background />
      <Abs style={{ left: W / 2 + 0.5, top: H / 2 + 0.5, width: 331, height: 125, transform: 'translate(-50%, -50%)' }}><Img src="logotype-big.svg" /></Abs>
      <WebPill style={{ left: '50%', top: H * 0.8 + 130, transform: 'translateX(-50%)' }} />
    </Frame>
  )
}

export const PROMO_SLIDES: { id: string; label: string; render: (data: PromoData) => ReactNode }[] = [
  { id: '1-bienvenidos', label: 'Bienvenidos', render: data => <Welcome {...data} /> },
  { id: '2-instala', label: 'Instala HaNet', render: data => <Install {...data} /> },
  { id: '3-hanet-id', label: 'Crea tu HaNet ID', render: () => <CreateId /> },
  { id: '4-listo', label: '¡Y listo!', render: data => <Done {...data} /> },
  { id: '5-cierre', label: 'Cierre', render: () => <Closing /> },
]
