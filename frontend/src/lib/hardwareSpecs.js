/**
 * Frontend Hardware Specifications Templates & Utility Functions
 */

export const CANONICAL_HARDWARE_TEMPLATES = {
  cpu: {
    categoryKey: 'cpu',
    label: 'Processor (CPU)',
    matchTerms: ['cpu', 'processor', 'processors', 'proc'],
    fields: [
      { key: 'Socket', label: 'Socket', type: 'text', placeholder: 'e.g. AM5, LGA1700, AM4' },
      { key: 'Cores', label: 'Total Cores', type: 'number', placeholder: 'e.g. 16' },
      { key: 'Threads', label: 'Total Threads', type: 'number', placeholder: 'e.g. 32' },
      { key: 'Base Clock', label: 'Base Clock', type: 'text', placeholder: 'e.g. 4.5 GHz' },
      { key: 'Boost Clock', label: 'Boost Clock', type: 'text', placeholder: 'e.g. 5.7 GHz' },
      { key: 'Integrated Graphics', label: 'Integrated Graphics', type: 'text', placeholder: 'e.g. Radeon Graphics, UHD 770, None' },
      { key: 'TDP', label: 'TDP / Base Power', type: 'text', placeholder: 'e.g. 105W, 170W' },
      { key: 'PCIe Version', label: 'PCIe Generation', type: 'text', placeholder: 'e.g. PCIe 5.0' },
      { key: 'L3 Cache', label: 'L3 Cache', type: 'text', placeholder: 'e.g. 64MB, 32MB' }
    ]
  },
  gpu: {
    categoryKey: 'gpu',
    label: 'Graphics Card (GPU)',
    matchTerms: ['gpu', 'graphics', 'video card', 'graphic card', 'vga', 'graphics cards'],
    fields: [
      { key: 'VRAM', label: 'VRAM Capacity', type: 'text', placeholder: 'e.g. 16GB, 24GB, 12GB' },
      { key: 'Memory Type', label: 'Memory Type', type: 'text', placeholder: 'e.g. GDDR6X, GDDR6' },
      { key: 'Interface', label: 'Interface Bus', type: 'text', placeholder: 'e.g. PCIe 4.0 x16, PCIe 5.0' },
      { key: 'Boost Clock', label: 'Boost Clock', type: 'text', placeholder: 'e.g. 2610 MHz' },
      { key: 'Length', label: 'Card Length', type: 'text', placeholder: 'e.g. 304 mm, 280 mm' },
      { key: 'Power Requirement', label: 'Recommended PSU', type: 'text', placeholder: 'e.g. 750W, 850W' },
      { key: 'Power Connectors', label: 'Power Connectors', type: 'text', placeholder: 'e.g. 1x 16-pin (12VHPWR), 2x 8-pin' },
      { key: 'Display Outputs', label: 'Display Outputs', type: 'text', placeholder: 'e.g. 3x DP 1.4a, 1x HDMI 2.1a' }
    ]
  },
  ram: {
    categoryKey: 'ram',
    label: 'Memory (RAM)',
    matchTerms: ['ram', 'memory', 'dram', 'ddr4', 'ddr5'],
    fields: [
      { key: 'Capacity', label: 'Total Capacity', type: 'text', placeholder: 'e.g. 32GB (2x16GB), 64GB' },
      { key: 'Type', label: 'Memory Standard', type: 'text', placeholder: 'e.g. DDR5, DDR4' },
      { key: 'Speed', label: 'Frequency Speed', type: 'text', placeholder: 'e.g. 6000 MHz, 3600 MHz' },
      { key: 'Form Factor', label: 'Form Factor', type: 'text', placeholder: 'e.g. DIMM (Desktop), SO-DIMM (Laptop)' },
      { key: 'CAS Latency', label: 'CAS Latency (CL)', type: 'text', placeholder: 'e.g. CL30, CL36' },
      { key: 'Voltage', label: 'Tested Voltage', type: 'text', placeholder: 'e.g. 1.35V, 1.4V' },
      { key: 'RGB Lighting', label: 'RGB Lighting', type: 'text', placeholder: 'e.g. Yes (ARGB), Non-RGB' }
    ]
  },
  storage: {
    categoryKey: 'storage',
    label: 'Storage (SSD / HDD)',
    matchTerms: ['storage', 'ssd', 'hdd', 'hard drive', 'solid state drive', 'nvme', 'm.2'],
    fields: [
      { key: 'Capacity', label: 'Storage Capacity', type: 'text', placeholder: 'e.g. 1TB, 2TB, 4TB' },
      { key: 'Interface', label: 'Interface / Protocol', type: 'text', placeholder: 'e.g. NVMe PCIe 4.0 x4, PCIe 5.0 x4, SATA III' },
      { key: 'Form Factor', label: 'Form Factor', type: 'text', placeholder: 'e.g. M.2 2280, 2.5-inch, 3.5-inch' },
      { key: 'Sequential Read', label: 'Max Read Speed', type: 'text', placeholder: 'e.g. 7450 MB/s' },
      { key: 'Sequential Write', label: 'Max Write Speed', type: 'text', placeholder: 'e.g. 6900 MB/s' },
      { key: 'NAND Flash', label: 'NAND Flash Type', type: 'text', placeholder: 'e.g. 3D TLC, QLC' },
      { key: 'Endurance (TBW)', label: 'Endurance (TBW)', type: 'text', placeholder: 'e.g. 1200 TBW' }
    ]
  },
  motherboard: {
    categoryKey: 'motherboard',
    label: 'Motherboard',
    matchTerms: ['motherboard', 'mainboard', 'mobo'],
    fields: [
      { key: 'Socket', label: 'CPU Socket', type: 'text', placeholder: 'e.g. AM5, LGA1700, AM4' },
      { key: 'Chipset', label: 'Chipset', type: 'text', placeholder: 'e.g. AMD B650, X670E, Intel Z790' },
      { key: 'Form Factor', label: 'Form Factor', type: 'text', placeholder: 'e.g. ATX, Micro-ATX, Mini-ITX' },
      { key: 'RAM Type', label: 'Supported RAM', type: 'text', placeholder: 'e.g. DDR5, DDR4' },
      { key: 'RAM Slots', label: 'RAM Slots', type: 'number', placeholder: 'e.g. 4, 2' },
      { key: 'Max RAM Capacity', label: 'Max RAM Capacity', type: 'text', placeholder: 'e.g. 192GB, 128GB' },
      { key: 'PCIe Slots', label: 'PCIe Expansion Slots', type: 'text', placeholder: 'e.g. 1x PCIe 5.0 x16, 2x PCIe 4.0 x16' },
      { key: 'M.2 Slots', label: 'M.2 Slots', type: 'text', placeholder: 'e.g. 3x M.2 (1x Gen5, 2x Gen4)' },
      { key: 'Wireless Connectivity', label: 'Wi-Fi & Bluetooth', type: 'text', placeholder: 'e.g. Wi-Fi 6E, Bluetooth 5.3, None' }
    ]
  },
  psu: {
    categoryKey: 'psu',
    label: 'Power Supply (PSU)',
    matchTerms: ['psu', 'power supply', 'power'],
    fields: [
      { key: 'Wattage', label: 'Rated Wattage', type: 'text', placeholder: 'e.g. 750W, 850W, 1000W' },
      { key: 'Efficiency Rating', label: '80 PLUS Rating', type: 'text', placeholder: 'e.g. 80 PLUS Gold, 80 PLUS Platinum' },
      { key: 'Modular Type', label: 'Modularity', type: 'text', placeholder: 'e.g. Fully Modular, Semi-Modular, Non-Modular' },
      { key: 'Form Factor', label: 'Form Factor', type: 'text', placeholder: 'e.g. ATX, SFX, SFX-L' },
      { key: 'PCIe 5.0 / 12VHPWR', label: 'ATX 3.0 / PCIe 5.0', type: 'text', placeholder: 'e.g. Yes (12V-2x6 / 12VHPWR), No' },
      { key: 'Warranty', label: 'Manufacturer Warranty', type: 'text', placeholder: 'e.g. 10 Years, 7 Years' }
    ]
  },
  case: {
    categoryKey: 'case',
    label: 'PC Case / Chassis',
    matchTerms: ['case', 'chassis', 'casing', 'tower'],
    fields: [
      { key: 'Form Factor', label: 'Case Type', type: 'text', placeholder: 'e.g. Mid Tower, Full Tower, Mini-ITX' },
      { key: 'Motherboard Support', label: 'Motherboard Compatibility', type: 'text', placeholder: 'e.g. ATX, Micro-ATX, Mini-ITX, E-ATX' },
      { key: 'GPU Clearance', label: 'Max GPU Length', type: 'text', placeholder: 'e.g. 400 mm, 360 mm' },
      { key: 'CPU Cooler Clearance', label: 'Max CPU Cooler Height', type: 'text', placeholder: 'e.g. 165 mm, 180 mm' },
      { key: 'PSU Clearance', label: 'Max PSU Length', type: 'text', placeholder: 'e.g. 200 mm' },
      { key: 'Radiator Support', label: 'Radiator Support', type: 'text', placeholder: 'e.g. Front 360mm, Top 280mm' },
      { key: 'Included Fans', label: 'Pre-installed Fans', type: 'text', placeholder: 'e.g. 4x 120mm ARGB' }
    ]
  },
  cooler: {
    categoryKey: 'cooler',
    label: 'Cooling / CPU Cooler',
    matchTerms: ['cooler', 'cooling', 'fan', 'aio', 'liquid cooler', 'heatsink'],
    fields: [
      { key: 'Cooler Type', label: 'Cooler Type', type: 'text', placeholder: 'e.g. 360mm AIO Liquid Cooler, Air Cooler' },
      { key: 'Radiator / Heatsink Size', label: 'Radiator / Size', type: 'text', placeholder: 'e.g. 360mm (394 x 120 x 27 mm)' },
      { key: 'Fan Speed', label: 'Fan Speed (RPM)', type: 'text', placeholder: 'e.g. 800 - 2000 RPM ± 10%' },
      { key: 'Noise Level', label: 'Noise Level', type: 'text', placeholder: 'e.g. 32.5 dBA' },
      { key: 'Supported Sockets', label: 'Socket Compatibility', type: 'text', placeholder: 'e.g. Intel LGA1700/1200, AMD AM5/AM4' },
      { key: 'Lighting', label: 'RGB / Display', type: 'text', placeholder: 'e.g. ARGB, LCD Display, Non-RGB' }
    ]
  },
  monitor: {
    categoryKey: 'monitor',
    label: 'Monitor / Display',
    matchTerms: ['monitor', 'display', 'screen'],
    fields: [
      { key: 'Screen Size', label: 'Screen Diagonal', type: 'text', placeholder: 'e.g. 27 inch, 32 inch, 24 inch' },
      { key: 'Resolution', label: 'Native Resolution', type: 'text', placeholder: 'e.g. 2560 x 1440 (QHD), 3840 x 2160 (4K), 1920 x 1080 (FHD)' },
      { key: 'Refresh Rate', label: 'Refresh Rate', type: 'text', placeholder: 'e.g. 165 Hz, 240 Hz, 144 Hz' },
      { key: 'Panel Type', label: 'Panel Technology', type: 'text', placeholder: 'e.g. Fast IPS, OLED, VA' },
      { key: 'Response Time', label: 'Response Time', type: 'text', placeholder: 'e.g. 1ms GtG, 0.03ms' },
      { key: 'Curvature', label: 'Curvature', type: 'text', placeholder: 'e.g. Flat, 1000R, 1500R' },
      { key: 'Video Inputs', label: 'Video Connectivity', type: 'text', placeholder: 'e.g. 2x HDMI 2.1, 1x DP 1.4, 1x USB-C (90W)' }
    ]
  }
};

