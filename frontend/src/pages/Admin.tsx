import React, { useEffect, useState } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { apiRequest } from '../services/api';

type Account = { id: number; email: string; username?: string; full_name: string; role: string; is_active: boolean };
export const Admin: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const load = async () => {
    try { setAccounts(await apiRequest<Account[]>('/enterprise/users')); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load users'); }
  };
  useEffect(() => { void load(); }, []);
  const change = async (id: number, role: string) => {
    if (!window.confirm(`Change account #${id} to ${role}?`)) return;
    setBusy(id);
    try {
      await apiRequest(`/enterprise/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Role update failed'); }
    finally { setBusy(null); }
  };
  return <div className="text-slate-100 space-y-5">
    <div className="flex items-center justify-between"><h1 className="text-xl font-bold flex gap-2 items-center"><Shield /> Administration — User Roles</h1>
      <button onClick={load} className="px-3 py-2 rounded-lg bg-slate-800 flex gap-2 items-center"><RefreshCw size={16}/> Refresh</button></div>
    <p className="text-sm text-slate-400">Only verified administrators can change roles. All changes are audited.</p>
    {error && <p role="alert" className="text-rose-400">{error}</p>}
    <div className="overflow-x-auto border border-slate-700 rounded-xl"><table className="w-full text-sm text-left"><thead className="bg-slate-800"><tr><th className="p-3">Account</th><th className="p-3">Username</th><th className="p-3">Role</th></tr></thead>
    <tbody>{accounts.map(a => <tr key={a.id} className="border-t border-slate-800"><td className="p-3">{a.full_name}<div className="text-slate-400 text-xs">{a.email}</div></td><td className="p-3">{a.username || '—'}</td><td className="p-3"><select disabled={busy === a.id} value={a.role} onChange={e => void change(a.id, e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2"><option value="viewer">Viewer</option><option value="analyst">Analyst</option><option value="admin">Admin</option></select></td></tr>)}</tbody></table></div>
  </div>;
};
