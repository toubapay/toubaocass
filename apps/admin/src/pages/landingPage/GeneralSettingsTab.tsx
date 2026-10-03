import { useEffect, useRef, useState } from 'react';

import { extractErrorMessage } from '../../api/client';
import { fetchLandingPageSettings, removeLandingPageLogo, updateLandingPageSettings, uploadLandingPageLogo } from '../../api/landingPage';
import type { LandingNavLink, LandingPageSettings } from '../../api/types';
import { Button } from '../../components/Button';
import { CenteredSpinner } from '../../components/Spinner';
import { TextField } from '../../components/TextField';
import { colors, radius, spacing } from '../../theme';

const TEXT_FIELDS: { base: string; label: string; multiline?: boolean }[] = [
  { base: 'open_app_label', label: "Bouton « Ouvrir l'application »" },
  { base: 'hero_cta_primary', label: 'Bouton principal (diapositives)' },
  { base: 'hero_cta_secondary', label: 'Bouton secondaire (diapositives)' },
  { base: 'final_cta_title', label: 'Titre — section finale' },
  { base: 'final_cta_subtitle', label: 'Sous-titre — section finale', multiline: true },
  { base: 'final_cta_button', label: 'Bouton — section finale' },
  { base: 'footer_blurb', label: 'Description — pied de page', multiline: true },
  { base: 'footer_company', label: 'Nom de la société — pied de page' },
];

const COLOR_FIELDS: { key: 'primary_color' | 'primary_dark_color' | 'accent_color'; label: string }[] = [
  { key: 'primary_color', label: 'Couleur principale' },
  { key: 'primary_dark_color', label: 'Couleur principale (foncée)' },
  { key: 'accent_color', label: "Couleur d'accent" },
];

export function GeneralSettingsTab() {
  const [settings, setSettings] = useState<LandingPageSettings | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [navLinks, setNavLinks] = useState<LandingNavLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    fetchLandingPageSettings()
      .then((data) => {
        setSettings(data);
        setNavLinks(data.nav_links);
        setDraft(
          Object.fromEntries([
            ['brand_name', data.brand_name],
            ...COLOR_FIELDS.map((f) => [f.key, data[f.key]]),
            ...TEXT_FIELDS.flatMap((f) => [
              [`${f.base}_fr`, data[`${f.base}_fr` as keyof LandingPageSettings] as string],
              [`${f.base}_ar`, data[`${f.base}_ar` as keyof LandingPageSettings] as string],
            ]),
          ]),
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSave = async () => {
    setSaving(true);
    setError(undefined);
    setSaved(false);
    try {
      const updated = await updateLandingPageSettings({ ...draft, nav_links: navLinks } as Partial<LandingPageSettings>);
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoBusy(true);
    try {
      const updated = await uploadLandingPageLogo(file);
      setSettings(updated);
    } finally {
      setLogoBusy(false);
    }
  };

  const handleLogoRemove = async () => {
    setLogoBusy(true);
    try {
      const updated = await removeLandingPageLogo();
      setSettings(updated);
    } finally {
      setLogoBusy(false);
    }
  };

  const updateNavLink = (index: number, field: keyof LandingNavLink, value: string) => {
    setNavLinks((links) => links.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const removeNavLink = (index: number) => {
    setNavLinks((links) => links.filter((_, i) => i !== index));
  };

  const addNavLink = () => {
    setNavLinks((links) => [...links, { label_fr: '', label_ar: '', href: '#' }]);
  };

  if (loading || !settings) {
    return <CenteredSpinner />;
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: colors.text, margin: `0 0 ${spacing.md}px` }}>Logo &amp; nom</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: radius.sm,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.background,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {logoBusy ? (
              '…'
            ) : settings.logo_url ? (
              <img src={settings.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 24 }}>🚌</span>
            )}
          </div>
          <div>
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={logoBusy}
              style={{ border: 'none', background: 'none', padding: 0, color: colors.primary, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'block' }}
            >
              Changer le logo
            </button>
            {settings.logo_url && (
              <button
                onClick={handleLogoRemove}
                disabled={logoBusy}
                style={{ border: 'none', background: 'none', padding: 0, marginTop: 4, color: colors.danger, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'block' }}
              >
                Supprimer le logo
              </button>
            )}
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
          </div>
        </div>
        <TextField label="Nom de la marque" value={draft.brand_name ?? ''} onChange={(e) => setDraft((d) => ({ ...d, brand_name: e.target.value }))} style={{ maxWidth: 280 }} />
      </div>

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: colors.text, margin: `0 0 ${spacing.md}px` }}>Couleurs</h3>
        <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap' }}>
          {COLOR_FIELDS.map((f) => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>{f.label}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                <input
                  type="color"
                  value={draft[f.key] ?? '#8A6708'}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  style={{ width: 40, height: 36, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: 2, cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={draft[f.key] ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  style={{ width: 90, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: '8px 10px', fontSize: 13 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: colors.text, margin: `0 0 ${spacing.xs}px` }}>Barre de navigation</h3>
        <p style={{ fontSize: 13, color: colors.textMuted, margin: `0 0 ${spacing.md}px` }}>
          Liens affichés dans l'en-tête de la page. Le lien peut être une ancre (ex. <code>#services</code>) ou une URL.
        </p>
        {navLinks.map((link, index) => (
          <div key={index} style={{ display: 'flex', gap: spacing.sm, alignItems: 'flex-end', marginBottom: spacing.sm }}>
            <div style={{ flex: 1 }}>
              <TextField label="Libellé (Français)" value={link.label_fr} onChange={(e) => updateNavLink(index, 'label_fr', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <TextField label="Libellé (العربية)" value={link.label_ar} dir="rtl" onChange={(e) => updateNavLink(index, 'label_ar', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <TextField label="Lien" value={link.href} onChange={(e) => updateNavLink(index, 'href', e.target.value)} />
            </div>
            <button onClick={() => removeNavLink(index)} style={{ border: 'none', background: 'none', color: colors.danger, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: spacing.md }}>
              Retirer
            </button>
          </div>
        ))}
        <Button label="Ajouter un lien" onClick={addNavLink} variant="outline" />
      </div>

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: colors.text, margin: `0 0 ${spacing.md}px` }}>Textes &amp; boutons</h3>
        {TEXT_FIELDS.map((f) => (
          <div key={f.base} style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.xs }}>
            <div style={{ flex: 1 }}>
              <TextField label={`${f.label} (Français)`} value={draft[`${f.base}_fr`] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [`${f.base}_fr`]: e.target.value }))} />
            </div>
            <div style={{ flex: 1 }}>
              <TextField
                label={`${f.label} (العربية)`}
                value={draft[`${f.base}_ar`] ?? ''}
                dir="rtl"
                onChange={(e) => setDraft((d) => ({ ...d, [`${f.base}_ar`]: e.target.value }))}
              />
            </div>
          </div>
        ))}
      </div>

      {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: spacing.sm }}>{error}</p>}
      {saved && !error && <p style={{ color: colors.success, fontSize: 13, marginBottom: spacing.sm }}>Enregistré.</p>}
      <Button label="Enregistrer" onClick={handleSave} loading={saving} />
    </div>
  );
}
