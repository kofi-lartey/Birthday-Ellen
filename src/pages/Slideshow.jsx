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
        if (!downloadImage) {
            alert("No image available to download");
            return
        }

        // Find the slide data using the current index instead of URL matching
        const currentSlide = slides[downloadSlideIndex];
        if (!currentSlide) {
            alert("Could not find slide data");
            return;
        }

        await downloadImageWithOverlay(
            currentSlide.photo,
            code ? `${eventText.action.toLowerCase()}-${code}-slide-${downloadSlideIndex + 1}.jpg` : `${eventText.action.toLowerCase()}-slide-${downloadSlideIndex + 1}.jpg`,
            false,
            currentSlide  // Pass the slide data directly
        )
    }

    async function downloadAllImages() {
        if (slides.length === 0) return
        setIsBulkDownloading(true)
        setBulkDownloadProgress(0)
        try {
            for (let i = 0; i < slides.length; i++) {
                const filename = code ? `${eventText.action.toLowerCase()}-${code}-slide-${i + 1}.jpg` : `${eventText.action.toLowerCase()}-slide-${i + 1}.jpg`
                // Pass the current slide data directly
                await downloadImageWithOverlay(slides[i].photo, filename, true, slides[i])
                setBulkDownloadProgress(Math.round(((i + 1) / slides.length) * 100))
            }
        } finally {
            setIsBulkDownloading(false)
            setBulkDownloadProgress(0)
        }
    }

    async function downloadImageWithOverlay(imageUrl, filename, silent = false, providedSlideData = null) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            const img = new Image()
            img.crossOrigin = "Anonymous"

            let appIcon = null
            const loadAppIconPromise = loadAppIcon()

            img.onload = async () => {
                // ⭐ FIX: Define a clean master max target dimension first
                const maxDimension = 1200;
                const imgAspect = img.width / img.height;

                let targetWidth, targetHeight;

                // ⭐ FIX: Derive canvas aspect bounding box logically from source shape
                if (img.width > img.height) {
                    targetWidth = maxDimension;
                    targetHeight = maxDimension / imgAspect;
                } else {
                    targetHeight = maxDimension;
                    targetWidth = maxDimension * imgAspect;
                }

                // Lock canvas dimensions securely
                canvas.width = targetWidth;
                canvas.height = targetHeight;

                // ⭐ FIX: Center and scale image cleanly inside the newly constrained canvas
                let drawWidth = canvas.width;
                let drawHeight = canvas.height;
                let drawX = 0;
                let drawY = 0;

                // Draw the background image safely
                ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

                appIcon = await loadAppIconPromise

                // --- Below remains your overlay text & watermark rendering logic ---
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

                let slideData = providedSlideData;
                if (!slideData) {
                    slideData = slides[downloadSlideIndex];
                }
                if (!slideData) {
                    slideData = {
                        name: 'Memory',
                        message: 'A special moment',
                        photo: imageUrl
                    };
                }

                ctx.font = `${messageFontSize}px Outfit, sans-serif`
                const messageLines = wrapText(slideData.message, boxWidth - padding * 2)
                const boxHeight = padding + nameFontSize + padding / 2 + messageLines.length * lineHeight + padding
                const boxY = canvas.height - boxHeight - canvas.width * 0.05
                const radius = canvas.width * 0.03

                // Warm Glassmorphism Overlay (Matching your romantic theme update!)
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
                messageLines.forEach(line => {
                    ctx.fillText(line, canvas.width / 2, startY);
                    startY += lineHeight
                })

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
                    if (!blob) {
                        if (!silent) alert("Download failed.");
                        resolve();
                        return
                    }
                    const link = document.createElement("a")
                    link.href = URL.createObjectURL(blob)
                    link.download = filename
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    setTimeout(() => URL.revokeObjectURL(link.href), 100)
                    resolve()
                }, "image/jpeg", 0.95)
            }

            img.onerror = (err) => {
                console.error('Image load error:', err);
                if (!silent) alert("Image failed to load. Try again.");
                resolve()
            }

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

    async function drawTikTokWatermark(
        ctx,
        appIcon,
        width,
        height,
        frame
    ) {
        if (!appIcon) return;

        // =====================================
        // SIZE
        // =====================================

        const baseSize = isMobile
            ? Math.max(width * 0.20, 150)
            : Math.max(width * 0.10, 120);

        const margin = 40;

        // =====================================
        // MOVEMENT PATH
        // =====================================

        const cycleDuration = 300;

        const angle =
            ((frame % cycleDuration) / cycleDuration) *
            Math.PI *
            2;

        const orbitX =
            width / 2 -
            margin -
            baseSize / 2;

        const orbitY =
            height / 2 -
            margin -
            baseSize / 2;

        const x =
            width / 2 +
            Math.cos(angle) * orbitX -
            baseSize / 2;

        const y =
            height / 2 +
            Math.sin(angle) * orbitY -
            baseSize / 2;

        // =====================================
        // ANIMATIONS
        // =====================================

        const pulse =
            1 +
            Math.sin(frame * 0.05) *
            0.15;

        const rotation =
            Math.sin(frame * 0.02) *
            0.25;

        // =====================================
        // DRAW
        // =====================================

        ctx.save();

        ctx.translate(
            x + baseSize / 2,
            y + baseSize / 2
        );

        ctx.rotate(rotation);

        ctx.scale(pulse, pulse);

        // =====================================
        // GLOW
        // =====================================

        ctx.shadowColor = "#ff6b9d";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 2;
        ctx.lineWidth = 2;

        // =====================================
        // OUTER RING
        // =====================================

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            baseSize / 2 + 10,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fill();

        ctx.strokeStyle =
            "rgba(255,255,255,0.35)";
        ctx.lineWidth = 4;
        ctx.stroke();

        // =====================================
        // GLASS HIGHLIGHT
        // =====================================

        ctx.beginPath();

        ctx.arc(
            -baseSize * 0.12,
            -baseSize * 0.15,
            baseSize * 0.22,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            "rgba(255,255,255,0.15)";
        ctx.fill();

        // =====================================
        // CLIP ICON
        // =====================================

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            baseSize / 2,
            0,
            Math.PI * 2
        );

        ctx.clip();

        ctx.drawImage(
            appIcon,
            -baseSize / 2,
            -baseSize / 2,
            baseSize,
            baseSize
        );

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

   function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

// Liquid wave helper
function wave(t, x) {
    return Math.sin(x * 0.08 + t * 6) * 3;
}

function loadImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

// =====================================================
// INTRO RENDER — CLEAN LIQUID GLASS STYLE (NO EXPLOSION)
// =====================================================
async function renderIntro(ctx, width, height, totalFrames, startFrame = 0) {
    const appIcon = await loadAppIcon();
    const bgImage = await loadImage(APP_ICON_URL);

    for (let i = 0; i < totalFrames; i++) {
        const raw = i / totalFrames;
        const progress = easeOutCubic(raw);

        const isComplete = progress >= 0.999;

        // phase split (clean transition)
        const iconPhase = Math.min(1, progress / 0.35);   // icon focus
        const revealPhase = Math.max(0, (progress - 0.35) / 0.65);

        ctx.clearRect(0, 0, width, height);

        // =====================================================
        // 1. BACKGROUND (CINEMATIC BLUR)
        // =====================================================
        if (bgImage) {
            ctx.save();
            ctx.globalAlpha = 0.55;
            ctx.filter = "blur(35px) saturate(1.6) contrast(1.2)";

            const scale = Math.max(
                width / bgImage.width,
                height / bgImage.height
            );

            const x = (width - bgImage.width * scale) / 2;
            const y = (height - bgImage.height * scale) / 2;

            ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);
            ctx.restore();

            const overlay = ctx.createLinearGradient(0, 0, 0, height);
            overlay.addColorStop(0, "rgba(8, 12, 20, 0.55)");
            overlay.addColorStop(1, "rgba(3, 5, 10, 0.95)");

            ctx.fillStyle = overlay;
            ctx.fillRect(0, 0, width, height);
        }

        // vignette
        const vignette = ctx.createRadialGradient(
            width / 2,
            height / 2,
            60,
            width / 2,
            height / 2,
            Math.max(width, height)
        );

        vignette.addColorStop(0, "rgba(0,0,0,0)");
        vignette.addColorStop(1, "rgba(0,0,0,0.75)");

        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);

        // =====================================================
        // 2. GLASS CARD (SMOOTH REVEAL)
        // =====================================================
        const cardW = Math.min(width * 0.85, 520);
        const cardH = 470;
        const cardX = (width - cardW) / 2;
        const cardY = (height - cardH) / 2;

        ctx.save();

        ctx.globalAlpha = revealPhase;

        ctx.shadowColor = "rgba(0,0,0,0.65)";
        ctx.shadowBlur = 70;
        ctx.shadowOffsetY = 35;

        const glass = ctx.createLinearGradient(
            cardX,
            cardY,
            cardX,
            cardY + cardH
        );

        glass.addColorStop(0, "rgba(20, 30, 50, 0.55)");
        glass.addColorStop(0.5, "rgba(30, 40, 70, 0.25)");
        glass.addColorStop(1, "rgba(10, 15, 30, 0.65)");

        ctx.fillStyle = glass;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 34);
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.stroke();

        ctx.restore();

        // =====================================================
        // 3. ICON (SMOOTH FLOAT INTO POSITION)
        // =====================================================
        if (appIcon) {
            ctx.save();

            const floatY = Math.sin(progress * Math.PI * 2) * 5;
            const baseY = cardY + 70;

            // icon starts slightly higher and settles
            const startOffset = 40 * (1 - iconPhase);
            const iconY = baseY - startOffset + floatY;

            ctx.translate(width / 2, iconY);

            ctx.shadowColor = "rgba(99, 102, 241, 0.35)";
            ctx.shadowBlur = 35;

            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.beginPath();
            ctx.arc(0, 0, 60, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(0, 0, 52, 0, Math.PI * 2);
            ctx.clip();

            ctx.drawImage(appIcon, -52, -52, 104, 104);

            ctx.restore();
        }

        // =====================================================
        // 4. TEXT (FADE IN CLEANLY)
        // =====================================================
        const textAlpha = Math.min(1, Math.max(0, (revealPhase - 0.15) * 2));

        ctx.save();
        ctx.globalAlpha = textAlpha;
        ctx.textAlign = "center";

        ctx.fillStyle = "#ffffff";
        ctx.font = `800 ${width * 0.06}px Outfit`;
        ctx.fillText(eventText.title, width / 2, cardY + 190);

        ctx.font = `600 ${width * 0.05}px Outfit`;
        ctx.fillText(celebrantName, width / 2, cardY + 240);

        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.font = `400 ${width * 0.035}px Outfit`;
        ctx.fillText(
            "With love from your friends & family 💖",
            width / 2,
            cardY + 290
        );

        ctx.restore();

        // =====================================================
        // 5. CTA BUTTON
        // =====================================================
        const btnW = cardW * 0.7;
        const btnH = 54;
        const btnX = (width - btnW) / 2;
        const btnY = cardY + 330;

        ctx.save();

        ctx.globalAlpha = revealPhase;

        ctx.shadowColor = "rgba(99, 102, 241, 0.25)";
        ctx.shadowBlur = 30;

        const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
        btnGrad.addColorStop(0, "rgba(59, 130, 246, 0.7)");
        btnGrad.addColorStop(1, "rgba(236, 72, 153, 0.7)");

        ctx.fillStyle = btnGrad;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 18);
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.font = `600 18px Outfit`;
        ctx.textAlign = "center";
        ctx.fillText("✨ Open Our Story ✨", width / 2, btnY + 35);

        ctx.restore();

        // =====================================================
        // 6. PROGRESS BAR (LIQUID STYLE)
        // =====================================================
        const barW = cardW * 0.72;
        const barH = 10;
        const barX = (width - barW) / 2;
        const barY = btnY + 80;

        ctx.save();

        ctx.globalAlpha = revealPhase;

        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 20);
        ctx.fill();

        const fillW = barW * revealPhase;

        const liquidGrad = ctx.createLinearGradient(
            barX,
            barY,
            barX + fillW,
            barY
        );

        liquidGrad.addColorStop(0, "rgba(59, 130, 246, 0.9)");
        liquidGrad.addColorStop(0.5, "rgba(99, 102, 241, 0.9)");
        liquidGrad.addColorStop(1, "rgba(236, 72, 153, 0.9)");

        ctx.fillStyle = liquidGrad;

        ctx.beginPath();
        ctx.moveTo(barX, barY + barH);

        for (let x = 0; x <= fillW; x += 6) {
            const y = barY + wave(revealPhase, x);
            ctx.lineTo(barX + x, y);
        }

        ctx.lineTo(barX + fillW, barY + barH);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // =====================================================
        // 7. FINAL PULSE
        // =====================================================
        if (isComplete) {
            ctx.save();

            const pulse = Math.sin(i * 0.3) * 0.5 + 0.5;

            ctx.globalAlpha = pulse * 0.4;
            ctx.strokeStyle = "rgba(99, 102, 241, 1)";
            ctx.lineWidth = 4;

            ctx.beginPath();
            ctx.roundRect(cardX - 10, cardY - 10, cardW + 20, cardH + 20, 40);
            ctx.stroke();

            ctx.restore();
        }

        // =====================================================
        // WATERMARK
        // =====================================================
        await drawTikTokWatermark(
            ctx,
            appIcon,
            width,
            height,
            startFrame + i
        );

        await new Promise((r) => setTimeout(r, 1000 / 30));
    }
}

    // IMPROVED SLIDE RENDER - Modern "Card" Overlay
    async function renderSlide(
        ctx,
        width,
        height,
        slide,
        slideNumber,
        totalSlides,
        globalFrame,
        frames,
        isMobile = true
    ) {
        const img = new Image();
        img.crossOrigin = "anonymous";

        await new Promise((resolve) => {
            img.onload = resolve;
            img.src = slide.photo;
        });

        const appIcon = await loadAppIcon();

        for (let frame = 0; frame < frames; frame++) {
            ctx.clearRect(0, 0, width, height);

            // =====================================
            // DRAW IMAGE (COVER)
            // =====================================

            const imgAspect = img.width / img.height;
            const canvasAspect = width / height;

            let drawWidth;
            let drawHeight;
            let drawX;
            let drawY;

            if (imgAspect > canvasAspect) {
                drawHeight = height;
                drawWidth = drawHeight * imgAspect;
                drawX = (width - drawWidth) / 2;
                drawY = 0;
            } else {
                drawWidth = width;
                drawHeight = drawWidth / imgAspect;
                drawX = 0;
                drawY = (height - drawHeight) / 2;
            }

            ctx.drawImage(
                img,
                drawX,
                drawY,
                drawWidth,
                drawHeight
            );

            // =====================================
            // GRADIENT CARD
            // =====================================

            const cardWidth = width * 0.84;
            const cardHeight = isMobile ? 130 : 170;

            const cardX = (width - cardWidth) / 2;
            const cardY = height - cardHeight - 55;

            const radius = 30;

            // Shadow
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.25)";
            ctx.shadowBlur = 25;
            ctx.shadowOffsetY = 10;

            // Gradient
            const gradient = ctx.createLinearGradient(
                cardX,
                cardY,
                cardX,
                cardY + cardHeight
            );

            gradient.addColorStop(0, "#ff4fa3");
            gradient.addColorStop(0.5, "#ff5d8f");
            gradient.addColorStop(1, "#ff7b7b");

            ctx.fillStyle = gradient;

            ctx.beginPath();
            ctx.roundRect(
                cardX,
                cardY,
                cardWidth,
                cardHeight,
                radius
            );
            ctx.fill();

            ctx.restore();

            // =====================================
            // NAME
            // =====================================

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            ctx.fillStyle = "#ffffff";

            ctx.font = `700 ${isMobile ? width * 0.055 : width * 0.045
                }px Poppins`;

            ctx.fillText(
                slide.name,
                width / 2,
                cardY + cardHeight * 0.42
            );

            // =====================================
            // MESSAGE
            // =====================================

            ctx.font = `500 ${isMobile ? width * 0.038 : width * 0.03
                }px Poppins`;

            ctx.fillText(
                slide.message,
                width / 2,
                cardY + cardHeight * 0.72
            );

            // =====================================
            // WATERMARK
            // =====================================

            await drawTikTokWatermark(
                ctx,
                appIcon,
                width,
                height,
                globalFrame + frame
            );

            await new Promise((r) =>
                setTimeout(r, 1000 / 30)
            );
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


    async function renderOutro(ctx, width, height, totalFrames, startFrame = 0) {
        const appIcon = await loadAppIcon();
        const bgImage = await loadImage(APP_ICON_URL);

        for (let i = 0; i < totalFrames; i++) {
            const raw = i / totalFrames;
            const progress = easeOutCubic(raw);

            ctx.clearRect(0, 0, width, height);

            // =====================================================
            // 1. BACKGROUND (BLURRED APP IMAGE)
            // =====================================================
            if (bgImage) {
                ctx.save();
                ctx.globalAlpha = 0.45;
                ctx.filter = "blur(28px) saturate(1.4) contrast(1.1)";

                const scale = Math.max(
                    width / bgImage.width,
                    height / bgImage.height
                );

                const x = (width - bgImage.width * scale) / 2;
                const y = (height - bgImage.height * scale) / 2;

                ctx.drawImage(
                    bgImage,
                    x,
                    y,
                    bgImage.width * scale,
                    bgImage.height * scale
                );

                ctx.restore();

                // dark cinematic overlay
                const overlay = ctx.createLinearGradient(0, 0, 0, height);
                overlay.addColorStop(0, "rgba(10, 15, 25, 0.55)");
                overlay.addColorStop(1, "rgba(5, 8, 15, 0.92)");

                ctx.fillStyle = overlay;
                ctx.fillRect(0, 0, width, height);
            }

            // vignette
            const vignette = ctx.createRadialGradient(
                width / 2,
                height / 2,
                80,
                width / 2,
                height / 2,
                Math.max(width, height)
            );

            vignette.addColorStop(0, "rgba(0,0,0,0)");
            vignette.addColorStop(1, "rgba(0,0,0,0.65)");

            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, width, height);

            // =====================================================
            // 2. GLASS MIRROR CARD (DARK CINEMATIC)
            // =====================================================
            const cardSize = Math.min(width * 0.78, 420);
            const cardX = (width - cardSize) / 2;
            const cardY = (height - cardSize) / 2;

            ctx.save();

            ctx.shadowColor = "rgba(0,0,0,0.6)";
            ctx.shadowBlur = 60;
            ctx.shadowOffsetY = 30;

            const glass = ctx.createLinearGradient(
                cardX,
                cardY,
                cardX,
                cardY + cardSize
            );

            glass.addColorStop(0, "rgba(15, 23, 42, 0.55)");
            glass.addColorStop(0.5, "rgba(30, 41, 59, 0.25)");
            glass.addColorStop(1, "rgba(15, 23, 42, 0.6)");

            ctx.fillStyle = glass;

            ctx.beginPath();
            ctx.roundRect(cardX, cardY, cardSize, cardSize, 36);
            ctx.fill();

            ctx.strokeStyle = "rgba(255,255,255,0.08)";
            ctx.stroke();

            // reflection sweep
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(cardX, cardY, cardSize, cardSize, 36);
            ctx.clip();

            const shinePos = (progress * cardSize * 1.4) % (cardSize * 2);

            const shine = ctx.createLinearGradient(
                cardX + shinePos - cardSize,
                0,
                cardX + shinePos,
                0
            );

            shine.addColorStop(0, "rgba(255,255,255,0)");
            shine.addColorStop(0.5, "rgba(255,255,255,0.07)");
            shine.addColorStop(1, "rgba(255,255,255,0)");

            ctx.fillStyle = shine;
            ctx.fillRect(cardX, cardY, cardSize, cardSize);

            ctx.restore();
            ctx.restore();

            // =====================================================
            // 3. LOGO (FLOAT + GLOW PULSE)
            // =====================================================
            const logoAlpha = Math.min(1, progress * 1.6);
            const float = Math.sin(progress * Math.PI * 2) * 6;

            ctx.save();
            ctx.translate(width / 2, height / 2 - 60 + float);
            ctx.scale(0.85 + logoAlpha * 0.15, 0.85 + logoAlpha * 0.15);
            ctx.globalAlpha = logoAlpha;

            // glow
            ctx.shadowColor = "rgba(255, 0, 80, 0.35)";
            ctx.shadowBlur = 30;

            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.beginPath();
            ctx.arc(0, 0, 62, 0, Math.PI * 2);
            ctx.fill();

            if (appIcon) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(0, 0, 54, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(appIcon, -54, -54, 108, 108);
                ctx.restore();
            }

            ctx.restore();

            // =====================================================
            // 4. TEXT (CLEAN CINEMATIC FADE)
            // =====================================================
            const textAlpha = Math.min(1, Math.max(0, (progress - 0.25) * 2));

            ctx.save();
            ctx.globalAlpha = textAlpha;
            ctx.textAlign = "center";

            ctx.fillStyle = "#ffffff";
            ctx.font = `800 ${width * 0.07}px Outfit`;
            ctx.fillText("Thank You!", width / 2, height / 2 + 80);

            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.font = `400 ${width * 0.04}px Outfit`;
            ctx.fillText(
                "Made with love for your special day",
                width / 2,
                height / 2 + 120
            );

            ctx.restore();

            // =====================================================
            // 5. CREDIT
            // =====================================================
            ctx.save();
            ctx.globalAlpha = progress;
            ctx.fillStyle = "rgba(255,255,255,0.35)";
            ctx.font = `300 14px Playfair Display`;
            ctx.textAlign = "center";
            ctx.fillText("Designed by KofiLartey", width / 2, height - 30);
            ctx.restore();

            // =====================================================
            // 6. WATERMARK
            // =====================================================
            await drawTikTokWatermark(
                ctx,
                appIcon,
                width,
                height,
                startFrame + i
            );

            await new Promise((r) => setTimeout(r, 1000 / 30));
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
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/40 backdrop-blur-md transition-all duration-500"
                    onClick={closeDownloadModal}
                >
                    {/* Responsive Container: Scales nicely on desktop vs mobile */}
                    <div
                        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row gap-8 p-6 md:p-10 rounded-3xl bg-white/[0.06] backdrop-blur-3xl border border-white/20 shadow-2xl overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-2"
                            onClick={closeDownloadModal}
                        >
                            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Left Side: The Clear, Full Image Display */}
                        <div className="flex-1 flex items-center justify-center bg-black/20 rounded-2xl overflow-hidden border border-white/10 shadow-inner">
                            <img
                                src={downloadImage}
                                alt="Memory"
                                className="w-full h-full object-contain max-h-[70vh]"
                            />
                        </div>

                        {/* Right Side: Details and Actions */}
                        <div className="w-full md:w-80 flex flex-col justify-center space-y-6 text-center md:text-left">
                            <div className="space-y-2">
                                <h1 className="text-3xl font-bold text-white tracking-tight">Save This Memory 📸</h1>
                                <p className="text-white/70">Keep a beautiful snapshot of this special moment forever.</p>
                            </div>

                            {/* Updated Buttons Section: Forced flex-row to keep buttons side-by-side on all screen sizes */}
                            <div className="flex flex-row gap-3 w-full max-w-sm mx-auto">
                                <button
                                    onClick={downloadImageFile}
                                    className="flex-1 px-3 py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl font-bold text-sm transition-transform hover:scale-[1.02] active:scale-95"
                                >
                                    Download
                                </button>
                                <button
                                    onClick={() => { shareToWhatsApp(); closeDownloadModal(); }}
                                    className="flex-1 px-3 py-4 bg-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-all active:scale-95"
                                >
                                    Share
                                </button>
                            </div>
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