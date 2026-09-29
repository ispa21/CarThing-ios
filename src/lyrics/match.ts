// Title and artist normalisation shared by the lyrics providers.

/** "Blinding Lights - 2020 Remaster (feat. X)" and "blinding lights" → "blinding lights". */
export function matchKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s[-–—]\s.*$/, '')
    .replace(/[([].*?[)\]]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
