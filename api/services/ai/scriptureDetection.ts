const books = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalm','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'
]

export function findReferencesRule(text: string): Array<{ reference: string }> {
  const refs: Array<{ reference: string }> = []
  const patterns = [
    /\b([1-3]?\s?[A-Z][a-z]+)\s+(\d{1,3})(?::(\d{1,3})(?:-(\d{1,3}))?)?\b/g,
  ]
  for (const re of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const book = m[1]
      if (!books.includes(book)) continue
      const chapter = m[2]
      const from = m[3]
      const to = m[4]
      const ref = from ? `${book} ${chapter}:${from}${to ? '-' + to : ''}` : `${book} ${chapter}`
      refs.push({ reference: ref })
    }
  }
  return refs
}

