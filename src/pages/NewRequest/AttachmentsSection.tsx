import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, File, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface AttachmentsSectionProps {
  attachments: File[]
  updateFormData: (field: string, value: any) => void
}

interface UploadingFile {
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  url?: string
}

export function AttachmentsSection({ attachments, updateFormData }: AttachmentsSectionProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }))
    setUploadingFiles(prev => [...prev, ...newFiles])
    updateFormData('attachments', [...attachments, ...acceptedFiles])

    // Simulate upload progress (in production, upload to Supabase storage)
    for (const uploadFile of newFiles) {
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100))
        setUploadingFiles(prev =>
          prev.map(f =>
            f.file === uploadFile.file ? { ...f, progress } : f
          )
        )
      }
      setUploadingFiles(prev =>
        prev.map(f =>
          f.file === uploadFile.file ? { ...f, status: 'success' } : f
        )
      )
    }
  }, [attachments, updateFormData])

  const removeFile = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index)
    updateFormData('attachments', newAttachments)
    setUploadingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 25 * 1024 * 1024 // 25MB
  })

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return '📄'
    if (ext === 'docx') return '📝'
    if (ext === 'xlsx') return '📊'
    if (['jpg', 'jpeg', 'png'].includes(ext || '')) return '🖼️'
    return '📎'
  }

  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
        <div {...getRootProps()} className="cursor-pointer">
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          {isDragActive ? (
            <p className="text-blue-600">Drop files here...</p>
          ) : (
            <>
              <p className="text-gray-600">Drop files here or click to browse</p>
              <p className="text-sm text-gray-400 mt-1">
                PDF, DOCX, XLSX, PNG, JPG — max 25MB each
              </p>
            </>
          )}
        </div>
      </div>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Uploading</h4>
          {uploadingFiles.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl">{getFileIcon(item.file.name)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.file.name}</p>
                <p className="text-xs text-gray-500">
                  {(item.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {item.status === 'uploading' && (
                  <Progress value={item.progress} className="h-1 mt-2" />
                )}
                {item.status === 'success' && (
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-green-600">Uploaded</span>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(idx)}
                disabled={item.status === 'uploading'}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Files */}
      {attachments.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Attached Files</h4>
          {attachments.map((file, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl">{getFileIcon(file.name)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeFile(idx)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && uploadingFiles.length === 0 && (
        <div className="text-center py-8">
          <File className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No files attached yet</p>
        </div>
      )}
    </div>
  )
}
