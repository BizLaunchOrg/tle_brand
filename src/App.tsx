import { Route, Routes } from 'react-router-dom'
import { MainLayout } from './components/MainLayout.tsx'
import { LandingPage } from './pages/LandingPage/LandingPage.tsx'
import { MakeupPage } from './pages/MakeupPage/MakeupPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage/NotFoundPage.tsx'
import { ShopPage } from './pages/ShopPage/ShopPage.tsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="makeup" element={<MakeupPage />} />
        <Route path="book" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
