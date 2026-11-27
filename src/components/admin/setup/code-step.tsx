import { FileDown } from 'lucide-react'
import { useState } from 'react'
import { CodePanel } from '@/components/admin/code-panel'
import { Alert } from '@/components/arc/alert/alert'
import { Button } from '@/components/arc/button/button'
import { describeError } from '@/lib/errors'
import type { AdminInstitution } from '@/lib/hnt-admin'
import { adminsOf, isStaffRow, useSetupMembers } from './members-store'
import type { InscriptionData } from './inscription-pdf'

/**
 * Código e inscripción: al generar el código se descarga el PDF "Inscripción a
 * HaNet" con la frase, que solo existe en ese momento (el backend guarda su hash).
 */
export function CodeStep({ institution }: { institution: AdminInstitution }) {
  const loaded = useSetupMembers(institution)
  const [code, setCode] = useState<{ words: string[]; at: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function data(words: string[] | null, at: number | null): InscriptionData {
    const members = loaded?.members ?? []
    const complete = !!loaded && !loaded.truncated && members.length > 0
    const students = members.filter(member => !isStaffRow(member))
    return {
      institution,
      words,
      generatedAt: at,
      admins: adminsOf(members).map(member => ({ fullName: member.fullName, email: member.email })),
      roster: {
        total: institution.rosterCount,
        students: complete ? students.length : null,
        staff: complete ? members.length - students.length : null,
        courses: complete ? new Set(students.map(member => member.curso.trim())).size : null,
      },
    }
  }

  async function download(words: string[] | null, at: number | null) {
    setBusy(true)
    setError(null)
    try {
      const { downloadInscriptionPdf } = await import('./inscription-pdf')
      await downloadInscriptionPdf(data(words, at))
      if (words) setDownloaded(true)
    } catch (failure) {
      console.error('Inscripción PDF', failure)
      setError(describeError(failure, 'No pudimos armar el PDF. Inténtalo nuevamente.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <CodePanel
        institution={institution}
        heading={false}
        onGenerated={(words, at) => {
          setCode({ words, at })
          void download(words, at)
        }}
      />

      <section className="flex flex-col gap-3">
        <h3 className="font-medium">Inscripción a HaNet (PDF)</h3>
        <p className="max-w-prose text-(length:--text-sm) text-(--text-secondary)">
          {code && downloaded
            ? 'Se descargó con la frase. Mándaselo a la administración del liceo por un medio privado: es la única copia de la frase.'
            : 'Los datos del liceo, el código y los primeros pasos, para mandárselo a su administración. Se descarga solo al generar el código, porque la frase no se puede volver a leer después.'}
        </p>
        <Alert tone="danger" title="No se descargó el PDF" open={!!error}>{error}</Alert>
        {code && (
          <Button variant={downloaded ? 'secondary' : 'primary'} loading={busy} onClick={() => void download(code.words, code.at)} className="self-start">
            <FileDown aria-hidden="true" className="size-4" /> {downloaded ? 'Descargar otra vez' : 'Descargar inscripción'}
          </Button>
        )}
        {!code && institution.hasInviteCode && (
          <Button variant="ghost" loading={busy} onClick={() => void download(null, null)} className="self-start">
            <FileDown aria-hidden="true" className="size-4" /> Descargar sin la frase
          </Button>
        )}
      </section>
    </div>
  )
}
