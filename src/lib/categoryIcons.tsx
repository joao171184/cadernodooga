import {
  Sparkles, Flame, Zap, Sword, Crosshair, Wind, Waves, Moon, Sun,
  Heart, Anchor, Music, Baby, Feather, Cross, Skull, Crown,
  HandHeart, Bird, Leaf, Star, Drum, Mountain, Compass, Shield,
  TreePine, Droplets, Hammer, Swords, Ship, Trees, Cloud, Snowflake,
  Sparkle, Gem, Eye, Bone, Castle, Flower2, Cat,
  type LucideIcon,
} from "lucide-react";

// Catálogo de ícones disponíveis para escolher manualmente em categorias.
export const ICON_CATALOG: { key: string; Icon: LucideIcon; label: string }[] = [
  { key: "drum", Icon: Drum, label: "Tambor" },
  { key: "crown", Icon: Crown, label: "Coroa" },
  { key: "sword", Icon: Sword, label: "Espada" },
  { key: "swords", Icon: Swords, label: "Espadas" },
  { key: "shield", Icon: Shield, label: "Escudo" },
  { key: "crosshair", Icon: Crosshair, label: "Mira" },
  { key: "feather", Icon: Feather, label: "Pena" },
  { key: "bird", Icon: Bird, label: "Pássaro" },
  { key: "leaf", Icon: Leaf, label: "Folha" },
  { key: "tree", Icon: TreePine, label: "Pinheiro" },
  { key: "trees", Icon: Trees, label: "Mata" },
  { key: "flower", Icon: Flower2, label: "Flor" },
  { key: "mountain", Icon: Mountain, label: "Montanha" },
  { key: "waves", Icon: Waves, label: "Ondas" },
  { key: "droplets", Icon: Droplets, label: "Gotas" },
  { key: "wind", Icon: Wind, label: "Vento" },
  { key: "flame", Icon: Flame, label: "Chama" },
  { key: "zap", Icon: Zap, label: "Raio" },
  { key: "cloud", Icon: Cloud, label: "Nuvem" },
  { key: "snowflake", Icon: Snowflake, label: "Floco" },
  { key: "sun", Icon: Sun, label: "Sol" },
  { key: "moon", Icon: Moon, label: "Lua" },
  { key: "star", Icon: Star, label: "Estrela" },
  { key: "sparkle", Icon: Sparkle, label: "Brilho" },
  { key: "sparkles", Icon: Sparkles, label: "Brilhos" },
  { key: "gem", Icon: Gem, label: "Joia" },
  { key: "heart", Icon: Heart, label: "Coração" },
  { key: "handheart", Icon: HandHeart, label: "Mão+coração" },
  { key: "cross", Icon: Cross, label: "Cruz" },
  { key: "skull", Icon: Skull, label: "Caveira" },
  { key: "bone", Icon: Bone, label: "Osso" },
  { key: "eye", Icon: Eye, label: "Olho" },
  { key: "baby", Icon: Baby, label: "Bebê" },
  { key: "cat", Icon: Cat, label: "Gato" },
  { key: "music", Icon: Music, label: "Música" },
  { key: "anchor", Icon: Anchor, label: "Âncora" },
  { key: "ship", Icon: Ship, label: "Barco" },
  { key: "compass", Icon: Compass, label: "Bússola" },
  { key: "hammer", Icon: Hammer, label: "Martelo" },
  { key: "castle", Icon: Castle, label: "Castelo" },
];

const KEY_TO_ICON: Record<string, LucideIcon> = ICON_CATALOG.reduce(
  (acc, { key, Icon }) => ({ ...acc, [key]: Icon }),
  {} as Record<string, LucideIcon>
);

// Mapeamento por nome de categoria (fallback automático).
const NAME_MAP: Record<string, LucideIcon> = {
  "abertura": Sparkles, "esquenta": Flame,
  "orixás": Crown, "orixas": Crown,
  "guias de direita": HandHeart, "guias de esquerda": Flame,
  "exu": Skull, "ogum": Sword,
  "oxóssi": Crosshair, "oxossi": Crosshair,
  "xangô": Zap, "xango": Zap,
  "iansã": Wind, "iansa": Wind,
  "iemanjá": Waves, "iemanja": Waves,
  "oxum": Heart, "nanã": Moon, "nana": Moon,
  "omolu": Cross, "oxalá": Sun, "oxala": Sun,
  "caboclo": Feather,
  "preto-velho": Mountain, "preto velho": Mountain,
  "criança": Baby, "crianca": Baby,
  "boiadeiro": Compass, "marinheiro": Anchor,
  "baiano": Music, "pomba gira": Star, "exu mirim": Skull,
};

export function getCategoryIcon(nome: string): LucideIcon {
  const key = nome.trim().toLowerCase();
  return NAME_MAP[key] ?? Leaf;
}

// Resolve o ícone a partir do campo armazenado (chave) OU faz fallback pelo nome.
export function resolveIcon(stored: string | undefined, nome: string): LucideIcon {
  if (stored && KEY_TO_ICON[stored]) return KEY_TO_ICON[stored];
  return getCategoryIcon(nome);
}

export { Drum, Bird };
