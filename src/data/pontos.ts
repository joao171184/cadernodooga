export interface Ponto {
  id: string;
  nome: string;
  categoria: string;
  subcategoria: string;
  letra: string;
  audio: string;
}

// Estrutura de categorias com pastas e subpastas
export interface CategoriaNode {
  nome: string;
  emoji: string;
  filhos?: CategoriaNode[];
}

export const defaultCategoriaTree: CategoriaNode[] = [
  { nome: "Abertura", emoji: "🕊️" },
  { nome: "Esquenta", emoji: "🔥" },
  {
    nome: "Orixás",
    emoji: "⚡",
    filhos: [
      { nome: "Exu", emoji: "🔱" },
      { nome: "Ogum", emoji: "⚔️" },
      { nome: "Oxóssi", emoji: "🏹" },
      { nome: "Xangô", emoji: "⚡" },
      { nome: "Iansã", emoji: "🌪️" },
      { nome: "Iemanjá", emoji: "🌊" },
      { nome: "Oxum", emoji: "🪞" },
      { nome: "Nanã", emoji: "🌙" },
      { nome: "Omolu", emoji: "🩹" },
      { nome: "Oxalá", emoji: "☀️" },
    ],
  },
  {
    nome: "Guias de Direita",
    emoji: "🙏",
    filhos: [
      { nome: "Caboclo", emoji: "🪶" },
      { nome: "Preto-Velho", emoji: "🕯️" },
      { nome: "Criança", emoji: "🧸" },
      { nome: "Boiadeiro", emoji: "🤠" },
      { nome: "Marinheiro", emoji: "⚓" },
      { nome: "Baiano", emoji: "🎶" },
    ],
  },
  {
    nome: "Guias de Esquerda",
    emoji: "🔥",
    filhos: [
      { nome: "Exu", emoji: "🔱" },
      { nome: "Pomba Gira", emoji: "🌹" },
      { nome: "Exu Mirim", emoji: "😈" },
    ],
  },
];

const CATEGORIAS_KEY = "caderno-oga-categorias";

export function loadCategorias(): CategoriaNode[] {
  try {
    const saved = localStorage.getItem(CATEGORIAS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return JSON.parse(JSON.stringify(defaultCategoriaTree));
}

export function saveCategorias(tree: CategoriaNode[]) {
  localStorage.setItem(CATEGORIAS_KEY, JSON.stringify(tree));
}

// Compat: mantida para imports antigos (snapshot do default)
export const categoriaTree = defaultCategoriaTree;

export function getCategoriaPath(categoria: string, subcategoria: string): string {
  if (!subcategoria) return categoria;
  return `${categoria}/${subcategoria}`;
}

const STORAGE_KEY = "caderno-oga-pontos";

const defaultPontos: Ponto[] = [
  {
    id: "abertura-1",
    nome: "Abertura de Trabalhos",
    categoria: "Abertura",
    subcategoria: "",
    letra: "ABRE-SE A GIRA COM FÉ\nNO TERREIRO DE UMBANDA\nSARAVÁ MEU PAI OXALÁ\nE TODA A SUA DEMANDA",
    audio: "",
  },
  {
    id: "esquenta-1",
    nome: "Esquenta de Atabaque",
    categoria: "Esquenta",
    subcategoria: "",
    letra: "BATE O ATABAQUE COM AXÉ\nA GIRA VAI COMEÇAR\nCOM A FORÇA DOS GUIAS\nVAMOS TRABALHAR",
    audio: "",
  },
];

export function loadPontos(): Ponto[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [...defaultPontos];
}

export function savePontos(pontos: Ponto[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pontos));
}
