export default function PdfOverlay({ url, title, page }: { url: string; title: string; page: number }) {
  const src = `${url}#page=${page}`
  return (
    <div className="w-full h-full">
      <iframe src={src} className="w-full h-full" />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-2 rounded">
        {title} • Page {page}
      </div>
    </div>
  )
}
