import { useEffect, useState } from 'react';

import { extractErrorMessage } from '../../api/client';
import { listBackups, runBackup } from '../../api/backups';
import type { BackupsResponse } from '../../api/types';
import { Button } from '../../components/Button';
import { CenteredSpinner } from '../../components/Spinner';
import { colors, radius, spacing } from '../../theme';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function BackupsPage() {
  const [data, setData] = useState<BackupsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [lastRunOutput, setLastRunOutput] = useState<string | undefined>();

  const load = () => {
    setLoading(true);
    listBackups()
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRun = async () => {
    setRunning(true);
    setError(undefined);
    setLastRunOutput(undefined);
    try {
      const res = await runBackup();
      setLastRunOutput(res.output);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setRunning(false);
    }
  };

  if (loading || !data) {
    return <CenteredSpinner />;
  }

  const sorted = [...data.backups].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: 0 }}>Sauvegardes</h1>
          <p style={{ fontSize: 13, color: colors.textMuted, margin: '4px 0 0' }}>
            Disque : {data.disk} · {data.reachable ? 'Accessible' : 'Injoignable'} · sauvegarde automatique quotidienne à 2h.
          </p>
        </div>
        <Button label="Lancer une sauvegarde" onClick={handleRun} loading={running} />
      </div>

      {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: spacing.sm }}>{error}</p>}
      {lastRunOutput && (
        <pre style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: spacing.sm, fontSize: 12, marginBottom: spacing.md, whiteSpace: 'pre-wrap' }}>
          {lastRunOutput}
        </pre>
      )}

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
              {['Fichier', 'Date', 'Taille'].map((label) => (
                <th key={label} style={{ padding: spacing.sm, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((backup) => (
              <tr key={backup.path} style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td style={{ padding: spacing.sm, fontSize: 13, color: colors.text, fontFamily: 'monospace' }}>{backup.path}</td>
                <td style={{ padding: spacing.sm, fontSize: 14, color: colors.textMuted }}>
                  {new Date(backup.date).toLocaleString('fr-FR')}
                </td>
                <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{formatSize(backup.size_bytes)}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: spacing.lg, textAlign: 'center', color: colors.textMuted }}>
                  Aucune sauvegarde pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
