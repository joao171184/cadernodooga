import {
  Sparkles, Flame, Zap, Sword, Crosshair, Wind, Waves, Moon, Sun,
  Heart, Anchor, Music, Baby, Feather, Cross, Skull, Crown,
  HandHeart, Bird, Leaf, Star, Drum, Mountain, Compass,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  // Categorias raiz
  "abertura": Sparkles,
  "esquenta": Flame,
  "orixás": Crown,
  "orixas": Crown,
  "guias de direita": HandHeart,
  "guias de esquerda": Flame,

  // Orixás
  "exu": Skull,
  "ogum": Sword,
  "oxóssi": Crosshair,
  "oxossi": Crosshair,
  "xangô": Zap,
  "xango": Zap,
  "iansã": Wind,
  "iansa": Wind,
  "iemanjá": Waves,
  "iemanja": Waves,
  "oxum": Heart,
  "nanã": Moon,
  "nana": Moon,
  "omolu": Cross,
  "oxalá": Sun,
  "oxala": Sun,

  // Guias
  "caboclo": Feather,
  "preto-velho": Mountain,
  "preto velho": Mountain,
  "criança": Baby,
  "crianca": Baby,
  "boiadeiro": Compass,
  "marinheiro": Anchor,
  "baiano": Music,
  "pomba gira": Star,
  "exu mirim": Skull,
};

export function getCategoryIcon(nome: string): LucideIcon {
  const key = nome.trim().toLowerCase();
  return MAP[key] ?? Leaf;
}

export { Drum, Bird };
