import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { JobPhoto } from '../../../types'
import { PhotoUpload, type UploadedPhoto } from '../../../components/ui/PhotoUpload'

export function JobPhotosSection({ jobSheetId, editable }: { jobSheetId: string; editable: boolean }) {
  const [photos, setPhotos] = useState<JobPhoto[]>([])
  const [afterPhotos, setAfterPhotos] = useState<UploadedPhoto[]>([])

  async function load() {
    const { data } = await supabase.from('job_photos').select('*').eq('job_sheet_id', jobSheetId).order('created_at')
    const rows = (data ?? []) as JobPhoto[]
    setPhotos(rows)
    const withUrls = await Promise.all(
      rows
        .filter((p) => p.stage === 'after')
        .map(async (p) => {
          const { data: signed } = await supabase.storage.from('job-photos').createSignedUrl(p.storage_path, 3600)
          return { storagePath: p.storage_path, previewUrl: signed?.signedUrl ?? '' }
        })
    )
    setAfterPhotos(withUrls)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobSheetId])

  async function handleAfterChange(next: UploadedPhoto[]) {
    const added = next.filter((p) => !afterPhotos.some((e) => e.storagePath === p.storagePath))
    for (const photo of added) {
      await supabase.from('job_photos').insert({ job_sheet_id: jobSheetId, stage: 'after', storage_path: photo.storagePath })
    }
    setAfterPhotos(next)
  }

  const [beforeUrls, setBeforeUrls] = useState<Record<string, string>>({})
  useEffect(() => {
    const before = photos.filter((p) => p.stage === 'before')
    Promise.all(
      before.map(async (p) => {
        const { data } = await supabase.storage.from('job-photos').createSignedUrl(p.storage_path, 3600)
        return [p.id, data?.signedUrl ?? ''] as const
      })
    ).then((entries) => setBeforeUrls(Object.fromEntries(entries)))
  }, [photos])

  const beforePhotos = photos.filter((p) => p.stage === 'before')

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400">Before Repair</h3>
        {beforePhotos.length === 0 ? (
          <p className="text-sm text-slate-400">No before photos.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {beforePhotos.map((p) => (
              <a key={p.id} href={beforeUrls[p.id]} target="_blank" rel="noreferrer">
                <img src={beforeUrls[p.id]} alt="" className="h-20 w-20 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
              </a>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400">After Repair</h3>
        <PhotoUpload
          bucket="job-photos"
          pathPrefix={`after/${jobSheetId}`}
          photos={afterPhotos}
          onChange={editable ? handleAfterChange : () => {}}
        />
      </div>
    </div>
  )
}
