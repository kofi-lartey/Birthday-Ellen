import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Admin from './pages/Admin'
import Upload from './pages/Upload'
import Slideshow from './pages/Slideshow'

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/slideshow" element={<Slideshow />} />
            </Routes>
        </Router>
    )
}

export default App
