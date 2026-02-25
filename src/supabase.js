import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iyslevrqnzlgsfvqcekt.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5c2xldnJxbnpsZ3NmdnFjZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzE5NjEsImV4cCI6MjA4NzU0Nzk2MX0.WJpAGcB19xvOFnsG0ZD7pckNe7iIma3STtzTs7ZQCFc'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Cloudinary configuration
export const cloudinaryConfig = {
    cloudName: 'djjgkezui',
    uploadPreset: 'ml_default'
}

// Admin credentials
export const ADMIN_CREDENTIALS = {
    username: 'ellen',
    password: 'ellen2025'
}

// Birthday date
export const BIRTHDAY_DATE = '2026-02-27' // Change to actual birthday

// Default gallery images
export const defaultGalleryImages = [
    'https://res.cloudinary.com/djjgkezui/image/upload/v1771045118/IMG-20240922-WA0010_ssgxfc.jpg',
    'https://res.cloudinary.com/djjgkezui/image/upload/v1771045117/IMG-20240425-WA0004_gzmq2d.jpg',
    'https://res.cloudinary.com/djjgkezui/image/upload/v1771045116/IMG-20240920-WA0022_kltayh.jpg',
    'https://res.cloudinary.com/djjgkezui/image/upload/v1771045115/IMG-20240425-WA0003_1_azyp5i.jpg',
    'https://res.cloudinary.com/djjgkezui/image/upload/v1771045114/IMG-20240624-WA0028_1_f7bivb.jpg',
    'https://res.cloudinary.com/djjgkezui/image/upload/v1771045113/IMG-20240624-WA0027_yfcilt.jpg',
    'https://res.cloudinary.com/djjgkezui/image/upload/v1771045107/IMG-20241003-WA0014_wf8his.jpg',
    'https://res.cloudinary.com/djjgkezui/image/upload/v1771045107/IMG-20241103-WA0039_c1qyz6.jpg',
    'https://res.cloudinary.com/djjgkezui/image/upload/v1771045106/IMG-20241103-WA0037_1_yxsu67.jpg',
    'https://res.cloudinary.com/djjgkezui/image/upload/v1771045105/IMG-20241103-WA0036_xeibow.jpg',
    'https://res.cloudinary.com/djjgkezui/image/upload/v1771045103/IMG-20241103-WA0035_fd4dun.jpg',
    'https://res.cloudinary.com/djjgkezui/image/upload/v1771045102/IMG-20241103-WA0038_t2rlv5.jpg',
    'https://res.cloudinary.com/djjgkezui/image/upload/v1771045098/IMG-20250817-WA0006_ajjrge.jpg',
    'https://res.cloudinary.com/djjgkezui/image/upload/v1771045092/IMG-20250301-WA0000_am4agl.jpg'
]

// Local storage keys
export const STORAGE_KEYS = {
    PHOTOS: 'ellenPhotos',
    MESSAGES: 'ellenMessages',
    GIFTS: 'ellenGifts',
    MOM0: 'ellenMomoNumber',
    VIEWS: 'ellenViews',
    ADMIN_LOGGED_IN: 'ellenAdminLoggedIn'
}
