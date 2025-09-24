import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import BouncingShapes from './pages/BouncingShapes'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/bouncing-shapes" element={<BouncingShapes />} />
      <Route
        path="*"
        element={
          <div className="min-h-screen grid place-items-center text-center p-6">
            <div>
              <h1 className="text-2xl font-bold">Not Found</h1>
              <Link className="text-blue-400 underline" to="/">Go Home</Link>
            </div>
          </div>
        }
      />
    </Routes>
  )
}