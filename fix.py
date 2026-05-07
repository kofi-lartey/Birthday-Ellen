import re

with open('src/pages/Slideshow.jsx', 'r') as f:
    c = f.read()

c = c.replace("import { Link, useParams } from 'react-router-dom'", "import { Link, useParams, useLocation } from 'react-router-dom'")
c = c.replace("    const { code } = useParams()", "    const { code, id } = useParams()\n    const location = useLocation()")
c = c.replace("    const intervalRef = useRef(null)", "    const [eventType, setEventType] = useState('birthday')\n    const [eventName, setEventName] = useState('')\n    const [eventDate, setEventDate] = useState('')\n    const intervalRef = useRef(null)")

with open('src/pages/Slideshow.jsx', 'w') as f:
    f.write(c)

print('OK')