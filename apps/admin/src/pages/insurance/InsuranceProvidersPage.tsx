import { useEffect, useState } from 'react';

import { createInsuranceProvider, listInsuranceProviders, updateInsuranceProvider } from '../../api/insurance';
import { extractErrorMessage } from '../../api/client';
import type { InsuranceProvider } from '../../api/types';
import { Button } from '../../components/Button';
import { CenteredSpinner } from '../../components/Spinner';
import { TextField } from '../../components/TextField';
import { colors, radius, spacing } from '../../theme';

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        backgroundColor: isActive ? colors.successSoft : colors.background,
        color: isActive ? colors.success : colors.textMuted,
      }}
    >
      {isActive ? 'Actif' : 'Inactif'}
    </span>
  );
}

function RowEditor({ provider, onSaved }: { provider: InsuranceProvider; onSaved: (updated: InsuranceProvider) => void }) {
  const [commissionRate, setCommissionRate] = useState(String(provider.commission_rate));
  const [isActive, setIsActive] = useState(provider.is_active);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  const dirty =
    commissionRate !== String(provider.commission_rate) || isActive !== provider.is_active || apiBaseUrl !== '' || apiKey !== '';

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateInsuranceProvider(provider.id, {
        commission_rate: Number(commissionRate),
        is_active: isActive,
        ...(apiBaseUrl ? { api_base_url: apiBaseUrl } : {}),
        ...(apiKey ? { api_key: apiKey } : {}),
      });
      setApiBaseUrl('');
      setApiKey('');
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        <input
          type="number"
          min={0}
          max={100}
          step="0.1"
          value={commissionRate}
          onChange={(e) => setCommissionRate(e.target.value)}
          style={{ width: 70, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: '6px 8px', fontSize: 13 }}
        />
        <span style={{ fontSize: 12, color: colors.textMuted }}>% commission</span>
        <select
          value={isActive ? 'active' : 'inactive'}
          onChange={(e) => setIsActive(e.target.value === 'active')}
          style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: '6px 10px', fontSize: 13 }}
        >
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
        </select>
        {dirty && <Button label="Enregistrer" onClick={handleSave} loading={saving} />}
      </div>
      <div style={{ display: 'flex', gap: spacing.sm }}>
        <input
          placeholder="URL de l'API du partenaire"
          value={apiBaseUrl}
          onChange={(e) => setApiBaseUrl(e.target.value)}
          style={{ flex: 1, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: '6px 8px', fontSize: 12 }}
        />
        <input
          placeholder="Clé API"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{ flex: 1, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: '6px 8px', fontSize: 12 }}
        />
      </div>
    </div>
  );
}

export function InsuranceProvidersPage() {
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', commission_rate: '10' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = () => {
    setLoading(true);
    listInsuranceProviders()
      .then(setProviders)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    setCreating(true);
    setError(undefined);
    try {
      await createInsuranceProvider({ code: form.code, name: form.name, commission_rate: Number(form.commission_rate) });
      setForm({ code: '', name: '', commission_rate: '10' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const handleSaved = (updated: InsuranceProvider) => {
    setProviders((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: 0 }}>Partenaires assurance</h1>
        <Button label={showForm ? 'Annuler' : 'Nouveau partenaire'} onClick={() => setShowForm((s) => !s)} variant={showForm ? 'outline' : 'primary'} />
      </div>
      <p style={{ fontSize: 14, color: colors.textMuted, margin: `0 0 ${spacing.lg}px` }}>
        Comparateur d'assurance auto pour les chauffeurs. Un partenaire sans clé API fonctionne en mode simulé (devis calculés en interne, aucun appel réel envoyé).
      </p>

      {showForm && (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg, maxWidth: 420 }}>
          <TextField label="Code (identifiant technique)" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="ex. sunu_assurance" />
          <TextField label="Nom" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <TextField
            label="Commission (%)"
            type="number"
            value={form.commission_rate}
            onChange={(e) => setForm((f) => ({ ...f, commission_rate: e.target.value }))}
          />
          {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: spacing.sm }}>{error}</p>}
          <Button label="Créer le partenaire" onClick={handleCreate} loading={creating} />
        </div>
      )}

      {loading ? (
        <CenteredSpinner />
      ) : (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
                {['Partenaire', 'Statut', 'Intégration', 'Configuration'].map((label) => (
                  <th key={label} style={{ padding: spacing.sm, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <tr key={provider.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: spacing.sm, fontSize: 14, fontWeight: 600, color: colors.text }}>
                    {provider.name}
                    <div style={{ fontSize: 12, color: colors.textMuted, fontWeight: 400 }}>{provider.code}</div>
                  </td>
                  <td style={{ padding: spacing.sm }}>
                    <StatusBadge isActive={provider.is_active} />
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 13, color: provider.has_api_credentials ? colors.success : colors.textMuted, fontWeight: 600 }}>
                    {provider.has_api_credentials ? 'API en direct' : 'Simulé'}
                  </td>
                  <td style={{ padding: spacing.sm, minWidth: 320 }}>
                    <RowEditor provider={provider} onSaved={handleSaved} />
                  </td>
                </tr>
              ))}
              {providers.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: spacing.lg, textAlign: 'center', color: colors.textMuted }}>
                    Aucun partenaire configuré.
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
