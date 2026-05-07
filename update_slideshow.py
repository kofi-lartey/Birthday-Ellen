import re

def update_slideshow():
    with open('src/pages/Slideshow.jsx', 'r', encoding='utf-8') as f:
        c = f.read()
    
    old = '''    const musicRef = useRef(null)

     // Load order config if code exists'''
    
    new = '''    const musicRef = useRef(null)

    // Detect event type from URL path
    useEffect(() => {
        const path = location.pathname
        if (path.includes('/wedding/') || path.includes('/public/wedding/')) {
            setEventType('wedding')
        } else if (path.includes('/anniversary/') || path.includes('/public/anniversary/')) {
            setEventType('anniversary')
        } else if (path.includes('/party/') || path.includes('/public/party/')) {
            setEventType('party')
        } else if (path.includes('/hangout/') || path.includes('/public/hangout/')) {
            setEventType('hangout')
        } else if (path.includes('/other-event/') || path.includes('/public/other-event/')) {
            setEventType('other')
        } else {
            setEventType('birthday')
        }
    }, [location])

     // Load order config if code exists'''
    
    if old not in c:
        print('Pattern not found!')
        return
    
    c = c.replace(old, new)
    
    with open('src/pages/Slideshow.jsx', 'w', encoding='utf-8') as f:
        f.write(c)
    
    print('Slideshow updated successfully')

if __name__ == '__main__':
    update_slideshow()
