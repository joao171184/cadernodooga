export interface Ponto {
  id: string;
  nome: string;
  categoria: string;
  letra: string;
  audio: string;
}

export const pontos: Ponto[] = [
  {
    id: "exu-1",
    nome: "Exu Tranca Rua",
    categoria: "Exu",
    letra: `Exu que é dono da rua\nExu que é dono da encruzilhada\nEle é Tranca Rua\nÉ o dono da gira, é o dono da estrada\n\nAbre os caminhos\nTranca Rua é o senhor\nNa encruzilhada ele mora\nCom sua capa e seu bastão`,
    audio: "audio/exu1.mp3",
  },
  {
    id: "ogum-1",
    nome: "Ogum de Ronda",
    categoria: "Ogum",
    letra: `Ogum de ronda bateu na porta\nOgum de ronda quer entrar\nEle é filho de Ogum\nVeio de Aruanda pra trabalhar\n\nOgum, Ogum, Ogum de lei\nDefende os filhos com sua espada\nNa guerra ele é rei\nNo terreiro é proteção sagrada`,
    audio: "audio/ogum1.mp3",
  },
  {
    id: "oxossi-1",
    nome: "Oxóssi Caçador",
    categoria: "Oxóssi",
    letra: `Oxóssi é caçador\nLá na mata ele mora\nCom seu arco e sua flecha\nEle caça a toda hora\n\nSalve a mata, salve a floresta\nSalve Oxóssi, nosso protetor\nNa mata virgem ele reina\nCom todo o seu esplendor`,
    audio: "audio/oxossi1.mp3",
  },
  {
    id: "xango-1",
    nome: "Xangô das Pedreiras",
    categoria: "Xangô",
    letra: `Xangô, Xangô das pedreiras\nSua justiça não tem igual\nCom sua balança na mão\nJulga o bem e julga o mal\n\nKaô Kabecilê\nXangô é rei lá do Oió\nNa pedreira ele trabalha\nCom trovão e com calor`,
    audio: "audio/xango1.mp3",
  },
  {
    id: "iemanja-1",
    nome: "Iemanjá Rainha do Mar",
    categoria: "Iemanjá",
    letra: `Iemanjá, Iemanjá\nRainha das ondas, dona do mar\nMãe d'água abençoada\nVeio de longe pra nos guardar\n\nNas águas do mar sagrado\nEla traz paz e proteção\nIemanjá, mãe querida\nAbençoa seus filhos com devoção`,
    audio: "audio/iemanja1.mp3",
  },
  {
    id: "preto-velho-1",
    nome: "Pai Joaquim de Angola",
    categoria: "Preto-Velho",
    letra: `Pai Joaquim de Angola\nVeio de Aruanda pra trabalhar\nCom seu cachimbo e sua bengala\nVeio no terreiro nos abençoar\n\nSaravá, Pai Joaquim\nSeu povo vem lhe saudar\nCom toda fé e carinho\nA umbanda vem lhe louvar`,
    audio: "audio/preto-velho1.mp3",
  },
  {
    id: "oxum-1",
    nome: "Oxum das Cachoeiras",
    categoria: "Oxum",
    letra: `Oxum, Oxum, minha mãe\nDona da cachoeira\nCom seu espelho dourado\nÉ a rainha das águas doces inteira\n\nOra iê iê ô\nOra iê iê ô\nMamãe Oxum é ouro\nÉ beleza e é amor`,
    audio: "audio/oxum1.mp3",
  },
];
