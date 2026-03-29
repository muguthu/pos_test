export function svgAvatar(name = '', color = '#8e44ff', size = 256){
  const initials = (name || '').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase() || 'SP'
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stop-color='${color}' stop-opacity='1'/>
          <stop offset='1' stop-color='#2b1b45' stop-opacity='0.9'/>
        </linearGradient>
      </defs>
      <rect width='100%' height='100%' rx='24' fill='url(#g)' />
      <text x='50%' y='52%' font-size='${size * 0.34}' text-anchor='middle' fill='white' font-family='Arial, Helvetica, sans-serif' font-weight='700' dy='.1em'>${initials}</text>
    </svg>
  `
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
