import { useState, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'

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

    const intervalRef = useRef(null)
    const progressRef = useRef(null)
    const musicRef = useRef(null)
    const [popAnimationKey, setPopAnimationKey] = useState(0)

    useEffect(() => {
        // trigger animation every time currentIndex changes
        setPopAnimationKey(prev => prev + 1)
    }, [currentIndex])

    // Responsive detection
    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Load order config if code exists
    useEffect(() => {
        if (code) {
            loadOrderConfig()
            loadOrderSlides()
        }
    }, [code])

    // Normalize localStorage order format to match Supabase schema
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
        const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]')
        const localOrder = orders.find(o => o.code.toLowerCase() === code?.toLowerCase())
        if (localOrder) {
            setOrderConfig(normalizeOrder(localOrder))
            return
        }
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('code', code)
                .limit(1)
            if (data && data.length > 0) setOrderConfig(data[0])
            else if (error) console.log('Supabase orders table not available')
        } catch (err) {
            console.log('Supabase not available')
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

    // Initialize audio element on mount (without playing)
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
            }, 4000)
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    }, [isPlaying, slides.length])

    function createHearts() {
        const container = document.getElementById('heartsContainer')
        if (!container) return
        const heartSymbols = ['❤️', '💕', '💗', '💖', '💘', '💝']
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

    const recipientName = orderConfig?.recipient_name || orderConfig?.nickname || 'Birthday Star'

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

    function goBack() { window.location.href = '/' }

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
        await downloadImageWithOverlay(downloadImage, code ? `birthday-${code}-slide-${downloadSlideIndex + 1}.jpg` : `birthday-slide-${downloadSlideIndex + 1}.jpg`)
    }

    async function downloadAllImages() {
        if (slides.length === 0) return
        setIsBulkDownloading(true)
        setBulkDownloadProgress(0)
        try {
            for (let i = 0; i < slides.length; i++) {
                const filename = code ? `birthday-${code}-slide-${i + 1}.jpg` : `birthday-slide-${i + 1}.jpg`
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
            img.onload = () => {
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

    // Video export functions - Production-ready with robust audio-video sync
    async function exportVideo() {
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

        // ────────────────────────────────────────────────────────
        // 1. Canvas & Video Stream Setup
        // ────────────────────────────────────────────────────────
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false });
        const FPS = 30;
        const width = 720;
        const height = 1280;
        canvas.width = width;
        canvas.height = height;

        // Capture canvas stream at target FPS
        const videoStream = canvas.captureStream(FPS);
        const videoTrack = videoStream.getVideoTracks()[0];

        if (!videoTrack) {
            alert('Could not capture video stream. Please try again.');
            setIsRecording(false);
            return;
        }

        // Apply constraints for consistent frame rate
        try {
            await videoTrack.applyConstraints({
                frameRate: { ideal: FPS, min: 24, max: 30 }
            });
        } catch (e) {
            console.warn('Frame rate constraint not supported:', e);
        }

        // ────────────────────────────────────────────────────────
        // 2. Audio Context & Stream Setup
        // ────────────────────────────────────────────────────────
        let audioElement = null;
        let audioContext = null;
        let audioSource = null;
        let audioDestination = null;
        let audioTracks = [];
        let audioInitialized = false;

        try {
            // Create a fresh audio element for this export
            audioElement = new Audio(audioUrl);
            audioElement.loop = false;
            audioElement.volume = 0.3;
            audioElement.crossOrigin = 'anonymous';

            // Create AudioContext for real-time routing
            audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 48000 // Standard for video
            });

            // Resume context (required after user gesture)
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            // Create MediaElementSource from the audio element
            audioSource = audioContext.createMediaElementSource(audioElement);

            // Create destination stream for recording
            audioDestination = audioContext.createMediaStreamDestination();

            // Connect: source → destination (for recording)
            // Also connect to main output so user can hear it during export
            audioSource.connect(audioDestination);
            audioSource.connect(audioContext.destination);

            // Extract audio track from the destination stream
            audioTracks = audioDestination.stream.getAudioTracks();

            if (audioTracks.length === 0) {
                throw new Error('No audio track could be captured');
            }

            // Configure audio track for better quality
            const settings = audioTracks[0].getSettings();
            console.log('Audio track settings:', settings);

            audioInitialized = true;
        } catch (err) {
            console.error('Audio setup failed:', err);
            // Don't block export if audio fails - continue with video only
            alert('Could not capture audio. The video will export without background music.');
            audioTracks = [];
            audioInitialized = false;
        }

        // ────────────────────────────────────────────────────────
        // 3. Combine Streams (Video + Audio)
        // ────────────────────────────────────────────────────────
        let combinedStream;
        try {
            if (audioInitialized && audioTracks.length > 0) {
                // Merge video and audio tracks
                combinedStream = new MediaStream([
                    videoTrack,
                    ...audioTracks
                ]);
                console.log('Combined stream created with audio');
            } else {
                // Video only
                combinedStream = new MediaStream([videoTrack]);
                console.log('Combined stream created (video only)');
            }
        } catch (err) {
            console.error('Failed to combine streams:', err);
            combinedStream = new MediaStream([videoTrack]);
        }

        // ────────────────────────────────────────────────────────
        // 4. MediaRecorder Configuration
        // ────────────────────────────────────────────────────────
        // Prioritize formats that support multi-track and wide compatibility
        let mimeType = '';
        const preferredTypes = [
            // MP4 with H.264 + AAC (best compatibility)
            'video/mp4; codecs="avc1.640028,mp4a.40.2"',
            'video/mp4; codecs="avc1.42E01E,mp4a.40.2"',
            // WebM with VP9 + Opus (good quality, open format)
            'video/webm; codecs="vp9,opus"',
            'video/webm; codecs="vp8,opus"',
            // Fallback
            'video/webm',
            'video/mp4'
        ];

        for (const type of preferredTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                mimeType = type;
                console.log('Selected MIME type:', type);
                break;
            }
        }

        if (!mimeType) {
            alert('No supported video format found in this browser.');
            cleanup();
            return;
        }

        // Configure recorder for high quality
        const options = {
            mimeType,
            videoBitsPerSecond: 5_000_000, // 5 Mbps for good quality
            audioBitsPerSecond: 192_000    // 192 kbps for audio quality
        };

        let recorder;
        try {
            recorder = new MediaRecorder(combinedStream, options);
        } catch (err) {
            console.warn('Failed with options, trying without:', err);
            // Fallback to basic configuration
            recorder = new MediaRecorder(combinedStream);
        }

        const chunks = [];
        let startTime = 0;
        let expectedDuration = 0;

        recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        recorder.onstart = () => {
            startTime = Date.now();
            console.log('Recording started at:', new Date().toISOString());
        };

        recorder.onstop = () => {
            const endTime = Date.now();
            const actualDuration = (endTime - startTime) / 1000;
            console.log('Recording stopped. Duration:', actualDuration, 's');
            console.log('Chunks received:', chunks.length);

            if (chunks.length === 0) {
                alert('No video data was recorded. Please try again.');
                cleanup();
                return;
            }

            // Create and download the video
            const blob = new Blob(chunks, { type: mimeType });

            // Estimate video duration from blob size as fallback
            if (blob.size === 0) {
                alert('The recorded video is empty. Please try again.');
                cleanup();
                return;
            }

            const url = URL.createObjectURL(blob);
            const filename = code
                ? `birthday-slideshow-${code}-${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`
                : `birthday-slideshow-${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Cleanup URLs after a delay
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 10000);

            cleanup();
        };

        recorder.onerror = (e) => {
            console.error('MediaRecorder error:', e.error);
            alert('An error occurred during recording: ' + e.error.message);
            cleanup();
        };

        // ────────────────────────────────────────────────────────
        // 5. Calculate Frame Timing
        // ────────────────────────────────────────────────────────
        // Calculate expected duration based on content (not audio)
        // This ensures we render all frames before stopping
        const INTRO_FRAMES = 90;
        const TRANSITION_FRAMES_PER_SLIDE = 30;
        const SLIDE_FRAMES = 150;
        const OUTRO_FRAMES = 180;

        const totalFrames = INTRO_FRAMES +
            (slides.length - 1) * TRANSITION_FRAMES_PER_SLIDE +
            slides.length * SLIDE_FRAMES +
            OUTRO_FRAMES;

        expectedDuration = totalFrames / FPS;
        console.log('Expected recording duration:', expectedDuration.toFixed(2), 's');

        // ────────────────────────────────────────────────────────
        // 6. Render & Record
        // ────────────────────────────────────────────────────────
        try {
            // Start recording first
            recorder.start(100); // Collect data every 100ms

            // Give audio a moment to start if present
            if (audioElement && audioInitialized) {
                try {
                    await audioElement.play();
                    console.log('Background audio started');
                } catch (err) {
                    console.warn('Could not play audio:', err);
                }
            }

            // Render intro
            await renderIntro(ctx, width, height);
            setRecordingProgress(10);

            // Render each slide with transitions
            for (let i = 0; i < slides.length; i++) {
                // Transition from previous slide (except first)
                if (i > 0) {
                    await renderTransition(ctx, width, height, slides[i - 1], slides[i]);
                }

                // Render the slide
                await renderSlide(ctx, width, height, slides[i], i + 1, slides.length);

                // Update progress (50% intro, 40% slides, 10% outro)
                const slideProgress = 50 + Math.round(((i + 1) / slides.length) * 40);
                setRecordingProgress(slideProgress);
            }

            // Render outro
            await renderOutro(ctx, width, height);
            setRecordingProgress(95);

            // Wait for final frame to be captured
            await new Promise(resolve => setTimeout(resolve, 1000 / FPS));

            // Stop recording
            recorder.stop();

            // Stop audio if playing
            if (audioElement) {
                audioElement.pause();
                audioElement.currentTime = 0;
            }

            setRecordingProgress(100);

        } catch (err) {
            console.error('Rendering error:', err);
            alert('An error occurred during rendering: ' + err.message);
            recorder.stop();
            cleanup();
        }

        // ────────────────────────────────────────────────────────
        // 7. Cleanup Function
        // ────────────────────────────────────────────────────────
        function cleanup() {
            // Stop all media tracks
            if (combinedStream) {
                combinedStream.getTracks().forEach(track => {
                    track.stop();
                });
            }

            if (videoTrack) {
                videoTrack.stop();
            }

            if (audioTracks && audioTracks.length > 0) {
                audioTracks.forEach(track => track.stop());
            }

            // Close AudioContext
            if (audioContext) {
                audioContext.close().catch(err => {
                    console.warn('Error closing AudioContext:', err);
                });
            }

            // Clean up audio element
            if (audioElement) {
                audioElement.pause();
                audioElement.src = '';
                audioElement.load();
                audioElement = null;
            }

            // Clear references
            audioSource = null;
            audioDestination = null;
            audioTracks = [];

            setIsRecording(false);
            setRecordingProgress(0);

            console.log('Cleanup completed');
        }
    }

    async function renderIntro(ctx, width, height) {
        const fps = 30
        const totalFrames = 90 // 3 seconds

        // Particle system
        const particles = []
        const particleCount = 25
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: 15 + Math.random() * 25,
                speedX: (Math.random() - 0.5) * 1.5,
                speedY: 0.5 + Math.random() * 1.2,
                opacity: 0.3 + Math.random() * 0.6,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 3,
                type: Math.random() > 0.7 ? 'star' : 'heart'
            })
        }

        // Background gradient offsets (moving)
        let offsetX = 0, offsetY = 0

        for (let i = 0; i < totalFrames; i++) {
            const progress = i / totalFrames
            const easeProgress = 1 - Math.pow(1 - progress, 3) // cubic out

            // --- Animated gradient background ---
            offsetX = Math.sin(i * 0.02) * 50
            offsetY = Math.cos(i * 0.03) * 30

            const grad = ctx.createLinearGradient(
                width / 2 + offsetX, 0,
                width / 2 - offsetX, height
            )
            grad.addColorStop(0, '#0f0c29')
            grad.addColorStop(0.5, '#302b63')
            grad.addColorStop(1, '#24243e')
            ctx.fillStyle = grad
            ctx.fillRect(0, 0, width, height)

            // Add a subtle vignette
            ctx.save()
            ctx.globalCompositeOperation = 'overlay'
            ctx.fillStyle = 'rgba(0,0,0,0.15)'
            ctx.fillRect(0, 0, width, height)
            ctx.restore()

            // --- Draw particles (hearts & stars) ---
            particles.forEach(p => {
                p.x += p.speedX
                p.y += p.speedY
                p.rotation += p.rotationSpeed
                if (p.y < -50) p.y = height + 50
                if (p.x < -50) p.x = width + 50
                if (p.x > width + 50) p.x = -50

                ctx.save()
                ctx.translate(p.x, p.y)
                ctx.rotate(p.rotation * Math.PI / 180)
                ctx.globalAlpha = p.opacity * (0.6 + 0.4 * Math.sin(i * 0.05 + p.x * 0.01))
                ctx.font = `${p.size}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`
                ctx.fillStyle = p.type === 'heart' ? '#ff6b9d' : '#ffd966'
                ctx.fillText(p.type === 'heart' ? '❤️' : '⭐', 0, 0)
                ctx.restore()
            })

            // --- Main title: animated scale and gradient fill ---
            const scale = 0.6 + easeProgress * 0.5
            const alpha = Math.min(1, progress * 2.5)

            ctx.save()
            ctx.shadowColor = 'rgba(255, 105, 180, 0.6)'
            ctx.shadowBlur = 20
            ctx.translate(width / 2, height / 2 - 40)
            ctx.scale(scale, scale)
            ctx.globalAlpha = alpha

            // Gradient text for "Happy Birthday"
            const textGrad = ctx.createLinearGradient(-150, 0, 150, 0)
            textGrad.addColorStop(0, '#f9c1d9')
            textGrad.addColorStop(0.5, '#ff9eb5')
            textGrad.addColorStop(1, '#f9c1d9')
            ctx.fillStyle = textGrad
            ctx.font = 'bold 70px "Playfair Display", "Poppins", serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('Happy', 0, -20)
            ctx.fillText('Birthday', 0, 40)

            // Second line: recipient name with bounce effect
            const bounce = Math.sin(i * 0.2) * 5
            ctx.font = 'bold 85px "Dancing Script", "Playfair Display", cursive'
            ctx.fillStyle = '#fff3e6'
            ctx.shadowBlur = 15
            ctx.fillText(`${recipientName} 🎂`, 0, 140 + bounce)
            ctx.restore()

            // --- Animated sparkles (rotating and scaling) ---
            for (let s = 0; s < 12; s++) {
                const angle = (i * 0.08 + s * Math.PI / 6) % (Math.PI * 2)
                const radius = 200 + Math.sin(i * 0.1) * 40
                const sparkleX = width / 2 + Math.cos(angle) * radius
                const sparkleY = height / 2 + Math.sin(angle) * radius
                const sparkleScale = 0.8 + Math.sin(i * 0.3 + s) * 0.5
                const sparkleAlpha = Math.max(0, Math.sin(i * 0.2 + s) * 0.8)

                ctx.save()
                ctx.translate(sparkleX, sparkleY)
                ctx.scale(sparkleScale, sparkleScale)
                ctx.globalAlpha = sparkleAlpha
                ctx.fillStyle = '#fbbf24'
                ctx.font = '28px "Segoe UI Emoji"'
                ctx.fillText('✨', 0, 0)
                ctx.restore()
            }

            await new Promise(r => setTimeout(r, 1000 / fps))
        }
    }

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
            // Easing: easeOutCubic
            const easeProgress = 1 - Math.pow(1 - progress, 3)

            ctx.clearRect(0, 0, width, height)

            // --- Previous slide: zoom out and fade out ---
            const prevScale = 1 - easeProgress * 0.15  // shrink slightly
            const prevWidth = width * prevScale
            const prevHeight = height * prevScale
            const prevX = (width - prevWidth) / 2
            const prevY = (height - prevHeight) / 2

            ctx.save()
            ctx.globalAlpha = 1 - easeProgress
            // Draw previous image with scaling
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
            ctx.drawImage(prevImg, sx, sy, sw, sh, prevX, prevY, prevWidth, prevHeight)
            ctx.restore()

            // --- Next slide: zoom in and fade in ---
            const nextScale = 0.85 + easeProgress * 0.15  // grow from 0.85 to 1
            const nextWidth = width * nextScale
            const nextHeight = height * nextScale
            const nextX = (width - nextWidth) / 2
            const nextY = (height - nextHeight) / 2

            ctx.save()
            ctx.globalAlpha = easeProgress
            let nx = 0, ny = 0, nw = nextImg.width, nh = nextImg.height
            if (nextImg.width / nextImg.height > canvasRatio) {
                nw = nextImg.height * canvasRatio
                nx = (nextImg.width - nw) / 2
            } else {
                nh = nextImg.width / canvasRatio
                ny = (nextImg.height - nh) / 2
            }
            ctx.drawImage(nextImg, nx, ny, nw, nh, nextX, nextY, nextWidth, nextHeight)
            ctx.restore()

            await new Promise(r => setTimeout(r, 1000 / fps))
        }
    }

    async function renderOutro(ctx, width, height) {
        const fps = 30
        const totalFrames = 180 // 6 seconds

        // Stars (twinkling background)
        const stars = []
        for (let s = 0; s < 30; s++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: 2 + Math.random() * 4,
                twinkle: Math.random() * Math.PI * 2,
                speed: 0.05 + Math.random() * 0.1
            })
        }

        // Floating hearts (rise up)
        const hearts = []
        for (let h = 0; h < 12; h++) {
            hearts.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: 20 + Math.random() * 30,
                speed: 0.5 + Math.random() * 1.2,
                opacity: 0.4 + Math.random() * 0.5,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 2
            })
        }

        // Background gradient offsets (moving)
        let offsetHue = 0

        for (let i = 0; i < totalFrames; i++) {
            const progress = i / totalFrames
            offsetHue = (offsetHue + 0.5) % 360

            // --- Animated radial gradient background ---
            const grad = ctx.createRadialGradient(
                width / 2 + Math.sin(i * 0.02) * 30,
                height / 2 + Math.cos(i * 0.03) * 20,
                0,
                width / 2,
                height / 2,
                width * 0.8
            )
            grad.addColorStop(0, '#1a1a3e')
            grad.addColorStop(0.6, '#0f0f23')
            grad.addColorStop(1, '#05050f')
            ctx.fillStyle = grad
            ctx.fillRect(0, 0, width, height)

            // --- Twinkling stars ---
            stars.forEach(star => {
                const twinkle = Math.sin(i * star.speed + star.twinkle) * 0.5 + 0.5
                ctx.fillStyle = `rgba(255, 240, 200, ${twinkle * 0.8})`
                ctx.beginPath()
                ctx.arc(star.x, star.y, star.size * (0.5 + twinkle * 0.5), 0, Math.PI * 2)
                ctx.fill()
            })

            // --- Floating hearts (slowly rise and rotate) ---
            hearts.forEach(heart => {
                heart.y -= heart.speed
                heart.rotation += heart.rotSpeed
                if (heart.y < -50) {
                    heart.y = height + 50
                    heart.x = Math.random() * width
                }
                ctx.save()
                ctx.translate(heart.x, heart.y)
                ctx.rotate(heart.rotation * Math.PI / 180)
                ctx.globalAlpha = heart.opacity * (0.7 + 0.3 * Math.sin(i * 0.05))
                ctx.font = `${heart.size}px "Segoe UI Emoji", "Apple Color Emoji"`
                ctx.fillStyle = '#ff6b9d'
                ctx.fillText('❤️', 0, 0)
                ctx.restore()
            })

            // --- Text animation phases ---
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            if (progress < 0.25) {
                // Fade in "Thank You"
                const fadeProgress = progress / 0.25
                ctx.globalAlpha = Math.min(1, fadeProgress * 1.2)

                ctx.save()
                ctx.shadowColor = 'rgba(255, 105, 180, 0.8)'
                ctx.shadowBlur = 25
                // Gradient text
                const gradText = ctx.createLinearGradient(-200, 0, 200, 0)
                gradText.addColorStop(0, '#ff9eb5')
                gradText.addColorStop(0.5, '#ff6b9d')
                gradText.addColorStop(1, '#ff9eb5')
                ctx.fillStyle = gradText
                ctx.font = 'bold 80px "Playfair Display", "Poppins", serif'
                ctx.fillText('Thank You', width / 2, height / 2 - 40)
                ctx.restore()
            }
            else if (progress < 0.5) {
                // Hold "Thank You" with slight pulse
                const pulse = 1 + Math.sin(i * 0.2) * 0.03
                ctx.globalAlpha = 1
                ctx.save()
                ctx.shadowColor = 'rgba(255, 105, 180, 0.8)'
                ctx.shadowBlur = 25
                const gradText = ctx.createLinearGradient(-200, 0, 200, 0)
                gradText.addColorStop(0, '#ff9eb5')
                gradText.addColorStop(0.5, '#ff6b9d')
                gradText.addColorStop(1, '#ff9eb5')
                ctx.fillStyle = gradText
                ctx.font = `bold ${80 * pulse}px "Playfair Display", "Poppins", serif`
                ctx.fillText('Thank You', width / 2, height / 2 - 40)
                ctx.restore()
            }
            else if (progress < 0.6) {
                // Fade out "Thank You"
                const fadeProgress = (progress - 0.5) / 0.1
                ctx.globalAlpha = 1 - fadeProgress
                ctx.save()
                ctx.shadowColor = 'rgba(255, 105, 180, 0.8)'
                ctx.shadowBlur = 25
                ctx.fillStyle = '#ff9eb5'
                ctx.font = 'bold 80px "Playfair Display", "Poppins", serif'
                ctx.fillText('Thank You', width / 2, height / 2 - 40)
                ctx.restore()
            }
            else {
                // Credits section (progress > 0.6)
                ctx.globalAlpha = 1
                const creditProgress = (progress - 0.6) / 0.4

                // "Made with Love" with bounce
                const bounce = Math.sin(i * 0.15) * 8
                ctx.save()
                ctx.shadowBlur = 15
                ctx.shadowColor = 'rgba(255, 200, 100, 0.5)'
                const loveGrad = ctx.createLinearGradient(-150, 0, 150, 0)
                loveGrad.addColorStop(0, '#fbbf24')
                loveGrad.addColorStop(0.5, '#ff9eb5')
                loveGrad.addColorStop(1, '#fbbf24')
                ctx.fillStyle = loveGrad
                ctx.font = 'bold 56px "Dancing Script", "Poppins", cursive'
                ctx.fillText('Made with Love', width / 2, height / 2 - 60 + bounce)
                ctx.restore()

                // "Happy Birthday"
                ctx.fillStyle = '#ffffff'
                ctx.font = 'bold 32px "Poppins", sans-serif'
                ctx.fillText('❤️ Happy Birthday! 🎂', width / 2, height / 2 + 20)

                // Credit line
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
                ctx.font = 'bold 22px "Poppins", sans-serif'
                ctx.fillText('Designed by KofiLartey', width / 2, height / 2 + 100)

                // Subtle additional line (optional)
                if (creditProgress > 0.7) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
                    ctx.font = '18px "Poppins", sans-serif'
                    ctx.fillText('✨ Forever in our hearts ✨', width / 2, height / 2 + 160)
                }
            }

            ctx.globalAlpha = 1
            await new Promise(r => setTimeout(r, 1000 / fps))
        }
    }

    async function renderSlide(ctx, width, height, slide, slideNumber, totalSlides) {
        const img = new Image()
        img.crossOrigin = "anonymous"
        await new Promise(resolve => { img.onload = resolve; img.src = slide.photo })

        const fps = 30
        const frames = 150 // 5 seconds

        for (let frame = 0; frame < frames; frame++) {
            ctx.clearRect(0, 0, width, height)

            // --- Draw image (cover) ---
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

            // --- Subtle vignette (darkens edges) ---
            const vignette = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 1.5)
            vignette.addColorStop(0, 'rgba(0,0,0,0)')
            vignette.addColorStop(0.7, 'rgba(0,0,0,0.2)')
            vignette.addColorStop(1, 'rgba(0,0,0,0.6)')
            ctx.fillStyle = vignette
            ctx.fillRect(0, 0, width, height)

            // --- Text overlay (bottom, modern glass card) ---
            const padding = width * 0.04
            const nameFontSize = width * 0.045
            const messageFontSize = width * 0.03
            const lineHeight = messageFontSize * 1.4

            function wrapText(text, maxWidth) {
                const words = text.split(' ')
                const lines = []
                let line = ''
                for (let word of words) {
                    const testLine = line + word + ' '
                    if (ctx.measureText(testLine).width > maxWidth && line !== '') {
                        lines.push(line.trim())
                        line = word + ' '
                    } else {
                        line = testLine
                    }
                }
                lines.push(line.trim())
                return lines
            }

            const msgLines = wrapText(slide.message, width * 0.7)
            const barHeight = padding * 2 + nameFontSize + (msgLines.length * lineHeight) + padding
            const barWidth = width * 0.8
            const barX = (width - barWidth) / 2
            const barY = height - barHeight - 40
            const radius = width * 0.02

            // Glassmorphic background
            ctx.shadowBlur = 0
            ctx.beginPath()
            ctx.moveTo(barX + radius, barY)
            ctx.lineTo(barX + barWidth - radius, barY)
            ctx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + radius)
            ctx.lineTo(barX + barWidth, barY + barHeight - radius)
            ctx.quadraticCurveTo(barX + barWidth, barY + barHeight, barX + barWidth - radius, barY + barHeight)
            ctx.lineTo(barX + radius, barY + barHeight)
            ctx.quadraticCurveTo(barX, barY + barHeight, barX, barY + barHeight - radius)
            ctx.lineTo(barX, barY + radius)
            ctx.quadraticCurveTo(barX, barY, barX + radius, barY)
            ctx.closePath()
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
            ctx.fill()
            // Subtle border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
            ctx.lineWidth = 1.5
            ctx.stroke()

            // Name (gradient text)
            const nameGrad = ctx.createLinearGradient(barX + 50, barY + padding, barX + barWidth - 50, barY + padding + nameFontSize)
            nameGrad.addColorStop(0, '#f9c1d9')
            nameGrad.addColorStop(1, '#ff6b9d')
            ctx.fillStyle = nameGrad
            ctx.font = `600 ${nameFontSize}px "Poppins", sans-serif`
            ctx.shadowColor = 'rgba(0,0,0,0.5)'
            ctx.shadowBlur = 8
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillText(slide.name, width / 2, barY + padding)

            // Message
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
            ctx.font = `${messageFontSize}px "Poppins", sans-serif`
            ctx.shadowBlur = 4
            let yOffset = barY + padding + nameFontSize + 10
            for (let line of msgLines) {
                ctx.fillText(line, width / 2, yOffset)
                yOffset += lineHeight
            }

            // Slide counter (small badge, top right)
            ctx.textAlign = 'right'
            ctx.font = `bold ${width * 0.025}px "Poppins", sans-serif`
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
            ctx.shadowBlur = 2
            ctx.fillText(`${slideNumber}/${totalSlides}`, width - 20, 30)

            // Credit (optional, bottom left)
            ctx.textAlign = 'left'
            ctx.font = `${width * 0.018}px "Poppins", sans-serif`
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
            ctx.fillText('Designed by KofiLartey', 20, height - 20)

            ctx.shadowBlur = 0
            await new Promise(r => setTimeout(r, 1000 / fps))
        }
    }

    function shareToWhatsApp() {
        const currentSlide = slides[currentIndex];
        if (currentSlide) {
            const baseUrl = window.location.origin;
            const path = window.location.pathname.split('/slideshow/')[0];
            const shareLink = `${baseUrl}${path}/slideshow/${currentSlide.id}`;

            const messageText = `"${currentSlide.message}"\n\nView the full slideshow here: ${shareLink}\n\n- ${currentSlide.name}\n\n🎂 Happy Birthday! 💕`;
            const encodedMessage = encodeURIComponent(messageText);

            window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        }
    }

    // Helper for desktop carousel: get 5 slides (current + 2 left + 2 right, wrapped)
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
            {/* Background gradient */}
            <div className="fixed inset-0" style={{ background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #0a0a0a 50%, #000 100%)', zIndex: -1 }} />

            {/* Floating Hearts */}
            <div className="hearts" id="heartsContainer"></div>

            {/* Back Button */}
            <button onClick={goBack} className="fab back fixed top-5 left-5 z-50" title="Go Back">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>

            {/* FABs Container */}
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
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5 animate-spin">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
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

            {/* Recording / Bulk Download Overlays */}
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

            {/* Title Overlay */}
            <div className={`title-overlay ${showTitle ? 'show' : ''}`}>
                <h1 className="romantic-font">Happy Birthday, {recipientName}! 🎂</h1>
                <p>With love from your friends & family 💕</p>
            </div>

            {/* MAIN CONTENT */}
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
                                        className={`
                        transition-all duration-500 ease-out cursor-pointer
                        ${isActive
                                                ? 'z-10 scale-100 md:scale-110'
                                                : 'scale-90 md:scale-75 blur-sm opacity-70 hover:opacity-100 hover:blur-none'
                                            }
                    `}
                                        style={{
                                            flex: '0 0 auto',
                                            width: isActive ? 'min(65vw, 500px)' : 'min(25vw, 200px)',
                                            transition: 'width 0.4s ease, transform 0.4s ease, filter 0.4s ease, opacity 0.4s ease'
                                        }}
                                    >
                                        <div className={`relative rounded-2xl overflow-hidden shadow-2xl ${isActive ? 'animate-gentle-pop' : ''}`}
                                            key={popAnimationKey} /* forces re‑animation when index changes */
                                        >
                                            <img
                                                src={slides[index].photo}
                                                alt={slides[index].name}
                                                className="w-full h-auto object-contain max-h-[70vh] transition-transform duration-700 hover:scale-105"
                                                onError={(e) => e.target.src = 'data:image/svg+xml;...'}
                                            />
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

                            {/* Compact controls (same as before) */}
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

                            {/* Smaller FABs */}
                            <div className="fab-container fixed top-5 right-5 z-50 flex gap-1 scale-75 origin-top-right opacity-80 hover:opacity-100 transition-all duration-300">
                                {/* ... your existing FAB buttons ... */}
                            </div>
                        </div>
                    ) : (
                        /* MOBILE FULL‑SCREEN SLIDESHOW */
                        <div className="slideshow-container bg-rose-500">
                            {slides.map((slide, index) => (
                                <div key={index} className={`slide ${index === currentIndex ? 'active' : ''}`}>
                                    <img src={slide.photo} className="slide-image" alt={`Slide ${index + 1}`}
                                        onError={(e) => e.target.src = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%25%22 y1=%220%25%22 x2=%22100%25%22 y2=%22100%25%22%3E%3Cstop offset=%220%25%22 stop-color=%22%23ec4899%22/%3E%3Cstop offset=%22100%25%22 stop-color=%22%23f43f5e%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill=%22url(%23g)%22 width=%22100%25%22 height=%22100%25%22/%3E%3Ctext fill=%22white%22 font-size=%2224%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3EImage Not Found%3C/text%3E%3C/svg%3E'}
                                    />
                                    <div className="slide-message bg-rose-500">
                                        <h3>{slide.name}</h3>
                                        <p>{slide.message}</p>
                                    </div>
                                </div>
                            ))}
                            <div className="photo-counter">
                                {currentIndex + 1} / {slides.length}
                            </div>
                            <div className="controls-wrapper">
                                <div className="progress-container">
                                    <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="controls">
                                    <button className="control-btn" onClick={prevSlide}>
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <button className="control-btn primary" onClick={togglePlay}>
                                        {isPlaying ? (
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        ) : (
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            </svg>
                                        )}
                                    </button>
                                    <button className="control-btn" onClick={nextSlide}>
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center px-4">
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-600 mb-2 romantic-font">
                            Happy {orderConfig?.event_type === 'anniversary' ? 'Anniversary' : orderConfig?.event_type === 'wedding' ? 'Wedding Celebration' : orderConfig?.event_type === 'party' ? 'Party' : 'Birthday'}, {recipientName}! 🎂
                        </h2>
                        <p className="text-gray-300 mt-2 max-w-md mx-auto">
                            The celebration is about to begin! Share your favorite memories to make this moment even more special.
                        </p>
                        <Link to="/upload" className="inline-block mt-6 bg-gradient-to-r from-rose-500 to-pink-600 text-white px-8 py-3 rounded-full hover:from-rose-600 hover:to-pink-700 transition shadow-lg">
                            Add Your Photos 📸
                        </Link>
                    </div>
                </div>
            )}

            {/* Download Modal */}
            {showDownload && (
                <div className="download-modal active fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={closeDownloadModal}>
                    <div className="download-content bg-gray-900 rounded-2xl p-6 max-w-sm w-full mx-4 text-center" onClick={e => e.stopPropagation()}>
                        <button className="close-modal float-right text-gray-400 hover:text-white" onClick={closeDownloadModal}>✕</button>
                        <h2 className="romantic-font text-2xl mb-4">Save This Memory 📸</h2>
                        <img src={downloadImage} alt="Preview" className="download-preview w-full rounded-lg mb-4" />
                        <div className="download-buttons flex gap-3 justify-center">
                            <button className="download-btn primary bg-pink-600 px-4 py-2 rounded-full text-white flex items-center gap-2" onClick={downloadImageFile}>
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                            </button>
                            <button className="download-btn secondary bg-gray-700 px-4 py-2 rounded-full text-white flex items-center gap-2" onClick={() => { shareToWhatsApp(); closeDownloadModal(); }}>
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