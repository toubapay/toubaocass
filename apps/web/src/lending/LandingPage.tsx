import { useCallback, useEffect, useRef, useState } from 'react';

import './landing.css';

const SLIDES = [
  {
    eyebrow: 'Trajets Intercity',
    title: 'Voyagez entre les villes en toute sérénité',
    subtitle:
      "Réservez une place dans un trajet partagé entre conducteurs et passagers, à l'heure et au prix qui vous conviennent.",
    emoji: '🚌',
  },
  {
    eyebrow: 'Dem Légui',
    title: 'Une course à la demande en quelques secondes',
    subtitle: 'Indiquez où vous êtes et où vous allez — un conducteur en ligne à proximité accepte votre demande.',
    emoji: '🚕',
  },
  {
    eyebrow: 'Livraison',
    title: 'Envoyez un colis, où que vous soyez',
    subtitle: "Faites livrer un colis en ville ou entre villes, suivi en direct jusqu'à la remise.",
    emoji: '📦',
  },
  {
    eyebrow: 'Anando',
    title: 'Partagez un trajet instantané',
    subtitle: 'Comme du covoiturage : publiez ou rejoignez un trajet qui part maintenant.',
    emoji: '🚗',
  },
] as const;

const SERVICES = [
  {
    icon: '🚌',
    title: 'Trajets Intercity',
    description: 'Réservez une place dans un trajet intercity partagé, économique et confortable.',
  },
  {
    icon: '🚕',
    title: 'Dem Légui',
    description: 'Demandez une course maintenant, comme un taxi à la demande.',
  },
  {
    icon: '🚗',
    title: 'Anando',
    description: 'Partagez ou trouvez un trajet instantané, comme du covoiturage.',
  },
  {
    icon: '📦',
    title: 'Livraison',
    description: 'Envoi de colis en ville et entre villes, suivi en direct.',
  },
  {
    icon: '🛳️',
    title: 'Cargaison',
    description: 'Transport de marchandises en gros volume.',
  },
  {
    icon: '🚛',
    title: 'Camion',
    description: 'Déménagement et transport de gros objets.',
  },
  {
    icon: '🔑',
    title: 'Location',
    description: 'Location de véhicules avec ou sans chauffeur.',
  },
] as const;

const STEPS = [
  {
    title: 'Choisissez un service',
    description: "Trajet intercity, course à la demande, livraison ou covoiturage instantané : indiquez simplement où vous allez.",
  },
  {
    title: 'Réservez en quelques clics',
    description: 'Comparez les options disponibles, choisissez votre mode de paiement et confirmez.',
  },
  {
    title: 'Voyagez en toute confiance',
    description: 'Suivez votre trajet en direct et restez en contact avec votre conducteur jusqu\'à l\'arrivée.',
  },
] as const;

const SLIDE_INTERVAL_MS = 6000;

export function LandingPage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const restartTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveSlide((s) => (s + 1) % SLIDES.length);
    }, SLIDE_INTERVAL_MS);
  }, []);

  useEffect(() => {
    restartTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [restartTimer]);

  const goTo = (index: number) => {
    setActiveSlide(((index % SLIDES.length) + SLIDES.length) % SLIDES.length);
    restartTimer();
  };

  return (
    <div className="lending-root">
      <header className="lending-header">
        <div className="lending-header-inner">
          <a href="#top" className="lending-brand">
            <img src="/icons/icon-192.png" alt="Intercity" />
            Intercity
          </a>
          <nav className="lending-nav">
            <div className="lending-nav-links">
              <a href="#services">Services</a>
              <a href="#comment-ca-marche">Comment ça marche</a>
              <a href="#contact">Contact</a>
            </div>
            <a className="lending-cta-button" href="/login">
              Ouvrir l'application
            </a>
          </nav>
        </div>
      </header>

      <section className="lending-hero" id="top">
        <div className="lending-hero-inner">
          {SLIDES.map((slide, index) => (
            <div key={slide.title} className={`lending-slide ${index === activeSlide ? 'active' : ''}`} aria-hidden={index !== activeSlide}>
              <div className="lending-slide-grid">
                <div>
                  <span className="lending-slide-eyebrow">{slide.eyebrow}</span>
                  <h1 className="lending-slide-title">{slide.title}</h1>
                  <p className="lending-slide-subtitle">{slide.subtitle}</p>
                  <div className="lending-slide-actions">
                    <a className="lending-cta-button" href="/login">
                      Commencer maintenant
                    </a>
                    <a className="lending-cta-button ghost" href="#services">
                      Découvrir les services
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

          <button className="lending-hero-arrow prev" onClick={() => goTo(activeSlide - 1)} aria-label="Diapositive précédente">
            ‹
          </button>
          <button className="lending-hero-arrow next" onClick={() => goTo(activeSlide + 1)} aria-label="Diapositive suivante">
            ›
          </button>

          <div className="lending-hero-controls">
            <div className="lending-hero-dots">
              {SLIDES.map((slide, index) => (
                <button
                  key={slide.title}
                  className={`lending-hero-dot ${index === activeSlide ? 'active' : ''}`}
                  onClick={() => goTo(index)}
                  aria-label={`Aller à la diapositive ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="lending-trust-band">
        <div className="lending-trust-item">
          <span className="icon">💳</span> Paiement en espèces ou par portefeuille mobile
        </div>
        <div className="lending-trust-item">
          <span className="icon">📍</span> Suivi en direct de chaque trajet
        </div>
        <div className="lending-trust-item">
          <span className="icon">⭐</span> Conducteurs notés par la communauté
        </div>
        <div className="lending-trust-item">
          <span className="icon">🆘</span> Partage de position en cas de besoin
        </div>
      </div>

      <section className="lending-section" id="services">
        <div className="lending-container">
          <div className="lending-section-head">
            <span className="lending-eyebrow">Nos services</span>
            <h2 className="lending-section-title">Tout ce dont vous avez besoin, une seule application</h2>
            <p className="lending-section-subtitle">
              Du trajet intercity à la livraison de colis, Intercity rassemble tous vos déplacements et envois en un seul endroit.
            </p>
          </div>
          <div className="lending-services-grid">
            {SERVICES.map((service) => (
              <div className="lending-service-card" key={service.title}>
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
            <span className="lending-eyebrow">Comment ça marche</span>
            <h2 className="lending-section-title">Trois étapes, et vous êtes parti</h2>
          </div>
          <div className="lending-steps">
            {STEPS.map((step, index) => (
              <div className="lending-step" key={step.title}>
                <div className="lending-step-number">{index + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lending-final-cta" id="contact">
        <h2>Prêt à prendre la route ?</h2>
        <p>Créez votre compte en quelques instants et réservez votre premier trajet dès aujourd'hui.</p>
        <div className="lending-slide-actions">
          <a className="lending-cta-button" href="/login">
            Créer un compte
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
              <p>
                Une plateforme de mobilité et de livraison qui connecte conducteurs et passagers pour des trajets intercity, des
                courses à la demande, du covoiturage instantané et l'envoi de colis.
              </p>
            </div>
            <div>
              <h4>Services</h4>
              <ul>
                {SERVICES.slice(0, 5).map((service) => (
                  <li key={service.title}>
                    <a href="#services">{service.title}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Contact</h4>
              <ul>
                <li>
                  <a href="/login">Ouvrir l'application</a>
                </li>
                <li>
                  <span>Promobile Sénégal</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="lending-footer-bottom">
            <span>© {new Date().getFullYear()} Intercity — Promobile Sénégal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
