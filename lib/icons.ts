export interface IconType {
  id: string;
  label: string;
  category: 'road' | 'vehicle' | 'traffic' | 'incident' | 'movement';
  color: string;
  width: number;
  height: number;
  render: (x: number, y: number, rotation: number, scale: number) => string;
}

// ────────────────────────────────────────────────
// Roads ───────────────────────────────────────────
// ────────────────────────────────────────────────

const roadStraight: IconType = {
  id: 'road-straight-clean',
  label: 'Straight Road',
  category: 'road',
  color: '#64748b',
  width: 225,
  height: 350,
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${0.8*scale})">
      <rect x="-112.5" y="-175" width="225" height="350" fill="#94a3b8" stroke="#475569" stroke-width="6"/>
      <line x1="-100" y1="-175" x2="-100" y2="175" stroke="#fef08a" stroke-width="10"/>
      <line x1="100"  y1="-175" x2="100"  y2="175" stroke="#fef08a" stroke-width="10"/>
      <line x1="-30" y1="-175" x2="-30" y2="175" stroke="#fbbf24" stroke-width="7.5" stroke-dasharray="30,30"/>
      <line x1="30"  y1="-175" x2="30"  y2="175" stroke="#fbbf24" stroke-width="7.5" stroke-dasharray="30,30"/>
    </g>
  `,
};

const roadCurved: IconType = {
  id: 'road-curved',
  label: 'Curved Road',
  category: 'road',
  color: '#64748b',
  width: 250,
  height: 250,
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      <path d="M -75 -125 Q 75 -125 75 125" fill="none" stroke="#94a3b8" stroke-width="100" stroke-linecap="round"/>
      <path d="M -75 -125 Q 75 -125 75 125" fill="none" stroke="#fbbf24" stroke-width="5" stroke-dasharray="25,25"/>
    </g>
  `,
};

const roadIntersection: IconType = {
  id: 'road-intersection',
  label: 'Intersection',
  category: 'road',
  color: '#64748b',
  width: 250,
  height: 250,
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      <rect x="-100" y="-50" width="200" height="100" fill="#94a3b8" stroke="#475569" stroke-width="5"/>
      <rect x="-50"  y="-100" width="100" height="200" fill="#94a3b8" stroke="#475569" stroke-width="5"/>
      <line x1="-100" y1="0" x2="100" y2="0" stroke="#fbbf24" stroke-width="5" stroke-dasharray="25,25"/>
      <line x1="0" y1="-100" x2="0" y2="100" stroke="#fbbf24" stroke-width="5" stroke-dasharray="25,25"/>
    </g>
  `,
};

const roadCrossroad: IconType = {
  id: 'road-crossroad',
  label: '4-Way Crossroad',
  category: 'road',
  color: '#64748b',
  width: 300,
  height: 300,
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      <!-- background fill for arms -->
      <!-- horizontal road -->
      <rect x="-150" y="-55" width="300" height="110" fill="#94a3b8"/>
      <!-- vertical road -->
      <rect x="-55" y="-150" width="110" height="300" fill="#94a3b8"/>

      <!-- kerb outlines -->
      <rect x="-150" y="-55" width="300" height="110" fill="none" stroke="#475569" stroke-width="4"/>
      <rect x="-55" y="-150" width="110" height="300" fill="none" stroke="#475569" stroke-width="4"/>

      <!-- corner fillets (cover the ugly corners) -->
      <rect x="-55" y="-55" width="110" height="110" fill="#94a3b8"/>

      <!-- horizontal centre dash -->
      <line x1="-150" y1="0" x2="-60" y2="0" stroke="#fbbf24" stroke-width="6" stroke-dasharray="22,18"/>
      <line x1="60"   y1="0" x2="150" y2="0" stroke="#fbbf24" stroke-width="6" stroke-dasharray="22,18"/>

      <!-- vertical centre dash -->
      <line x1="0" y1="-150" x2="0" y2="-60" stroke="#fbbf24" stroke-width="6" stroke-dasharray="22,18"/>
      <line x1="0" y1="60"   x2="0" y2="150" stroke="#fbbf24" stroke-width="6" stroke-dasharray="22,18"/>

      <!-- edge lines horizontal -->
      <line x1="-150" y1="-45" x2="-55" y2="-45" stroke="#fef08a" stroke-width="5"/>
      <line x1=" 55"  y1="-45" x2="150" y2="-45" stroke="#fef08a" stroke-width="5"/>
      <line x1="-150" y1=" 45" x2="-55" y2=" 45" stroke="#fef08a" stroke-width="5"/>
      <line x1=" 55"  y1=" 45" x2="150" y2=" 45" stroke="#fef08a" stroke-width="5"/>

      <!-- edge lines vertical -->
      <line x1="-45" y1="-150" x2="-45" y2="-55" stroke="#fef08a" stroke-width="5"/>
      <line x1="-45" y1=" 55"  x2="-45" y2="150" stroke="#fef08a" stroke-width="5"/>
      <line x1=" 45" y1="-150" x2=" 45" y2="-55" stroke="#fef08a" stroke-width="5"/>
      <line x1=" 45" y1=" 55"  x2=" 45" y2="150" stroke="#fef08a" stroke-width="5"/>

      <!-- zebra crossing — top -->
      ${[...Array(5)].map((_,i) => `<rect x="-42" y="${-72 + i*8}" width="84" height="5" fill="white" opacity="0.7"/>`).join('')}
      <!-- zebra crossing — bottom -->
      ${[...Array(5)].map((_,i) => `<rect x="-42" y="${55 + i*8}" width="84" height="5" fill="white" opacity="0.7"/>`).join('')}
      <!-- zebra crossing — left -->
      ${[...Array(5)].map((_,i) => `<rect x="${-72 + i*8}" y="-42" width="5" height="84" fill="white" opacity="0.7"/>`).join('')}
      <!-- zebra crossing — right -->
      ${[...Array(5)].map((_,i) => `<rect x="${55 + i*8}" y="-42" width="5" height="84" fill="white" opacity="0.7"/>`).join('')}
    </g>
  `,
};

