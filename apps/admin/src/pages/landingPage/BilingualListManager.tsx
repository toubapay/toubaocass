import { useEffect, useState } from 'react';

import { extractErrorMessage } from '../../api/client';
import { Button } from '../../components/Button';
import { CenteredSpinner } from '../../components/Spinner';
import { TextField } from '../../components/TextField';
import { colors, radius, spacing } from '../../theme';

interface PairedField {
  baseKey: string;
  label: string;
  multiline?: boolean;
}

interface SingleField {
  key: string;
  label: string;
  maxLength?: number;
}

type Row = { id: number; sort_order: number; is_active: boolean } & Record<string, unknown>;

/**
 * One generic admin list editor for the landing page's repeatable,
 * bilingual (fr/ar) sections — slides, services, trust-band items, and
 * how-it-works steps are all structurally the same (an ordered list of
 * rows, each with an optional single field like an icon plus one or more
 * fr/ar text-field pairs), so this is configured per-resource instead of
 * copy-pasted four times.
 */
export function BilingualListManager<T extends Row>({
  title,
  description,
  singleField,
  pairedFields,
  list,
  create,
  update,
  remove,
  reorder,
  rowLabel,
}: {
  title: string;
  description: string;
  singleField?: SingleField;
  pairedFields: PairedField[];
  list: () => Promise<T[]>;
  create: (input: Record<string, unknown>) => Promise<T>;
  update: (id: number, input: Record<string, unknown>) => Promise<T>;
  remove: (id: number) => Promise<void>;
  reorder: (ids: number[]) => Promise<T[]>;
  rowLabel: (item: T) => string;
}) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    list()
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const emptyForm = (): Record<string, string> => {
    const f: Record<string, string> = {};
    if (singleField) f[singleField.key] = '';
    pairedFields.forEach((pf) => {
      f[`${pf.baseKey}_fr`] = '';
      f[`${pf.baseKey}_ar`] = '';
    });
    return f;
  };

  const handleCreate = async () => {
    setCreating(true);
    setError(undefined);
    try {
      await create(form);
      setForm(emptyForm());
      setShowForm(false);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Supprimer cet élément ?')) return;
    await remove(id);
    load();
  };

  const handleToggleActive = async (item: T) => {
    const updated = await update(item.id, { is_active: !item.is_active });
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setItems(reordered);
    const updated = await reorder(reordered.map((i) => i.id));
    setItems(updated);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: colors.text, margin: 0 }}>{title}</h2>
        <Button
          label={showForm ? 'Annuler' : 'Ajouter'}
          onClick={() => {
            setForm(emptyForm());
            setShowForm((s) => !s);
          }}
          variant={showForm ? 'outline' : 'primary'}
        />
      </div>
      <p style={{ fontSize: 13.5, color: colors.textMuted, margin: `0 0 ${spacing.md}px` }}>{description}</p>

      {showForm && (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg }}>
          {singleField && (
            <TextField
              label={singleField.label}
              value={form[singleField.key] ?? ''}
              maxLength={singleField.maxLength}
              onChange={(e) => setForm((f) => ({ ...f, [singleField.key]: e.target.value }))}
              style={{ maxWidth: 120 }}
            />
          )}
          {pairedFields.map((pf) => (
            <div key={pf.baseKey} style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.xs }}>
              <div style={{ flex: 1 }}>
                <TextField
                  label={`${pf.label} (Français)`}
                  value={form[`${pf.baseKey}_fr`] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, [`${pf.baseKey}_fr`]: e.target.value }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label={`${pf.label} (العربية)`}
                  value={form[`${pf.baseKey}_ar`] ?? ''}
                  dir="rtl"
                  onChange={(e) => setForm((f) => ({ ...f, [`${pf.baseKey}_ar`]: e.target.value }))}
                />
              </div>
            </div>
          ))}
          {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: spacing.sm }}>{error}</p>}
          <Button label="Enregistrer" onClick={handleCreate} loading={creating} />
        </div>
      )}

      {loading ? (
        <CenteredSpinner />
      ) : (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md }}>
          {items.length === 0 && (
            <p style={{ padding: spacing.lg, textAlign: 'center', color: colors.textMuted, margin: 0 }}>Aucun élément pour le moment.</p>
          )}
          {items.map((item, index) => (
            <Row
              key={item.id}
              item={item}
              index={index}
              total={items.length}
              singleField={singleField}
              pairedFields={pairedFields}
              rowLabel={rowLabel}
              expanded={expandedId === item.id}
              onToggleExpand={() => setExpandedId((id) => (id === item.id ? null : item.id))}
              onMove={handleMove}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
              onSaved={(updated) => setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))}
              update={update}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Row<T extends Row>({
  item,
  index,
  total,
  singleField,
  pairedFields,
  rowLabel,
  expanded,
  onToggleExpand,
  onMove,
  onToggleActive,
  onDelete,
  onSaved,
  update,
}: {
  item: T;
  index: number;
  total: number;
  singleField?: SingleField;
  pairedFields: PairedField[];
  rowLabel: (item: T) => string;
  expanded: boolean;
  onToggleExpand: () => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onToggleActive: (item: T) => void;
  onDelete: (id: number) => void;
  onSaved: (updated: T) => void;
  update: (id: number, input: Record<string, unknown>) => Promise<T>;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    const d: Record<string, string> = {};
    if (singleField) d[singleField.key] = String(item[singleField.key] ?? '');
    pairedFields.forEach((pf) => {
      d[`${pf.baseKey}_fr`] = String(item[`${pf.baseKey}_fr`] ?? '');
      d[`${pf.baseKey}_ar`] = String(item[`${pf.baseKey}_ar`] ?? '');
    });
    setDraft(d);
    onToggleExpand();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await update(item.id, draft);
      onSaved(updated);
      onToggleExpand();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ borderBottom: `1px solid ${colors.border}`, padding: spacing.md }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <button
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            style={{ border: 'none', background: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1, fontSize: 12, padding: 0, lineHeight: 1 }}
          >
            ▲
          </button>
          <button
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            style={{ border: 'none', background: 'none', cursor: index === total - 1 ? 'default' : 'pointer', opacity: index === total - 1 ? 0.3 : 1, fontSize: 12, padding: 0, lineHeight: 1 }}
          >
            ▼
          </button>
        </div>
        {singleField && <span style={{ fontSize: 20 }}>{String(item[singleField.key] ?? '')}</span>}
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: colors.text }}>{rowLabel(item)}</span>
        <button
          onClick={() => onToggleActive(item)}
          style={{
            border: 'none',
            borderRadius: 999,
            padding: '3px 10px',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: item.is_active ? colors.successSoft : colors.dangerSoft,
            color: item.is_active ? colors.success : colors.danger,
          }}
        >
          {item.is_active ? 'Visible' : 'Masqué'}
        </button>
        <button onClick={expanded ? onToggleExpand : startEdit} style={{ border: 'none', background: 'none', color: colors.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {expanded ? 'Fermer' : 'Modifier'}
        </button>
        <button onClick={() => onDelete(item.id)} style={{ border: 'none', background: 'none', color: colors.danger, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Supprimer
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTop: `1px dashed ${colors.border}` }}>
          {singleField && (
            <TextField
              label={singleField.label}
              value={draft[singleField.key] ?? ''}
              maxLength={singleField.maxLength}
              onChange={(e) => setDraft((d) => ({ ...d, [singleField.key]: e.target.value }))}
              style={{ maxWidth: 120 }}
            />
          )}
          {pairedFields.map((pf) => (
            <div key={pf.baseKey} style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.xs }}>
              <div style={{ flex: 1 }}>
                <TextField
                  label={`${pf.label} (Français)`}
                  value={draft[`${pf.baseKey}_fr`] ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [`${pf.baseKey}_fr`]: e.target.value }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label={`${pf.label} (العربية)`}
                  value={draft[`${pf.baseKey}_ar`] ?? ''}
                  dir="rtl"
                  onChange={(e) => setDraft((d) => ({ ...d, [`${pf.baseKey}_ar`]: e.target.value }))}
                />
              </div>
            </div>
          ))}
          <Button label="Enregistrer les modifications" onClick={handleSave} loading={saving} />
        </div>
      )}
    </div>
  );
}
