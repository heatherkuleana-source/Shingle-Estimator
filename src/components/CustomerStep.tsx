import type { Customer, Estimate } from '../types';
import { Card, Field, TextArea, TextField } from './ui';

export function CustomerStep({ estimate, update }: { estimate: Estimate; update: (fn: (e: Estimate) => Estimate) => void }) {
  const c = estimate.customer;
  const set = <K extends keyof Customer>(k: K, v: Customer[K]) =>
    update((e) => ({ ...e, customer: { ...e.customer, [k]: v } }));
  return (
    <Card title="Customer & job">
      <div className="grid">
        <Field label="Customer type">
          <select value={c.type} onChange={(e) => set('type', e.target.value as Customer['type'])}>
            <option value="homeowner">Homeowner</option>
            <option value="contractor">General contractor</option>
          </select>
        </Field>
        <TextField label="Estimate #" value={estimate.number} onChange={(v) => update((e) => ({ ...e, number: v }))} />
        <TextField label={c.type === 'contractor' ? 'Contact name' : 'Homeowner name'} value={c.name} onChange={(v) => set('name', v)} />
        {c.type === 'contractor' && <TextField label="Company" value={c.company} onChange={(v) => set('company', v)} />}
        <TextField label="Phone" type="tel" value={c.phone} onChange={(v) => set('phone', v)} />
        <TextField label="Email" type="email" value={c.email} onChange={(v) => set('email', v)} />
        <TextField label="Job / property address" wide value={c.propertyAddress} onChange={(v) => set('propertyAddress', v)} />
        <TextField label="Billing address (if different)" wide value={c.billingAddress} onChange={(v) => set('billingAddress', v)} />
        <TextField label="Estimator" value={estimate.estimator} onChange={(v) => update((e) => ({ ...e, estimator: v }))} />
        <TextArea label="Job notes (shown on contract)" rows={3} value={estimate.notes} onChange={(v) => update((e) => ({ ...e, notes: v }))} />
      </div>
    </Card>
  );
}
