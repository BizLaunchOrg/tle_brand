import { Route, Routes } from 'react-router-dom'
import { MainLayout } from './components/MainLayout.tsx'
import { LandingPage } from './pages/LandingPage/LandingPage.tsx'
import { MakeupPage } from './pages/MakeupPage/MakeupPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage/NotFoundPage.tsx'
import { ProductDetailPage } from './pages/ProductDetailPage/ProductDetailPage.tsx'
import { LoginPage } from './pages/Auth/LoginPage.tsx'
import { SignupPage } from './pages/Auth/SignupPage.tsx'
import { AuthConfirmPage } from './pages/Auth/AuthConfirmPage.tsx'
import { ShopPage } from './pages/ShopPage/ShopPage.tsx'
import { CheckoutPage } from './pages/CheckoutPage/CheckoutPage.tsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="auth/confirm" element={<AuthConfirmPage />} />
        <Route path="product/:slug" element={<ProductDetailPage />} />
        <Route path="makeup" element={<MakeupPage />} />
        <Route path="book" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
