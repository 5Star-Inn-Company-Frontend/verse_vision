import dotenv from 'dotenv'
import { fetchSongLyrics } from '../api/services/ai/openai'

dotenv.config()

async function test() {
  console.log('Testing fetchSongLyrics for "Amazing Grace"...')
  const result = await fetchSongLyrics('Amazing Grace')
  if (result) {
      console.log('Result:', JSON.stringify(result, null, 2))
      if (result.lines.some(l => l.includes('Verse'))) {
          console.log('SUCCESS: "Verse" headers detected.')
      } else {
          console.log('WARNING: "Verse" headers NOT detected.')
      }
      
      if (result.lines.some(l => l.includes('  '))) {
          console.log('SUCCESS: Indentation detected.')
      } else {
           console.log('WARNING: Indentation NOT detected.')
      }
  } else {
      console.log('FAILURE: Result is null.')
  }
}

test().catch(console.error)
