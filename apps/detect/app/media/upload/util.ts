export const FILE_UPLOAD_PSEUDO_URL_BASE = "http://truemedia-fileuploads.org"

export function buildFakeMediaUrl(id: string, filename: string): string {
  return `${FILE_UPLOAD_PSEUDO_URL_BASE}/${id}/${filename}`
}

export function parseFakeMediaUrl(url: string): { id: string; filename: string } | undefined {
  if (!url.startsWith(FILE_UPLOAD_PSEUDO_URL_BASE)) return undefined
  const parts = url.split("/")
  return parts.length === 5 ? { id: parts[3], filename: parts[4] } : undefined
}
