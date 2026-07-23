import { useEffect, useState } from 'react';

import { createModule, listModules, updateModuleStatus } from '../../api/modules';
import { extractErrorMessage } from '../../api/client';
import type { Module } from '../../api/types';
import { Button } from '../../components/Button';
import { CenteredSpinner } from '../../components/Spinner';
import { TextField } from '../../components/TextField';
import { colors, radius, spacing } from '../../theme';

function StatusToggle({ module, onToggled }: { module: Module; onToggled: (updated: Module) => void }) {
  const [saving, setSaving] = useState(false);

  const handleToggle = async () => {
    setSaving(true);
    try {
      const updated = await updateModuleStatus(module.id, !module.is_enabled);
      onToggled(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={saving}
      style={{
        border: 'none',
        borderRadius: 999,
        padding: '4px 14px',
        fontSize: 12,
        fontWeight: 700,
        cursor: saving ? 'default' : 'pointer',
        opacity: saving ? 0.6 : 1,
        backgroundColor: module.is_enabled ? colors.successSoft : colors.dangerSoft,
        color: module.is_enabled ? colors.success : colors.danger,
      }}
    >
      {module.is_enabled ? 'Activé' : 'Désactivé'}
    </button>
  );
}

export function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ key: '', name: '', description: '', category: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = () => {
    setLoading(true);
    listModules()
      .then((res) => setModules(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    setCreating(true);
    setError(undefined);
    try {
      await createModule({
        key: form.key,
        name: form.name,
        description: form.description || undefined,
        category: form.category || undefined,
      });
      setForm({ key: '', name: '', description: '', category: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const handleToggled = (updated: Module) => {
    setModules((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: 0 }}>Gestion des modules</h1>
        <Button label={showForm ? 'Annuler' : 'Nouveau module'} onClick={() => setShowForm((s) => !s)} variant={showForm ? 'outline' : 'primary'} />
      </div>
      <p style={{ fontSize: 14, color: colors.textMuted, margin: `0 0 ${spacing.lg}px` }}>
        Active ou désactive des fonctionnalités de la plateforme sans déploiement. Un module désactivé bloque uniquement
        la création de nouvelles ressources (ex. publier un trajet Anando) — l'existant reste consultable.
      </p>

      {showForm && (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg, maxWidth: 420 }}>
          <TextField
            label="Clé (identifiant technique)"
            value={form.key}
            onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            placeholder="ex. anando"
          />
          <TextField label="Nom" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <TextField
            label="Catégorie"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="ex. trajets"
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: spacing.sm }}>{error}</p>}
          <Button label="Créer le module" onClick={handleCreate} loading={creating} />
        </div>
      )}

      {loading ? (
        <CenteredSpinner />
      ) : (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
                {['Module', 'Catégorie', 'Statut'].map((label) => (
                  <th key={label} style={{ padding: spacing.sm, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                <tr key={module.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: spacing.sm, fontSize: 14, fontWeight: 600, color: colors.text }}>
                    {module.name}
                    <div style={{ fontSize: 12, color: colors.textMuted, fontWeight: 400 }}>{module.key}</div>
                    {module.description && (
                      <div style={{ fontSize: 12, color: colors.textMuted, fontWeight: 400, marginTop: 2 }}>{module.description}</div>
                    )}
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 13, color: colors.textMuted }}>{module.category ?? '—'}</td>
                  <td style={{ padding: spacing.sm }}>
                    <StatusToggle module={module} onToggled={handleToggled} />
                  </td>
                </tr>
              ))}
              {modules.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: spacing.lg, textAlign: 'center', color: colors.textMuted }}>
                    Aucun module configuré. Les fonctionnalités non listées ici restent activées par défaut.
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
