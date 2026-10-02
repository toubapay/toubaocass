import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getStoredLanguage, setStoredLanguage, type SupportedLanguage } from '../i18n/i18n';
import './landing.css';

const SLIDE_IDS = ['intercity', 'demLegui', 'livraison', 'anando'] as const;
const SLIDE_EMOJI: Record<(typeof SLIDE_IDS)[number], string> = {
  intercity: '🚌',
  demLegui: '🚕',
  livraison: '📦',
  anando: '🚗',
};

const SERVICE_IDS = ['intercity', 'demLegui', 'anando', 'livraison', 'cargaison', 'camion', 'location'] as const;
const SERVICE_ICON: Record<(typeof SERVICE_IDS)[number], string> = {
  intercity: '🚌',
  demLegui: '🚕',
  anando: '🚗',
  livraison: '📦',
  cargaison: '🛳️',
  camion: '🚛',
  location: '🔑',
};

const STEP_IDS = ['step1', 'step2', 'step3'] as const;

const SLIDE_INTERVAL_MS = 6000;

export function LandingPage() {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState<SupportedLanguage>(getStoredLanguage());
  const isRtl = language === 'ar';
  const [activeSlide, setActiveSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const restartTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveSlide((s) => (s + 1) % SLIDE_IDS.length);
    }, SLIDE_INTERVAL_MS);
  }, []);

  useEffect(() => {
    restartTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [restartTimer]);

  const goTo = (index: number) => {
    setActiveSlide(((index % SLIDE_IDS.length) + SLIDE_IDS.length) % SLIDE_IDS.length);
    restartTimer();
  };

  const toggleLanguage = () => {
    const next: SupportedLanguage = language === 'ar' ? 'fr' : 'ar';
    setLanguage(next);
    setStoredLanguage(next);
  };

  return (
    <div className="lending-root" dir={isRtl ? 'rtl' : 'ltr'} lang={i18n.language}>
      <header className="lending-header">
        <div className="lending-header-inner">
          <a href="#top" className="lending-brand">
            <img src="/icons/icon-192.png" alt="Intercity" />
            Intercity
          </a>
          <nav className="lending-nav">
            <div className="lending-nav-links">
              <a href="#services">{t('lending.nav.services')}</a>
              <a href="#comment-ca-marche">{t('lending.nav.howItWorks')}</a>
              <a href="#contact">{t('lending.nav.contact')}</a>
            </div>
            <button type="button" className="lending-lang-toggle" onClick={toggleLanguage}>
              {t('lending.languageToggle')}
            </button>
            <a className="lending-cta-button" href="/login">
              {t('lending.nav.openApp')}
            </a>
          </nav>
        </div>
      </header>

      <section className="lending-hero" id="top">
        <div className="lending-hero-inner">
          {SLIDE_IDS.map((id, index) => (
            <div key={id} className={`lending-slide ${index === activeSlide ? 'active' : ''}`} aria-hidden={index !== activeSlide}>
              <div className="lending-slide-grid">
                <div>
                  <span className="lending-slide-eyebrow">{t(`lending.slides.${id}.eyebrow`)}</span>
                  <h1 className="lending-slide-title">{t(`lending.slides.${id}.title`)}</h1>
                  <p className="lending-slide-subtitle">{t(`lending.slides.${id}.subtitle`)}</p>
                  <div className="lending-slide-actions">
                    <a className="lending-cta-button" href="/login">
                      {t('lending.heroCtaPrimary')}
                    </a>
                    <a className="lending-cta-button ghost" href="#services">
                      {t('lending.heroCtaSecondary')}
                    </a>
                  </div>
                </div>
                <div className="lending-slide-visual">
                  <div className="lending-slide-emoji-disc" role="img" aria-label={t(`lending.slides.${id}.eyebrow`)}>
                    {SLIDE_EMOJI[id]}
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
              {SLIDE_IDS.map((id, index) => (
                <button
                  key={id}
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
        <div className="lending-trust-item">
          <span className="icon">💳</span> {t('lending.trust.payment')}
        </div>
        <div className="lending-trust-item">
          <span className="icon">📍</span> {t('lending.trust.tracking')}
        </div>
        <div className="lending-trust-item">
          <span className="icon">⭐</span> {t('lending.trust.ratings')}
        </div>
        <div className="lending-trust-item">
          <span className="icon">🆘</span> {t('lending.trust.sos')}
        </div>
      </div>

      <section className="lending-section" id="services">
        <div className="lending-container">
          <div className="lending-section-head">
            <span className="lending-eyebrow">{t('lending.services.eyebrow')}</span>
            <h2 className="lending-section-title">{t('lending.services.title')}</h2>
            <p className="lending-section-subtitle">{t('lending.services.subtitle')}</p>
          </div>
          <div className="lending-services-grid">
            {SERVICE_IDS.map((id) => (
              <div className="lending-service-card" key={id}>
                <div className="lending-service-icon">{SERVICE_ICON[id]}</div>
                <h3>{t(`lending.services.${id}.title`)}</h3>
                <p>{t(`lending.services.${id}.description`)}</p>
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
            {STEP_IDS.map((id, index) => (
              <div className="lending-step" key={id}>
                <div className="lending-step-number">{index + 1}</div>
                <h3>{t(`lending.howItWorks.${id}.title`)}</h3>
                <p>{t(`lending.howItWorks.${id}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lending-final-cta" id="contact">
        <h2>{t('lending.finalCta.title')}</h2>
        <p>{t('lending.finalCta.subtitle')}</p>
        <div className="lending-slide-actions">
          <a className="lending-cta-button" href="/login">
            {t('lending.finalCta.button')}
          </a>
        </div>
      </section>

      <footer className="lending-footer">
        <div className="lending-container">
          <div className="lending-footer-grid">
            <div>
              <div className="lending-footer-brand">
                <img src="/icons/icon-192.png" alt="Intercity" />
                Intercity
              </div>
              <p>{t('lending.footer.blurb')}</p>
            </div>
            <div>
              <h4>{t('lending.footer.servicesHeading')}</h4>
              <ul>
                {SERVICE_IDS.slice(0, 5).map((id) => (
                  <li key={id}>
                    <a href="#services">{t(`lending.services.${id}.title`)}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>{t('lending.footer.contactHeading')}</h4>
              <ul>
                <li>
                  <a href="/login">{t('lending.nav.openApp')}</a>
                </li>
                <li>
                  <span>{t('lending.footer.company')}</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="lending-footer-bottom">
            <span>{t('lending.footer.copyright', { year: new Date().getFullYear(), company: t('lending.footer.company') })}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
