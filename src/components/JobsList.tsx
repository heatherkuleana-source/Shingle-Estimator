import type { Estimate, Settings } from '../types';
import { computeTotals, formatDate, money } from '../calc';
import { Card } from './ui';

export function JobsList({ estimates, settings, onOpen, onNew, onDuplicate, onDelete }: {
  estimates: Estimate[];
  settings: Settings;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const sorted = [...estimates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <Card title="Estimates" actions={<button onClick={onNew}>+ New estimate</button>}>
      {sorted.length === 0 ? (
        <div className="empty">
          <p>No estimates yet.</p>
          <ol className="muted">
            <li>Load your prices under <strong>Settings → Price List</strong> (type them in or import a CSV).</li>
            <li>Check labor rate and hours per square under <strong>Settings → Labor &amp; Pricing</strong>.</li>
            <li>Add your company info and contract terms under <strong>Settings → Company &amp; Contract</strong>.</li>
            <li>Click <strong>New estimate</strong>, upload the satellite report and work through the steps.</li>
          </ol>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="jobs">
            <thead><tr><th>#</th><th>Customer</th><th>Job address</th><th>Updated</th><th>Status</th><th className="r">Price</th><th /></tr></thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id} onClick={() => onOpen(e.id)}>
                  <td>{e.number}</td>
                  <td>{e.customer.name || <span className="muted">—</span>}{e.customer.type === 'contractor' && <span className="tag">GC</span>}</td>
                  <td>{e.customer.propertyAddress}</td>
                  <td>{formatDate(e.updatedAt)}</td>
                  <td><span className={`status ${e.status}`}>{e.status}</span></td>
                  <td className="r">{money(computeTotals(e, settings).total)}</td>
                  <td className="r" onClick={(ev) => ev.stopPropagation()}>
                    <button className="link" onClick={() => onDuplicate(e.id)}>Copy</button>
                    <button className="link danger" onClick={() => { if (confirm(`Delete estimate ${e.number}?`)) onDelete(e.id); }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
