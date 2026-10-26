import {
  Droplets,
  Zap,
  Paintbrush,
  ChevronsUpDown,
  Sparkles,
  ShieldCheck,
  Hammer,
  Leaf,
  Bug,
  Cctv,
  Truck,
  Fuel,
  Flame,
  Sun,
  Trash2,
  Users,
  Scale,
  Umbrella,
  Receipt,
  Car,
  Dumbbell,
  Landmark,
  PartyPopper,
  Wrench,
  CircleEllipsis,
  type LucideIcon,
} from "lucide-react";

export interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
  /** hex used for donut chart + chips */
  color: string;
  soft: string;
}

export const CATEGORIES: Category[] = [
  { id: "plumbing", label: "Plumbing", icon: Droplets, color: "#3178a0", soft: "#dbe9f0" },
  { id: "electrical", label: "Electrical", icon: Zap, color: "#c78f10", soft: "#f6e9c8" },
  { id: "painting", label: "Painting", icon: Paintbrush, color: "#a05a9e", soft: "#f0ddf0" },
  { id: "lift", label: "Lift / Elevator", icon: ChevronsUpDown, color: "#4f6fb5", soft: "#dde5f4" },
  { id: "housekeeping", label: "Housekeeping", icon: Sparkles, color: "#2c9e8f", soft: "#d5ece8" },
  { id: "security", label: "Security Guards", icon: ShieldCheck, color: "#40566f", soft: "#dfe4ea" },
  { id: "cameras", label: "CCTV & Intercom", icon: Cctv, color: "#b2543c", soft: "#f4ded8" },
  { id: "civil", label: "Civil & Repairs", icon: Hammer, color: "#a8613a", soft: "#f0dfd2" },
  { id: "garden", label: "Garden", icon: Leaf, color: "#4c8440", soft: "#ddebd6" },
  { id: "pest", label: "Pest Control", icon: Bug, color: "#7d5aa8", soft: "#e8ddf2" },
  { id: "water", label: "Water Tanker", icon: Truck, color: "#2f86b8", soft: "#d9ecf5" },
  { id: "generator", label: "DG & Power Backup", icon: Fuel, color: "#8a6a3c", soft: "#efe4d3" },
  { id: "fire", label: "Fire Safety", icon: Flame, color: "#c4502a", soft: "#f7e0d6" },
  { id: "solar", label: "Solar & Energy", icon: Sun, color: "#d2a013", soft: "#faeecb" },
  { id: "waste", label: "Waste Management", icon: Trash2, color: "#5f7a4a", soft: "#e3ecd9" },
  { id: "staff", label: "Staff Salary", icon: Users, color: "#3f7a73", soft: "#dbecea" },
  { id: "legal", label: "Legal & Admin", icon: Scale, color: "#6b6f87", soft: "#e3e4ec" },
  { id: "insurance", label: "Insurance", icon: Umbrella, color: "#4a6fa0", soft: "#dee7f2" },
  { id: "utilities", label: "Utility Bills", icon: Receipt, color: "#9a7b2f", soft: "#f2e9ce" },
  { id: "taxes", label: "Taxes & Dues", icon: Landmark, color: "#56636e", soft: "#e2e6e9" },
  { id: "parking", label: "Parking & Driveway", icon: Car, color: "#72707e", soft: "#e6e5ea" },
  { id: "amenities", label: "Clubhouse & Gym", icon: Dumbbell, color: "#a04f73", soft: "#f3dde7" },
  { id: "events", label: "Festivals & Events", icon: PartyPopper, color: "#c26a1f", soft: "#f8e5cf" },
  { id: "amc", label: "AMC & Contracts", icon: Wrench, color: "#4d7d9c", soft: "#dde9f1" },
  { id: "other", label: "Other", icon: CircleEllipsis, color: "#707955", soft: "#e4e6da" },
];

export const categoryById = (id: string): Category =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

export const PAYMENT_MODES = ["UPI", "Cash", "Bank Transfer", "Cheque", "Card"] as const;
