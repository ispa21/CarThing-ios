// The share poster's layout maths, apart from the canvas so it can be tested. Pure.

export type Measure = (text: string) => number

/** Greedy word wrap to `maxWidth`. A single word wider than the line gets a line of its own. */
export function wrap(text: string, measure: Measure, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (line && measure(next) > maxWidth) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

/**
 * The biggest size (stepping down from `max`) at which `text` fits `maxLines` lines in
 * `maxWidth` without breaking a word, and `maxHeight` tall.
 */
export function fitHeadline(text: string, measureAt: (size: number) => Measure, { max, min, maxWidth, maxLines, maxHeight, leading }: { max: number; min: number; maxWidth: number; maxLines: number; maxHeight: number; leading: number }) {
  for (let size = max; size >= min; size -= 6) {
    const measure = measureAt(size)
    const lines = wrap(text, measure, maxWidth)
    const longest = Math.max(...text.split(/\s+/).map((w) => measure(w)), 0)
    if (lines.length <= maxLines && longest <= maxWidth && lines.length * size * leading <= maxHeight) return { size, lines }
  }
  const measure = measureAt(min)
  return { size: min, lines: wrap(text, measure, maxWidth).slice(0, maxLines) }
}

/** Cut to `maxLines`, ending the last line with an ellipsis if there was more. */
export function clampLines(lines: string[], maxLines: number) {
  if (lines.length <= maxLines) return lines
  return [...lines.slice(0, maxLines - 1), `${lines[maxLines - 1].replace(/[\s,.;:]+$/, '')}…`]
}
