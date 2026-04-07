import { useRef, type ReactNode } from 'react'

type Props = { 
  headTone?: 'dark' | 'light'; 
  cardType?: 'asignatura' | 'ra';
  title: ReactNode; 
  subtitle?: ReactNode; 
  imageSrc?: string;
  imageVariant?: number;
  imageAlt?: string;
  onClick?: () => void; 
  onDoubleClick?: () => void;
  ariaLabel?: string 
}

const RA_TOP_IMAGES = [
  '/ra-defaults/fondos4.png',
  '/ra-defaults/fondos5.png'
]

const ASIGNATURA_TOP_IMAGES = [
  '/ra-defaults/fondos1.png',
  '/ra-defaults/fondos2.png',
  '/ra-defaults/fondos3.png'
]

const getCardImageIndex = (seed: string, total: number): number => {
  if (!seed || total <= 0) return 0

  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }

  return hash % total
}

const RaCard = ({ headTone = 'light', cardType = 'ra', title, subtitle, imageSrc, imageVariant, imageAlt, onClick, onDoubleClick, ariaLabel }: Props) => {
  const clickTimer = useRef<NodeJS.Timeout | null>(null)
  const variantSeed =
    (typeof title === 'string' && title) ||
    (typeof subtitle === 'string' && subtitle) ||
    ariaLabel ||
    cardType
  const imagePool = cardType === 'asignatura' ? ASIGNATURA_TOP_IMAGES : RA_TOP_IMAGES
  const autoImageIndex = getCardImageIndex(variantSeed, imagePool.length)
  const normalizedVariantIndex = typeof imageVariant === 'number' && imageVariant > 0
    ? (imageVariant - 1) % imagePool.length
    : autoImageIndex
  const fallbackSrc = imagePool[normalizedVariantIndex]
  const resolvedImageSrc = imageSrc || fallbackSrc
  const resolvedAlt = imageAlt || (cardType === 'asignatura'
    ? 'Imagen decorativa superior de asignatura'
    : 'Imagen decorativa superior de resultado de aprendizaje')

  const handleClick = () => {
    // Si hay doble clic configurado, esperar para ver si es doble clic
    if (onDoubleClick) {
      if (clickTimer.current) {
        clearTimeout(clickTimer.current)
        clickTimer.current = null
      }
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null
        if (onClick) onClick()
      }, 250)
    } else {
      // Sin doble clic, ejecutar inmediatamente
      if (onClick) onClick()
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Cancelar el timer del clic simple
    if (clickTimer.current) {
      clearTimeout(clickTimer.current)
      clickTimer.current = null
    }
    // Ejecutar acción de doble clic
    if (onDoubleClick) {
      e.preventDefault()
      onDoubleClick()
    }
  }

  return (
    <div
      className={`ra-card ra-card--${cardType}`}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
      title={onDoubleClick ? "Haz clic para ver detalles, doble clic para análisis rápido" : undefined}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onClick) { e.preventDefault(); onClick() }
        if (e.key === ' ' && onClick) { e.preventDefault(); onClick() }
      }}
    >
      <div className={`ra-card-head ${headTone === 'dark' ? 'bg-secondary' : 'bg-secondary-subtle'}`}>
        {resolvedImageSrc && (
          <img
            src={resolvedImageSrc}
            alt={resolvedAlt}
            className="ra-card-image"
            loading="lazy"
          />
        )}
        {onDoubleClick && (
          <div className="position-absolute top-0 end-0 p-2 opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
            </svg>
          </div>
        )}
      </div>
      <div className="ra-card-body">
        <div>{title}</div>
        {subtitle && <div className="ra-small">{subtitle}</div>}
      </div>
    </div>
  )
}

export default RaCard