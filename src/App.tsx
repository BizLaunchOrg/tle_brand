import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ShopProductsProvider } from './context/ShopProductsContext.tsx'
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
import { AdminGate } from './pages/admin/AdminGate.tsx'
import { AdminLayout } from './pages/admin/AdminLayout.tsx'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.tsx'
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage.tsx'
import { AdminOrderDetailPage } from './pages/admin/AdminOrderDetailPage.tsx'
import { AdminTransactionsPage } from './pages/admin/AdminTransactionsPage.tsx'
import { AdminProductsPage } from './pages/admin/AdminProductsPage.tsx'
import { AdminAccountPage } from './pages/admin/AdminAccountPage.tsx'

function App() {
  return (
    <AuthProvider>
      <ShopProductsProvider>
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

        <Route path="/admin" element={<AdminGate />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="orders/:orderId" element={<AdminOrderDetailPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="transactions" element={<AdminTransactionsPage />} />
            <Route path="account" element={<AdminAccountPage />} />
          </Route>
        </Route>
      </Routes>
      </ShopProductsProvider>
    </AuthProvider>
  )
}

export default App
