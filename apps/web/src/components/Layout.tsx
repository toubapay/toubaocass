import React from 'react';
import { NavLink } from 'react-router-dom';

import { colors, radius, spacing } from '../theme';
import { MyLocationBar } from './MyLocationBar';
import { ServicesIcon } from './ServicesIcon';

const NAV_ITEMS = [
  { to: '/', label: 'Accueil', icon: '🏠', end: true },
  { to: '/services', label: 'Services', icon: 'services' as const, end: false },
  { to: '/bookings', label: 'Réservations', icon: '🎫', end: false },
  { to: '/profile', label: 'Profil', icon: '👤', end: false },
];

export function Layout({ children }: { children: React.ReactNode }) {
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
            <span style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>Intercity</span>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.85)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              Voyagez à partir de chez vous. Recherchez et réservez.
            </span>
          </div>
        </div>
        <MyLocationBar />
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

      {/* The floating nav below has margin on every side, unlike the old
          edge-to-edge bar — without this, scrolled page content is visible
          peeking through the gaps around it (left/right/below) as the page
          scrolls. This opaque, page-colored backdrop covers that whole
          footprint so nothing ever shows through. */}
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
          // Forces its own compositing layer so iOS Safari doesn't let the
          // fixed nav flicker/lag behind scrolled content while the address
          // bar is showing/hiding.
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
          {NAV_ITEMS.map((item) => (
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
                fontSize: 12.5,
                fontWeight: isActive ? 700 : 600,
              })}
            >
              {({ isActive }) => (
                <>
                  {item.icon === 'services' ? (
                    <ServicesIcon size={20} color={isActive ? colors.primary : colors.textMuted} />
                  ) : (
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                  )}
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
