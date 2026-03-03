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
  width: 225,     // was 90  → ×2.5
  height: 350,    // was 140 → ×2.5
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      <!-- road background -->
      <rect x="-112.5" y="-175" width="225" height="350" fill="#94a3b8" stroke="#475569" stroke-width="6"/>
      
      <!-- edge lines (solid white/yellow) -->
      <line x1="-100" y1="-175" x2="-100" y2="175" stroke="#fef08a" stroke-width="10"/>
      <line x1="100"  y1="-175" x2="100"  y2="175" stroke="#fef08a" stroke-width="10"/>
      
      <!-- center dashed lines -->
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
  width: 250,     // was 100 → ×2.5
  height: 250,    // was 100 → ×2.5
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
  width: 250,     // ×2.5
  height: 250,    // ×2.5
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      <rect x="-100" y="-50" width="200" height="100" fill="#94a3b8" stroke="#475569" stroke-width="5"/>
      <rect x="-50"  y="-100" width="100" height="200" fill="#94a3b8" stroke="#475569" stroke-width="5"/>
      <line x1="-100" y1="0" x2="100" y2="0" stroke="#fbbf24" stroke-width="5" stroke-dasharray="25,25"/>
      <line x1="0" y1="-100" x2="0" y2="100" stroke="#fbbf24" stroke-width="5" stroke-dasharray="25,25"/>
    </g>
  `,
};

const roadRoundabout: IconType = {
  id: 'road-roundabout',
  label: 'Roundabout',
  category: 'road',
  color: '#64748b',
  width: 250,     // ×2.5
  height: 250,    // ×2.5
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      <circle cx="0" cy="0" r="100" fill="none" stroke="#94a3b8" stroke-width="50"/>
      <circle cx="0" cy="0" r="62.5" fill="#e0e7ff" stroke="#475569" stroke-width="5"/>
      <circle cx="0" cy="0" r="50" fill="none" stroke="#fbbf24" stroke-width="5" stroke-dasharray="25,25"/>
      <path d="M 0 -100 L 0 -87.5 M 100 0 L 87.5 0 M 0 100 L 0 87.5 M -100 0 L -87.5 0" 
            stroke="#fbbf24" stroke-width="5"/>
    </g>
  `,
};

// ────────────────────────────────────────────────
// Vehicles ────────────────────────────────────────
// ────────────────────────────────────────────────

const vehicleCar: IconType = {
  id: 'vehicle-car-improved',
  label: 'Car',
  category: 'vehicle',
  color: '#ef4444',
  width: 150,     // was 60  → ×2.5
  height: 80,     // was 32  → ×2.5
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      <!-- Main body -->
      <path d="M -62.5 -10 Q -70 -25 -50 -30 L 50 -30 Q 70 -25 62.5 -10 L 62.5 20 Q 62.5 30 45 30 L -45 30 Q -62.5 30 -62.5 20 Z" 
            fill="#ef4444" stroke="#991b1b" stroke-width="5" stroke-linejoin="round"/>
      
      <!-- Windows -->
      <path d="M -45 -25 L -20 -15 L 20 -15 L 45 -25" fill="none" stroke="#93c5fd" stroke-width="3.5"/>
      <rect x="-37.5" y="-22.5" width="25" height="12.5" fill="#93c5fd" stroke="#1e3a8a" stroke-width="2.5"/>
      <rect x="12.5"  y="-22.5" width="25" height="12.5" fill="#93c5fd" stroke="#1e3a8a" stroke-width="2.5"/>
      
      <!-- Wheels -->
      <circle cx="-37.5" cy="25" r="12.5" fill="#1f2937" stroke="#111827" stroke-width="3.5"/>
      <circle cx="37.5"  cy="25" r="12.5" fill="#1f2937" stroke="#111827" stroke-width="3.5"/>
      <circle cx="-37.5" cy="25" r="6.25" fill="#4b5563"/>
      <circle cx="37.5"  cy="25" r="6.25" fill="#4b5563"/>
    </g>
  `,
};

const vehicleTruck: IconType = {
  id: 'vehicle-truck',
  label: 'Truck',
  category: 'vehicle',
  color: '#f97316',
  width: 400,     // ×2.5
  height: 400,     // ×2.5
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      <rect x="-50"  y="-20" width="62.5" height="40" fill="#f97316" stroke="#92400e" stroke-width="3.5" rx="5"/>
      <rect x="12.5" y="-15" width="37.5" height="30" fill="#84cc16" stroke="#3f6212" stroke-width="3.5" rx="2.5"/>
      <rect x="-25"  y="-25" width="15"  height="10" fill="#93c5fd" stroke="#1e3a8a" stroke-width="2.5"/>
      <circle cx="-37.5" cy="20" r="6.25" fill="#1f2937"/>
      <circle cx="25"    cy="20" r="7.5"  fill="#1f2937"/>
      <circle cx="45"    cy="20" r="7.5"  fill="#1f2937"/>
    </g>
  `,
};

