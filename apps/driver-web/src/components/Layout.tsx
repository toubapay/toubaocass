import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useModuleStatus } from '../context/ModuleStatusContext';
import { colors, radius, spacing } from '../theme';

const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.trips', icon: '🚗', end: true },
  { to: '/deliveries', labelKey: 'nav.deliveries', icon: '📦', end: false, module: 'livraison' },
  { to: '/fleet', labelKey: 'nav.fleet', icon: '🚙', end: false },
  { to: '/kyc', labelKey: 'nav.kyc', icon: '🛡️', end: false },
  { to: '/profile', labelKey: 'nav.profile', icon: '👤', end: false },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { isModuleEnabled } = useModuleStatus();
  const items = NAV_ITEMS.filter((item) => !item.module || isModuleEnabled(item.module));

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: `${spacing.md}px ${spacing.lg}px`,
          backgroundColor: colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
          boxShadow: '0 2px 10px rgba(19, 26, 23, 0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, minWidth: 0, flexShrink: 1 }}>
          <img src="/favicon.svg" alt="" width={28} height={28} style={{ flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Intercity</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.85)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              Chauffeur
            </span>
          </div>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          padding: spacing.lg,
          paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
        }}
      >
        {children}
      </main>

      {/* Opaque backdrop covering the floating nav's footprint so scrolled
          content never peeks through the gaps around it. */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'calc(92px + env(safe-area-inset-bottom))',
          backgroundColor: colors.background,
          zIndex: 99,
        }}
      />

      <nav
        style={{
          position: 'fixed',
          bottom: 'calc(14px + env(safe-area-inset-bottom))',
          left: 14,
          right: 14,
          display: 'flex',
          justifyContent: 'center',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          willChange: 'transform',
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            maxWidth: 480,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            boxShadow: '0 6px 20px rgba(19, 26, 23, 0.18)',
            padding: 6,
            gap: 2,
          }}
        >
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: `${spacing.sm}px 0`,
                borderRadius: radius.md,
                textDecoration: 'none',
                backgroundColor: isActive ? colors.accentSoft : 'transparent',
                color: isActive ? colors.primary : colors.textMuted,
                fontSize: 11.5,
                fontWeight: isActive ? 700 : 600,
              })}
            >
              <span style={{ fontSize: 19 }}>{item.icon}</span>
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
