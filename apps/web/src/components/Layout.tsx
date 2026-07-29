import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { colors, radius, spacing } from '../theme';
import { MyLocationBar } from './MyLocationBar';
import { ServicesIcon } from './ServicesIcon';

const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.home', icon: '🏠', end: true },
  { to: '/services', labelKey: 'nav.services', icon: 'services' as const, end: false },
  { to: '/bookings', labelKey: 'nav.bookings', icon: '🎫', end: false },
  { to: '/profile', labelKey: 'nav.profile', icon: '👤', end: false },
];

type NavItem = (typeof NAV_ITEMS)[number] & { state?: Record<string, unknown> };

// Swaps the "Bookings" tab for a module-specific "my trip(s)" link while the
// user is browsing that module — first matching prefix wins.
const MODULE_NAV_OVERRIDES: Array<{ matches: (pathname: string) => boolean; item: NavItem }> = [
  {
    matches: (p) => p.startsWith('/services/livraison') || p.startsWith('/deliveries'),
    item: { to: '/deliveries', labelKey: 'myDeliveries.title', icon: '📦', end: false },
  },
  {
    matches: (p) => p.startsWith('/services/anando'),
    item: { to: '/services/anando', labelKey: 'anando.myTripNav', icon: '🚗', end: false, state: { initialTab: 'mine' } },
  },
  {
    matches: (p) => p.startsWith('/services/dem-legui'),
    item: { to: '/services/dem-legui', labelKey: 'demLegui.myTripNav', icon: '🚕', end: false },
  },
];

function moduleNavOverride(pathname: string): NavItem | null {
  return MODULE_NAV_OVERRIDES.find((override) => override.matches(pathname))?.item ?? null;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();

  const override = moduleNavOverride(location.pathname);
  const navItems: NavItem[] = override ? NAV_ITEMS.map((item) => (item.to === '/bookings' ? override : item)) : NAV_ITEMS;

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
              {t('layout.tagline')}
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
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              state={item.state}
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
                  <span>{t(item.labelKey)}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
