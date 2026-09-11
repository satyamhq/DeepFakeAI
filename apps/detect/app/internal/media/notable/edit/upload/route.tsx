import { NextResponse } from "next/server"
import { supabaseAdmin } from "../../../../../db"

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const filename = searchParams.get("filename")
  if (!filename) return NextResponse.json({ error: "No filename provided." }, { status: 400 })

  try {
    const buffer = Buffer.from(await request.arrayBuffer())
    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
    const storagePath = `notable/${Date.now()}_${cleanFilename}`
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "media-uploads"

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: request.headers.get("content-type") || "application/octet-stream",
        upsert: true,
      })

    if (error) {
      const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath)
      return NextResponse.json({ url: urlData.publicUrl })
    }

    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed." }, { status: 500 })
  }
}
