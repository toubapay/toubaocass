import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getStoredLanguage, setStoredLanguage, type SupportedLanguage } from '../i18n/i18n';
import { fetchLendingContent, type LendingContent } from './api';
import './landing.css';

const FALLBACK_SLIDE_IDS = ['intercity', 'demLegui', 'livraison', 'anando'] as const;
const FALLBACK_SLIDE_EMOJI: Record<(typeof FALLBACK_SLIDE_IDS)[number], string> = {
  intercity: '🚌',
  demLegui: '🚕',
  livraison: '📦',
  anando: '🚗',
};

const FALLBACK_SERVICE_IDS = ['intercity', 'demLegui', 'anando', 'livraison', 'cargaison', 'camion', 'location'] as const;
const FALLBACK_SERVICE_ICON: Record<(typeof FALLBACK_SERVICE_IDS)[number], string> = {
  intercity: '🚌',
  demLegui: '🚕',
  anando: '🚗',
  livraison: '📦',
  cargaison: '🛳️',
  camion: '🚛',
  location: '🔑',
};

const FALLBACK_STEP_IDS = ['step1', 'step2', 'step3'] as const;

const SLIDE_INTERVAL_MS = 6000;

interface DisplaySlide {
  key: string;
  emoji: string;
  eyebrow: string;
  title: string;
  subtitle: string;
}

interface DisplayService {
  key: string;
  icon: string;
  title: string;
  description: string;
}

interface DisplayTrustItem {
  key: string;
  icon: string;
  text: string;
}

interface DisplayStep {
  key: string;
  title: string;
  description: string;
}

interface DisplayNavLink {
  key: string;
  label: string;
  href: string;
}

