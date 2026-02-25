import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Locked from './pages/Locked'
import Gift from './pages/Gift'
import Admin from './pages/Admin'
import Upload from './pages/Upload'
import Slideshow from './pages/Slideshow'

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Locked />} />
                <Route path="/home" element={<Home />} />
                <Route path="/gift" element={<Gift />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/slideshow" element={<Slideshow />} />
            </Routes>
        </Router>
    )
}

export default App
