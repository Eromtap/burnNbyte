export const EQUIPMENT_OPTIONS = [
  {
    id: "commercial_gym",
    label: "Full Gym",
    description: "Commercial gym with machines, cables, and barbells",
  },
  {
    id: "home_rack",
    label: "Home Gym (rack + barbell)",
    description: "Rack, barbell, plates, bench, basic attachments",
  },
  {
    id: "dumbbells_bands",
    label: "Dumbbells + Bands",
    description: "Adjustable dumbbells, resistance bands, maybe a bench",
  },
  {
    id: "kettlebells",
    label: "Kettlebells",
    description: "Single or pair of kettlebells",
  },
  {
    id: "bodyweight",
    label: "Bodyweight Only",
    description: "No equipment needed beyond a mat/doorframe",
  },
  {
    id: "cardio_machine",
    label: "Cardio Machine",
    description: "Treadmill, bike, rower, or elliptical available",
  },
  {
    id: "outdoor",
    label: "Outdoor Access",
    description: "Roads/trails for running, hiking, or cycling",
  },
];

const EQUIPMENT_LOOKUP = EQUIPMENT_OPTIONS.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});

export function normalizeEquipmentAccess(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => v?.toString().trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function labelForEquipmentOption(value) {
  if (!value) return "";
  return EQUIPMENT_LOOKUP[value]?.label ?? value;
}
