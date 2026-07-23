import { NavLink } from 'react-router-dom';

import type { AdminUser } from '../api/types';
import { colors, layout, radius, spacing } from '../theme';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  controllers: 'Contrôleur',
  support: 'Support',
  accountant: 'Comptable',
  superviseur: 'Superviseur',
};

interface NavItem {
  to: string;
  label: string;
  permission: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Tableau de bord', permission: 'view_dashboard' },
  { to: '/users', label: 'Utilisateurs', permission: 'manage_users' },
  { to: '/kyc', label: 'Vérification KYC', permission: 'manage_kyc' },
  { to: '/live-trips', label: 'Trajets en direct', permission: 'view_dashboard' },
  { to: '/security-alerts', label: 'Alertes de sécurité', permission: 'view_security_alerts' },
  { to: '/fares', label: 'Tarifs & commission', permission: 'manage_fares' },
  { to: '/financials', label: 'Finances', permission: 'view_financials' },
  { to: '/insurance/providers', label: 'Partenaires assurance', permission: 'manage_insurance' },
  { to: '/insurance/policies', label: 'Polices vendues', permission: 'manage_insurance' },
  { to: '/backups', label: 'Sauvegardes', permission: 'manage_backups' },
  { to: '/modules', label: 'Modules', permission: 'manage_modules' },
  { to: '/staff', label: 'Équipe back-office', permission: 'manage_admins' },
  { to: '/audit-log', label: "Journal d'audit", permission: 'manage_admins' },
  { to: '/settings', label: 'Paramètres', permission: 'manage_system_settings' },
];

export function Sidebar({ admin, onSignOut }: { admin: AdminUser; onSignOut: () => void }) {
  const items = NAV_ITEMS.filter((item) => admin.permissions.includes(item.permission));

  return (
    <div
      style={{
        width: layout.sidebarWidth,
        flexShrink: 0,
        height: '100%',
        backgroundColor: colors.primary,
        display: 'flex',
        flexDirection: 'column',
        padding: spacing.lg,
      }}
    >
      <div style={{ marginBottom: spacing.xl }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Intercity</span>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
          Back-office
        </span>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'block',
              padding: '10px 12px',
              borderRadius: radius.sm,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              backgroundColor: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: spacing.md }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>{admin.name}</p>
        <p style={{ margin: `2px 0 ${spacing.sm}px`, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
          {ROLE_LABELS[admin.role] ?? admin.role}
        </p>
        <button
          onClick={onSignOut}
          style={{
            border: 'none',
            background: 'none',
            padding: 0,
            fontSize: 13,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.85)',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Déconnexion
        </button>
      </div>
    </div>
  );
}
