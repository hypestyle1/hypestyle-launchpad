import type { Localized } from './types';

export type NosotrosContent = {
  heroKicker: string;
  heroTitle: string;
  heroText: string;
  originLabel: string;
  originTitle: string;
  originLead: string;
  originP2: string;
  /** Con `**Producto, contenido, comunidad.**` en negrita. */
  originP3: string;
  photoAlt: string;
  photoCaption: string;
  ideasLabel: string;
  ideasTitle: string;
  ideasText: string;
  ideas: { k: string; t: string; p: string }[];
  letterLabel: string;
  letterTitle: string;
  letterP1: string;
  letterP2: string;
  signatureOf: string;
  signAgain: string;
  ctaTitle: string;
  ctaText: string;
  ctaButton: string;
};

// Los nombres, apodos y roles del equipo (Founder & Creative, Content Manager…)
// no se traducen: son como en la tarjeta que va en cada pedido.
export const NOSOTROS: Localized<NosotrosContent> = {
  ES: {
    heroKicker: 'Buenos Aires — Est. 2018',
    heroTitle: 'De apuesta personal a construir nuestro propio camino.',
    heroText: 'Streetwear con identidad, cultura y concepto, hecho en Buenos Aires desde 2018.',
    originLabel: 'Origen',
    originTitle: 'Empezamos en 2018 como una apuesta personal.',
    originLead:
      'Hype nació en 2018, en pleno furor de la cultura hypebeast, cuando en Argentina casi no había marcas de streetwear. Arrancamos vendiendo online desde el primer día, sin local y sin estructura: con ganas de traer nuevos estilos al país.',
    originP2:
      'Los primeros dos años fueron a pulmón: contenido, boca a boca y presencia en la escena. En 2020 llegó el salto, gracias a colaboraciones con artistas y referentes de la cultura. Lo que era un proyecto personal pasó a ser un equipo.',
    originP3:
      'Hoy seguimos con la misma idea: hacer producto con identidad, contarlo con contenido propio y cuidar a la comunidad que se armó alrededor. **Producto, contenido, comunidad.** Y ustedes son la razón por la que seguimos acá.',
    photoAlt: 'El equipo de Hype en Buenos Aires',
    photoCaption: 'El equipo de Hype. Buenos Aires, 2026.',
    ideasLabel: 'Cómo pensamos',
    ideasTitle: 'La ropa es solo una excusa.',
    ideasText: 'Con cada pieza tratamos de dejar un mensaje. A veces más explícito, a veces menos. Por eso STYLE&CULTURE: el estilo y la cultura.',
    ideas: [
      { k: 'Inspiración', t: 'Miramos para afuera, no para adentro.', p: 'Nos inspira la escena internacional. Tratamos de crear nuestras propias tendencias antes que copiar lo que ya funciona.' },
      { k: 'Comunidad', t: 'Ustedes opinan antes de que produzcamos.', p: 'Muchas veces mostramos los diseños en Mejores Amigos antes de lanzarlos. Más de una vez esa reacción fue lo que llevó una idea a producción.' },
      { k: 'Identidad', t: 'Cada drop tiene su propia historia.', p: 'Un lanzamiento es un evento, no ropa de temporada. Cada colección tiene su concepto, su estética y su momento.' },
      { k: 'Compromiso', t: 'Nos hacemos cargo.', p: 'Todas las marcas tienen problemas: un envío demorado, un talle mandado mal. Lo importante es cómo lo resolvés. Siempre de frente y de la forma más práctica para vos.' },
    ],
    letterLabel: 'La misma carta que va en cada pedido',
    letterTitle: 'Gracias por ser parte.',
    letterP1: 'Cada prenda que creamos acá tiene historia, trabajo y sueños detrás. Gracias por confiar y ser parte de esta cultura que seguimos construyendo.',
    letterP2: 'Nos motiva verlos usar Hypestyle, leer sus mensajes, y sentir que estamos creciendo junto a ustedes.',
    signatureOf: 'Firma de',
    signAgain: 'Volver a firmar',
    ctaTitle: 'Subí tu historia con la prenda y etiquetanos',
    ctaText: 'Vas directo a Close Friends, donde te mostramos antes que nadie lo que viene, beneficios exclusivos y todo lo que pasa detrás.',
    ctaButton: 'Seguirnos en Instagram',
  },

  EN: {
    heroKicker: 'Buenos Aires — Est. 2018',
    heroTitle: 'From a personal bet to building our own path.',
    heroText: 'Streetwear with identity, culture and concept, made in Buenos Aires since 2018.',
    originLabel: 'Origin',
    originTitle: 'We started in 2018 as a personal bet.',
    originLead:
      'Hype was born in 2018, at the height of hypebeast culture, when there were almost no streetwear brands in Argentina. We started selling online from day one, with no store and no structure: just the drive to bring new styles to the country.',
    originP2:
      'The first two years were pure hustle: content, word of mouth and presence in the scene. In 2020 came the leap, thanks to collaborations with artists and cultural figures. What was a personal project became a team.',
    originP3:
      'Today we keep the same idea: make product with identity, tell it through our own content and look after the community that grew around it. **Product, content, community.** And you are the reason we are still here.',
    photoAlt: 'The Hype team in Buenos Aires',
    photoCaption: 'The Hype team. Buenos Aires, 2026.',
    ideasLabel: 'How we think',
    ideasTitle: 'Clothes are just an excuse.',
    ideasText: 'With every piece we try to leave a message. Sometimes more explicit, sometimes less. Hence STYLE&CULTURE: style and culture.',
    ideas: [
      { k: 'Inspiration', t: 'We look outward, not inward.', p: 'The international scene inspires us. We try to create our own trends rather than copy what already works.' },
      { k: 'Community', t: 'You weigh in before we produce.', p: 'We often show designs on Close Friends before launching them. More than once that reaction is what took an idea into production.' },
      { k: 'Identity', t: 'Every drop has its own story.', p: 'A release is an event, not seasonal clothing. Every collection has its concept, its aesthetic and its moment.' },
      { k: 'Commitment', t: 'We take responsibility.', p: 'Every brand has problems: a delayed shipment, a wrong size sent. What matters is how you solve it. Always upfront and in the most practical way for you.' },
    ],
    letterLabel: 'The same letter that goes in every order',
    letterTitle: 'Thank you for being part of it.',
    letterP1: 'Every garment we create here has history, work and dreams behind it. Thank you for trusting us and being part of this culture we keep building.',
    letterP2: 'Seeing you wear Hypestyle, reading your messages and feeling that we are growing alongside you is what drives us.',
    signatureOf: 'Signature of',
    signAgain: 'Sign again',
    ctaTitle: 'Post a story wearing the piece and tag us',
    ctaText: 'You go straight to Close Friends, where we show you what is coming before anyone else, exclusive perks and everything that happens behind the scenes.',
    ctaButton: 'Follow us on Instagram',
  },

  PT: {
    heroKicker: 'Buenos Aires — Est. 2018',
    heroTitle: 'De aposta pessoal a construir nosso próprio caminho.',
    heroText: 'Streetwear com identidade, cultura e conceito, feito em Buenos Aires desde 2018.',
    originLabel: 'Origem',
    originTitle: 'Começamos em 2018 como uma aposta pessoal.',
    originLead:
      'A Hype nasceu em 2018, no auge da cultura hypebeast, quando na Argentina quase não havia marcas de streetwear. Começamos vendendo online desde o primeiro dia, sem loja e sem estrutura: com vontade de trazer novos estilos para o país.',
    originP2:
      'Os dois primeiros anos foram na raça: conteúdo, boca a boca e presença na cena. Em 2020 veio o salto, graças a colaborações com artistas e referências da cultura. O que era um projeto pessoal virou uma equipe.',
    originP3:
      'Hoje seguimos com a mesma ideia: fazer produto com identidade, contá-lo com conteúdo próprio e cuidar da comunidade que se formou ao redor. **Produto, conteúdo, comunidade.** E vocês são a razão pela qual continuamos aqui.',
    photoAlt: 'A equipe da Hype em Buenos Aires',
    photoCaption: 'A equipe da Hype. Buenos Aires, 2026.',
    ideasLabel: 'Como pensamos',
    ideasTitle: 'A roupa é só uma desculpa.',
    ideasText: 'Com cada peça tentamos deixar uma mensagem. Às vezes mais explícita, às vezes menos. Por isso STYLE&CULTURE: o estilo e a cultura.',
    ideas: [
      { k: 'Inspiração', t: 'Olhamos para fora, não para dentro.', p: 'A cena internacional nos inspira. Tentamos criar nossas próprias tendências em vez de copiar o que já funciona.' },
      { k: 'Comunidade', t: 'Vocês opinam antes de a gente produzir.', p: 'Muitas vezes mostramos os designs no Melhores Amigos antes de lançar. Mais de uma vez essa reação foi o que levou uma ideia à produção.' },
      { k: 'Identidade', t: 'Cada drop tem sua própria história.', p: 'Um lançamento é um evento, não roupa de temporada. Cada coleção tem seu conceito, sua estética e seu momento.' },
      { k: 'Compromisso', t: 'Assumimos a responsabilidade.', p: 'Todas as marcas têm problemas: um envio atrasado, um tamanho enviado errado. O importante é como você resolve. Sempre de frente e da forma mais prática para você.' },
    ],
    letterLabel: 'A mesma carta que vai em cada pedido',
    letterTitle: 'Obrigado por fazer parte.',
    letterP1: 'Cada peça que criamos aqui tem história, trabalho e sonhos por trás. Obrigado por confiar e fazer parte desta cultura que seguimos construindo.',
    letterP2: 'Ver vocês usando Hypestyle, ler suas mensagens e sentir que estamos crescendo junto com vocês é o que nos motiva.',
    signatureOf: 'Assinatura de',
    signAgain: 'Assinar de novo',
    ctaTitle: 'Poste seu story com a peça e marque a gente',
    ctaText: 'Você vai direto para o Melhores Amigos, onde mostramos antes de todo mundo o que vem por aí, benefícios exclusivos e tudo o que acontece nos bastidores.',
    ctaButton: 'Siga-nos no Instagram',
  },

  DE: {
    heroKicker: 'Buenos Aires — Est. 2018',
    heroTitle: 'Von einer persönlichen Wette zum eigenen Weg.',
    heroText: 'Streetwear mit Identität, Kultur und Konzept, seit 2018 in Buenos Aires gemacht.',
    originLabel: 'Ursprung',
    originTitle: 'Wir haben 2018 als persönliche Wette angefangen.',
    originLead:
      'Hype entstand 2018, auf dem Höhepunkt der Hypebeast-Kultur, als es in Argentinien kaum Streetwear-Marken gab. Wir haben vom ersten Tag an online verkauft, ohne Laden und ohne Struktur: mit dem Wunsch, neue Styles ins Land zu bringen.',
    originP2:
      'Die ersten zwei Jahre liefen aus eigener Kraft: Content, Mundpropaganda und Präsenz in der Szene. 2020 kam der Sprung, dank Kollaborationen mit Künstlern und Größen der Kultur. Aus einem persönlichen Projekt wurde ein Team.',
    originP3:
      'Heute verfolgen wir dieselbe Idee: Produkte mit Identität machen, sie mit eigenem Content erzählen und die Community pflegen, die drumherum entstanden ist. **Produkt, Content, Community.** Und ihr seid der Grund, warum wir noch hier sind.',
    photoAlt: 'Das Hype-Team in Buenos Aires',
    photoCaption: 'Das Hype-Team. Buenos Aires, 2026.',
    ideasLabel: 'Wie wir denken',
    ideasTitle: 'Kleidung ist nur ein Vorwand.',
    ideasText: 'Mit jedem Teil versuchen wir, eine Botschaft zu hinterlassen. Mal deutlicher, mal weniger. Deshalb STYLE&CULTURE: Stil und Kultur.',
    ideas: [
      { k: 'Inspiration', t: 'Wir schauen nach außen, nicht nach innen.', p: 'Uns inspiriert die internationale Szene. Wir versuchen, eigene Trends zu setzen, statt zu kopieren, was schon funktioniert.' },
      { k: 'Community', t: 'Ihr gebt eure Meinung ab, bevor wir produzieren.', p: 'Oft zeigen wir Designs bei Close Friends, bevor wir sie launchen. Mehr als einmal war diese Reaktion der Grund, eine Idee in Produktion zu geben.' },
      { k: 'Identität', t: 'Jeder Drop hat seine eigene Geschichte.', p: 'Ein Release ist ein Event, keine Saisonware. Jede Kollektion hat ihr Konzept, ihre Ästhetik und ihren Moment.' },
      { k: 'Verantwortung', t: 'Wir stehen dafür gerade.', p: 'Jede Marke hat Probleme: eine verspätete Lieferung, eine falsch verschickte Größe. Entscheidend ist, wie man es löst. Immer offen und auf die für dich praktischste Art.' },
    ],
    letterLabel: 'Derselbe Brief, der in jeder Bestellung liegt',
    letterTitle: 'Danke, dass du dabei bist.',
    letterP1: 'Hinter jedem Kleidungsstück, das wir hier machen, stecken Geschichte, Arbeit und Träume. Danke für dein Vertrauen und dafür, Teil dieser Kultur zu sein, die wir weiter aufbauen.',
    letterP2: 'Euch in Hypestyle zu sehen, eure Nachrichten zu lesen und zu spüren, dass wir gemeinsam mit euch wachsen, ist das, was uns antreibt.',
    signatureOf: 'Unterschrift von',
    signAgain: 'Noch mal unterschreiben',
    ctaTitle: 'Poste eine Story mit dem Teil und markiere uns',
    ctaText: 'Du kommst direkt zu Close Friends, wo wir dir vor allen anderen zeigen, was kommt, plus exklusive Vorteile und alles, was hinter den Kulissen passiert.',
    ctaButton: 'Folge uns auf Instagram',
  },

  FR: {
    heroKicker: 'Buenos Aires — Est. 2018',
    heroTitle: "D'un pari personnel à la construction de notre propre chemin.",
    heroText: 'Du streetwear avec identité, culture et concept, fait à Buenos Aires depuis 2018.',
    originLabel: 'Origine',
    originTitle: 'Nous avons commencé en 2018 comme un pari personnel.',
    originLead:
      "Hype est née en 2018, en pleine fièvre de la culture hypebeast, quand il n'y avait presque aucune marque de streetwear en Argentine. Nous avons vendu en ligne dès le premier jour, sans boutique et sans structure : avec l'envie d'apporter de nouveaux styles au pays.",
    originP2:
      "Les deux premières années se sont faites à la force du poignet : contenu, bouche-à-oreille et présence dans la scène. En 2020 est venu le déclic, grâce à des collaborations avec des artistes et des figures de la culture. Ce qui était un projet personnel est devenu une équipe.",
    originP3:
      "Aujourd'hui, nous gardons la même idée : faire du produit avec une identité, le raconter avec notre propre contenu et prendre soin de la communauté qui s'est formée autour. **Produit, contenu, communauté.** Et vous êtes la raison pour laquelle nous sommes toujours là.",
    photoAlt: "L'équipe Hype à Buenos Aires",
    photoCaption: "L'équipe Hype. Buenos Aires, 2026.",
    ideasLabel: 'Notre façon de penser',
    ideasTitle: "Les vêtements ne sont qu'un prétexte.",
    ideasText: "Avec chaque pièce, nous essayons de laisser un message. Parfois plus explicite, parfois moins. D'où STYLE&CULTURE : le style et la culture.",
    ideas: [
      { k: 'Inspiration', t: "Nous regardons vers l'extérieur, pas vers l'intérieur.", p: "La scène internationale nous inspire. Nous essayons de créer nos propres tendances plutôt que de copier ce qui marche déjà." },
      { k: 'Communauté', t: 'Vous donnez votre avis avant que nous produisions.', p: "Nous montrons souvent les designs en Amis proches avant de les lancer. Plus d'une fois, cette réaction a mené une idée jusqu'à la production." },
      { k: 'Identité', t: 'Chaque drop a sa propre histoire.', p: "Un lancement est un événement, pas des vêtements de saison. Chaque collection a son concept, son esthétique et son moment." },
      { k: 'Engagement', t: 'Nous assumons.', p: "Toutes les marques ont des problèmes : une livraison en retard, une mauvaise taille envoyée. L'important, c'est comment on le résout. Toujours en face et de la façon la plus pratique pour toi." },
    ],
    letterLabel: 'La même lettre qui accompagne chaque commande',
    letterTitle: "Merci d'en faire partie.",
    letterP1: "Chaque vêtement que nous créons ici a une histoire, du travail et des rêves derrière lui. Merci de nous faire confiance et de faire partie de cette culture que nous continuons de construire.",
    letterP2: "Vous voir porter Hypestyle, lire vos messages et sentir que nous grandissons avec vous, c'est ce qui nous motive.",
    signatureOf: 'Signature de',
    signAgain: 'Signer à nouveau',
    ctaTitle: 'Publie ta story avec la pièce et identifie-nous',
    ctaText: "Tu passes directement en Amis proches, où nous te montrons avant tout le monde ce qui arrive, des avantages exclusifs et tout ce qui se passe en coulisses.",
    ctaButton: 'Nous suivre sur Instagram',
  },

  IT: {
    heroKicker: 'Buenos Aires — Est. 2018',
    heroTitle: 'Da scommessa personale a costruire la nostra strada.',
    heroText: 'Streetwear con identità, cultura e concetto, fatto a Buenos Aires dal 2018.',
    originLabel: 'Origine',
    originTitle: 'Abbiamo iniziato nel 2018 come una scommessa personale.',
    originLead:
      "Hype è nata nel 2018, in pieno boom della cultura hypebeast, quando in Argentina quasi non esistevano marchi di streetwear. Abbiamo iniziato a vendere online dal primo giorno, senza negozio e senza struttura: con la voglia di portare nuovi stili nel paese.",
    originP2:
      "I primi due anni sono stati tutti di fatica: contenuti, passaparola e presenza nella scena. Nel 2020 è arrivato il salto, grazie a collaborazioni con artisti e figure di riferimento della cultura. Quello che era un progetto personale è diventato un team.",
    originP3:
      "Oggi andiamo avanti con la stessa idea: fare prodotto con identità, raccontarlo con contenuti nostri e prenderci cura della community che si è creata intorno. **Prodotto, contenuti, community.** E voi siete il motivo per cui siamo ancora qui.",
    photoAlt: 'Il team di Hype a Buenos Aires',
    photoCaption: 'Il team di Hype. Buenos Aires, 2026.',
    ideasLabel: 'Come pensiamo',
    ideasTitle: 'I vestiti sono solo una scusa.',
    ideasText: 'Con ogni pezzo cerchiamo di lasciare un messaggio. A volte più esplicito, a volte meno. Per questo STYLE&CULTURE: lo stile e la cultura.',
    ideas: [
      { k: 'Ispirazione', t: "Guardiamo fuori, non dentro.", p: "Ci ispira la scena internazionale. Cerchiamo di creare le nostre tendenze invece di copiare quello che già funziona." },
      { k: 'Community', t: 'Voi dite la vostra prima che produciamo.', p: "Spesso mostriamo i design in Amici più stretti prima di lanciarli. Più di una volta quella reazione è stata ciò che ha portato un'idea in produzione." },
      { k: 'Identità', t: 'Ogni drop ha la sua storia.', p: "Un lancio è un evento, non abbigliamento di stagione. Ogni collezione ha il suo concetto, la sua estetica e il suo momento." },
      { k: 'Impegno', t: 'Ci prendiamo la responsabilità.', p: "Tutti i marchi hanno problemi: una spedizione in ritardo, una taglia sbagliata. L'importante è come lo risolvi. Sempre a viso aperto e nel modo più pratico per te." },
    ],
    letterLabel: 'La stessa lettera che va in ogni ordine',
    letterTitle: 'Grazie per farne parte.',
    letterP1: "Ogni capo che creiamo qui ha dietro storia, lavoro e sogni. Grazie per la fiducia e per far parte di questa cultura che continuiamo a costruire.",
    letterP2: "Vedervi indossare Hypestyle, leggere i vostri messaggi e sentire che stiamo crescendo insieme a voi è ciò che ci motiva.",
    signatureOf: 'Firma di',
    signAgain: 'Firma di nuovo',
    ctaTitle: 'Pubblica la tua storia con il capo e taggaci',
    ctaText: "Vai dritto negli Amici più stretti, dove ti mostriamo prima di tutti quello che arriva, vantaggi esclusivi e tutto quello che succede dietro le quinte.",
    ctaButton: 'Seguici su Instagram',
  },
};