const roadRoundabout: IconType = {
  id: 'road-roundabout',
  label: 'Roundabout',
  category: 'road',
  color: '#64748b',
  width: 250,
  height: 250,
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      <circle cx="0" cy="0" r="100" fill="none" stroke="#94a3b8" stroke-width="50"/>
      <circle cx="0" cy="0" r="62.5" fill="#e0e7ff" stroke="#475569" stroke-width="5"/>
      <circle cx="0" cy="0" r="50" fill="none" stroke="#fbbf24" stroke-width="5" stroke-dasharray="25,25"/>
    </g>
  `,
};

// ────────────────────────────────────────────────
// Vehicles — Realistic Top-Down View ──────────────
// ────────────────────────────────────────────────

/**
 * Top-down car: viewed from directly above.
 * The car faces "up" (negative-Y) by default so rotation=0 means heading north.
 *   - body, roof, windshields, windows, hood, boot
 *   - four realistic wheels with tyre + rim detail
 *   - subtle drop-shadow and specular highlight on roof
 */
const topDownCar = (
  bodyColor: string,
  idSuffix: string,
  labelSuffix: string = ''
): IconType => ({
  id: `vehicle-car-${idSuffix}`,
  label: `Car${labelSuffix ? ` (${labelSuffix})` : ''}`,
  category: 'vehicle',
  color: bodyColor,
  width: 110,
  height: 210,
  render: (x, y, rotation, scale) => {
    const shadow = '#00000033';
    const roofColor = shadeColor(bodyColor, -30);
    const darkBody  = shadeColor(bodyColor, -15);
    return `
      <g transform="translate(${x},${y}) rotate(${rotation}) scale(${0.5*scale})">
        <defs>
          <radialGradient id="roofGrad_${idSuffix}" cx="50%" cy="45%" r="55%">
            <stop offset="0%"   stop-color="${lightenColor(bodyColor, 35)}"/>
            <stop offset="100%" stop-color="${roofColor}"/>
          </radialGradient>
          <filter id="shadow_${idSuffix}" x="-20%" y="-10%" width="140%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="${shadow}"/>
          </filter>
        </defs>

        <!-- ── Drop shadow ── -->
        <ellipse cx="2" cy="6" rx="44" ry="88" fill="${shadow}" filter="url(#shadow_${idSuffix})"/>

        <!-- ── Body shell ── -->
        <!-- Boot (rear) -->
        <path d="M -38 72  Q -42 95  -28 100  L 28 100  Q 42 95  38 72 Z"
              fill="${darkBody}" stroke="${shadeColor(bodyColor,-40)}" stroke-width="2"/>
        <!-- Hood (front) -->
        <path d="M -36 -72  Q -40 -98  -22 -100  L 22 -100  Q 40 -98  36 -72 Z"
              fill="${darkBody}" stroke="${shadeColor(bodyColor,-40)}" stroke-width="2"/>
        <!-- Main body -->
        <rect x="-42" y="-72" width="84" height="144" rx="14"
              fill="${bodyColor}" stroke="${shadeColor(bodyColor,-40)}" stroke-width="2.5"
              filter="url(#shadow_${idSuffix})"/>

        <!-- ── Roof / greenhouse ── -->
        <rect x="-30" y="-42" width="60" height="84" rx="10"
              fill="url(#roofGrad_${idSuffix})" stroke="${shadeColor(bodyColor,-50)}" stroke-width="1.5"/>

        <!-- ── Windshields ── -->
        <!-- Front windscreen -->
        <path d="M -26 -40  L 26 -40  L 22 -68  L -22 -68 Z"
              fill="#cce8ff" fill-opacity="0.82" stroke="#1e40af" stroke-width="1.5"/>
        <!-- Rear windscreen -->
        <path d="M -26 42  L 26 42  L 22 68  L -22 68 Z"
              fill="#cce8ff" fill-opacity="0.65" stroke="#1e40af" stroke-width="1.5"/>

        <!-- ── Side windows ── -->
        <rect x="-32" y="-36" width="10" height="30" rx="3"
              fill="#93c5fd" fill-opacity="0.75" stroke="#1e40af" stroke-width="1.2"/>
        <rect x="22"  y="-36" width="10" height="30" rx="3"
              fill="#93c5fd" fill-opacity="0.75" stroke="#1e40af" stroke-width="1.2"/>
        <rect x="-32" y="6"   width="10" height="28" rx="3"
              fill="#93c5fd" fill-opacity="0.65" stroke="#1e40af" stroke-width="1.2"/>
        <rect x="22"  y="6"   width="10" height="28" rx="3"
              fill="#93c5fd" fill-opacity="0.65" stroke="#1e40af" stroke-width="1.2"/>

        <!-- ── Door lines ── -->
        <line x1="-42" y1="-4" x2="-30" y2="-4" stroke="${shadeColor(bodyColor,-55)}" stroke-width="1.2" opacity="0.7"/>
        <line x1="30"  y1="-4" x2="42"  y2="-4" stroke="${shadeColor(bodyColor,-55)}" stroke-width="1.2" opacity="0.7"/>
        <line x1="-42" y1="5"  x2="-30" y2="5"  stroke="${shadeColor(bodyColor,-55)}" stroke-width="1.2" opacity="0.7"/>
        <line x1="30"  y1="5"  x2="42"  y2="5"  stroke="${shadeColor(bodyColor,-55)}" stroke-width="1.2" opacity="0.7"/>

        <!-- ── Wing mirrors ── -->
        <path d="M -44 -52  Q -55 -50  -52 -42  L -44 -44 Z"
              fill="${darkBody}" stroke="${shadeColor(bodyColor,-50)}" stroke-width="1.5"/>
        <path d="M 44 -52  Q 55 -50  52 -42  L 44 -44 Z"
              fill="${darkBody}" stroke="${shadeColor(bodyColor,-50)}" stroke-width="1.5"/>

        <!-- ── Headlights ── -->
        <rect x="-22" y="-96" width="16" height="8" rx="3" fill="#fffde7" stroke="#ca8a04" stroke-width="1.5"/>
        <rect x="6"   y="-96" width="16" height="8" rx="3" fill="#fffde7" stroke="#ca8a04" stroke-width="1.5"/>

        <!-- ── Tail lights ── -->
        <rect x="-22" y="88" width="16" height="8" rx="3" fill="#fca5a5" stroke="#dc2626" stroke-width="1.5"/>
        <rect x="6"   y="88" width="16" height="8" rx="3" fill="#fca5a5" stroke="#dc2626" stroke-width="1.5"/>

        <!-- ── Roof specular highlight ── -->
        <ellipse cx="-4" cy="-18" rx="12" ry="22"
                 fill="white" fill-opacity="0.12" transform="rotate(-8,-4,-18)"/>
      </g>
    `;
  },
});

/** Renders a single top-down wheel centred at (cx,cy) */
function wheel(cx: number, cy: number): string {
  return `
    <g transform="translate(${cx},${cy})">
      <!-- tyre -->
      <rect x="-10" y="-16" width="20" height="32" rx="5"
            fill="#1c1917" stroke="#000" stroke-width="1.5"/>
      <!-- rim -->
      <rect x="-6" y="-11" width="12" height="22" rx="3"
            fill="#6b7280"/>
      <!-- hub -->
      <circle cx="0" cy="0" r="4" fill="#d1d5db"/>
      <!-- spoke lines -->
      <line x1="0" y1="-8" x2="0" y2="8"   stroke="#9ca3af" stroke-width="1.2"/>
      <line x1="-6" y1="0" x2="6" y2="0"   stroke="#9ca3af" stroke-width="1.2"/>
    </g>
  `;
}

/** Simple hex color darkening/lightening helper (works for #rrggbb) */
function shadeColor(hex: string, pct: number): string {
  const n = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, Math.max(0, (n >> 16) + pct));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + pct));
  const b = Math.min(255, Math.max(0, (n & 0xff) + pct));
  return `rgb(${r},${g},${b})`;
}
function lightenColor(hex: string, pct: number): string {
  return shadeColor(hex, pct);
}
const vehicleCarBlack   = topDownCar('#111827', 'black',   'Black');
const vehicleCarSilver  = topDownCar('#c0c0c0', 'silver',  'Silver');
const vehicleCarGray    = topDownCar('#6b7280', 'gray',    'Gray');
const vehicleCarBrown   = topDownCar('#7c4a2d', 'brown',   'Brown');
const vehicleCarRed     = topDownCar('#b91c1c', 'red',     'Red');
const vehicleCarBlue    = topDownCar('#1e3a8a', 'blue',    'Blue');
// ── Top-Down Truck ──────────
// ──────────────────────────────────────────────────
const vehicleTruck: IconType = {
  id: 'vehicle-truck-realistic',
  label: 'Truck',
  category: 'vehicle',
  color: '#f97316',
  width: 130,
  height: 300,
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      
   
      <!-- external SVG -->
      <image 
        href="/image/truckk.png" 
        x="-65" 
        y="-150" 
        width="130" 
        height="300"
        preserveAspectRatio="xMidYMid meet"
      />
      
    </g>
  `,
};