const vehicleMotorcycle: IconType = {
  id: 'vehicle-motorcycle-proper',
  label: 'Motorcycle',
  category: 'vehicle',
  color: '#06b6d4',
  width: 150,     // ×2.5
  height: 100,    // ×2.5
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      <!-- wheels -->
      <circle cx="-45" cy="30" r="20" fill="#1f2937" stroke="#111827" stroke-width="3.5"/>
      <circle cx="45"  cy="30" r="20" fill="#1f2937" stroke="#111827" stroke-width="3.5"/>
      
      <!-- body / frame -->
      <path d="M -55 30 L -25 0 L 0 -5 L 55 10 L 55 30 Z" 
            fill="#06b6d4" stroke="#164e63" stroke-width="5" stroke-linejoin="round"/>
      
      <!-- seat -->
      <rect x="-30" y="-15" width="60" height="20" rx="5" fill="#64748b" stroke="#475569" stroke-width="3.5"/>
      
      <!-- handlebar -->
      <line x1="-25" y1="-10" x2="-55" y2="-30" stroke="#164e63" stroke-width="7.5" stroke-linecap="round"/>
      
      <!-- small details -->
      <circle cx="0" cy="0" r="6" fill="#dc2626"/> <!-- tail light -->
      <rect x="50" y="10" width="15" height="10" fill="#93c5fd" rx="2.5"/> <!-- headlight area -->
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
  width: 62.5,    // ×2.5
  height: 150,    // ×2.5
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
  width: 87.5,    // ×2.5
  height: 87.5,   // ×2.5
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
  width: 62.5,    // ×2.5
  height: 87.5,   // ×2.5
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
  width: 75,      // ×2.5
  height: 75,     // ×2.5
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
  width: 250,     // ×2.5
  height: 37.5,   // ×2.5
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
  width: 100,     // ×2.5
  height: 100,    // ×2.5
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
  color: '#3b82f6',
  width: 80,     // ×2.5
  height: 60,     // ×2.5
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      <defs>
        <marker id="arrowhead" markerWidth="25" markerHeight="25" refX="22.5" refY="7.5" orient="auto">
          <polygon points="0 0, 25 7.5, 0 15" fill="#3b82f6"/>
        </marker>
      </defs>
      <line x1="-50" y1="0" x2="50" y2="0" stroke="#3b82f6" stroke-width="7.5" marker-end="url(#arrowhead)" opacity="0.7"/>
      <circle cx="-50" cy="0" r="7.5" fill="#3b82f6"/>
    </g>
  `,
};

const movementArrowCurved: IconType = {
  id: 'movement-arrow-curved',
  label: 'Curved Movement',
  category: 'movement',
  color: '#8b5cf6',
  width: 80,     // ×2.5
  height: 60,    // ×2.5
  render: (x, y, rotation, scale) => `
    <g transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})">
      <defs>
        <marker id="arrowhead-curved" markerWidth="25" markerHeight="25" refX="22.5" refY="7.5" orient="auto">
          <polygon points="0 0, 25 7.5, 0 15" fill="#8b5cf6"/>
        </marker>
      </defs>
      <path d="M -62.5 0 Q 0 62.5 62.5 0" fill="none" stroke="#8b5cf6" stroke-width="7.5" marker-end="url(#arrowhead-curved)" opacity="0.7"/>
      <circle cx="-62.5" cy="0" r="7.5" fill="#8b5cf6"/>
    </g>
  `,
};

export const ICON_LIBRARY: IconType[] = [
  // Roads
  roadStraight,
  roadCurved,
  roadIntersection,
  roadRoundabout,
  // Vehicles
  vehicleCar,
  vehicleTruck,
  vehicleMotorcycle,
  // Traffic
  trafficLight,
  stopSign,
  speedLimitSign,
  // Incidents
  collisionMarker,
  skidMark,
  damageMarker,
  // Movement
  movementArrowRight,
  movementArrowCurved,
];

export const ICON_CATEGORIES = {
  road: 'Roads',
  vehicle: 'Vehicles',
  traffic: 'Traffic Control',
  incident: 'Incident Markers',
  movement: 'Movement',
};