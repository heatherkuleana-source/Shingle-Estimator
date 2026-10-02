import type { Measurements } from './types';

/**
 * Best-effort extraction of roof measurements from the text of a measurement
 * report (EagleView, Hover, RoofSnap, GAF QuickMeasure, etc.).
 * Returns only the fields it found; the estimator reviews them before use.
 */
const NUM = '([\\d,]+(?:\\.\\d+)?)';
const SEP = '\\s*(?:=|:|-)?\\s*';

const LENGTH_PATTERNS: [keyof Measurements, RegExp][] = [
  ['ridges', new RegExp(`\\bridges?(?!\\s*/\\s*hips)${SEP}${NUM}\\s*(?:ft|lf|'|feet)?`, 'i')],
  ['hips', new RegExp(`(?<!ridges?\\s*/\\s*)\\bhips?${SEP}${NUM}\\s*(?:ft|lf|'|feet)?`, 'i')],
  ['valleys', new RegExp(`\\bvalleys?${SEP}${NUM}\\s*(?:ft|lf|'|feet)?`, 'i')],
  ['rakes', new RegExp(`\\brakes?${SEP}${NUM}\\s*(?:ft|lf|'|feet)?`, 'i')],
  ['eaves', new RegExp(`\\beaves?(?:\\s*/\\s*starter)?${SEP}${NUM}\\s*(?:ft|lf|'|feet)?`, 'i')],
  ['stepFlashing', new RegExp(`\\bstep\\s+flashing${SEP}${NUM}`, 'i')],
  ['wallFlashing', new RegExp(`(?<!step\\s+)(?:wall\\s+|headwall\\s+|counter\\s+)?\\bflashing${SEP}${NUM}`, 'i')],
];

const toNum = (s: string) => Number(s.replace(/,/g, ''));

export function parseReportText(text: string): Partial<Measurements> {
  const t = text.replace(/\s+/g, ' ');
  const found: Partial<Measurements> = {};

  const area =
    t.match(new RegExp(`total\\s+(?:roof\\s+)?area${SEP}${NUM}\\s*(?:sq\\.?\\s*ft|ft²|ft2|sf|square\\s+feet)?`, 'i')) ??
    t.match(new RegExp(`roof\\s+area${SEP}${NUM}`, 'i'));
  if (area) found.areaSqFt = toNum(area[1]);
  else {
    const squares = t.match(new RegExp(`total\\s+squares${SEP}${NUM}`, 'i'));
    if (squares) found.areaSqFt = Math.round(toNum(squares[1]) * 100);
  }

  const pitch = t.match(/(?:predominant\s+)?pitch\s*(?:=|:|-)?\s*(\d+(?:\.\d+)?)\s*\/\s*12/i);
  if (pitch) found.pitch = Number(pitch[1]);

  for (const [key, re] of LENGTH_PATTERNS) {
    const m = t.match(re);
    if (m) (found as Record<string, number>)[key] = toNum(m[1]);
  }

  const stories = t.match(/(\d+)\s*(?:-\s*)?stor(?:y|ies)/i);
  if (stories) found.stories = Number(stories[1]);

  return found;
}
