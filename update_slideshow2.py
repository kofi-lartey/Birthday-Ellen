import re

with open('src/pages/Slideshow.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line numbers for specific markers
code_idx = None
music_ref_idx = None
load_order_idx = None

for i, line in enumerate(lines):
    if 'const { code } = useParams()' in line:
        code_idx = i
    if 'const musicRef = useRef(null)' in line:
        music_ref_idx = i
    if '// Load order config if code exists' in line:
        load_order_idx = i

print(f'code_idx={code_idx}, music_ref_idx={music_ref_idx}, load_order_idx={load_order_idx}')

# Update import line 2 (0-indexed)
lines[1] = 'import { Link, useParams, useLocation } from \'react-router-dom\'\n'

# Update code line (add id and location)
lines[code_idx] = '    const { code, id } = useParams()\n    const location = useLocation()\n'

# Add eventType state after orderConfig
# Find orderConfig line
for i, line in enumerate(lines):
    if 'const [orderConfig, setOrderConfig]' in line:
        # Add new state declarations after this line
        lines.insert(i+1, '    const [eventType, setEventType] = useState(\'birthday\')\n')
        lines.insert(i+2, '    const [eventName, setEventName] = useState(\'\')\n')
        music_ref_idx += 2
        load_order_idx += 2
        break

# Update musicRef section to add event detection useEffect
for i, line in enumerate(lines):
    if 'const musicRef = useRef(null)' in line:
        # Find the next line after a blank line that has the comment
        for j in range(i+3, i+10):
            if j < len(lines) and '// Load order config if code exists' in lines[j]:
                insert_pos = j  # Insert before this comment
                new_block = '''    const musicRef = useRef(null)

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

    // Load order config if code exists
'''
                # Replace from musicRef line to load_order_idx line
                del lines[i:insert_pos]
                lines.insert(i, new_block)
                break
        break

with open('src/pages/Slideshow.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Slideshow.jsx updated successfully')
