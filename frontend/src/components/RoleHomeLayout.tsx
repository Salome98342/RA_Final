import React from 'react'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'

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
  moduleCards,
  onSidebarClick,
}) => {
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
              <h4 className="mb-2">Bienvenido, {welcomeName || welcomeFallback}! 👋</h4>
              <p className="text-muted mb-0">{welcomeDescription}</p>
            </div>
          </section>

          <div className="row g-3">
            {moduleCards.map((item) => (
              <div className="col-md-6 col-xl-4" key={item.key}>
                <div className="card h-100 shadow-sm border-0">
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex align-items-center mb-2">
                      <i className={`${item.icon} me-2 ${item.iconClassName || 'text-danger'}`}></i>
                      <h6 className="mb-0">{item.title}</h6>
                    </div>
                    <p className="text-muted small flex-grow-1 mb-0">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

export default RoleHomeLayout