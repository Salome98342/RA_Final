import React, { useEffect, useMemo, useState } from 'react'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import '@/styles/role-home-layout.css'

type SidebarItem = {
  key: string
  icon: string
  title: string
}

type ModuleCard = {
  key: string
  icon: string
  title: string
  desc: string
  iconClassName?: string
}

type Slide =
  | { kind: 'text'; title: string; text: string; tips?: string[]; ctaLabel?: string; ctaHref?: string; variant?: 'default' | 'highlight' }
  | { kind: 'modules'; title: string; text: string }

type RoleHomeLayoutProps = {
  roleLabel: string
  homeTitle: string
  welcomeName: string | null | undefined
  welcomeFallback: string
  welcomeDescription: string
  sidebarItems: SidebarItem[]
  moduleCards: ModuleCard[]
  onSidebarClick: (key: string) => void
  additionalSlides?: Slide[]
}

const RoleHomeLayout: React.FC<RoleHomeLayoutProps> = ({
  roleLabel,
  homeTitle,
  welcomeName,
  welcomeFallback,
  welcomeDescription,
  sidebarItems,
  moduleCards,
  onSidebarClick,
  additionalSlides,
}) => {
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const slides = useMemo<Slide[]>(() => ([
    {
      kind: 'text',
      title: 'Buenas prácticas',
      text: 'Revisa notificaciones al iniciar, valida la información antes de guardar cambios y usa mensajes de confirmación para evitar errores.',
      tips: [
        'Consulta primero alertas y pendientes para priorizar tareas.',
        'Verifica datos y fechas antes de crear o actualizar registros.',
        'Usa el botón ? para entender el contexto de cada pantalla.',
        'Evita cerrar la pestaña mientras un guardado esté en proceso.',
        'Si algo no carga, recarga la página y vuelve a intentar.',
        'Ante dudas funcionales, revisa el manual de usuario.',
      ],
    },
    {
      kind: 'modules',
      title: 'Accesos rápidos del módulo',
      text: 'Selecciona una tarjeta para abrir directamente la sección correspondiente.',
    },
    {
      kind: 'text',
      title: '¿Tienes dudas? Usa la ayuda',
      text: 'Si tienes dudas en la página actual, busca el ícono ? para ver ayuda contextual. También puedes consultar el manual de usuario.',
      ctaLabel: 'Leer manual de usuario',
      ctaHref: 'https://i.pinimg.com/originals/ee/12/a9/ee12a906d097550141060360ccc54fd2.jpg',
    },
    ...(additionalSlides || []),
  ]), [additionalSlides])

  useEffect(() => {
    if (isPaused) return

    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length)
    }, 6500)

    return () => window.clearInterval(timer)
  }, [isPaused, slides.length])

  const goToSlide = (index: number) => setActiveSlide(index)
  const goPrev = () => setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length)
  const goNext = () => setActiveSlide((prev) => (prev + 1) % slides.length)
  const currentSlide = slides[activeSlide]
  const sidebarIconByKey = useMemo(() => {
    return new Map(sidebarItems.map((item) => [item.key, item.icon]))
  }, [sidebarItems])

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel={roleLabel} />
      <div className="dash-wrapper">
        <Sidebar active="inicio" onClick={onSidebarClick} items={sidebarItems} />
        <main className="dash-content">
          <div className="content-title mb-3">
            <i className="bi bi-house-door-fill text-danger me-2"></i>
            {homeTitle}
          </div>

          <section className="card shadow-sm border-0 mb-4">
            <div className="card-body">
              <h4 className="mb-2">Bienvenido, {welcomeName || welcomeFallback}!</h4>
              <p className="text-muted mb-0">{welcomeDescription}</p>
            </div>
          </section>

          <section className="role-hero mb-4" aria-label="Información destacada">
            <div className="role-hero__badge">Portal Académico Univalle</div>
            <h3 className="role-hero__title">Mantente informado y usa cada módulo con claridad</h3>

            <div
              className="role-carousel"
              role="region"
              aria-live="polite"
              aria-label="Carrusel de recomendaciones"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <button type="button" className="role-carousel__control" onClick={goPrev} aria-label="Mensaje anterior">
                <i className="bi bi-chevron-left" />
              </button>

              <div className="role-carousel__viewport">
                <article
                  key={currentSlide.title}
                  className={`role-carousel__slide ${currentSlide.kind === 'modules' ? 'role-carousel__slide--modules' : ''} ${currentSlide.kind === 'text' && currentSlide.variant === 'highlight' ? 'role-carousel__slide--highlight' : ''} is-active`}
                >
                  <h4>{currentSlide.title}</h4>
                  <p>{currentSlide.text}</p>
                  {currentSlide.kind === 'text' && Array.isArray(currentSlide.tips) && currentSlide.tips.length > 0 && (
                    <ul className="role-carousel__tips">
                      {currentSlide.tips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  )}
                  {currentSlide.kind === 'text' && currentSlide.ctaHref && currentSlide.ctaLabel && (
                    <a
                      className="role-carousel__cta"
                      href={currentSlide.ctaHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="bi bi-book me-2" />
                      {currentSlide.ctaLabel}
                    </a>
                  )}
                  {currentSlide.kind === 'modules' && (
                    <div className="role-carousel-modules">
                      {moduleCards.map((item) => (
                        <button
                          key={`slide-${item.key}`}
                          type="button"
                          className="role-carousel-module-card"
                          onClick={() => onSidebarClick(item.key)}
                        >
                          <div className="role-carousel-module-card__title">
                            <i className={sidebarIconByKey.get(item.key) ?? item.icon} />
                            <span>{item.title}</span>
                          </div>
                          <small>{item.desc}</small>
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              </div>

              <button type="button" className="role-carousel__control" onClick={goNext} aria-label="Mensaje siguiente">
                <i className="bi bi-chevron-right" />
              </button>
            </div>

            <div className="role-carousel__dots" aria-hidden="true">
              {slides.map((slide, index) => (
                <button
                  key={`${slide.title}-dot`}
                  type="button"
                  className={`role-carousel__dot ${index === activeSlide ? 'is-active' : ''}`}
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>
          </section>

          <section className="role-support card shadow-sm border-0 mb-4" aria-label="Atención y soporte">
            <div className="card-body">
              <h5 className="role-support__title">
                <i className="bi bi-envelope-paper me-2" />
                Atención y soporte
              </h5>
              <p className="role-support__email mb-2">ra.manager.univalle@gmail.com</p>
              <p className="text-muted mb-0">
                Si requiere atención personalizada, solicítela por correo electrónico indicando el motivo de su consulta.
                Recibirá un correo de vuelta.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default RoleHomeLayout