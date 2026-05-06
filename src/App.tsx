import { Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar/navbar.tsx'
import { Footer } from './components/Footer/footer.tsx'
import { Home } from './pages/Home.tsx'

function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