function truckWheel(cx: number, cy: number): string {
  return `
    <g transform="translate(${cx},${cy})">
      <rect x="-13" y="-20" width="26" height="40" rx="6" fill="#1c1917" stroke="#000" stroke-width="2"/>
      <rect x="-8"  y="-14" width="16" height="28" rx="3" fill="#6b7280"/>
      <circle cx="0" cy="0" r="5" fill="#d1d5db"/>
      <line x1="0" y1="-10" x2="0" y2="10" stroke="#9ca3af" stroke-width="1.5"/>
      <line x1="-8" y1="0"  x2="8" y2="0"  stroke="#9ca3af" stroke-width="1.5"/>
    </g>
  `;
}


const vehicleVan: IconType = {
  id: 'vehicle-van-svg',
  label: 'Van',
  category: 'vehicle',
  color: '#3b82f6',
  width: 130,
  height: 300,
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${0.6 * scale})">
      
   
      <!-- external SVG -->
      <image 
        href="/image/van.svg" 
        x="-65" 
        y="-150" 
        width="130" 
        height="300"
        preserveAspectRatio="xMidYMid meet"
      />
      
    </g>
  `,
};
// ── Top-Down Motorcycle ───────────────────────────────────────────────────────
const vehicleMotorcycle: IconType = {
  id: 'vehicle-motorcycle-realistic',
  label: 'Motorcycle',
  category: 'vehicle',
  color: '#06b6d4',
  width: 60,
  height: 180,
   render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${0.6*scale})">
      
   
      <!-- external SVG -->
      <image 
        href="/image/bikeee.png" 
        x="-65" 
        y="-150" 
        width="130" 
        height="300"
        preserveAspectRatio="xMidYMid meet"
      />
      
    </g>
  `,
};

