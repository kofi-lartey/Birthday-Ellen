import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Locked from './pages/Locked'
import Gift from './pages/Gift'
import Admin from './pages/Admin'
import Upload from './pages/Upload'
import Slideshow from './pages/Slideshow'
import Order from './pages/Order'
import OrderStatus from './pages/OrderStatus'
import Birthday from './pages/Birthday'
import OrderUpload from './pages/OrderUpload'
import Register from './pages/Register'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Welcome from './pages/Welcome'

function App() {
    return (
        <Router future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
        }}>
            <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/order" element={<Order />} />
                <Route path="/order-status" element={<OrderStatus />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/birthday/:code" element={<Birthday />} />
                <Route path="/upload/:code" element={<Upload />} />
                <Route path="/slideshow/:code" element={<Slideshow />} />
                <Route path="/home" element={<Home />} />
                <Route path="/gift" element={<Gift />} />
                <Route path="/gift/:code" element={<Gift />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/slideshow" element={<Slideshow />} />
                <Route path="/locked" element={<Locked />} />
            </Routes>
        </Router>
    )
}

export default App
