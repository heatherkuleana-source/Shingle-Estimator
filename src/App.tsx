import { useMemo, useState } from 'react';
import type { Estimate, Settings } from './types';
import { computeTotals, money } from './calc';
import { defaultSettings, emptyMeasurements, newEstimate } from './defaults';
import { deleteReport, getReport, putReport, usePersistentState } from './storage';
import { JobsList } from './components/JobsList';
import { CustomerStep } from './components/CustomerStep';
import { MeasurementsStep } from './components/MeasurementsStep';
import { ScopeStep } from './components/ScopeStep';
import { MaterialsStep } from './components/MaterialsStep';
import { PriceStep } from './components/PriceStep';
import { ContractStep } from './components/ContractStep';
import { SettingsView } from './components/SettingsView';

const STEPS = [
  ['customer', '1. Customer'],
  ['measure', '2. Measurements'],
  ['scope', '3. Scope'],
  ['materials', '4. Materials'],
  ['price', '5. Labor & Price'],
  ['contract', '6. Contract'],
] as const;
type Step = (typeof STEPS)[number][0];

/** Fill in fields added in later versions so older saved data keeps working. */
function migrateSettings(s: Settings): Settings {
  const d = defaultSettings();
  return { ...d, ...s, company: { ...d.company, ...s.company }, labor: { ...d.labor, ...s.labor }, pricing: { ...d.pricing, ...s.pricing } };
}
const migrateEstimates = (list: Estimate[]) =>
  list.map((e) => ({
    ...e,
    estimator: e.estimator ?? '',
    shingleColor: e.shingleColor ?? '',
    crewIds: e.crewIds ?? [],
    jobCosts: e.jobCosts ?? {},
    measurements: { ...emptyMeasurements(), ...e.measurements },
    showMaterialList: e.showMaterialList ?? true,
    showItemizedPrices: e.showItemizedPrices ?? false,
  }));

function nextNumber(estimates: Estimate[]): string {
  const year = new Date().getFullYear();
  const max = estimates
    .map((e) => e.number.match(new RegExp(`^${year}-(\\d+)$`)))
    .reduce((m, r) => (r ? Math.max(m, Number(r[1])) : m), 0);
  return `${year}-${String(max + 1).padStart(3, '0')}`;
}

export default function App() {
  const [settings, setSettingsRaw, settingsErr] = usePersistentState<Settings>('se.settings', defaultSettings, migrateSettings);
  const [estimates, setEstimates, estimatesErr] = usePersistentState<Estimate[]>('se.estimates', () => [], migrateEstimates);
  const [view, setView] = useState<'jobs' | 'estimate' | 'settings'>('jobs');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('customer');

  const setSettings = (fn: (s: Settings) => Settings) => setSettingsRaw((s) => fn(s));
  const current = estimates.find((e) => e.id === currentId) ?? null;
  const totals = useMemo(() => (current ? computeTotals(current, settings) : null), [current, settings]);

  const update = (fn: (e: Estimate) => Estimate) =>
    setEstimates((list) => list.map((e) => (e.id === currentId ? { ...fn(e), updatedAt: new Date().toISOString() } : e)));

  const open = (id: string) => { setCurrentId(id); setStep('customer'); setView('estimate'); };
  const create = () => {
    const e = newEstimate(settings, nextNumber(estimates));
    setEstimates((list) => [...list, e]);
    open(e.id);
  };
  const duplicate = async (id: string) => {
    const src = estimates.find((e) => e.id === id);
    if (!src) return;
    const now = new Date().toISOString();
    const copy: Estimate = { ...structuredClone(src), id: crypto.randomUUID(), number: nextNumber(estimates), createdAt: now, updatedAt: now, status: 'draft' };
    setEstimates((list) => [...list, copy]);
    const report = await getReport(id).catch(() => undefined);
    if (report) await putReport(copy.id, report).catch(() => {});
  };
  const remove = (id: string) => {
    setEstimates((list) => list.filter((e) => e.id !== id));
    deleteReport(id).catch(() => {});
  };

  const stepIndex = STEPS.findIndex(([s]) => s === step);
  const saveError = settingsErr ?? estimatesErr;

  return (
    <div className="app">
      <header className="topbar no-print">
        <button className="brand" onClick={() => setView('jobs')}>Shingle Estimator</button>
        <nav>
          <button className={view !== 'settings' ? 'active' : ''} onClick={() => setView(current ? 'estimate' : 'jobs')}>Estimates</button>
          <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}>Settings</button>
        </nav>
      </header>
      {saveError && <p className="notice danger no-print">{saveError}</p>}

      <main>
        {view === 'jobs' && (
          <JobsList estimates={estimates} settings={settings} onOpen={open} onNew={create} onDuplicate={duplicate} onDelete={remove} />
        )}

        {view === 'settings' && (
          <SettingsView settings={settings} setSettings={setSettings} estimates={estimates} setEstimates={setEstimates} />
        )}

        {view === 'estimate' && current && totals && (
          <>
            <div className="estimate-head no-print">
              <button className="link" onClick={() => setView('jobs')}>‹ All estimates</button>
              <h1>{current.customer.name || 'New estimate'} <span className="muted">#{current.number}</span></h1>
              <div className="total-badge">
                {money(totals.total)}
                <span>{totals.labor.squares.toFixed(1)} sq · {totals.durationDays} day{totals.durationDays === 1 ? '' : 's'}</span>
              </div>
            </div>
            <nav className="tabs steps no-print">
              {STEPS.map(([id, label]) => (
                <button key={id} className={step === id ? 'active' : ''} onClick={() => setStep(id)}>{label}</button>
              ))}
            </nav>

            {step === 'customer' && <CustomerStep estimate={current} update={update} />}
            {step === 'measure' && <MeasurementsStep estimate={current} update={update} />}
            {step === 'scope' && <ScopeStep estimate={current} update={update} settings={settings} />}
            {step === 'materials' && <MaterialsStep estimate={current} update={update} settings={settings} />}
            {step === 'price' && <PriceStep estimate={current} update={update} settings={settings} totals={totals} />}
            {step === 'contract' && <ContractStep estimate={current} update={update} settings={settings} totals={totals} />}

            <div className="step-nav no-print">
              {stepIndex > 0 && <button className="secondary" onClick={() => setStep(STEPS[stepIndex - 1][0])}>‹ Back</button>}
              {stepIndex < STEPS.length - 1 && <button onClick={() => setStep(STEPS[stepIndex + 1][0])}>Next: {STEPS[stepIndex + 1][1].slice(3)} ›</button>}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