/**
 * Returns a template for a category (checking category.spec_template first, then fallback to canonical)
 */
export function getCategorySpecTemplate(categoryOrName) {
  if (!categoryOrName) return null;

  // If category object has custom spec_template defined
  if (typeof categoryOrName === 'object') {
    if (categoryOrName.spec_template) {
      let fields = categoryOrName.spec_template;
      if (typeof fields === 'string') {
        try { fields = JSON.parse(fields); } catch {}
      }
      if (Array.isArray(fields) && fields.length > 0) {
        return {
          categoryKey: categoryOrName.slug || 'custom',
          label: categoryOrName.name || 'Category',
          fields
        };
      }
    }
    return getCategorySpecTemplate(categoryOrName.name || categoryOrName.slug);
  }

  const normalized = categoryOrName.toString().toLowerCase().trim();
  for (const template of Object.values(CANONICAL_HARDWARE_TEMPLATES)) {
    if (template.categoryKey === normalized) return template;
    for (const term of template.matchTerms) {
      if (normalized.includes(term) || term.includes(normalized)) {
        return template;
      }
    }
  }
  return null;
}

/**
 * Parses specifications safely into an object, array, or string
 */
export function parseProductSpecs(specifications) {
  if (!specifications) return null;

  if (typeof specifications === 'object') {
    return specifications;
  }

  if (typeof specifications === 'string') {
    const trimmed = specifications.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch {
      // Legacy plain-text
      return trimmed;
    }
  }

  return null;
}

/**
 * Formats specifications into a clean, concise single-line summary string
 * e.g. "AM5 • 16 Cores • 5.7 GHz"
 */
export function formatSpecsSummary(specifications, maxItems = 3) {
  const parsed = parseProductSpecs(specifications);
  if (!parsed) return '';

  if (typeof parsed === 'string') {
    return parsed.length > 60 ? parsed.slice(0, 57) + '...' : parsed;
  }

  const entries = Object.entries(parsed).filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== '');
  if (entries.length === 0) return '';

  return entries
    .slice(0, maxItems)
    .map(([k, v]) => `${v}`)
    .join(' • ');
}

/**
 * Formats specifications for Excel export
 */
export function formatSpecsForExport(specifications) {
  const parsed = parseProductSpecs(specifications);
  if (!parsed) return '';

  if (typeof parsed === 'string') return parsed;

  return Object.entries(parsed)
    .filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
}
