import { useState, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'

// App icon URL for watermark
const APP_ICON_URL = 'https://res.cloudinary.com/djjgkezui/image/upload/v1778959179/IMG-20260516-WA0050_zegaok.jpg'

function Slideshow() {
    const { code } = useParams()
    const [slides, setSlides] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(true)
    const [showTitle, setShowTitle] = useState(true)
    const [showDownload, setShowDownload] = useState(false)
    const [downloadImage, setDownloadImage] = useState('')
    const [downloadSlideIndex, setDownloadSlideIndex] = useState(0)
    const [isRecording, setIsRecording] = useState(false)
    const [recordingProgress, setRecordingProgress] = useState(0)
    const [musicPlaying, setMusicPlaying] = useState(false)
    const [audioInitialized, setAudioInitialized] = useState(false)
    const [isBulkDownloading, setIsBulkDownloading] = useState(false)
    const [bulkDownloadProgress, setBulkDownloadProgress] = useState(0)
    const [orderConfig, setOrderConfig] = useState(null)
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
    const [eventType, setEventType] = useState('birthday')
    const isMobile = window.innerWidth < 768

    const intervalRef = useRef(null)
    const progressRef = useRef(null)
    const musicRef = useRef(null)
    const [popAnimationKey, setPopAnimationKey] = useState(0)
    const [orderLoaded, setOrderLoaded] = useState(false)

    // Get event-specific text based on type
    const getEventText = () => {
        const texts = {
            birthday: {
                title: 'Happy Birthday',
                emoji: '🎂',
                action: 'Birthday',
                shareMessage: 'birthday celebration',
                defaultCelebrant: 'Birthday Star'
            },
            wedding: {
                title: 'Congratulations',
                emoji: '💍',
                action: 'Wedding Celebration',
                shareMessage: 'wedding celebration',
                defaultCelebrant: 'the Happy Couple'
            },
            anniversary: {
                title: 'Happy Anniversary',
                emoji: '💕',
                action: 'Anniversary',
                shareMessage: 'anniversary celebration',
                defaultCelebrant: 'the Happy Couple'
            },
            party: {
                title: 'Party Time',
                emoji: '🎉',
                action: 'Party',
                shareMessage: 'party celebration',
                defaultCelebrant: 'Party Host'
            },
            hangout: {
                title: 'Good Times',
                emoji: '👋',
                action: 'Hangout',
                shareMessage: 'hangout',
                defaultCelebrant: 'the Crew'
            },
            other: {
                title: 'Special Celebration',
                emoji: '✨',
                action: 'Celebration',
                shareMessage: 'celebration',
                defaultCelebrant: 'Celebrant'
            }
        }
        return texts[eventType] || texts.birthday
    }

    const eventText = getEventText()
    // Only show actual celebrant name after order is loaded
    const celebrantName = orderLoaded && orderConfig
        ? (orderConfig?.recipient_name || orderConfig?.nickname || orderConfig?.couple_names || '')
        : ''

    const bgImage = orderConfig?.background_image
    const titleText = celebrantName ? `${eventText.title}, ${celebrantName}! ${eventText.emoji}` : eventText.title
    const subtitleText = celebrantName ? 'With love from your friends & family 💕' : 'The celebration is about to begin!'

    // Load app icon helper
    async function loadAppIcon() {
        return new Promise((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve(img)
            img.onerror = () => resolve(null)
            img.src = APP_ICON_URL
        })
    }

    useEffect(() => {
        setPopAnimationKey(prev => prev + 1)
    }, [currentIndex])

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        if (code) {
            loadOrderConfig()
            loadOrderSlides()
        }
    }, [code])

    function normalizeOrder(order) {
        if (!order) return order
        if (order.audioUrl !== undefined || order.recipientName !== undefined) {
            return {
                ...order,
                audio_url: order.audioUrl ?? order.audio_url ?? order.birthdayDetails?.audioUrl,
                recipient_name: order.recipientName ?? order.recipient_name,
                nickname: order.nickname ?? order.birthdayDetails?.nickname,
                background_image: order.backgroundImage ?? order.background_image ?? order.birthdayDetails?.backgroundImage,
                heart_message: order.heartMessage ?? order.heart_message ?? order.birthdayDetails?.heartMessage,
                date_of_birth: order.dateOfBirth ?? order.date_of_birth ?? order.birthdayDetails?.dateOfBirth,
                letter: order.letter ?? order.birthdayDetails?.letter,
                photos: order.photos ?? order.birthdayDetails?.photos ?? []
            }
        }
        return order
    }

    async function loadOrderConfig() {
        try {
            const { data: registryData, error: registryError } = await supabase
                .from('event_registry')
                .select('*')
                .eq('code', code)
                .maybeSingle()

            if (registryData && !registryError) {
                setEventType(registryData.event_type)
                setOrderConfig({
                    recipient_name: registryData.event_name,
                    couple_names: registryData.couple_names,
                    event_type: registryData.event_type,
                    audio_url: registryData.audio_url,
                    background_image: registryData.background_image,
                    letter: registryData.letter,
                    nickname: registryData.nickname
                })
                setOrderLoaded(true)
                return
            }

            const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]')
            const localOrder = orders.find(o => o.code?.toLowerCase() === code?.toLowerCase())
            if (localOrder) {
                setEventType(localOrder.event_type || 'birthday')
                setOrderConfig(normalizeOrder(localOrder))
                setOrderLoaded(true)
                return
            }

            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('code', code)
                .limit(1)
            if (data && data.length > 0) {
                setEventType(data[0].event_type || 'birthday')
                setOrderConfig(data[0])
                setOrderLoaded(true)
            }
        } catch (err) {
            console.log('Error loading order config:', err)
            setOrderLoaded(true)
        }
    }

    async function loadOrderSlides() {
        try {
            await loadFromSupabase()
            if (slides.length === 0) {
                const messages = JSON.parse(localStorage.getItem(`${STORAGE_KEYS.MESSAGES}_${code}`) || '[]')
                const photos = JSON.parse(localStorage.getItem(`${STORAGE_KEYS.PHOTOS}_${code}`) || '[]')
                const allSlides = [
                    ...messages.map(msg => ({ name: msg.name, message: msg.message, photo: msg.photo })),
                    ...photos.map(photoUrl => ({ name: 'From the Cloud', message: 'A special memory shared with love', photo: photoUrl }))
                ]
                if (allSlides.length > 0) setSlides(allSlides)
            }
        } finally {
            setIsLoading(false)
        }
    }

    async function loadFromSupabase() {
        try {
            const { data, error } = await supabase
                .from('photos')
                .select('*')
                .eq('order_code', code)
                .eq('tag', 'slideshow')
                .order('created_at', { ascending: true })
            if (data && data.length > 0) {
                const supabaseSlides = data.map(photo => ({
                    name: photo.name || 'From the Cloud',
                    message: photo.message || 'A special memory shared with love',
                    photo: photo.image_url
                }))
                setSlides(supabaseSlides)
            }
        } catch (err) {
            console.log('Error loading from Supabase:', err)
        }
    }

    useEffect(() => {
        if (orderConfig?.audio_url && !musicRef.current) {
            try {
                musicRef.current = new Audio(orderConfig.audio_url)
                musicRef.current.loop = true
                musicRef.current.volume = 0.3
                setAudioInitialized(true)
            } catch (err) {
                console.log('Failed to initialize audio:', err)
            }
        }
    }, [orderConfig])

    useEffect(() => {
        if (!code) loadSlides()
        createHearts()
        const titleTimer = setTimeout(() => setShowTitle(false), 4000)
        return () => {
            clearTimeout(titleTimer)
            if (intervalRef.current) clearInterval(intervalRef.current)
            if (progressRef.current) clearInterval(progressRef.current)
            if (musicRef.current) {
                musicRef.current.pause()
                musicRef.current = null
            }
        }
    }, [code])

    useEffect(() => {
        if (isPlaying && slides.length > 0) {
            intervalRef.current = setInterval(() => {
                setCurrentIndex(prev => (prev + 1) % slides.length)
            }, 5000)
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    }, [isPlaying, slides.length])

    function createHearts() {
        const container = document.getElementById('heartsContainer')
        if (!container) return

        const symbols = {
            birthday: ['🎂', '🎈', '🎁', '🎉', '✨', '💖', '🎊', '❤️', '💕', '💗'],
            wedding: ['💍', '💒', '💕', '🌸', '✨', '💖', '🥂', '❤️', '💗', '🌹'],
            anniversary: ['💕', '❤️', '💖', '💗', '💝', '💘', '🌹', '✨', '🎉', '💐'],
            party: ['🎉', '🎈', '🎊', '🪅', '✨', '💃', '🕺', '🎶', '🥳', '🎸'],
            hangout: ['👋', '😎', '✨', '🎮', '🍕', '🎵', '💬', '🎉', '🍔', '🎧'],
            other: ['✨', '🎉', '💫', '⭐', '🌟', '🎈', '🎊', '❤️', '💕', '🎀']
        }
        const heartSymbols = symbols[eventType] || symbols.birthday

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
        if (code) {
            loadOrderSlides()
            return
        }
        try {
            const { data, error } = await supabase
                .from('photos')
                .select('*')
                .eq('tag', 'slideshow')
            if (data && data.length > 0) {
                setSlides(data.map(photo => ({
                    name: photo.name || 'From The Cloud',
                    message: photo.message || 'A special memory shared with love',
                    photo: photo.image_url
                })))
                setIsLoading(false)
                return
            }
        } catch (err) { console.error('Error loading from Supabase:', err) }
        const messages = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]')
        const firebasePhotos = JSON.parse(localStorage.getItem('birthdayPhotos') || '[]')
        const allSlides = [
            ...messages.map(msg => ({ name: msg.name, message: msg.message, photo: msg.photo })),
            ...firebasePhotos.map(photoUrl => ({ name: '☁️ From the Cloud', message: 'A special memory shared with love', photo: photoUrl }))
        ]
        if (allSlides.length > 0) setSlides(allSlides)
        setIsLoading(false)
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
        if (!musicRef.current && orderConfig?.audio_url) {
            try {
                musicRef.current = new Audio(orderConfig.audio_url)
                musicRef.current.loop = true
                musicRef.current.volume = 0.3
                setAudioInitialized(true)
            } catch (err) {
                console.log('Failed to create audio element:', err)
                return
            }
        }
        if (!musicRef.current) return
        if (musicPlaying) {
            musicRef.current.pause()
            setMusicPlaying(false)
        } else {
            musicRef.current.play().then(() => setMusicPlaying(true)).catch((error) => console.log('Music play error:', error))
        }
    }

    function goBack() { window.location.href = '/dashboard' }

    function openDownloadModal() {
        if (slides[currentIndex]) {
            setDownloadImage(slides[currentIndex].photo)
            setDownloadSlideIndex(currentIndex)
            setShowDownload(true)
        }
    }

    function closeDownloadModal() { setShowDownload(false); setDownloadImage('') }

    async function downloadImageFile() {
        if (!downloadImage) { alert("No image available to download"); return }
        await downloadImageWithOverlay(downloadImage, code ? `${eventText.action.toLowerCase()}-${code}-slide-${downloadSlideIndex + 1}.jpg` : `${eventText.action.toLowerCase()}-slide-${downloadSlideIndex + 1}.jpg`)
    }

    async function downloadAllImages() {
        if (slides.length === 0) return
        setIsBulkDownloading(true)
        setBulkDownloadProgress(0)
        try {
            for (let i = 0; i < slides.length; i++) {
                const filename = code ? `${eventText.action.toLowerCase()}-${code}-slide-${i + 1}.jpg` : `${eventText.action.toLowerCase()}-slide-${i + 1}.jpg`
                await downloadImageWithOverlay(slides[i].photo, filename, true)
                setBulkDownloadProgress(Math.round(((i + 1) / slides.length) * 100))
            }
        } finally {
            setIsBulkDownloading(false)
            setBulkDownloadProgress(0)
        }
    }

    async function downloadImageWithOverlay(imageUrl, filename, silent = false) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            const img = new Image()
            img.crossOrigin = 'anonymous'

            let appIcon = null
            const loadAppIconPromise = loadAppIcon()

            img.onload = async () => {
                canvas.width = img.width
                canvas.height = img.height
                ctx.drawImage(img, 0, 0)

                appIcon = await loadAppIconPromise

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

                const slideData = slides.find(s => s.photo === imageUrl) || { name: 'Memory', message: 'A special moment' }
                ctx.font = `${messageFontSize}px Outfit, sans-serif`
                const messageLines = wrapText(slideData.message, boxWidth - padding * 2)
                const boxHeight = padding + nameFontSize + padding / 2 + messageLines.length * lineHeight + padding
                const boxY = canvas.height - boxHeight - canvas.width * 0.05
                const radius = canvas.width * 0.03
                const gradient = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxHeight)
                gradient.addColorStop(0, "rgba(236,72,153,0.9)")
                gradient.addColorStop(1, "rgba(244,63,94,0.9)")
                ctx.fillStyle = gradient
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
                ctx.fillStyle = "#fff"
                ctx.font = `bold ${nameFontSize}px Outfit, sans-serif`
                ctx.fillText(slideData.name, canvas.width / 2, boxY + padding)
                ctx.font = `${messageFontSize}px Outfit, sans-serif`
                let startY = boxY + padding + nameFontSize + padding / 2
                messageLines.forEach(line => { ctx.fillText(line, canvas.width / 2, startY); startY += lineHeight })

                if (appIcon) {
                    const watermarkSize = canvas.width * 0.08
                    const watermarkX = canvas.width - watermarkSize - 15
                    const watermarkY = canvas.height - watermarkSize - 15

                    ctx.beginPath()
                    ctx.arc(watermarkX + watermarkSize / 2, watermarkY + watermarkSize / 2, watermarkSize / 2 + 5, 0, Math.PI * 2)
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
                    ctx.fill()

                    ctx.drawImage(appIcon, watermarkX, watermarkY, watermarkSize, watermarkSize)

                    ctx.beginPath()
                    ctx.arc(watermarkX + watermarkSize / 2, watermarkY + watermarkSize / 2, watermarkSize / 2 + 8, 0, Math.PI * 2)
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
                    ctx.lineWidth = 2
                    ctx.stroke()
                }

                canvas.toBlob(blob => {
                    if (!blob) { if (!silent) alert("Download failed."); resolve(); return }
                    const link = document.createElement("a")
                    link.href = URL.createObjectURL(blob)
                    link.download = filename
                    link.click()
                    resolve()
                }, "image/jpeg", 0.95)
            }
            img.onerror = () => { if (!silent) alert("Image failed to load. Try again."); resolve() }
            img.src = imageUrl
        })
    }

    // ========== VIDEO RENDERING FUNCTIONS ==========

    async function ensureAudioContext() {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        const audioCtx = new AudioContext()

        if (audioCtx.state === 'suspended') {
            const silentBuffer = audioCtx.createBuffer(1, 1, 22050)
            const source = audioCtx.createBufferSource()
            source.buffer = silentBuffer
            source.connect(audioCtx.destination)
            source.start()
            source.stop(0.1)
            await audioCtx.resume()
        }

        return audioCtx
    }

    // Simple watermark - fixed position at bottom right, semi-transparent (NO TEXT)
    // Moving watermark - slides across the screen like TikTok style
    async function drawTikTokWatermark(ctx, appIcon, width, height, frame) {
        if (!appIcon) return;

        const size = width * 0.08; // Small watermark
        const margin = 15;

        // Animated path: moves from corners around the screen
        const cycleDuration = 600; // frames for full cycle
        const cycleProgress = (frame % cycleDuration) / cycleDuration;

        let x, y;

        // Path: top-left -> top-right -> bottom-right -> bottom-left -> repeat
        if (cycleProgress < 0.25) {
            // Top edge: left to right
            const t = cycleProgress / 0.25;
            x = margin + (width - size - margin * 2) * t;
            y = margin;
        } else if (cycleProgress < 0.5) {
            // Right edge: top to bottom
            const t = (cycleProgress - 0.25) / 0.25;
            x = width - size - margin;
            y = margin + (height - size - margin * 2) * t;
        } else if (cycleProgress < 0.75) {
            // Bottom edge: right to left
            const t = (cycleProgress - 0.5) / 0.25;
            x = width - size - margin - (width - size - margin * 2) * t;
            y = height - size - margin;
        } else {
            // Left edge: bottom to top
            const t = (cycleProgress - 0.75) / 0.25;
            x = margin;
            y = height - size - margin - (height - size - margin * 2) * t;
        }

        // Subtle pulse effect
        const pulseScale = 1 + Math.sin(frame * 0.1) * 0.05;

        ctx.save();
        ctx.translate(x + size / 2, y + size / 2);
        ctx.scale(pulseScale, pulseScale);
        ctx.translate(-(x + size / 2), -(y + size / 2));

        // Background circle with glow
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2 + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();

        // Outer ring
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2 + 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 107, 157, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw logo
        ctx.globalAlpha = 0.85;
        ctx.drawImage(appIcon, x, y, size, size);

        ctx.restore();
    }

    // Draw designer credit on intro and outro
    function drawDesignerCredit(ctx, width, height, frame) {
        const alpha = 0.35 + Math.sin(frame * 0.03) * 0.1;
        ctx.font = `${isMobile ? 12 : 14}px "Poppins", sans-serif`;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.textAlign = 'center';
        ctx.fillText('Designed by KofiLartey', width / 2, height - 20);
    }

    // Intro render
    async function renderIntro(ctx, width, height, totalFrames, startFrame = 0) {
        const appIcon = await loadAppIcon()

        for (let i = 0; i < totalFrames; i++) {
            const progress = i / totalFrames
            const easeProgress = 1 - Math.pow(1 - progress, 3)

            // Background gradient
            const grad = ctx.createLinearGradient(width / 2, 0, width / 2, height)
            grad.addColorStop(0, '#1a1a2e')
            grad.addColorStop(1, '#0a0a0a')
            ctx.fillStyle = grad
            ctx.fillRect(0, 0, width, height)

            // Add particles
            const particleCount = isMobile ? 15 : 35
            for (let p = 0; p < particleCount; p++) {
                const seed = 100 + p * 23
                const px = (seed * 37 + i * 0.5) % (width + 100) - 50
                const py = ((seed * 53 + i * 0.8) % (height + 100)) - 50
                ctx.save()
                ctx.globalAlpha = 0.3 + (seed % 40) / 100
                ctx.font = `${15 + (seed % 21)}px "Segoe UI Emoji"`
                ctx.fillStyle = '#ff6b9d'
                const emojis = ['❤️', '🎂', '🎈', '✨', '🎉', '💝']
                ctx.fillText(emojis[seed % emojis.length], px, py)
                ctx.restore()
            }

            // Title text
            const scale = 0.5 + easeProgress * 0.6
            const alpha = Math.min(1, progress * 2)

            ctx.save()
            ctx.shadowColor = 'rgba(255, 105, 180, 0.6)'
            ctx.shadowBlur = 25
            ctx.translate(width / 2, height / 2)
            ctx.scale(scale, scale)
            ctx.globalAlpha = alpha

            const titleFontSize = isMobile ? Math.min(45, width * 0.1) : 80
            const nameFontSize = isMobile ? Math.min(40, width * 0.09) : 70

            ctx.font = `bold ${titleFontSize}px "Playfair Display", serif`
            ctx.fillStyle = '#ff6b9d'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(eventText.title, 0, -30)

            ctx.font = `bold ${nameFontSize}px "Dancing Script", cursive`
            ctx.fillStyle = '#fff'
            ctx.fillText(`${celebrantName} ${eventText.emoji}`, 0, 50)
            ctx.restore()

            // Add designer credit
            // drawDesignerCredit(ctx, width, height, i)

            // Add watermark
            await drawTikTokWatermark(ctx, appIcon, width, height, startFrame + i)

            await new Promise(r => setTimeout(r, 1000 / 30))
        }
    }

    // Slide render with glass morphism text box (like slideshow)
    // Slide render with improved glass morphism and better text visibility
    async function renderSlide(ctx, width, height, slide, slideNumber, totalSlides, globalFrame, frames) {
        const img = new Image()
        img.crossOrigin = "anonymous"
        await new Promise(resolve => { img.onload = resolve; img.src = slide.photo })
        const appIcon = await loadAppIcon()

        for (let frame = 0; frame < frames; frame++) {
            ctx.clearRect(0, 0, width, height)

            // Enhanced Ken Burns effect (smoother zoom)
            const progress = frame / frames
            const zoom = 1 + Math.sin(progress * Math.PI) * 0.05
            const panX = Math.sin(progress * Math.PI * 1.2) * 15
            const panY = Math.cos(progress * Math.PI * 0.8) * 15

            const imgRatio = img.width / img.height
            const canvasRatio = width / height

            let drawWidth = width * zoom
            let drawHeight = height * zoom
            let drawX = (width - drawWidth) / 2 + panX
            let drawY = (height - drawHeight) / 2 + panY

            if (imgRatio > canvasRatio) {
                drawHeight = drawWidth / imgRatio
                drawY = (height - drawHeight) / 2 + panY
            } else {
                drawWidth = drawHeight * imgRatio
                drawX = (width - drawWidth) / 2 + panX
            }

            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

            // Enhanced overlay with gradient for better text readability
            const overlayGradient = ctx.createLinearGradient(0, height * 0.6, 0, height)
            overlayGradient.addColorStop(0, 'rgba(0,0,0,0.1)')
            overlayGradient.addColorStop(0.4, 'rgba(0,0,0,0.5)')
            overlayGradient.addColorStop(1, 'rgba(0,0,0,0.85)')
            ctx.fillStyle = overlayGradient
            ctx.fillRect(0, 0, width, height)

            // IMPROVED GLASS MORPHISM BOX - Larger and more readable
            const boxHeight = isMobile ? Math.min(140, height * 0.18) : 160
            const boxY = height - boxHeight - (isMobile ? 25 : 40)
            const padding = isMobile ? 20 : 28
            const borderRadius = 28

            // Glass background with better blur simulation
            ctx.save()

            // Shadow for depth
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
            ctx.shadowBlur = 20
            ctx.shadowOffsetY = 5

            // Semi-transparent background with gradient
            const glassGradient = ctx.createLinearGradient(0, boxY, 0, boxY + boxHeight)
            glassGradient.addColorStop(0, 'rgba(20, 15, 35, 0.85)')
            glassGradient.addColorStop(0.5, 'rgba(35, 25, 50, 0.88)')
            glassGradient.addColorStop(1, 'rgba(45, 35, 65, 0.92)')
            ctx.fillStyle = glassGradient

            // Rounded rectangle
            ctx.beginPath()
            ctx.moveTo(borderRadius, boxY)
            ctx.lineTo(width - borderRadius, boxY)
            ctx.quadraticCurveTo(width, boxY, width, boxY + borderRadius)
            ctx.lineTo(width, boxY + boxHeight - borderRadius)
            ctx.quadraticCurveTo(width, boxY + boxHeight, width - borderRadius, boxY + boxHeight)
            ctx.lineTo(borderRadius, boxY + boxHeight)
            ctx.quadraticCurveTo(0, boxY + boxHeight, 0, boxY + boxHeight - borderRadius)
            ctx.lineTo(0, boxY + borderRadius)
            ctx.quadraticCurveTo(0, boxY, borderRadius, boxY)
            ctx.closePath()
            ctx.fill()

            // Reset shadow for border
            ctx.shadowBlur = 0

            // Glass border with gradient
            ctx.beginPath()
            ctx.moveTo(borderRadius, boxY)
            ctx.lineTo(width - borderRadius, boxY)
            ctx.quadraticCurveTo(width, boxY, width, boxY + borderRadius)
            ctx.lineTo(width, boxY + boxHeight - borderRadius)
            ctx.quadraticCurveTo(width, boxY + boxHeight, width - borderRadius, boxY + boxHeight)
            ctx.lineTo(borderRadius, boxY + boxHeight)
            ctx.quadraticCurveTo(0, boxY + boxHeight, 0, boxY + boxHeight - borderRadius)
            ctx.lineTo(0, boxY + borderRadius)
            ctx.quadraticCurveTo(0, boxY, borderRadius, boxY)
            ctx.closePath()

            const borderGradient = ctx.createLinearGradient(0, boxY, width, boxY + boxHeight)
            borderGradient.addColorStop(0, 'rgba(255, 107, 157, 0.5)')
            borderGradient.addColorStop(0.5, 'rgba(255, 158, 181, 0.4)')
            borderGradient.addColorStop(1, 'rgba(255, 107, 157, 0.5)')
            ctx.strokeStyle = borderGradient
            ctx.lineWidth = 2
            ctx.stroke()

            // Add subtle shine effect on glass
            ctx.beginPath()
            ctx.moveTo(borderRadius + 2, boxY + 2)
            ctx.lineTo(width - borderRadius - 2, boxY + 2)
            ctx.quadraticCurveTo(width - 2, boxY + 2, width - 2, boxY + borderRadius + 2)
            ctx.lineTo(width - 2, boxY + 20)
            ctx.lineTo(borderRadius + 2, boxY + 20)
            ctx.lineTo(borderRadius + 2, boxY + borderRadius + 2)
            ctx.closePath()
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
            ctx.fill()

            // NAME TEXT - Larger and more prominent
            const nameFontSize = isMobile ? Math.min(28, width * 0.065) : 36
            const nameGrad = ctx.createLinearGradient(width / 2 - 150, boxY + padding, width / 2 + 150, boxY + padding + nameFontSize)
            nameGrad.addColorStop(0, '#ffb8d1')
            nameGrad.addColorStop(0.3, '#ff9eb5')
            nameGrad.addColorStop(0.7, '#ff85a8')
            nameGrad.addColorStop(1, '#ff6b9d')

            ctx.fillStyle = nameGrad
            ctx.font = `bold ${nameFontSize}px "Playfair Display", "Poppins", serif`
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
            ctx.shadowBlur = 10
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillText(slide.name, width / 2, boxY + padding)

            // MESSAGE TEXT - Improved readability with background
            const messageFontSize = isMobile ? Math.min(17, width * 0.042) : 22
            ctx.font = `${messageFontSize}px "Poppins", sans-serif`

            // Optional: Add subtle text background for better contrast
            ctx.shadowBlur = 2
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'

            let message = slide.message
            const maxChars = isMobile ? 85 : 140
            const maxLines = isMobile ? 3 : 4
            if (message.length > maxChars) {
                message = message.substring(0, maxChars - 3) + '...'
            }

            // Word wrap for long messages
            const words = message.split(' ')
            let lines = []
            let currentLine = ''

            for (let word of words) {
                const testLine = currentLine + (currentLine ? ' ' : '') + word
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)' // Just for measurement
                const metrics = ctx.measureText(testLine)
                if (metrics.width > width - (padding * 2) && currentLine) {
                    lines.push(currentLine)
                    currentLine = word
                    if (lines.length >= maxLines) break
                } else {
                    currentLine = testLine
                }
            }
            if (currentLine && lines.length < maxLines) lines.push(currentLine)

            if (lines.length === 0) lines = [message]

            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
            ctx.shadowBlur = 4
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'

            const lineHeight = messageFontSize + 6
            const messageY = boxY + padding + nameFontSize + 12

            lines.forEach((line, idx) => {
                if (idx < maxLines) {
                    ctx.fillText(line, width / 2, messageY + (idx * lineHeight))
                }
            })

            // Add decorative accent line
            ctx.beginPath()
            ctx.moveTo(width / 2 - 40, messageY - 5)
            ctx.lineTo(width / 2 + 40, messageY - 5)
            ctx.strokeStyle = 'rgba(255, 107, 157, 0.6)'
            ctx.lineWidth = 2
            ctx.stroke()

            ctx.beginPath()
            ctx.moveTo(width / 2 - 25, messageY - 3)
            ctx.lineTo(width / 2 + 25, messageY - 3)
            ctx.strokeStyle = 'rgba(255, 107, 157, 0.3)'
            ctx.lineWidth = 1.5
            ctx.stroke()

            ctx.restore()

            // SLIDE COUNTER - Improved styling
            ctx.save()
            ctx.font = `${isMobile ? 13 : 15}px "Poppins", monospace`
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
            ctx.shadowBlur = 4
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
            ctx.textAlign = 'right'

            // Counter background pill
            const counterText = `${slideNumber}/${totalSlides}`
            const counterMetrics = ctx.measureText(counterText)
            const counterWidth = counterMetrics.width + 20
            const counterHeight = 28
            const counterX = width - 25
            const counterY = 25

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
            ctx.beginPath()
            ctx.roundRect(counterX - counterWidth, counterY, counterWidth, counterHeight, 14)
            ctx.fill()

            ctx.fillStyle = 'rgba(255, 107, 157, 0.9)'
            ctx.textAlign = 'center'
            ctx.fillText(counterText, counterX - (counterWidth / 2), counterY + 19)
            ctx.restore()

            // Add moving watermark
            await drawTikTokWatermark(ctx, appIcon, width, height, globalFrame + frame)

            await new Promise(r => setTimeout(r, 1000 / 30))
        }
    }

    // Helper function for rounded rectangles (if not already defined)
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
            if (w < 2 * r) r = w / 2;
            if (h < 2 * r) r = h / 2;
            this.moveTo(x + r, y);
            this.lineTo(x + w - r, y);
            this.quadraticCurveTo(x + w, y, x + w, y + r);
            this.lineTo(x + w, y + h - r);
            this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            this.lineTo(x + r, y + h);
            this.quadraticCurveTo(x, y + h, x, y + h - r);
            this.lineTo(x, y + r);
            this.quadraticCurveTo(x, y, x + r, y);
            return this;
        };
    }

    // Outro render
    // Outro render with logo at the end
    async function renderOutro(ctx, width, height, totalFrames, startFrame = 0) {
        const appIcon = await loadAppIcon()

        for (let i = 0; i < totalFrames; i++) {
            const progress = i / totalFrames

            // Background gradient
            const grad = ctx.createLinearGradient(0, 0, 0, height)
            grad.addColorStop(0, '#1a1a3e')
            grad.addColorStop(1, '#05050f')
            ctx.fillStyle = grad
            ctx.fillRect(0, 0, width, height)

            // Floating hearts (fade out towards the end)
            const heartAlpha = Math.max(0, 1 - (progress * 1.5))
            for (let h = 0; h < (isMobile ? 8 : 15); h++) {
                const seed = 500 + h * 29
                const hy = ((seed * 47 + i * 0.5) % (height + 100)) - 50
                const hx = (seed * 137) % width
                ctx.save()
                ctx.globalAlpha = (0.3 + (seed % 10) / 25) * heartAlpha
                ctx.font = `${20 + (seed % 11)}px "Segoe UI Emoji"`
                ctx.fillStyle = '#ff6b9d'
                ctx.fillText('❤️', hx, hy)
                ctx.restore()
            }

            // Text animation (fades out to make room for logo)
            const textAlpha = Math.min(1, progress * 2) * Math.max(0, 1 - (progress * 1.2))
            const bounce = Math.sin(i * 0.1) * 5

            if (textAlpha > 0) {
                ctx.save()
                ctx.globalAlpha = textAlpha
                ctx.translate(width / 2, height / 2 + bounce)

                const thankFontSize = isMobile ? Math.min(40, width * 0.09) : 60
                ctx.font = `bold ${thankFontSize}px "Playfair Display", serif`
                ctx.fillStyle = '#ff9eb5'
                ctx.textAlign = 'center'
                ctx.fillText('Thank You', 0, -50)

                const loveFontSize = isMobile ? Math.min(28, width * 0.065) : 40
                ctx.font = `${loveFontSize}px "Dancing Script", cursive`
                ctx.fillStyle = '#fff'
                ctx.fillText('Made with Love', 0, 20)

                ctx.restore()
            }

            // LOGO ANIMATION - appears in the last 40% of the outro
            const logoStartProgress = 0.6 // Logo starts appearing at 60%
            let logoAlpha = 0
            let logoScale = 0.5

            if (progress > logoStartProgress) {
                const logoProgress = (progress - logoStartProgress) / (1 - logoStartProgress)
                logoAlpha = Math.min(1, logoProgress * 1.5)
                logoScale = 0.5 + (logoProgress * 0.7) // Scale from 0.5 to 1.2
                const bounceLogo = Math.sin(logoProgress * Math.PI) * 10
                const finalScale = logoScale + (bounceLogo / 100)

                ctx.save()
                ctx.globalAlpha = logoAlpha
                ctx.translate(width / 2, height / 2)
                ctx.scale(finalScale, finalScale)

                // Draw logo circle background
                ctx.shadowColor = 'rgba(255, 107, 157, 0.5)'
                ctx.shadowBlur = 20
                ctx.beginPath()
                ctx.arc(0, 0, 60, 0, Math.PI * 2)
                ctx.fillStyle = 'rgba(255, 107, 157, 0.15)'
                ctx.fill()

                ctx.beginPath()
                ctx.arc(0, 0, 50, 0, Math.PI * 2)
                ctx.fillStyle = 'rgba(255, 107, 157, 0.3)'
                ctx.fill()

                // Draw app icon/logo
                if (appIcon) {
                    ctx.drawImage(appIcon, -35, -35, 70, 70)
                } else {
                    // Fallback emoji logo
                    ctx.font = `bold ${isMobile ? 50 : 70}px "Segoe UI Emoji"`
                    ctx.fillStyle = '#ff6b9d'
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'
                    ctx.fillText('🎂', 0, 0)
                }

                ctx.restore()

                // Brand text that fades in after logo
                if (logoAlpha > 0.5) {
                    ctx.save()
                    ctx.globalAlpha = logoAlpha - 0.3
                    ctx.font = `${isMobile ? 16 : 20}px "Poppins", sans-serif`
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
                    ctx.textAlign = 'center'
                    ctx.fillText('Birthday Slideshow', width / 2, height / 2 + 85)
                    ctx.restore()
                }
            }

            // Designer credit (fades out when logo appears)
            const creditAlpha = Math.min(0.7, progress * 1.5) * Math.max(0, 1 - (progress * 1.3))
            if (creditAlpha > 0) {
                ctx.save();
                ctx.globalAlpha = creditAlpha;
                ctx.font = `${isMobile ? 14 : 18}px "Poppins", sans-serif`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.textAlign = 'center';
                ctx.fillText('Designed by KofiLartey', width / 2, height - 40);
                ctx.restore();
            }

            // Add moving watermark
            await drawTikTokWatermark(ctx, appIcon, width, height, startFrame + i)

            await new Promise(r => setTimeout(r, 1000 / 30))
        }
    }

    // ========== IMPROVED VIDEO EXPORT FUNCTION ==========

    async function exportVideo() {
        // Disable video download on mobile
        if (isMobile) {
            alert('Video download is only available on desktop for better quality. Please use a desktop computer to download videos.');
            return;
        }

        if (!slides.length) {
            alert('No slides to export');
            return;
        }

        const audioUrl = orderConfig?.audio_url;
        if (!audioUrl) {
            alert('No background music configured for this page.');
            return;
        }

        setIsRecording(true);
        setRecordingProgress(0);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false });

        // High quality resolution for desktop
        const width = 720;
        const height = 1280;
        canvas.width = width;
        canvas.height = height;

        let recorder = null;
        let audioElement = null;
        let audioContext = null;
        let audioDestination = null;
        let stream = null;
        let recordingChunks = [];
        let isRecordingActive = true;

        try {
            // Setup audio with better error handling
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioElement = new Audio(audioUrl);
            audioElement.loop = true;
            audioElement.volume = 0.3;
            audioElement.crossOrigin = 'anonymous';

            // Wait for audio to be ready
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Audio load timeout')), 10000);
                audioElement.addEventListener('canplaythrough', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                audioElement.addEventListener('error', reject);
                audioElement.load();
            });

            const source = audioContext.createMediaElementSource(audioElement);
            audioDestination = audioContext.createMediaStreamDestination();
            source.connect(audioDestination);
            source.connect(audioContext.destination);

            const canvasStream = canvas.captureStream(30);

            if (audioDestination.stream.getAudioTracks().length > 0) {
                stream = new MediaStream([
                    ...canvasStream.getVideoTracks(),
                    ...audioDestination.stream.getAudioTracks()
                ]);
            } else {
                stream = canvasStream;
            }

            // Find best MIME type - prioritize WebM for stability
            const mimeTypes = [
                'video/webm;codecs=vp8,opus',
                'video/webm;codecs=vp9,opus',
                'video/webm',
                'video/mp4'
            ];

            let mimeType = '';
            for (const type of mimeTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    mimeType = type;
                    break;
                }
            }

            if (!mimeType) {
                throw new Error('No supported MIME type found');
            }

            const recorderOptions = {
                mimeType: mimeType,
                videoBitsPerSecond: 3000000, // Slightly reduced for stability
                audioBitsPerSecond: 128000
            };

            recorder = new MediaRecorder(stream, recorderOptions);

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordingChunks.push(event.data);
                }
            };

            recorder.onerror = (event) => {
                console.error('Recorder error:', event);
                throw new Error('Recording error occurred');
            };

            // Start recording with timeslice
            recorder.start(1000);
            await new Promise(resolve => setTimeout(resolve, 200));

            // Start audio
            await audioContext.resume();
            try {
                await audioElement.play();
            } catch (err) {
                console.log('Audio playback warning:', err);
                // Continue without audio if needed
            }

            // Reduced frame counts for better performance
            const introFrames = 90;
            const slideFrames = 150;
            const outroFrames = 150; // Slightly longer to show logo

            let globalFrame = 0;

            // Helper for frame rendering with timeout
            const renderWithTimeout = async (renderFunc, ...args) => {
                if (!isRecordingActive) throw new Error('Recording stopped');
                return Promise.race([
                    renderFunc(...args),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Frame render timeout')), 30000))
                ]);
            };

            // Render intro
            setRecordingProgress(5);
            await renderWithTimeout(renderIntro, ctx, width, height, introFrames, globalFrame);
            globalFrame += introFrames;
            setRecordingProgress(15);

            // Preload all slide images
            const preloadPromises = slides.map(slide => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = resolve;
                    img.onerror = resolve; // Continue even if image fails
                    img.src = slide.photo;
                    setTimeout(resolve, 5000);
                });
            });
            await Promise.all(preloadPromises);

            // Render slides
            for (let i = 0; i < slides.length; i++) {
                if (!isRecordingActive) break;
                await renderWithTimeout(renderSlide, ctx, width, height, slides[i], i + 1, slides.length, globalFrame, slideFrames);
                globalFrame += slideFrames;
                const progress = 15 + Math.round(((i + 1) / slides.length) * 75);
                setRecordingProgress(progress);

                // Small pause between slides to prevent memory buildup
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            // Render outro with logo
            if (isRecordingActive) {
                await renderWithTimeout(renderOutro, ctx, width, height, outroFrames, globalFrame);
                setRecordingProgress(95);
            }

            // Give extra time for the last frames to render
            await new Promise(resolve => setTimeout(resolve, 500));

            // Stop recording
            if (recorder && recorder.state === 'recording') {
                recorder.stop();
            }

            // Stop audio
            if (audioElement) {
                audioElement.pause();
                audioElement.src = '';
            }

            if (audioContext) {
                await audioContext.close();
            }

            // Wait for final data
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (recordingChunks.length === 0) {
                throw new Error('No video data was recorded');
            }

            // Create and download video
            const blob = new Blob(recordingChunks, { type: mimeType });
            const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const filename = code
                ? `${eventText.action.toLowerCase()}-slideshow-${code}-${Date.now()}.${extension}`
                : `${eventText.action.toLowerCase()}-slideshow-${Date.now()}.${extension}`;

            // For large files, use download attribute
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => URL.revokeObjectURL(url), 5000);

            setRecordingProgress(100);
            alert('Video saved successfully!');

        } catch (err) {
            console.error('Video export error:', err);
            alert('Error creating video: ' + err.message + '. Please try again.');
        } finally {
            isRecordingActive = false;

            // Clean up resources
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (recorder && recorder.state === 'recording') {
                try {
                    recorder.stop();
                } catch (e) { }
            }
            if (audioElement) {
                audioElement.pause();
                audioElement.src = '';
                audioElement.load();
            }
            if (audioContext) {
                try {
                    await audioContext.close();
                } catch (e) { }
            }

            setIsRecording(false);
        }
    }

    // ========== VIDEO EXPORT FUNCTION ==========

    async function exportVideo() {
        // Disable video download on mobile
        if (isMobile) {
            alert('Video download is only available on desktop for better quality. Please use a desktop computer to download videos.');
            return;
        }

        if (!slides.length) {
            alert('No slides to export');
            return;
        }

        const audioUrl = orderConfig?.audio_url;
        if (!audioUrl) {
            alert('No background music configured for this page.');
            return;
        }

        setIsRecording(true);
        setRecordingProgress(0);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false });

        // High quality resolution for desktop
        const width = 720;
        const height = 1280;
        canvas.width = width;
        canvas.height = height;

        let recorder = null;
        let audioElement = null;
        let audioContext = null;
        let audioDestination = null;
        let stream = null;
        let recordingChunks = [];

        try {
            // Setup audio
            audioContext = await ensureAudioContext();
            audioElement = new Audio(audioUrl);
            audioElement.loop = true;
            audioElement.volume = 0.3;
            audioElement.crossOrigin = 'anonymous';

            const source = audioContext.createMediaElementSource(audioElement);
            audioDestination = audioContext.createMediaStreamDestination();
            source.connect(audioDestination);
            source.connect(audioContext.destination);

            const canvasStream = canvas.captureStream(30);

            if (audioDestination.stream.getAudioTracks().length > 0) {
                stream = new MediaStream([
                    ...canvasStream.getVideoTracks(),
                    ...audioDestination.stream.getAudioTracks()
                ]);
            } else {
                stream = canvasStream;
            }

            // Find best MIME type
            const mimeTypes = [
                'video/mp4;codecs=h264,aac',
                'video/mp4',
                'video/webm;codecs=vp8,opus',
                'video/webm'
            ];

            let mimeType = '';
            for (const type of mimeTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    mimeType = type;
                    break;
                }
            }

            const recorderOptions = {
                mimeType: mimeType,
                videoBitsPerSecond: 4000000,
                audioBitsPerSecond: 192000
            };

            recorder = new MediaRecorder(stream, recorderOptions);

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordingChunks.push(event.data);
                }
            };

            recorder.start(250);
            await new Promise(resolve => setTimeout(resolve, 100));

            if (audioContext.state !== 'running') {
                await audioContext.resume();
            }
            try {
                await audioElement.play();
            } catch (err) {
                console.log('Audio playback failed:', err);
            }

            const introFrames = 120;
            const slideFrames = 180;
            const outroFrames = 120;

            let globalFrame = 0;

            // Render intro
            await renderIntro(ctx, width, height, introFrames, globalFrame);
            globalFrame += introFrames;
            setRecordingProgress(10);

            // Render slides
            for (let i = 0; i < slides.length; i++) {
                await renderSlide(ctx, width, height, slides[i], i + 1, slides.length, globalFrame, slideFrames);
                globalFrame += slideFrames;
                setRecordingProgress(10 + Math.round(((i + 1) / slides.length) * 80));
            }

            // Render outro
            await renderOutro(ctx, width, height, outroFrames, globalFrame);
            setRecordingProgress(95);

            await new Promise(resolve => setTimeout(resolve, 500));

            if (recorder && recorder.state === 'recording') {
                recorder.stop();
            }

            if (audioElement) {
                audioElement.pause();
            }

            await new Promise(resolve => setTimeout(resolve, 1000));

            if (recordingChunks.length === 0) {
                throw new Error('No video data was recorded');
            }

            // Create video blob
            const blob = new Blob(recordingChunks, { type: mimeType || 'video/mp4' });
            const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const filename = code
                ? `${eventText.action.toLowerCase()}-slideshow-${code}-${Date.now()}.${extension}`
                : `${eventText.action.toLowerCase()}-slideshow-${Date.now()}.${extension}`;

            // Save to device
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            setRecordingProgress(100);
            alert('Video saved to your device!');

        } catch (err) {
            console.error('Video export error:', err);
            alert('An error occurred: ' + err.message);
        } finally {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (audioElement) {
                audioElement.pause();
                audioElement.src = '';
            }
            if (audioContext) {
                audioContext.close();
            }
            setIsRecording(false);
        }
    }

    function shareToWhatsApp() {
        if (code) {
            const baseUrl = window.location.origin;
            const shareLink = `${baseUrl}/slideshow/${code}`;
            const messageText = `✨ Join the ${eventText.shareMessage}! ✨\n\n🎥 Watch the slideshow: ${shareLink}\n\n💝 Enjoy the memories!`;
            const encodedMessage = encodeURIComponent(messageText);
            window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        }
    }

    function getVisibleSlides() {
        if (slides.length === 0) return []
        const indices = []
        for (let i = -2; i <= 2; i++) {
            let idx = currentIndex + i
            if (idx < 0) idx = slides.length + idx
            if (idx >= slides.length) idx = idx - slides.length
            indices.push({ index: idx, isActive: i === 0 })
        }
        return indices
    }

    const progress = slides.length > 0 ? ((currentIndex + 1) / slides.length) * 100 : 0

    return (
        <div className="relative w-full h-screen overflow-hidden" style={{ background: '#0a0a0a' }}>
            <div className="fixed inset-0" style={{ background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #0a0a0a 50%, #000 100%)', zIndex: -1 }} />
            <div className="hearts" id="heartsContainer"></div>

            <button onClick={goBack} className="fab back fixed top-5 left-5 z-50" title="Go Back">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>

            <div className="fab-container fixed top-5 right-5 z-50 flex gap-2">
                <button className="fab w-10 h-10 rounded-full bg-gray-800/80 backdrop-blur text-white flex items-center justify-center" onClick={toggleMusic} title="Toggle Music">
                    {musicPlaying ? (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                    ) : (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                    )}
                </button>
                <button className="fab w-10 h-10 rounded-full bg-gray-800/80 backdrop-blur text-white flex items-center justify-center" onClick={openDownloadModal} title="Download Current Slide">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
                <button className="fab w-10 h-10 rounded-full bg-gray-800/80 backdrop-blur text-white flex items-center justify-center" onClick={downloadAllImages} disabled={isBulkDownloading} title="Download All Images">
                    {isBulkDownloading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    )}
                </button>
                <button className="fab w-10 h-10 rounded-full bg-gray-800/80 backdrop-blur text-white flex items-center justify-center" onClick={exportVideo} disabled={isRecording} title="Export Video">
                    {isRecording ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    )}
                </button>
                <button className="fab w-10 h-10 rounded-full bg-gray-800/80 backdrop-blur text-white flex items-center justify-center" onClick={shareToWhatsApp} title="Share">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                </button>
            </div>

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

            {isBulkDownloading && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-6xl mb-4">📦</div>
                        <p className="text-white text-2xl mb-4">Downloading all images...</p>
                        <div className="w-64 h-4 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-200" style={{ width: `${bulkDownloadProgress}%` }} />
                        </div>
                        <p className="text-gray-400 mt-2">{bulkDownloadProgress}%</p>
                        <p className="text-gray-500 text-sm mt-2">Please don't close this tab</p>
                    </div>
                </div>
            )}

            {orderLoaded && celebrantName && showTitle && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 transition-all duration-1000 ease-out bg-stone-950">

                    {/* Full screen background image - Set to full opacity and perfectly clear */}
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-100"
                        style={{ backgroundImage: `url('https://res.cloudinary.com/djjgkezui/image/upload/v1778959179/IMG-20260516-WA0050_zegaok.jpg')` }}
                    />

                    {/* Warm, romantic vignette (Using a warm neutral/rose-tinted shadow instead of blue darks) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-stone-950/50" />

                    {/* Content Container - True White Mirror Glass Effect */}
                    <div className="relative z-10 max-w-xl text-center space-y-6 px-8 py-10 rounded-3xl bg-white/[0.08] backdrop-blur-2xl border-t border-l border-white/25 border-b border-r border-white/10 shadow-2xl shadow-black/40">

                        {/* Circular Icon Avatar with a warm, romantic rose/gold ring */}
                        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-rose-400 via-pink-400 to-amber-400 p-[2px] shadow-xl shadow-rose-400/30 animate-pulse">
                            <div
                                className="w-full h-full rounded-full bg-cover bg-center border-2 border-stone-900/10"
                                style={{ backgroundImage: `url('https://res.cloudinary.com/djjgkezui/image/upload/v1778959179/IMG-20260516-WA0050_zegaok.jpg')` }}
                            />
                        </div>

                        {/* Title & Subtitle with bright, clean typography */}
                        <div className="space-y-3 pt-2">
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-b from-white via-stone-100 to-stone-200 bg-clip-text text-transparent drop-shadow-sm">
                                {titleText}
                            </h1>
                            <div className="w-16 h-[2px] bg-gradient-to-r from-rose-400 via-pink-400 to-amber-400 mx-auto rounded-full" />
                            <p className="text-sm md:text-base text-white/90 font-normal tracking-wide max-w-sm mx-auto leading-relaxed drop-shadow">
                                {subtitleText}
                            </p>
                        </div>

                        {/* Romanticized Action Button */}
                        <button
                            onClick={() => {
                                setShowTitle(false);
                                if (musicRef.current && !musicPlaying) {
                                    musicRef.current.play()
                                        .then(() => {
                                            setMusicPlaying(true);
                                            setAudioInitialized(true);
                                        })
                                        .catch(err => console.log("Audio playback failed:", err));
                                }
                            }}
                            className="mt-4 px-8 py-3 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white rounded-xl font-semibold tracking-wider text-sm transition-all duration-300 transform active:scale-95 shadow-lg shadow-rose-500/20"
                        >
                            ✨ Open Our Story ✨
                        </button>

                        {/* Visual Countdown Bar Loader */}
                        <div className="w-full bg-white/20 h-[3px] rounded-full overflow-hidden mt-4">
                            <div className="h-full bg-gradient-to-r from-rose-400 via-pink-400 to-amber-400 rounded-full animate-[progress_4.5s_linear_forwards]" />
                        </div>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-6xl mb-4">✨</div>
                        <p className="text-white text-xl">Loading memories...</p>
                        <div className="mt-4 w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                </div>
            ) : slides.length > 0 ? (
                <>
                    {isDesktop ? (
                        <div className="desktop-carousel-container h-full flex flex-col justify-center items-center px-8 pb-4">
                            <div className="flex items-center justify-center gap-4 md:gap-6 max-w-7xl mx-auto">
                                {getVisibleSlides().map(({ index, isActive }) => (
                                    <div
                                        key={index}
                                        onClick={() => setCurrentIndex(index)}
                                        className={`transition-all duration-500 ease-out cursor-pointer ${isActive ? 'z-10 scale-100 md:scale-110' : 'scale-90 md:scale-75 blur-sm opacity-70 hover:opacity-100 hover:blur-none'}`}
                                        style={{ flex: '0 0 auto', width: isActive ? 'min(65vw, 500px)' : 'min(25vw, 200px)', transition: 'width 0.4s ease, transform 0.4s ease, filter 0.4s ease, opacity 0.4s ease' }}
                                    >
                                        <div className={`relative rounded-2xl overflow-hidden shadow-2xl ${isActive ? 'animate-gentle-pop' : ''}`} key={popAnimationKey}>
                                            <img src={slides[index].photo} alt={slides[index].name} className="w-full h-auto object-contain max-h-[70vh] transition-transform duration-700 hover:scale-105" onError={(e) => e.target.src = 'data:image/svg+xml;...'} />
                                            {isActive && (
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-4 text-white text-center transition-all duration-300">
                                                    <h3 className="font-bold text-lg md:text-xl romantic-font drop-shadow-lg">{slides[index].name}</h3>
                                                    <p className="text-xs md:text-sm mt-1 drop-shadow-md">{slides[index].message}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30 bg-black/50 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-4 shadow-lg transition-all duration-300">
                                <span className="text-white/80 text-xs font-mono">{currentIndex + 1}/{slides.length}</span>
                                <div className="w-32 h-1 bg-gray-500/50 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-pink-400 to-rose-400 transition-all duration-300" style={{ width: `${progress}%` }} />
                                </div>
                                <button onClick={prevSlide} className="text-white hover:text-pink-300 transition p-1">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <button onClick={togglePlay} className="text-white bg-pink-600/80 hover:bg-pink-600 rounded-full p-1.5 transition">
                                    {isPlaying ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                                    )}
                                </button>
                                <button onClick={nextSlide} className="text-white hover:text-pink-300 transition p-1">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="slideshow-container">
                            {slides.map((slide, index) => (
                                <div key={index} className={`slide ${index === currentIndex ? 'active' : ''}`}>
                                    <img src={slide.photo} className="slide-image" alt={`Slide ${index + 1}`} onError={(e) => e.target.src = 'data:image/svg+xml;...'} />
                                    <div className="slide-message">
                                        <h3>{slide.name}</h3>
                                        <p>{slide.message}</p>
                                    </div>
                                </div>
                            ))}
                            <div className="photo-counter">{currentIndex + 1} / {slides.length}</div>
                            <div className="controls-wrapper">
                                <div className="progress-container">
                                    <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="controls">
                                    <button className="control-btn" onClick={prevSlide}>
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <button className="control-btn primary" onClick={togglePlay}>
                                        {isPlaying ? (
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        ) : (
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                                        )}
                                    </button>
                                    <button className="control-btn" onClick={nextSlide}>
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center px-4">
                        <div className="text-6xl mb-4">{eventText.emoji}</div>
                        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-600 mb-2 romantic-font">
                            {eventText.title}, {celebrantName}! {eventText.emoji}
                        </h2>
                        <p className="text-gray-300 mt-2 max-w-md mx-auto">
                            The celebration is about to begin! Share your favorite memories to make this moment even more special.
                        </p>
                        <Link to={`/upload/${code}`} className="inline-block mt-6 bg-gradient-to-r from-rose-500 to-pink-600 text-white px-8 py-3 rounded-full hover:from-rose-600 hover:to-pink-700 transition shadow-lg">
                            Add Your Photos 📸
                        </Link>
                    </div>
                </div>
            )}

            {showDownload && (
                <div className="download-modal active fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={closeDownloadModal}>
                    <div className="download-content bg-gray-900 rounded-2xl p-6 max-w-sm w-full mx-4 text-center" onClick={e => e.stopPropagation()}>
                        <button className="close-modal float-right text-gray-400 hover:text-white" onClick={closeDownloadModal}>✕</button>
                        <h2 className="romantic-font text-2xl mb-4">Save This Memory 📸</h2>
                        <img src={downloadImage} alt="Preview" className="download-preview w-full rounded-lg mb-4" />
                        <div className="download-buttons flex gap-3 justify-center">
                            <button className="download-btn primary bg-pink-600 px-4 py-2 rounded-full text-white flex items-center gap-2" onClick={downloadImageFile}>
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Download
                            </button>
                            <button className="download-btn secondary bg-gray-700 px-4 py-2 rounded-full text-white flex items-center gap-2" onClick={() => { shareToWhatsApp(); closeDownloadModal(); }}>
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                Share
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <KeyboardControls onNext={nextSlide} onPrev={prevSlide} onTogglePlay={togglePlay} onToggleMusic={toggleMusic} onCloseModal={closeDownloadModal} />
        </div>
    )
}

function KeyboardControls({ onNext, onPrev, onTogglePlay, onToggleMusic, onCloseModal }) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ') onNext()
            else if (e.key === 'ArrowLeft') onPrev()
            else if (e.key === 'p' || e.key === 'P') onTogglePlay()
            else if (e.key === 'm' || e.key === 'M') onToggleMusic()
            else if (e.key === 'Escape') onCloseModal()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onNext, onPrev, onTogglePlay, onToggleMusic, onCloseModal])
    return null
}

export default Slideshow