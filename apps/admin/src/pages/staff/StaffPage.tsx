import { useEffect, useState } from 'react';

import { extractErrorMessage } from '../../api/client';
import { createStaff, listStaff, updateStaff } from '../../api/staff';
import type { AdminRole, AdminStatus, AdminUser } from '../../api/types';
import { Button } from '../../components/Button';
import { CenteredSpinner } from '../../components/Spinner';
import { TextField } from '../../components/TextField';
import { colors, radius, spacing } from '../../theme';

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  controllers: 'Contrôleur',
  support: 'Support',
  accountant: 'Comptable',
  superviseur: 'Superviseur',
};

const ROLES = Object.keys(ROLE_LABELS) as AdminRole[];

function RowEditor({ admin, onSaved }: { admin: AdminUser; onSaved: (updated: AdminUser) => void }) {
  const [role, setRole] = useState<AdminRole>(admin.role);
  const [status, setStatus] = useState<AdminStatus>(admin.status);
  const [saving, setSaving] = useState(false);

  const dirty = role !== admin.role || status !== admin.status;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateStaff(admin.id, { role, status });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as AdminRole)}
        style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: '6px 10px', fontSize: 13 }}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as AdminStatus)}
        style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: '6px 10px', fontSize: 13 }}
      >
        <option value="active">Actif</option>
        <option value="suspended">Suspendu</option>
      </select>
      {dirty && <Button label="Enregistrer" onClick={handleSave} loading={saving} />}
    </div>
  );
}

export function StaffPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'support' as AdminRole });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = () => {
    setLoading(true);
    listStaff()
      .then((res) => setAdmins(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    setCreating(true);
    setError(undefined);
    try {
      await createStaff(form);
      setForm({ name: '', email: '', password: '', role: 'support' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const handleSaved = (updated: AdminUser) => {
    setAdmins((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: 0 }}>Équipe back-office</h1>
        <Button label={showForm ? 'Annuler' : 'Nouveau compte admin'} onClick={() => setShowForm((s) => !s)} variant={showForm ? 'outline' : 'primary'} />
      </div>

      {showForm && (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg, maxWidth: 420 }}>
          <TextField label="Nom" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <TextField label="Mot de passe" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          <div style={{ marginBottom: spacing.md }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>Rôle</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AdminRole }))}
              style={{ width: '100%', border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: '10px 14px', fontSize: 15 }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: spacing.sm }}>{error}</p>}
          <Button label="Créer le compte" onClick={handleCreate} loading={creating} />
        </div>
      )}

      {loading ? (
        <CenteredSpinner />
      ) : (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
                {['Nom', 'Email', 'Rôle & statut', 'Dernière connexion'].map((label) => (
                  <th key={label} style={{ padding: spacing.sm, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: spacing.sm, fontSize: 14, fontWeight: 600, color: colors.text }}>{admin.name}</td>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{admin.email}</td>
                  <td style={{ padding: spacing.sm }}>
                    <RowEditor admin={admin} onSaved={handleSaved} />
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 13, color: colors.textMuted }}>
                    {admin.last_login_at ? new Date(admin.last_login_at).toLocaleString('fr-FR') : 'Jamais'}
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: spacing.lg, textAlign: 'center', color: colors.textMuted }}>
                    Aucun compte admin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