// ────────────────────────────────────────────────
// Traffic Control ─────────────────────────────────
// ────────────────────────────────────────────────

const trafficLight: IconType = {
  id: 'traffic-light',
  label: 'Traffic Light',
  category: 'traffic',
  color: '#1f2937',
  width: 62.5,
  height: 150,
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      <rect x="-20" y="-62.5" width="40" height="125" fill="#1f2937" stroke="#111827" stroke-width="3.5" rx="5"/>
      <circle cx="0" cy="-37.5" r="10" fill="#ef4444"/>
      <circle cx="0" cy="-5"    r="10" fill="#fbbf24"/>
      <circle cx="0" cy="27.5"  r="10" fill="#22c55e"/>
    </g>
  `,
};

const stopSign: IconType = {
  id: 'stop-sign',
  label: 'Stop Sign',
  category: 'traffic',
  color: '#dc2626',
  width: 87.5,
  height: 87.5,
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      <polygon points="0,-37.5 37.5,-12.5 37.5,12.5 0,37.5 -37.5,12.5 -37.5,-12.5"
               fill="#dc2626" stroke="#991b1b" stroke-width="5"/>
      <text x="0" y="7.5" font-size="20" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">STOP</text>
    </g>
  `,
};

const speedLimitSign: IconType = {
  id: 'speed-limit',
  label: 'Speed Limit',
  category: 'traffic',
  color: '#ffffff',
  width: 62.5,
  height: 87.5,
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      <rect x="-25" y="-37.5" width="50" height="75" fill="white" stroke="#1f2937" stroke-width="5" rx="5"/>
      <text x="0" y="2" font-size="25" font-weight="bold" fill="#1f2937" text-anchor="middle" dominant-baseline="middle">50</text>
    </g>
  `,
};

// ────────────────────────────────────────────────
// Incidents ───────────────────────────────────────
// ────────────────────────────────────────────────

const collisionMarker: IconType = {
  id: 'collision-marker',
  label: 'Collision Point',
  category: 'incident',
  color: '#dc2626',
  width: 75,
  height: 75,
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      <circle cx="0" cy="0" r="30" fill="#dc2626" opacity="0.3" stroke="#dc2626" stroke-width="5"/>
      <circle cx="0" cy="0" r="20" fill="none" stroke="#dc2626" stroke-width="6"/>
      <path d="M -10 -10 L 10 10 M 10 -10 L -10 10" stroke="#dc2626" stroke-width="5" stroke-linecap="round"/>
    </g>
  `,
};

