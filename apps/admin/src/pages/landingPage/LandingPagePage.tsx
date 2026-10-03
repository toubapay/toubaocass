import { useState } from 'react';

import {
  createLandingService,
  createLandingSlide,
  createLandingStep,
  createLandingTrustItem,
  deleteLandingService,
  deleteLandingSlide,
  deleteLandingStep,
  deleteLandingTrustItem,
  listLandingServices,
  listLandingSlides,
  listLandingSteps,
  listLandingTrustItems,
  reorderLandingServices,
  reorderLandingSlides,
  reorderLandingSteps,
  reorderLandingTrustItems,
  updateLandingService,
  updateLandingSlide,
  updateLandingStep,
  updateLandingTrustItem,
} from '../../api/landingPage';
import { colors, radius, spacing } from '../../theme';
import { BilingualListManager } from './BilingualListManager';
import { GeneralSettingsTab } from './GeneralSettingsTab';

type Tab = 'general' | 'slides' | 'services' | 'trust' | 'steps';

const TABS: { key: Tab; label: string }[] = [
  { key: 'general', label: 'Général' },
  { key: 'slides', label: 'Diapositives' },
  { key: 'services', label: 'Services' },
  { key: 'trust', label: 'Repères de confiance' },
  { key: 'steps', label: 'Comment ça marche' },
];

export function LandingPagePage() {
  const [tab, setTab] = useState<Tab>('general');

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: `0 0 ${spacing.xs}px` }}>Page de présentation</h1>
      <p style={{ fontSize: 14, color: colors.textMuted, margin: `0 0 ${spacing.lg}px` }}>
        Contenu, design et sections de la page publique de présentation (<code>/lending</code>) — couleurs, logo, barre de
        navigation, diapositives, cartes de service, et plus, sans déploiement.
      </p>

      <div style={{ display: 'flex', gap: spacing.xs, marginBottom: spacing.lg, borderBottom: `1px solid ${colors.border}`, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              border: 'none',
              background: 'none',
              padding: `${spacing.sm}px ${spacing.md}px`,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              color: tab === t.key ? colors.primary : colors.textMuted,
              borderBottom: tab === t.key ? `2px solid ${colors.primary}` : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && <GeneralSettingsTab />}

      {tab === 'slides' && (
        <BilingualListManager
          title="Diapositives du carrousel"
          description="Défilent automatiquement en haut de la page. Chaque diapositive a un mot-clé, un titre, un sous-titre et un émoji."
          singleField={{ key: 'emoji', label: 'Émoji', maxLength: 8 }}
          pairedFields={[
            { baseKey: 'eyebrow', label: 'Mot-clé' },
            { baseKey: 'title', label: 'Titre' },
            { baseKey: 'subtitle', label: 'Sous-titre', multiline: true },
          ]}
          list={listLandingSlides}
          create={createLandingSlide}
          update={updateLandingSlide}
          remove={deleteLandingSlide}
          reorder={reorderLandingSlides}
          rowLabel={(item) => item.title_fr as string}
        />
      )}

      {tab === 'services' && (
        <BilingualListManager
          title="Cartes de service"
          description="Grille de services affichée sur la page, avec icône, titre et description."
          singleField={{ key: 'icon', label: 'Icône', maxLength: 8 }}
          pairedFields={[
            { baseKey: 'title', label: 'Titre' },
            { baseKey: 'description', label: 'Description', multiline: true },
          ]}
          list={listLandingServices}
          create={createLandingService}
          update={updateLandingService}
          remove={deleteLandingService}
          reorder={reorderLandingServices}
          rowLabel={(item) => item.title_fr as string}
        />
      )}

      {tab === 'trust' && (
        <BilingualListManager
          title="Repères de confiance"
          description="Petite bande de points de réassurance (paiement, suivi, notes, SOS…) affichée sous le carrousel."
          singleField={{ key: 'icon', label: 'Icône', maxLength: 8 }}
          pairedFields={[{ baseKey: 'text', label: 'Texte' }]}
          list={listLandingTrustItems}
          create={createLandingTrustItem}
          update={updateLandingTrustItem}
          remove={deleteLandingTrustItem}
          reorder={reorderLandingTrustItems}
          rowLabel={(item) => item.text_fr as string}
        />
      )}

      {tab === 'steps' && (
        <BilingualListManager
          title="Comment ça marche"
          description="Les étapes numérotées affichées dans la section « Comment ça marche »."
          pairedFields={[
            { baseKey: 'title', label: 'Titre' },
            { baseKey: 'description', label: 'Description', multiline: true },
          ]}
          list={listLandingSteps}
          create={createLandingStep}
          update={updateLandingStep}
          remove={deleteLandingStep}
          reorder={reorderLandingSteps}
          rowLabel={(item) => item.title_fr as string}
        />
      )}
    </div>
  );
}
