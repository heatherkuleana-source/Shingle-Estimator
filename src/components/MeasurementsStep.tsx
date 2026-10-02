import { useEffect, useState } from 'react';
import type { Estimate, Measurements } from '../types';
import { suggestedWastePct } from '../calc';
import { imageToDataUrl } from '../files';
import { parseReportText } from '../reportParser';
import { deleteReport, getReport, putReport, type StoredReport } from '../storage';
import { Card, NumberField } from './ui';

const LABELS: Partial<Record<keyof Measurements, string>> = {
  areaSqFt: 'Roof area', pitch: 'Pitch', eaves: 'Eaves', rakes: 'Rakes', ridges: 'Ridges', hips: 'Hips',
  valleys: 'Valleys', stepFlashing: 'Step flashing', wallFlashing: 'Wall flashing', stories: 'Stories',
};

export function MeasurementsStep({ estimate, update }: { estimate: Estimate; update: (fn: (e: Estimate) => Estimate) => void }) {
  const m = estimate.measurements;
  const set = (k: keyof Measurements, v: number) =>
    update((e) => ({ ...e, measurements: { ...e.measurements, [k]: v } }));

  const [report, setReport] = useState<StoredReport | undefined>();
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [pasted, setPasted] = useState('');

  useEffect(() => {
    let live = true;
    getReport(estimate.id).then((r) => live && setReport(r)).catch(() => {});
    return () => { live = false; };
  }, [estimate.id]);

  const applyParsed = (text: string) => {
    const found = parseReportText(text);
    const keys = Object.keys(found) as (keyof Measurements)[];
    if (keys.length === 0) {
      setMessage('No measurements were recognized — enter them below from the report.');
      return;
    }
    update((e) => ({ ...e, measurements: { ...e.measurements, ...found } }));
    setMessage(`Filled in: ${keys.map((k) => `${LABELS[k] ?? k} ${found[k]}`).join(', ')}. Double-check against the report.`);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      let stored: StoredReport;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const { readPdf } = await import('../pdf');
        const { pages, text } = await readPdf(file);
        stored = { name: file.name, pages };
        applyParsed(text);
      } else {
        stored = { name: file.name, pages: [await imageToDataUrl(file)] };
        setMessage('Image uploaded. Enter the measurements shown on it below.');
      }
      await putReport(estimate.id, stored);
      setReport(stored);
      setPage(0);
    } catch (err) {
      setMessage(`Could not read that file: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const removeReport = async () => {
    await deleteReport(estimate.id);
    setReport(undefined);
  };

  const squares = m.areaSqFt / 100;
  const suggested = suggestedWastePct(m);

  return (
    <div className="split">
      <Card
        title="Satellite image / measurement report"
        actions={report && <button className="link danger" onClick={removeReport}>Remove</button>}
      >
        <label className="dropzone">
          <input type="file" accept="image/*,application/pdf" onChange={(e) => onFile(e.target.files?.[0])} />
          {busy ? 'Reading…' : report ? `Replace "${report.name}"` : 'Upload image or PDF report (EagleView, Hover, etc.)'}
        </label>
        {message && <p className="notice">{message}</p>}
        {report && (
          <div className="report-view">
            {report.pages.length > 1 && (
              <div className="pager">
                <button disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button>
                Page {page + 1} of {report.pages.length}
                <button disabled={page >= report.pages.length - 1} onClick={() => setPage(page + 1)}>›</button>
              </div>
            )}
            <a href={report.pages[page]} target="_blank" rel="noreferrer">
              <img src={report.pages[page]} alt={`${report.name} page ${page + 1}`} />
            </a>
          </div>
        )}
        <details>
          <summary>Paste report text instead</summary>
          <textarea rows={4} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Total Roof Area = 2,845 sq ft  Ridges = 54 ft …" />
          <button onClick={() => applyParsed(pasted)} disabled={!pasted.trim()}>Read measurements</button>
        </details>
      </Card>

      <Card title="Roof measurements">
        <div className="grid">
          <NumberField label="Total roof area (sq ft)" hint={`${squares.toFixed(2)} squares (pitched area from report)`} value={m.areaSqFt} onChange={(v) => set('areaSqFt', v)} />
          <NumberField label="Flat / low-slope area (sq ft)" hint="3-ply flat roof areas" value={m.flatAreaSqFt} onChange={(v) => set('flatAreaSqFt', v)} />
          <NumberField label="Predominant pitch (/12)" value={m.pitch} onChange={(v) => set('pitch', v)} />
          <NumberField label="Stories" value={m.stories} step={1} min={1} onChange={(v) => set('stories', v)} />
          <NumberField label="Layers to tear off" value={m.layers} step={1} min={0} onChange={(v) => set('layers', v)} />
        </div>
        <h3>Lengths (LF)</h3>
        <div className="grid">
          <NumberField label="Eaves" value={m.eaves} onChange={(v) => set('eaves', v)} />
          <NumberField label="Rakes" value={m.rakes} onChange={(v) => set('rakes', v)} />
          <NumberField label="Ridges" value={m.ridges} onChange={(v) => set('ridges', v)} />
          <NumberField label="Hips" value={m.hips} onChange={(v) => set('hips', v)} />
          <NumberField label="Valleys" value={m.valleys} onChange={(v) => set('valleys', v)} />
          <NumberField label="Step flashing" value={m.stepFlashing} onChange={(v) => set('stepFlashing', v)} />
          <NumberField label="Wall / counter flashing" value={m.wallFlashing} onChange={(v) => set('wallFlashing', v)} />
          <NumberField label="Ice & water rows at eaves" hint="3 ft courses" value={m.iceWaterRows} step={1} min={0} onChange={(v) => set('iceWaterRows', v)} />
        </div>
        <h3>Penetrations (count)</h3>
        <div className="grid">
          <NumberField label="Pipe jacks" step={1} value={m.pipeBoots} onChange={(v) => set('pipeBoots', v)} />
          <NumberField label="Hood / box vents" step={1} value={m.vents} onChange={(v) => set('vents', v)} />
          <NumberField label="Chimneys" step={1} value={m.chimneys} onChange={(v) => set('chimneys', v)} />
          <NumberField label="Skylights" step={1} value={m.skylights} onChange={(v) => set('skylights', v)} />
        </div>
        <h3>Waste</h3>
        <div className="grid">
          <NumberField
            label="Waste factor (%)"
            hint={`Suggested ${suggested}% for this roof shape. Applies to shingles and underlayment.`}
            value={estimate.wastePct}
            onChange={(v) => update((e) => ({ ...e, wastePct: v }))}
          />
          {estimate.wastePct !== suggested && (
            <button className="secondary align-end" onClick={() => update((e) => ({ ...e, wastePct: suggested }))}>
              Use {suggested}%
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
