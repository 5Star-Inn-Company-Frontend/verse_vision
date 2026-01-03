import fs from 'fs'
import path from 'path'

const BIBLES_DIR = path.join(process.cwd(), 'api', 'data', 'bibles')

export type BibleVerse = {
  text: string
}

export type BibleBook = Record<string, Record<string, string>> // Chapter -> Verse -> Text
export type BibleData = Record<string, BibleBook> // Book -> Chapters

export const bibleService = {
  getAvailableTranslations: async (): Promise<string[]> => {
    try {
      if (!fs.existsSync(BIBLES_DIR)) return []
      const files = await fs.promises.readdir(BIBLES_DIR)
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', '').toUpperCase())
    } catch (e) {
      console.error('Error listing bibles:', e)
      return []
    }
  },

  getText: async (reference: string, translation: string): Promise<string | null> => {
    try {
      const filePath = path.join(BIBLES_DIR, `${translation.toLowerCase()}.json`)
      if (!fs.existsSync(filePath)) return null

      // Note: For large JSONs, reading the whole file every time is inefficient.
      // In a real production app, we would cache this or use a database (SQLite).
      // Since the user asked to "download their jsons", we assume we work with JSON files.
      // We'll implement a simple in-memory cache if needed, but for now direct read.
      
      const content = await fs.promises.readFile(filePath, 'utf-8')
      const bible: BibleData = JSON.parse(content)

      // Parse reference "John 3:16" -> Book: John, Chapter: 3, Verse: 16
      // Regex to handle "1 John", "Song of Solomon", etc.
      const match = reference.match(/^((?:[1-3]\s)?[a-zA-Z\s]+)\s(\d+)[:\.](\d+)(?:-(\d+))?$/)
      if (!match) return null

      const bookName = match[1].trim() // e.g. "John"
      const chapter = match[2]         // e.g. "3"
      const verseStart = parseInt(match[3]) // e.g. 16
      const verseEnd = match[4] ? parseInt(match[4]) : verseStart

      // Normalize book name to match JSON keys (simple case-insensitive search)
      const bookKey = Object.keys(bible).find(k => k.toLowerCase() === bookName.toLowerCase())
      if (!bookKey) return null

      const book = bible[bookKey]
      const chap = book[chapter]
      if (!chap) return null

      let text = ''
      for (let v = verseStart; v <= verseEnd; v++) {
        if (chap[v]) {
          text += (text ? ' ' : '') + chap[v]
        }
      }
      
      return text || null
    } catch (e) {
      console.error('Error reading bible text:', e)
      return null
    }
  }
}
