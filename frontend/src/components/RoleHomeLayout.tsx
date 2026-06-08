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
  { title: string; imageSrc: string; alt: string; href?: string; hrefLabel?: string }

type RoleHomeLayoutProps = {
  roleLabel: string
  homeTitle: string
  welcomeName: string | null | undefined
  welcomeFallback: string
  welcomeDescription: string
  sidebarItems: SidebarItem[]
  moduleCards: ModuleCard[]
  onSidebarClick: (key: string) => void
}

const RoleHomeLayout: React.FC<RoleHomeLayoutProps> = ({
  roleLabel,
  homeTitle,
  welcomeName,
  welcomeFallback,
  welcomeDescription,
  sidebarItems,
  onSidebarClick,
}) => {
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const slides = useMemo<Slide[]>(() => {
    const baseSlide: Slide = {
      title: 'Bienvenida',
      imageSrc: '/carrusel/Bienvenida.png',
      alt: `Bienvenida ${roleLabel}`,
    }

    if (roleLabel === 'Coordinador') {
      return [
        baseSlide,
        { title: 'Acceso Coordinador', imageSrc: '/carrusel/Acceso_Coordinador.png', alt: 'Acceso Coordinador' },
        { title: 'Acceso Coordinador 2', imageSrc: '/carrusel/Acceso_Coordinador2.png', alt: 'Acceso Coordinador 2' },
        { title: 'Buenas Prácticas', imageSrc: '/carrusel/BP_Coordinador.png', alt: 'Buenas prácticas Coordinador' },
        {
          title: 'Manual',
          imageSrc: '/carrusel/Manual.png',
          alt: 'Manual de usuario',
          href: 'frontend/public/Manual de Usuario RA_Manager.pdf',
          hrefLabel: 'Abrir manual',
        },
      ]
    }

    if (roleLabel === 'Docente') {
      return [
        baseSlide,
        { title: 'Acceso Docente', imageSrc: '/carrusel/Acceso_Docente.png', alt: 'Acceso Docente' },
        { title: 'Buenas Prácticas', imageSrc: '/carrusel/BP_Docente.png', alt: 'Buenas prácticas Docente' },
        {
          title: 'Manual',
          imageSrc: '/carrusel/Manual.png',
          alt: 'Manual de usuario',
          href: 'frontend/public/Manual de Usuario RA_Manager.pdf',
          hrefLabel: 'Abrir manual',
        },
      ]
    }

    return [
      baseSlide,
      { title: 'Acceso Estudiante', imageSrc: '/carrusel/Acceso_Estudiante.png', alt: 'Acceso Estudiante' },
      { title: 'Buenas Prácticas', imageSrc: '/carrusel/BP_Estudiante.png', alt: 'Buenas prácticas Estudiante' },
      {
        title: 'Manual',
        imageSrc: '/carrusel/Manual.png',
        alt: 'Manual de usuario',
        href: 'frontend/public/Manual de Usuario RA_Manager.pdf',
        hrefLabel: 'Abrir manual',
      },
    ]
  }, [roleLabel])

  useEffect(() => {
    if (isPaused || slides.length <= 1) return

    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length)
    }, 6000)

    return () => window.clearInterval(timer)
  }, [isPaused, slides.length])

  const currentSlide = slides[activeSlide]
  const goToSlide = (index: number) => setActiveSlide(index)
  const goPrev = () => setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length)
  const goNext = () => setActiveSlide((prev) => (prev + 1) % slides.length)

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
              <h4 className="mb-2">¡Hola, {welcomeName || welcomeFallback}!</h4>
              <p className="text-muted mb-0">{welcomeDescription}</p>
            </div>
          </section>

          <section
            className="role-carousel role-carousel--image-only mb-4"
            role="region"
            aria-label="Carrusel de imágenes"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <button type="button" className="role-carousel__control" onClick={goPrev} aria-label="Imagen anterior">
              <i className="bi bi-chevron-left" />
            </button>

            <div className="role-carousel__viewport role-carousel__viewport--image-only">
              <article key={currentSlide.title} className="role-carousel__slide is-active">
                {currentSlide.href ? (
                  <a className="role-carousel__image-link" href={currentSlide.href} target="_blank" rel="noreferrer">
                    <img className="role-carousel__image" src={currentSlide.imageSrc} alt={currentSlide.alt} />
                  </a>
                ) : (
                  <img className="role-carousel__image" src={currentSlide.imageSrc} alt={currentSlide.alt} />
                )}
              </article>
            </div>

            <button type="button" className="role-carousel__control" onClick={goNext} aria-label="Imagen siguiente">
              <i className="bi bi-chevron-right" />
            </button>
          </section>

          <div className="role-carousel__dots role-carousel__dots--image-only" aria-hidden="true">
            {slides.map((slide, index) => (
              <button
                key={`${slide.title}-dot`}
                type="button"
                className={`role-carousel__dot ${index === activeSlide ? 'is-active' : ''}`}
                onClick={() => goToSlide(index)}
              />
            ))}
          </div>

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
