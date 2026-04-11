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

export const categoriaTree: CategoriaNode[] = [
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

// Função para pegar o path completo: ex "Orixás/Exu"
export function getCategoriaPath(categoria: string, subcategoria: string): string {
  if (!subcategoria) return categoria;
  return `${categoria}/${subcategoria}`;
}

const STORAGE_KEY = "caderno-oga-pontos";

const defaultPontos: Ponto[] = [
  {
    id: "abertura-1",
    nome: "Abrindo os Trabalhos",
    categoria: "Abertura",
    subcategoria: "",
    letra: "ABRE-SE A RODA COM FÉ E AMOR\nNO TERREIRO DA UMBANDA\nSARAVÁ MEU PAI OXALÁ\nSARAVÁ TODA DEMANDA\n\nCOM LICENÇA DOS GUIAS\nPEÇO FORÇA E PROTEÇÃO\nQUE SE ABRA ESSA GIRA\nCOM PAZ NO CORAÇÃO",
    audio: "audio/abertura1.mp3",
  },
  {
    id: "esquenta-1",
    nome: "Esquenta Terreiro",
    categoria: "Esquenta",
    subcategoria: "",
    letra: "VAMOS ESQUENTAR O TERREIRO\nCOM FORÇA E COM AXÉ\nBATE O PONTO NO ATABAQUE\nQUE É HORA DE TRABALHAR\n\nGIRA GIRA GIRA\nGIRA COM FÉ\nO TERREIRO TÁ ESQUENTANDO\nCOM A FORÇA DO AXÉ",
    audio: "audio/esquenta1.mp3",
  },
  {
    id: "exu-orixa-1",
    nome: "Exu Tranca Rua",
    categoria: "Orixás",
    subcategoria: "Exu",
    letra: "EXU QUE É DONO DA RUA\nEXU QUE É DONO DA ENCRUZILHADA\nELE É TRANCA RUA\nÉ O DONO DA GIRA, É O DONO DA ESTRADA\n\nABRE OS CAMINHOS\nTRANCA RUA É O SENHOR\nNA ENCRUZILHADA ELE MORA\nCOM SUA CAPA E SEU BASTÃO",
    audio: "audio/exu1.mp3",
  },
  {
    id: "ogum-1",
    nome: "Ogum de Ronda",
    categoria: "Orixás",
    subcategoria: "Ogum",
    letra: "OGUM DE RONDA BATEU NA PORTA\nOGUM DE RONDA QUER ENTRAR\nELE É FILHO DE OGUM\nVEIO DE ARUANDA PRA TRABALHAR\n\nOGUM, OGUM, OGUM DE LEI\nDEFENDE OS FILHOS COM SUA ESPADA\nNA GUERRA ELE É REI\nNO TERREIRO É PROTEÇÃO SAGRADA",
    audio: "audio/ogum1.mp3",
  },
  {
    id: "oxossi-1",
    nome: "Oxóssi Caçador",
    categoria: "Orixás",
    subcategoria: "Oxóssi",
    letra: "OXÓSSI É CAÇADOR\nLÁ NA MATA ELE MORA\nCOM SEU ARCO E SUA FLECHA\nELE CAÇA A TODA HORA\n\nSALVE A MATA, SALVE A FLORESTA\nSALVE OXÓSSI, NOSSO PROTETOR\nNA MATA VIRGEM ELE REINA\nCOM TODO O SEU ESPLENDOR",
    audio: "audio/oxossi1.mp3",
  },
  {
    id: "xango-1",
    nome: "Xangô das Pedreiras",
    categoria: "Orixás",
    subcategoria: "Xangô",
    letra: "XANGÔ, XANGÔ DAS PEDREIRAS\nSUA JUSTIÇA NÃO TEM IGUAL\nCOM SUA BALANÇA NA MÃO\nJULGA O BEM E JULGA O MAL\n\nKAÔ KABECILÊ\nXANGÔ É REI LÁ DO OIÓ\nNA PEDREIRA ELE TRABALHA\nCOM TROVÃO E COM CALOR",
    audio: "audio/xango1.mp3",
  },
  {
    id: "iemanja-1",
    nome: "Iemanjá Rainha do Mar",
    categoria: "Orixás",
    subcategoria: "Iemanjá",
    letra: "IEMANJÁ, IEMANJÁ\nRAINHA DAS ONDAS, DONA DO MAR\nMÃE D'ÁGUA ABENÇOADA\nVEIO DE LONGE PRA NOS GUARDAR\n\nNAS ÁGUAS DO MAR SAGRADO\nELA TRAZ PAZ E PROTEÇÃO\nIEMANJÁ, MÃE QUERIDA\nABENÇOA SEUS FILHOS COM DEVOÇÃO",
    audio: "audio/iemanja1.mp3",
  },
  {
    id: "preto-velho-1",
    nome: "Pai Joaquim de Angola",
    categoria: "Guias de Direita",
    subcategoria: "Preto-Velho",
    letra: "PAI JOAQUIM DE ANGOLA\nVEIO DE ARUANDA PRA TRABALHAR\nCOM SEU CACHIMBO E SUA BENGALA\nVEIO NO TERREIRO NOS ABENÇOAR\n\nSARAVÁ, PAI JOAQUIM\nSEU POVO VEM LHE SAUDAR\nCOM TODA FÉ E CARINHO\nA UMBANDA VEM LHE LOUVAR",
    audio: "audio/preto-velho1.mp3",
  },
  {
    id: "pomba-gira-1",
    nome: "Pomba Gira Maria Padilha",
    categoria: "Guias de Esquerda",
    subcategoria: "Pomba Gira",
    letra: "MARIA PADILHA\nRAINHA DAS SETE ENCRUZILHADAS\nELA GIRA, ELA GIRA\nCOM SUA SAIA RODADA\n\nSARAVÁ POMBA GIRA\nSARAVÁ MARIA PADILHA\nNA ENCRUZILHADA ELA REINA\nCOM SUA FORÇA E SUA MAGIA",
    audio: "audio/pomba-gira1.mp3",
  },
  {
    id: "oxum-1",
    nome: "Oxum das Cachoeiras",
    categoria: "Orixás",
    subcategoria: "Oxum",
    letra: "OXUM, OXUM, MINHA MÃE\nDONA DA CACHOEIRA\nCOM SEU ESPELHO DOURADO\nÉ A RAINHA DAS ÁGUAS DOCES INTEIRA\n\nORA IÊ IÊ Ô\nORA IÊ IÊ Ô\nMAMÃE OXUM É OURO\nÉ BELEZA E É AMOR",
    audio: "audio/oxum1.mp3",
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
