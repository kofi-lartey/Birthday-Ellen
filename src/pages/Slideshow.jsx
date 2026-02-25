import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'

function Slideshow() {
    const [slides, setSlides] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(true)
    const [showTitle, setShowTitle] = useState(true)
    const [showDownload, setShowDownload] = useState(false)
    const [downloadImage, setDownloadImage] = useState('')
    const [isRecording, setIsRecording] = useState(false)
    const [recordingProgress, setRecordingProgress] = useState(0)
    const [musicPlaying, setMusicPlaying] = useState(false)
    const intervalRef = useRef(null)
    const progressRef = useRef(null)
    const musicRef = useRef(null)

    useEffect(() => {
        loadSlides()
        createHearts()

        // Show title briefly then hide
        const titleTimer = setTimeout(() => {
            setShowTitle(false)
        }, 4000)

        // Auto-play music when slideshow loads
        setTimeout(() => {
            toggleMusic()
        }, 1000)

        return () => {
            clearTimeout(titleTimer)
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
            if (progressRef.current) {
                clearInterval(progressRef.current)
            }
            if (musicRef.current) {
                musicRef.current.pause()
            }
        }
    }, [])

    useEffect(() => {
        if (isPlaying && slides.length > 0) {
            intervalRef.current = setInterval(() => {
                setCurrentIndex(prev => (prev + 1) % slides.length)
            }, 4000)
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [isPlaying, slides.length])

    // Create floating hearts
    function createHearts() {
        const container = document.getElementById('heartsContainer')
        if (!container) return

        const heartSymbols = ['❤️', '💕', '💗', '💖', '💘', '💝']

        // Clear existing hearts
        container.innerHTML = ''

        for (let i = 0; i < 30; i++) {
            const heart = document.createElement('div')
            heart.className = 'heart'
            heart.innerText = heartSymbols[Math.floor(Math.random() * heartSymbols.length)]
            heart.style.left = Math.random() * 100 + 'vw'
            heart.style.animationDuration = (Math.random() * 5 + 5) + 's'
            heart.style.animationDelay = Math.random() * 5 + 's'
            heart.style.fontSize = (Math.random() * 15 + 15) + 'px'
            container.appendChild(heart)
        }
    }

    async function loadSlides() {
        // Load from Supabase first (photos table with name and message)
        try {
            const { data, error } = await supabase
                .from('photos')
                .select('*')
                .order('created_at', { ascending: true })

            if (data && data.length > 0) {
                const slidesFromSupabase = data.map((photo) => ({
                    name: photo.name || '☁️ From The Cloud',
                    message: photo.message || 'A special memory shared with love',
                    photo: photo.image_url
                }))
                setSlides(slidesFromSupabase)
                return
            }
        } catch (err) {
            console.error('Error loading from Supabase:', err)
        }

        // Fallback: Load from localStorage
        const messages = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]')

        // Also get Firebase photos
        const firebasePhotos = JSON.parse(localStorage.getItem('ellenFirebasePhotos') || '[]')

        // Combine messages and firebase photos
        const allSlides = [
            ...messages.map(msg => ({
                name: msg.name,
                message: msg.message,
                photo: msg.photo
            })),
            ...firebasePhotos.map(photoUrl => ({
                name: '☁️ From the Cloud',
                message: 'A special memory shared with love',
                photo: photoUrl
            }))
        ]

        if (allSlides.length > 0) {
            setSlides(allSlides)
        }
    }

    function nextSlide() {
        setCurrentIndex(prev => (prev + 1) % slides.length)
    }

    function prevSlide() {
        setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length)
    }

    function togglePlay() {
        setIsPlaying(!isPlaying)
    }

    function toggleMusic() {
        // Create audio if not exists
        if (!musicRef.current) {
            musicRef.current = new Audio('https://res.cloudinary.com/djjgkezui/video/upload/v1770985151/Samini_-_My_Own_Lyrics_Video_mcxjre.mp3')
            musicRef.current.loop = true
            musicRef.current.volume = 0.3
        }

        if (musicPlaying) {
            musicRef.current.pause()
            setMusicPlaying(false)
        } else {
            musicRef.current.play().then(() => {
                setMusicPlaying(true)
            }).catch((error) => {
                console.log('Music play error:', error)
            })
        }
    }

    function goBack() {
        window.location.href = '/'
    }

    function openDownloadModal() {
        if (slides[currentIndex]) {
            setDownloadImage(slides[currentIndex].photo)
            setShowDownload(true)
        }
    }

    function closeDownloadModal() {
        setShowDownload(false)
        setDownloadImage('')
    }

    // Download Image with glassmorphism card
    async function downloadImageFile() {
        const currentSlide = slides[currentIndex]
        const imageUrl = currentSlide.photo

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()
        img.crossOrigin = 'anonymous'

        await new Promise((resolve) => {
            img.onload = resolve
            img.onerror = resolve
            img.src = imageUrl
        })

        if (!img.width) {
            alert("Image failed to load. Try again.")
            return
        }

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const padding = canvas.width * 0.05
        const boxWidth = canvas.width * 0.85
        const boxX = (canvas.width - boxWidth) / 2
        const nameFontSize = canvas.width * 0.055
        const messageFontSize = canvas.width * 0.04
        const lineHeight = messageFontSize * 1.5

        ctx.textAlign = "center"
        ctx.textBaseline = "top"

        function wrapText(text, maxWidth) {
            const words = text.split(" ")
            let lines = [], line = ""
            for (let word of words) {
                const testLine = line + word + " "
                if (ctx.measureText(testLine).width > maxWidth && line !== "") {
                    lines.push(line.trim())
                    line = word + " "
                } else line = testLine
            }
            lines.push(line.trim())
            return lines
        }

        ctx.font = `${messageFontSize}px Outfit, sans-serif`
        const messageLines = wrapText(currentSlide.message, boxWidth - padding * 2)
        const boxHeight = padding + nameFontSize + padding / 2 + messageLines.length * lineHeight + padding
        const boxY = canvas.height - boxHeight - canvas.width * 0.05
        const radius = canvas.width * 0.03

        // Gradient background
        const gradient = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxHeight)
        gradient.addColorStop(0, "rgba(236,72,153,0.9)")
        gradient.addColorStop(1, "rgba(244,63,94,0.9)")
        ctx.fillStyle = gradient

        // Rounded rectangle
        ctx.beginPath()
        ctx.moveTo(boxX + radius, boxY)
        ctx.lineTo(boxX + boxWidth - radius, boxY)
        ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius)
        ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius)
        ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight)
        ctx.lineTo(boxX + radius, boxY + boxHeight)
        ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius)
        ctx.lineTo(boxX, boxY + radius)
        ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY)
        ctx.closePath()
        ctx.fill()

        // Name
        ctx.fillStyle = "#fff"
        ctx.font = `bold ${nameFontSize}px Outfit, sans-serif`
        ctx.fillText(currentSlide.name, canvas.width / 2, boxY + padding)

        // Message
        ctx.font = `${messageFontSize}px Outfit, sans-serif`
        let startY = boxY + padding + nameFontSize + padding / 2
        messageLines.forEach(line => {
            ctx.fillText(line, canvas.width / 2, startY)
            startY += lineHeight
        })

        canvas.toBlob(blob => {
            if (!blob) { alert("Download failed."); return }
            const link = document.createElement("a")
            link.href = URL.createObjectURL(blob)
            link.download = `ellen-birthday-${currentIndex + 1}.jpg`
            link.click()
        }, "image/jpeg", 0.95)
    }

    // Export Video
    async function exportVideo() {
        if (!slides.length) return

        setIsRecording(true)
        setRecordingProgress(0)

        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        // WhatsApp optimized 9:16
        const width = 720
        const height = 1280

        canvas.width = width
        canvas.height = height

        const videoStream = canvas.captureStream(30)

        // Setup audio (optional - continues without audio if blocked)
        let audioTracks = []
        let audioError = null
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)()

            // Try to resume audio context (may fail without user interaction)
            try {
                await audioContext.resume()
            } catch (e) {
                // Audio context can't resume - will try anyway
            }

            if (musicRef.current) {
                const musicClone = musicRef.current.cloneNode(true)
                musicClone.currentTime = 0

                const source = audioContext.createMediaElementSource(musicClone)
                const destination = audioContext.createMediaStreamDestination()

                source.connect(destination)
                source.connect(audioContext.destination)

                audioTracks = destination.stream.getAudioTracks()

                // Try to play - may fail due to browser restrictions
                try {
                    await musicClone.play()
                    musicRef.current = musicClone
                } catch (playError) {
                    audioTracks = [] // No audio if play fails
                    audioError = "Music blocked by browser - video will be created without audio"
                }
            }
        } catch (e) {
            audioError = "Audio setup failed - video will be created without audio"
            console.log('Audio setup error:', e)
        }

        // Show warning if audio failed
        if (audioError) {
            console.log(audioError)
        }

        const combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioTracks
        ])

        // Try different mime types
        let mimeType = "video/webm; codecs=vp9,opus"
        if (MediaRecorder.isTypeSupported("video/mp4; codecs=avc1.42E01E,mp4a.40.2")) {
            mimeType = "video/mp4; codecs=avc1.42E01E,mp4a.40.2"
        }

        const recorder = new MediaRecorder(combinedStream, {
            mimeType,
            videoBitsPerSecond: 4_000_000
        })

        const chunks = []

        recorder.ondataavailable = e => {
            if (e.data.size > 0) chunks.push(e.data)
        }

        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType })
            const url = URL.createObjectURL(blob)

            const a = document.createElement("a")
            a.href = url
            a.download = mimeType.includes('mp4') ? "ellen-birthday-slideshow.mp4" : "ellen-birthday-whatsapp.webm"
            a.click()

            setIsRecording(false)
            setRecordingProgress(0)
        }

        recorder.start()

        // Render intro
        await renderIntro(ctx, width, height)

        // Render each slide with transitions
        for (let i = 0; i < slides.length; i++) {
            // Fade transition from previous slide
            if (i > 0) {
                await renderTransition(ctx, width, height, slides[i - 1], slides[i])
            }
            await renderSlide(ctx, width, height, slides[i], i + 1, slides.length)
            setRecordingProgress(Math.round(((i + 1) / slides.length) * 100))
        }

        // Render outro
        await renderOutro(ctx, width, height)

        recorder.stop()
    }

    // Animated Intro with effects
    async function renderIntro(ctx, width, height) {
        const fps = 30
        const totalFrames = 90 // 3 seconds

        // Create floating hearts array
        const hearts = []
        for (let h = 0; h < 15; h++) {
            hearts.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: 20 + Math.random() * 30,
                speed: 1 + Math.random() * 2,
                opacity: 0.3 + Math.random() * 0.5,
                rotation: Math.random() * 360
            })
        }

        for (let i = 0; i < totalFrames; i++) {
            // Progress 0-1
            const progress = i / totalFrames
            const easeProgress = 1 - Math.pow(1 - progress, 3) // ease out cubic

            // Dark pink/purple gradient background
            const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width)
            gradient.addColorStop(0, '#1a1a2e')
            gradient.addColorStop(1, '#16213e')
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, width, height)

            // Draw floating hearts in background
            hearts.forEach(heart => {
                heart.y -= heart.speed
                heart.rotation += 0.5
                if (heart.y < -50) heart.y = height + 50

                ctx.save()
                ctx.translate(heart.x, heart.y)
                ctx.rotate(heart.rotation * Math.PI / 180)
                ctx.globalAlpha = heart.opacity * (0.5 + 0.5 * Math.sin(i * 0.1 + heart.x))
                ctx.fillStyle = '#ec4899'
                ctx.font = `${heart.size}px Arial`
                ctx.fillText('❤️', 0, 0)
                ctx.restore()
            })

            // Main title with scale animation
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            // Scale effect
            const scale = 0.5 + easeProgress * 0.5
            const alpha = Math.min(1, progress * 2)

            ctx.save()
            ctx.translate(width / 2, height / 2 - 30)
            ctx.scale(scale, scale)
            ctx.globalAlpha = alpha

            // Glow effect
            ctx.shadowColor = '#ec4899'
            ctx.shadowBlur = 20 + Math.sin(i * 0.2) * 10

            ctx.fillStyle = '#ffffff'
            ctx.font = 'bold 55px Poppins, sans-serif'
            ctx.fillText('Happy Birthday', 0, 0)

            ctx.font = 'bold 75px Playfair Display, serif'
            ctx.fillText('Ellen 🎂', 0, 75)

            ctx.restore()

            // Decorative sparkles
            for (let s = 0; s < 8; s++) {
                const angle = (i * 0.05 + s * Math.PI / 4) % (Math.PI * 2)
                const sparkleX = width / 2 + Math.cos(angle) * (150 + Math.sin(i * 0.1) * 30)
                const sparkleY = height / 2 + Math.sin(angle) * (150 + Math.sin(i * 0.1) * 30)
                const sparkleAlpha = Math.max(0, 1 - Math.abs(i - 45) / 45)

                ctx.save()
                ctx.globalAlpha = sparkleAlpha
                ctx.fillStyle = '#fbbf24'
                ctx.font = '20px Arial'
                ctx.fillText('✨', sparkleX, sparkleY)
                ctx.restore()
            }

            await new Promise(r => setTimeout(r, 1000 / fps))
        }
    }

    // Slide transition effect
    async function renderTransition(ctx, width, height, prevSlide, nextSlide) {
        const fps = 30
        const frames = 30 // 1 second transition

        const prevImg = new Image()
        prevImg.crossOrigin = 'anonymous'
        await new Promise(resolve => { prevImg.onload = resolve; prevImg.src = prevSlide.photo })

        const nextImg = new Image()
        nextImg.crossOrigin = 'anonymous'
        await new Promise(resolve => { nextImg.onload = resolve; nextImg.src = nextSlide.photo })

        for (let i = 0; i < frames; i++) {
            const progress = i / frames
            const easeProgress = progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2

            ctx.globalAlpha = 1
            ctx.clearRect(0, 0, width, height)

            // Cross fade between slides
            // Previous slide fading out
            ctx.globalAlpha = 1 - easeProgress
            const imgRatio = prevImg.width / prevImg.height
            const canvasRatio = width / height
            let sx = 0, sy = 0, sw = prevImg.width, sh = prevImg.height
            if (imgRatio > canvasRatio) {
                sw = prevImg.height * canvasRatio
                sx = (prevImg.width - sw) / 2
            } else {
                sh = prevImg.width / canvasRatio
                sy = (prevImg.height - sh) / 2
            }
            ctx.drawImage(prevImg, sx, sy, sw, sh, 0, 0, width, height)

            // Next slide fading in
            ctx.globalAlpha = easeProgress
            const nextRatio = nextImg.width / nextImg.height
            let nx = 0, ny = 0, nw = nextImg.width, nh = nextImg.height
            if (nextRatio > canvasRatio) {
                nw = nextImg.height * canvasRatio
                nx = (nextImg.width - nw) / 2
            } else {
                nh = nextImg.width / canvasRatio
                ny = (nextImg.height - nh) / 2
            }
            ctx.drawImage(nextImg, nx, ny, nw, nh, 0, 0, width, height)

            ctx.globalAlpha = 1

            await new Promise(r => setTimeout(r, 1000 / fps))
        }
    }

    // Outro with credits - longer duration
    async function renderOutro(ctx, width, height) {
        const fps = 30
        const totalFrames = 180 // 6 seconds

        const stars = []
        for (let s = 0; s < 20; s++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: 3 + Math.random() * 5,
                twinkle: Math.random() * Math.PI * 2
            })
        }

        for (let i = 0; i < totalFrames; i++) {
            const progress = i / totalFrames

            // Dark gradient background
            const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width)
            gradient.addColorStop(0, '#0f0f23')
            gradient.addColorStop(1, '#1a1a3e')
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, width, height)

            // Twinkling stars
            stars.forEach(star => {
                const twinkle = Math.sin(i * 0.1 + star.twinkle) * 0.5 + 0.5
                ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`
                ctx.beginPath()
                ctx.arc(star.x, star.y, star.size * twinkle, 0, Math.PI * 2)
                ctx.fill()
            })

            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            if (progress < 0.2) {
                // Fade in thank you
                const fadeProgress = progress / 0.2
                ctx.globalAlpha = fadeProgress

                ctx.save()
                ctx.shadowColor = '#ec4899'
                ctx.shadowBlur = 30
                ctx.fillStyle = '#ffffff'
                ctx.font = 'bold 60px Poppins, sans-serif'
                ctx.fillText('Thank You', width / 2, height / 2 - 40)
                ctx.restore()
            } else if (progress < 0.5) {
                // Hold thank you longer
                ctx.globalAlpha = 1

                ctx.save()
                ctx.shadowColor = '#ec4899'
                ctx.shadowBlur = 30
                ctx.fillStyle = '#ffffff'
                ctx.font = 'bold 60px Poppins, sans-serif'
                ctx.fillText('Thank You', width / 2, height / 2 - 40)
                ctx.restore()
            } else if (progress < 0.6) {
                // Fade to credits
                const fadeProgress = (progress - 0.5) / 0.1
                ctx.globalAlpha = 1 - fadeProgress

                ctx.save()
                ctx.shadowColor = '#ec4899'
                ctx.shadowBlur = 30
                ctx.fillStyle = '#ffffff'
                ctx.font = 'bold 60px Poppins, sans-serif'
                ctx.fillText('Thank You', width / 2, height / 2 - 40)
                ctx.restore()
            } else {
                // Credits - stay longer (40% of video)
                ctx.globalAlpha = 1

                ctx.fillStyle = '#fbbf24'
                ctx.font = 'bold 50px Poppins, sans-serif'
                ctx.fillText('Made with Love', width / 2, height / 2 - 30)

                ctx.fillStyle = '#ffffff'
                ctx.font = '28px Poppins, sans-serif'
                ctx.fillText('❤️ Happy Birthday Ellen 🎂', width / 2, height / 2 + 40)

                // KofiLartey credit - more visible
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
                ctx.font = 'bold 24px Poppins, sans-serif'
                ctx.fillText('by KofiLartey', width / 2, height / 2 + 100)
            }

            ctx.globalAlpha = 1
            await new Promise(r => setTimeout(r, 1000 / fps))
        }
    }

    // Render individual slide with effects
    async function renderSlide(ctx, width, height, slide, slideNumber, totalSlides) {
        const img = new Image()
        img.crossOrigin = "anonymous"
        await new Promise(resolve => { img.onload = resolve; img.src = slide.photo })

        const fps = 30
        const frames = 150 // 5 seconds

        for (let frame = 0; frame < frames; frame++) {
            ctx.clearRect(0, 0, width, height)

            // Cover image
            const imgRatio = img.width / img.height
            const canvasRatio = width / height

            let sx = 0, sy = 0, sw = img.width, sh = img.height

            if (imgRatio > canvasRatio) {
                sw = img.height * canvasRatio
                sx = (img.width - sw) / 2
            } else {
                sh = img.width / canvasRatio
                sy = (img.height - sh) / 2
            }

            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height)

            // Modern minimal text overlay - semi-transparent bar at bottom
            const padding = width * 0.04
            const nameFontSize = width * 0.042
            const messageFontSize = width * 0.028
            const lineHeight = messageFontSize * 1.5

            function wrapTextMin(text, maxWidth) {
                const words = text.split(" ")
                let lines = [], line = ""
                for (let word of words) {
                    const testLine = line + word + " "
                    if (ctx.measureText(testLine).width > maxWidth && line !== "") {
                        lines.push(line.trim())
                        line = word + " "
                    } else line = testLine
                }
                lines.push(line.trim())
                return lines
            }

            const msgLines = wrapTextMin(slide.message, width * 0.7)
            const barH = padding + nameFontSize + padding / 2 + msgLines.length * lineHeight + padding
            const barW = width * 0.72
            const barX = (width - barW) / 2
            const barY = height - barH - 50
            const r = width * 0.015

            // Dark semi-transparent bar
            ctx.beginPath()
            ctx.moveTo(barX + r, barY)
            ctx.lineTo(barX + barW - r, barY)
            ctx.quadraticCurveTo(barX + barW, barY, barX + barW, barY + r)
            ctx.lineTo(barX + barW, barY + barH - r)
            ctx.quadraticCurveTo(barX + barW, barY + barH, barX + barW - r, barY + barH)
            ctx.lineTo(barX + r, barY + barH)
            ctx.quadraticCurveTo(barX, barY + barH, barX, barY + barH - r)
            ctx.lineTo(barX, barY + r)
            ctx.quadraticCurveTo(barX, barY, barX + r, barY)
            ctx.fillStyle = "rgba(0, 0, 0, 0.72)"
            ctx.fill()

            // Pink accent line
            ctx.strokeStyle = "rgba(236, 72, 153, 0.5)"
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.moveTo(barX + 30, barY)
            ctx.lineTo(barX + barW - 30, barY)
            ctx.stroke()

            ctx.textAlign = "center"
            ctx.textBaseline = "top"
            ctx.font = `600 ${nameFontSize}px Poppins, sans-serif`
            ctx.shadowColor = "rgba(0, 0, 0, 0.4)"
            ctx.shadowBlur = 6
            ctx.fillStyle = "#fff"
            ctx.fillText(slide.name, width / 2, barY + padding)

            ctx.font = `400 ${messageFontSize}px Poppins, sans-serif`
            ctx.shadowBlur = 4
            ctx.fillStyle = "rgba(255, 255, 255, 0.85)"
            let yP = barY + padding + nameFontSize + padding / 2
            msgLines.forEach(l => { ctx.fillText(l, width / 2, yP); yP += lineHeight })

            // Slide #
            ctx.textAlign = "right"
            ctx.font = "bold 16px Poppins"
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
            ctx.fillText(`${slideNumber}/${totalSlides}`, width - 18, 22)

            // Credit
            ctx.textAlign = "left"
            ctx.font = "11px Poppins"
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
            ctx.fillText("by KofiLartey", 18, height - 16)

            await new Promise(r => setTimeout(r, 1000 / fps))
        }
    }

    function shareToWhatsApp() {
        const currentSlide = slides[currentIndex]
        if (currentSlide) {
            const message = encodeURIComponent(`"${currentSlide.message}"\n\n- ${currentSlide.name}\n\n🎂 Happy Birthday Ellen! 💕`)
            window.open(`https://wa.me/?text=${message}`, '_blank')
        }
    }

    const progress = slides.length > 0 ? ((currentIndex + 1) / slides.length) * 100 : 0

    return (
        <div className="relative w-full h-screen overflow-hidden" style={{ background: '#0a0a0a' }}>
            {/* Background gradient */}
            <div className="fixed inset-0" style={{
                background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #0a0a0a 50%, #000 100%)',
                zIndex: -1
            }} />

            {/* Floating Hearts */}
            <div className="hearts" id="heartsContainer"></div>

            {/* Back Button */}
            <button onClick={goBack} className="fab back fixed top-5 left-5 z-50" title="Go Back">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>

            {/* FABs Container */}
            <div className="fab-container fixed top-5 right-5 z-50">
                <button className="fab" onClick={toggleMusic} id="musicBtn" title="Toggle Music">
                    {musicPlaying ? (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                    ) : (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                    )}
                </button>
                <button className="fab" onClick={openDownloadModal} title="Download">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
                <button className="fab" onClick={exportVideo} disabled={isRecording} title="Export Video">
                    {isRecording ? (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6 animate-spin">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    ) : (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    )}
                </button>
                <button className="fab" onClick={shareToWhatsApp} title="Share">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                </button>
            </div>

            {/* Recording Progress Overlay */}
            {isRecording && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-6xl mb-4">🎬</div>
                        <p className="text-white text-2xl mb-4">Creating your video...</p>
                        <div className="w-64 h-4 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-200" style={{ width: `${recordingProgress}%` }} />
                        </div>
                        <p className="text-gray-400 mt-2">{recordingProgress}%</p>
                        <p className="text-gray-500 text-sm mt-2">Please don't close this tab</p>
                    </div>
                </div>
            )}

            {/* Title Overlay */}
            <div className={`title-overlay ${showTitle ? 'show' : ''}`}>
                <h1 className="romantic-font">Happy Birthday Ellen! 🎂</h1>
                <p>With love from your friends & family 💕</p>
            </div>

            {/* Slideshow */}
            {slides.length > 0 ? (
                <div className="slideshow-container">
                    {slides.map((slide, index) => (
                        <div key={index} className={`slide ${index === currentIndex ? 'active' : ''}`}>
                            <img src={slide.photo} className="slide-image" alt={`Slide ${index + 1}`}
                                onError={(e) => { e.target.src = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%25%22 y1=%220%25%22 x2=%22100%25%22 y2=%22100%25%22%3E%3Cstop offset=%220%25%22 stop-color=%22%23ec4899%22/%3E%3Cstop offset=%22100%25%22 stop-color=%22%23f43f5e%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill=%22url(%23g)%22 width=%22100%25%22 height=%22100%25%22/%3E%3Ctext fill=%22white%22 font-size=%2224%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3EImage Not Found%3C/text%3E%3C/svg%3E' }} />
                            <div className="slide-message">
                                <h3>{slide.name}</h3>
                                <p>{slide.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-6xl mb-4">📷</div>
                        <p className="text-white text-xl">No photos yet!</p>
                        <p className="text-gray-400 mt-2">Go to upload page to add photos</p>
                        <Link to="/upload" className="inline-block mt-4 bg-rose-500 text-white px-6 py-3 rounded-full hover:bg-rose-600 transition">
                            Upload Photos 📸
                        </Link>
                    </div>
                </div>
            )}

            {/* Photo Counter */}
            {slides.length > 0 && (
                <div className="photo-counter">
                    {currentIndex + 1} / {slides.length}
                </div>
            )}

            {/* Controls */}
            {slides.length > 0 && (
                <div className="controls-wrapper">
                    {/* Progress bar */}
                    <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                    </div>

                    {/* Main Controls */}
                    <div className="controls">
                        <button className="control-btn" onClick={prevSlide}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <button className="control-btn primary" onClick={togglePlay}>
                            {isPlaying ? (
                                <>
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Pause</span>
                                </>
                            ) : (
                                <>
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    </svg>
                                    <span>Play</span>
                                </>
                            )}
                        </button>

                        <button className="control-btn" onClick={nextSlide}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Download Modal */}
            {showDownload && (
                <div className="download-modal active" onClick={closeDownloadModal}>
                    <div className="download-content" onClick={e => e.stopPropagation()}>
                        <button className="close-modal" onClick={closeDownloadModal}>✕</button>
                        <h2 className="romantic-font">Save This Memory 📸</h2>
                        <img src={downloadImage} alt="Preview" className="download-preview" />
                        <div className="download-buttons">
                            <button className="download-btn primary" onClick={downloadImageFile}>
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                            </button>
                            <button className="download-btn secondary" onClick={() => { shareToWhatsApp(); closeDownloadModal(); }}>
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                                Share
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Keyboard controls */}
            <KeyboardControls
                onNext={nextSlide}
                onPrev={prevSlide}
                onTogglePlay={togglePlay}
                onToggleMusic={toggleMusic}
                onCloseModal={closeDownloadModal}
            />
        </div>
    )
}

// Keyboard controls component
function KeyboardControls({ onNext, onPrev, onTogglePlay, onToggleMusic, onCloseModal }) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                onNext()
            } else if (e.key === 'ArrowLeft') {
                onPrev()
            } else if (e.key === 'p' || e.key === 'P') {
                onTogglePlay()
            } else if (e.key === 'm' || e.key === 'M') {
                onToggleMusic()
            } else if (e.key === 'Escape') {
                onCloseModal()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onNext, onPrev, onTogglePlay, onToggleMusic, onCloseModal])

    return null
}

export default Slideshow