export function LandingPage() {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState<SupportedLanguage>(getStoredLanguage());
  const isRtl = language === 'ar';
  const [activeSlide, setActiveSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [content, setContent] = useState<LendingContent | null>(null);

  // Admin-managed content, loaded from the backend — the page still
  // renders its built-in defaults immediately (below) so there's no
  // blank/loading flash and no hard dependency on this request succeeding.
  useEffect(() => {
    fetchLendingContent()
      .then(setContent)
      .catch(() => {});
  }, []);

  const pick = useCallback((fr: string, ar: string) => (isRtl ? ar : fr), [isRtl]);

  const slides: DisplaySlide[] = useMemo(() => {
    if (content?.slides.length) {
      return content.slides.map((s) => ({
        key: String(s.id),
        emoji: s.emoji,
        eyebrow: pick(s.eyebrow_fr, s.eyebrow_ar),
        title: pick(s.title_fr, s.title_ar),
        subtitle: pick(s.subtitle_fr, s.subtitle_ar),
      }));
    }
    return FALLBACK_SLIDE_IDS.map((id) => ({
      key: id,
      emoji: FALLBACK_SLIDE_EMOJI[id],
      eyebrow: t(`lending.slides.${id}.eyebrow`),
      title: t(`lending.slides.${id}.title`),
      subtitle: t(`lending.slides.${id}.subtitle`),
    }));
  }, [content, pick, t]);

  const services: DisplayService[] = useMemo(() => {
    if (content?.services.length) {
      return content.services.map((s) => ({
        key: String(s.id),
        icon: s.icon,
        title: pick(s.title_fr, s.title_ar),
        description: pick(s.description_fr, s.description_ar),
      }));
    }
    return FALLBACK_SERVICE_IDS.map((id) => ({
      key: id,
      icon: FALLBACK_SERVICE_ICON[id],
      title: t(`lending.services.${id}.title`),
      description: t(`lending.services.${id}.description`),
    }));
  }, [content, pick, t]);

  const trustItems: DisplayTrustItem[] = useMemo(() => {
    if (content?.trust_items.length) {
      return content.trust_items.map((item) => ({ key: String(item.id), icon: item.icon, text: pick(item.text_fr, item.text_ar) }));
    }
    return [
      { key: 'payment', icon: '💳', text: t('lending.trust.payment') },
      { key: 'tracking', icon: '📍', text: t('lending.trust.tracking') },
      { key: 'ratings', icon: '⭐', text: t('lending.trust.ratings') },
      { key: 'sos', icon: '🆘', text: t('lending.trust.sos') },
    ];
  }, [content, pick, t]);

  const steps: DisplayStep[] = useMemo(() => {
    if (content?.steps.length) {
      return content.steps.map((s) => ({ key: String(s.id), title: pick(s.title_fr, s.title_ar), description: pick(s.description_fr, s.description_ar) }));
    }
    return FALLBACK_STEP_IDS.map((id) => ({
      key: id,
      title: t(`lending.howItWorks.${id}.title`),
      description: t(`lending.howItWorks.${id}.description`),
    }));
  }, [content, pick, t]);

  const navLinks: DisplayNavLink[] = useMemo(() => {
    if (content?.settings.nav_links.length) {
      return content.settings.nav_links.map((link, index) => ({ key: String(index), label: pick(link.label_fr, link.label_ar), href: link.href }));
    }
    return [
      { key: 'services', label: t('lending.nav.services'), href: '#services' },
      { key: 'howItWorks', label: t('lending.nav.howItWorks'), href: '#comment-ca-marche' },
      { key: 'contact', label: t('lending.nav.contact'), href: '#contact' },
    ];
  }, [content, pick, t]);

  const brandName = content?.settings.brand_name ?? 'Intercity';
  const logoUrl = content?.settings.logo_url ?? '/icons/icon-192.png';
  const openAppLabel = content ? pick(content.settings.open_app_label_fr, content.settings.open_app_label_ar) : t('lending.nav.openApp');
  const heroCtaPrimary = content ? pick(content.settings.hero_cta_primary_fr, content.settings.hero_cta_primary_ar) : t('lending.heroCtaPrimary');
  const heroCtaSecondary = content ? pick(content.settings.hero_cta_secondary_fr, content.settings.hero_cta_secondary_ar) : t('lending.heroCtaSecondary');
  const finalCtaTitle = content ? pick(content.settings.final_cta_title_fr, content.settings.final_cta_title_ar) : t('lending.finalCta.title');
  const finalCtaSubtitle = content ? pick(content.settings.final_cta_subtitle_fr, content.settings.final_cta_subtitle_ar) : t('lending.finalCta.subtitle');
  const finalCtaButton = content ? pick(content.settings.final_cta_button_fr, content.settings.final_cta_button_ar) : t('lending.finalCta.button');
  const footerBlurb = content ? pick(content.settings.footer_blurb_fr, content.settings.footer_blurb_ar) : t('lending.footer.blurb');
  const footerCompany = content ? pick(content.settings.footer_company_fr, content.settings.footer_company_ar) : t('lending.footer.company');

  const rootStyle = content
    ? ({
        '--primary': content.settings.primary_color,
        '--primary-dark': content.settings.primary_dark_color,
        '--accent': content.settings.accent_color,
      } as React.CSSProperties)
    : undefined;

  const restartTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveSlide((s) => (s + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);
  }, [slides.length]);

  useEffect(() => {
    restartTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [restartTimer]);

  // The slide count can change once admin-managed content arrives — keep
  // the active index in range rather than pointing past the new array end.
  useEffect(() => {
    setActiveSlide((s) => (s >= slides.length ? 0 : s));
  }, [slides.length]);

  const goTo = (index: number) => {
    setActiveSlide(((index % slides.length) + slides.length) % slides.length);
    restartTimer();
  };

  const toggleLanguage = () => {
    const next: SupportedLanguage = language === 'ar' ? 'fr' : 'ar';
    setLanguage(next);
    setStoredLanguage(next);
  };

  return (
    <div className="lending-root" dir={isRtl ? 'rtl' : 'ltr'} lang={i18n.language} style={rootStyle}>
      <header className="lending-header">
        <div className="lending-header-inner">
          <a href="#top" className="lending-brand">
            <img src={logoUrl} alt={brandName} />
            {brandName}
          </a>
          <nav className="lending-nav">
            <div className="lending-nav-links">
              {navLinks.map((link) => (
                <a key={link.key} href={link.href}>
                  {link.label}
                </a>
              ))}
            </div>
            <button type="button" className="lending-lang-toggle" onClick={toggleLanguage}>
              {t('lending.languageToggle')}
            </button>
            <a className="lending-cta-button" href="/login">
              {openAppLabel}
            </a>
          </nav>
        </div>
      </header>

      <section className="lending-hero" id="top">
        <div className="lending-hero-inner">
          {slides.map((slide, index) => (
            <div key={slide.key} className={`lending-slide ${index === activeSlide ? 'active' : ''}`} aria-hidden={index !== activeSlide}>
              <div className="lending-slide-grid">
                <div>
                  <span className="lending-slide-eyebrow">{slide.eyebrow}</span>
                  <h1 className="lending-slide-title">{slide.title}</h1>
                  <p className="lending-slide-subtitle">{slide.subtitle}</p>
                  <div className="lending-slide-actions">
                    <a className="lending-cta-button" href="/login">
                      {heroCtaPrimary}
                    </a>
                    <a className="lending-cta-button ghost" href="#services">
                      {heroCtaSecondary}
                    </a>
                  </div>
                </div>
                <div className="lending-slide-visual">
                  <div className="lending-slide-emoji-disc" role="img" aria-label={slide.eyebrow}>
                    {slide.emoji}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button className="lending-hero-arrow prev" onClick={() => goTo(activeSlide - 1)} aria-label={t('lending.prevSlide')}>
            {isRtl ? '›' : '‹'}
          </button>
          <button className="lending-hero-arrow next" onClick={() => goTo(activeSlide + 1)} aria-label={t('lending.nextSlide')}>
            {isRtl ? '‹' : '›'}
          </button>

          <div className="lending-hero-controls">
            <div className="lending-hero-dots">
              {slides.map((slide, index) => (
                <button
                  key={slide.key}
                  className={`lending-hero-dot ${index === activeSlide ? 'active' : ''}`}
                  onClick={() => goTo(index)}
                  aria-label={t('lending.goToSlide', { n: index + 1 })}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="lending-trust-band">
        {trustItems.map((item) => (
          <div className="lending-trust-item" key={item.key}>
            <span className="icon">{item.icon}</span> {item.text}
          </div>
        ))}
      </div>

      <section className="lending-section" id="services">
        <div className="lending-container">
          <div className="lending-section-head">
            <span className="lending-eyebrow">{t('lending.services.eyebrow')}</span>
            <h2 className="lending-section-title">{t('lending.services.title')}</h2>
            <p className="lending-section-subtitle">{t('lending.services.subtitle')}</p>
          </div>
          <div className="lending-services-grid">
            {services.map((service) => (
              <div className="lending-service-card" key={service.key}>
                <div className="lending-service-icon">{service.icon}</div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lending-section alt" id="comment-ca-marche">
        <div className="lending-container">
          <div className="lending-section-head">
            <span className="lending-eyebrow">{t('lending.howItWorks.eyebrow')}</span>
            <h2 className="lending-section-title">{t('lending.howItWorks.title')}</h2>
          </div>
          <div className="lending-steps">
            {steps.map((step, index) => (
              <div className="lending-step" key={step.key}>
                <div className="lending-step-number">{index + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lending-final-cta" id="contact">
        <h2>{finalCtaTitle}</h2>
        <p>{finalCtaSubtitle}</p>
        <div className="lending-slide-actions">
          <a className="lending-cta-button" href="/login">
            {finalCtaButton}
          </a>
        </div>
      </section>

      <footer className="lending-footer">
        <div className="lending-container">
          <div className="lending-footer-grid">
            <div>
              <div className="lending-footer-brand">
                <img src={logoUrl} alt={brandName} />
                {brandName}
              </div>
              <p>{footerBlurb}</p>
            </div>
            <div>
              <h4>{t('lending.footer.servicesHeading')}</h4>
              <ul>
                {services.slice(0, 5).map((service) => (
                  <li key={service.key}>
                    <a href="#services">{service.title}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>{t('lending.footer.contactHeading')}</h4>
              <ul>
                <li>
                  <a href="/login">{openAppLabel}</a>
                </li>
                <li>
                  <span>{footerCompany}</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="lending-footer-bottom">
            <span>
              © {new Date().getFullYear()} {brandName} — {footerCompany}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
