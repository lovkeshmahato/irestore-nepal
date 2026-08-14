import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Spinner } from './Spinner'

export interface UploadedPhoto {
  storagePath: string
  previewUrl: string
}

export function PhotoUpload({
  bucket,
  pathPrefix,
  maxPhotos = 7,
  photos,
  onChange,
}: {
  bucket: string
  pathPrefix: string
  maxPhotos?: number
  photos: UploadedPhoto[]
  onChange: (photos: UploadedPhoto[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setUploading(true)
    try {
      const remaining = maxPhotos - photos.length
      const toUpload = Array.from(files).slice(0, Math.max(0, remaining))
      const uploaded: UploadedPhoto[] = []
      for (const file of toUpload) {
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `${pathPrefix}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file)
        if (uploadError) throw uploadError
        uploaded.push({ storagePath: path, previewUrl: URL.createObjectURL(file) })
      }
      onChange([...photos, ...uploaded])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function removePhoto(index: number) {
    onChange(photos.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Photos ({photos.length}/{maxPhotos})
        </span>
        {uploading && <Spinner className="h-4 w-4" />}
      </div>
      <div className="flex flex-wrap gap-3">
        {photos.map((photo, index) => (
          <div
            key={photo.storagePath}
            className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 sm:h-24 sm:w-24"
          >
            <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(index)}
              className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-1 text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-primary-400 hover:text-primary-500 dark:border-slate-600 sm:h-24 sm:w-24"
          >
            <Camera className="h-5 w-5" />
            <span className="text-[11px]">Add</span>
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-danger-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