const skidMark: IconType = {
  id: 'skid-mark',
  label: 'Skid Mark',
  category: 'incident',
  color: '#1f2937',
  width: 250,
  height: 37.5,
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      <path d="M -100 -12.5 Q -75 7.5 -50 -7.5 Q -25 12.5 0 -5 Q 25 10 50 -2.5 Q 75 7.5 100 -10"
            fill="none" stroke="#1f2937" stroke-width="10" stroke-linecap="round" opacity="0.6"/>
    </g>
  `,
};

const damageMarker: IconType = {
  id: 'damage-marker',
  label: 'Damage Area',
  category: 'incident',
  color: '#f97316',
  width: 100,
  height: 100,
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      <circle cx="0" cy="0" r="37.5" fill="#f97316" opacity="0.2" stroke="#f97316" stroke-width="5"/>
      <polygon points="0,-20 7.5,-5 22.5,-5 12.5,5 17.5,20 0,10 -17.5,20 -12.5,5 -22.5,-5 -7.5,-5"
               fill="#f97316" stroke="#ea580c" stroke-width="2.5"/>
    </g>
  `,
};

// ────────────────────────────────────────────────
// Movement ────────────────────────────────────────
// ────────────────────────────────────────────────

const movementArrowRight: IconType = {
  id: 'movement-arrow-right',
  label: 'Move Right',
  category: 'movement',
  color: '#000000',
  width: 120,
  height: 44,
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${0.6*scale})">
      <!-- shaft -->
      <rect x="-55" y="-7" width="90" height="14" rx="4" fill="#000000"/>
      <!-- arrowhead triangle -->
      <polygon points="32,-18 58,0 32,18" fill="#000000"/>
      <!-- origin dot -->
      <circle cx="-55" cy="0" r="8" fill="#000000"/>
    </g>
  `,
};

const movementArrowCurved: IconType = {
  id: 'movement-arrow-curved',
  label: 'Curved Movement',
  category: 'movement',
  color: '#374151',
  width: 100,
  height: 60,
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${0.7*scale})">
      <defs>
        <marker 
          id="arrowhead-curved-slim" 
          markerWidth="8" 
          markerHeight="8" 
          refX="6" 
          refY="4" 
          orient="auto"
        >
          <polygon 
            points="0 0, 8 4, 0 8" 
            fill="#374151"
          />
        </marker>
      </defs>

      <!-- slim realistic curve -->
      <path 
        d="M -35 25 Q -35 -20 35 -20"
        fill="none"
        stroke="#374151"
        stroke-width="3"
        stroke-linecap="round"
        marker-end="url(#arrowhead-curved-slim)"
      />

      <!-- small subtle origin dot -->
      <circle 
        cx="-35" 
        cy="25" 
        r="3" 
        fill="#374151"
      />
    </g>
  `,
};
export const ICON_LIBRARY: IconType[] = [
  roadStraight, roadCurved, roadIntersection, roadCrossroad, roadRoundabout,
  vehicleCarRed, vehicleCarBlue, vehicleCarBlack, vehicleCarSilver, vehicleCarGray, vehicleCarBrown,
  vehicleTruck, vehicleMotorcycle,vehicleVan,
  trafficLight, stopSign, speedLimitSign,
  collisionMarker, skidMark, damageMarker,
  movementArrowRight, movementArrowCurved,
];

export const ICON_CATEGORIES = {
  road:     'Roads',
  vehicle:  'Vehicles',
  traffic:  'Traffic Control',
  incident: 'Incident Markers',
  movement: 'Movement',
};