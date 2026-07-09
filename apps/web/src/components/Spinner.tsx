import { colors } from '../theme';

export function Spinner({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `3px solid ${colors.border}`,
        borderTopColor: colors.primary,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto',
      }}
    />
  );
}

export function CenteredSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <Spinner />
    </div>
  );
}
