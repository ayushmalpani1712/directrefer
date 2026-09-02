import { Outlet } from 'react-router'
import { SiteFooter } from './SiteFooter'

export default function PublicLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
