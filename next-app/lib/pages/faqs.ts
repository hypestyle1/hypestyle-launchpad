import type { Localized } from './types';

export type FaqCategory = { category: string; items: { q: string; a: string }[] };

export type FaqsContent = {
  heroLabel: string;
  heroTitle: string;
  categories: FaqCategory[];
  ctaQuestion: string;
  ctaButton: string;
};

export const FAQS: Localized<FaqsContent> = {
  ES: {
    heroLabel: 'Ayuda',
    heroTitle: 'FAQs',
    categories: [
      {
        category: 'Pedidos & Pagos',
        items: [
          { q: '¿Cómo hago un pedido?', a: 'Elegí tu producto, seleccioná talle y color, y agregalo al carrito. Luego completá los datos de envío y elegí tu método de pago.' },
          { q: '¿Qué métodos de pago aceptan?', a: 'Aceptamos transferencia bancaria (con 10% de descuento), MercadoPago y tarjetas de crédito/débito.' },
          { q: '¿Cuándo se confirma mi pedido?', a: 'Una vez acreditado el pago, te confirmamos el pedido por WhatsApp o email dentro de las 24 hs.' },
        ],
      },
      {
        category: 'Envíos',
        items: [
          { q: '¿Cuánto tarda el envío dentro de Argentina?', a: 'Entre 3 y 7 días hábiles dependiendo de la provincia. CABA y GBA suelen ser más rápidos.' },
          { q: '¿Hacen envíos internacionales?', a: 'Sí, enviamos a todo el mundo. Consultá los tiempos y costos en nuestra página de Envíos Internacionales.' },
          { q: '¿Puedo rastrear mi pedido?', a: 'Sí. Una vez despachado te mandamos el número de seguimiento por WhatsApp.' },
        ],
      },
      {
        category: 'Productos & Talles',
        items: [
          { q: '¿Cómo sé qué talle elegir?', a: 'Cada producto tiene una guía de talles en la página de producto. Si tenés dudas, escribinos por WhatsApp.' },
          { q: '¿Los productos son limitados?', a: 'Sí. Lanzamos drops con stock limitado. Una vez agotado un talle, no se repone hasta el próximo drop.' },
          { q: '¿Cómo cuido mis prendas?', a: 'Lavado a mano o máquina en frío, del revés. No usar secadora. Ver las instrucciones de cuidado específicas en cada producto.' },
        ],
      },
      {
        category: 'Devoluciones & Cambios',
        items: [
          { q: '¿Puedo cambiar mi pedido?', a: 'Aceptamos cambios por talle dentro de los 30 días corridos desde la compra, siempre que la prenda esté sin uso y con etiquetas y haya stock del talle nuevo. Escribinos por WhatsApp o Instagram con tu número de pedido. Consultá nuestra política de cambios.' },
          { q: '¿Qué hago si recibí un producto defectuoso?', a: 'Escribinos de inmediato a nuestro WhatsApp o Instagram con fotos del problema. Lo resolvemos.' },
        ],
      },
    ],
    ctaQuestion: '¿No encontrás lo que buscás?',
    ctaButton: 'Contactanos',
  },

  EN: {
    heroLabel: 'Help',
    heroTitle: 'FAQs',
    categories: [
      {
        category: 'Orders & Payments',
        items: [
          { q: 'How do I place an order?', a: 'Pick your product, choose size and colour, and add it to the cart. Then fill in your shipping details and choose a payment method.' },
          { q: 'Which payment methods do you accept?', a: 'We accept bank transfer (with a 10% discount), MercadoPago and credit/debit cards.' },
          { q: 'When is my order confirmed?', a: 'Once the payment clears, we confirm your order by WhatsApp or email within 24 hours.' },
        ],
      },
      {
        category: 'Shipping',
        items: [
          { q: 'How long does shipping take within Argentina?', a: 'Between 3 and 7 business days depending on the province. Buenos Aires City and Greater Buenos Aires are usually faster.' },
          { q: 'Do you ship internationally?', a: 'Yes, we ship worldwide. Check delivery times and costs on our International Shipping page.' },
          { q: 'Can I track my order?', a: 'Yes. Once it ships, we send you the tracking number by WhatsApp.' },
        ],
      },
      {
        category: 'Products & Sizes',
        items: [
          { q: 'How do I know which size to choose?', a: 'Every product has a size guide on its page. If in doubt, message us on WhatsApp.' },
          { q: 'Are the products limited?', a: 'Yes. We release drops with limited stock. Once a size sells out, it is not restocked until the next drop.' },
          { q: 'How do I care for my garments?', a: 'Hand or machine wash cold, inside out. Do not tumble dry. See the specific care instructions on each product.' },
        ],
      },
      {
        category: 'Returns & Exchanges',
        items: [
          { q: 'Can I exchange my order?', a: 'We accept size exchanges within 30 calendar days of purchase, as long as the item is unworn with its tags and the new size is in stock. Message us on WhatsApp or Instagram with your order number. See our exchange policy.' },
          { q: 'What if I received a faulty product?', a: 'Message us right away on WhatsApp or Instagram with photos of the problem. We will sort it out.' },
        ],
      },
    ],
    ctaQuestion: "Can't find what you're looking for?",
    ctaButton: 'Contact us',
  },

  PT: {
    heroLabel: 'Ajuda',
    heroTitle: 'FAQs',
    categories: [
      {
        category: 'Pedidos & Pagamentos',
        items: [
          { q: 'Como faço um pedido?', a: 'Escolha o produto, selecione tamanho e cor e adicione ao carrinho. Depois preencha os dados de envio e escolha a forma de pagamento.' },
          { q: 'Quais formas de pagamento vocês aceitam?', a: 'Aceitamos transferência bancária (com 10% de desconto), MercadoPago e cartões de crédito/débito.' },
          { q: 'Quando meu pedido é confirmado?', a: 'Assim que o pagamento é creditado, confirmamos o pedido por WhatsApp ou e-mail em até 24 h.' },
        ],
      },
      {
        category: 'Envios',
        items: [
          { q: 'Quanto demora o envio dentro da Argentina?', a: 'Entre 3 e 7 dias úteis dependendo da província. Buenos Aires (CABA) e a Grande Buenos Aires costumam ser mais rápidos.' },
          { q: 'Vocês fazem envios internacionais?', a: 'Sim, enviamos para o mundo todo. Consulte prazos e custos na nossa página de Envios Internacionais.' },
          { q: 'Posso rastrear meu pedido?', a: 'Sim. Assim que despachado, enviamos o código de rastreio por WhatsApp.' },
        ],
      },
      {
        category: 'Produtos & Tamanhos',
        items: [
          { q: 'Como sei qual tamanho escolher?', a: 'Cada produto tem uma guia de tamanhos na página do produto. Se tiver dúvidas, fale conosco pelo WhatsApp.' },
          { q: 'Os produtos são limitados?', a: 'Sim. Lançamos drops com estoque limitado. Quando um tamanho esgota, não é reposto até o próximo drop.' },
          { q: 'Como cuido das minhas peças?', a: 'Lavar à mão ou na máquina com água fria, do avesso. Não usar secadora. Veja as instruções de cuidado específicas em cada produto.' },
        ],
      },
      {
        category: 'Devoluções & Trocas',
        items: [
          { q: 'Posso trocar meu pedido?', a: 'Aceitamos trocas por tamanho em até 30 dias corridos da compra, desde que a peça esteja sem uso, com etiquetas e haja estoque do tamanho novo. Escreva pelo WhatsApp ou Instagram com o número do pedido. Consulte nossa política de trocas.' },
          { q: 'O que faço se recebi um produto com defeito?', a: 'Escreva imediatamente pelo nosso WhatsApp ou Instagram com fotos do problema. Nós resolvemos.' },
        ],
      },
    ],
    ctaQuestion: 'Não encontrou o que procura?',
    ctaButton: 'Fale conosco',
  },

  DE: {
    heroLabel: 'Hilfe',
    heroTitle: 'FAQs',
    categories: [
      {
        category: 'Bestellungen & Zahlung',
        items: [
          { q: 'Wie gebe ich eine Bestellung auf?', a: 'Wähle dein Produkt, Größe und Farbe und leg es in den Warenkorb. Dann gibst du deine Versanddaten ein und wählst die Zahlungsart.' },
          { q: 'Welche Zahlungsarten akzeptiert ihr?', a: 'Wir akzeptieren Banküberweisung (mit 10 % Rabatt), MercadoPago sowie Kredit- und Debitkarten.' },
          { q: 'Wann wird meine Bestellung bestätigt?', a: 'Sobald die Zahlung eingegangen ist, bestätigen wir deine Bestellung innerhalb von 24 Stunden per WhatsApp oder E-Mail.' },
        ],
      },
      {
        category: 'Versand',
        items: [
          { q: 'Wie lange dauert der Versand innerhalb Argentiniens?', a: 'Je nach Provinz 3 bis 7 Werktage. Buenos Aires Stadt und Umland gehen meist schneller.' },
          { q: 'Versendet ihr international?', a: 'Ja, wir versenden weltweit. Lieferzeiten und Kosten findest du auf unserer Seite zum internationalen Versand.' },
          { q: 'Kann ich meine Bestellung verfolgen?', a: 'Ja. Sobald sie verschickt ist, senden wir dir die Sendungsnummer per WhatsApp.' },
        ],
      },
      {
        category: 'Produkte & Größen',
        items: [
          { q: 'Woher weiß ich, welche Größe ich nehmen soll?', a: 'Jedes Produkt hat eine Größentabelle auf seiner Seite. Bei Zweifeln schreib uns per WhatsApp.' },
          { q: 'Sind die Produkte limitiert?', a: 'Ja. Wir veröffentlichen Drops mit begrenztem Bestand. Ist eine Größe ausverkauft, wird sie bis zum nächsten Drop nicht nachproduziert.' },
          { q: 'Wie pflege ich meine Kleidung?', a: 'Hand- oder Maschinenwäsche kalt, auf links. Nicht in den Trockner. Die genauen Pflegehinweise stehen bei jedem Produkt.' },
        ],
      },
      {
        category: 'Rückgabe & Umtausch',
        items: [
          { q: 'Kann ich meine Bestellung umtauschen?', a: 'Wir akzeptieren Größenumtausch innerhalb von 30 Kalendertagen nach dem Kauf, sofern der Artikel ungetragen und mit Etiketten ist und die neue Größe auf Lager ist. Schreib uns per WhatsApp oder Instagram mit deiner Bestellnummer. Siehe unsere Umtauschbedingungen.' },
          { q: 'Was mache ich, wenn ich ein fehlerhaftes Produkt erhalten habe?', a: 'Schreib uns sofort per WhatsApp oder Instagram mit Fotos des Problems. Wir lösen das.' },
        ],
      },
    ],
    ctaQuestion: 'Nicht gefunden, was du suchst?',
    ctaButton: 'Kontaktiere uns',
  },

  FR: {
    heroLabel: 'Aide',
    heroTitle: 'FAQs',
    categories: [
      {
        category: 'Commandes & Paiements',
        items: [
          { q: 'Comment passer une commande ?', a: 'Choisis ton produit, sélectionne la taille et la couleur, puis ajoute-le au panier. Ensuite, complète tes informations de livraison et choisis ton moyen de paiement.' },
          { q: 'Quels moyens de paiement acceptez-vous ?', a: 'Nous acceptons le virement bancaire (avec 10 % de remise), MercadoPago et les cartes de crédit/débit.' },
          { q: 'Quand ma commande est-elle confirmée ?', a: "Une fois le paiement reçu, nous confirmons ta commande par WhatsApp ou e-mail sous 24 h." },
        ],
      },
      {
        category: 'Livraison',
        items: [
          { q: 'Combien de temps prend la livraison en Argentine ?', a: 'Entre 3 et 7 jours ouvrés selon la province. Buenos Aires et sa banlieue sont généralement plus rapides.' },
          { q: "Livrez-vous à l'international ?", a: 'Oui, nous livrons dans le monde entier. Consulte les délais et les coûts sur notre page Livraison internationale.' },
          { q: 'Puis-je suivre ma commande ?', a: "Oui. Une fois expédiée, nous t'envoyons le numéro de suivi par WhatsApp." },
        ],
      },
      {
        category: 'Produits & Tailles',
        items: [
          { q: 'Comment savoir quelle taille choisir ?', a: 'Chaque produit a un guide des tailles sur sa page. En cas de doute, écris-nous sur WhatsApp.' },
          { q: 'Les produits sont-ils limités ?', a: "Oui. Nous lançons des drops en stock limité. Une fois une taille épuisée, elle n'est pas réassortie avant le prochain drop." },
          { q: "Comment entretenir mes vêtements ?", a: "Lavage à la main ou en machine à froid, à l'envers. Pas de sèche-linge. Voir les instructions d'entretien spécifiques sur chaque produit." },
        ],
      },
      {
        category: 'Retours & Échanges',
        items: [
          { q: 'Puis-je échanger ma commande ?', a: "Nous acceptons les échanges de taille dans les 30 jours calendaires suivant l'achat, à condition que l'article soit non porté, avec ses étiquettes, et que la nouvelle taille soit en stock. Écris-nous sur WhatsApp ou Instagram avec ton numéro de commande. Consulte notre politique d'échanges." },
          { q: "Que faire si j'ai reçu un produit défectueux ?", a: 'Écris-nous immédiatement sur WhatsApp ou Instagram avec des photos du problème. Nous réglons ça.' },
        ],
      },
    ],
    ctaQuestion: 'Tu ne trouves pas ce que tu cherches ?',
    ctaButton: 'Contacte-nous',
  },

  IT: {
    heroLabel: 'Aiuto',
    heroTitle: 'FAQs',
    categories: [
      {
        category: 'Ordini & Pagamenti',
        items: [
          { q: 'Come faccio un ordine?', a: 'Scegli il prodotto, seleziona taglia e colore e aggiungilo al carrello. Poi completa i dati di spedizione e scegli il metodo di pagamento.' },
          { q: 'Quali metodi di pagamento accettate?', a: 'Accettiamo bonifico bancario (con il 10% di sconto), MercadoPago e carte di credito/debito.' },
          { q: 'Quando viene confermato il mio ordine?', a: 'Una volta accreditato il pagamento, confermiamo l\'ordine via WhatsApp o e-mail entro 24 ore.' },
        ],
      },
      {
        category: 'Spedizioni',
        items: [
          { q: 'Quanto ci mette la spedizione in Argentina?', a: 'Tra 3 e 7 giorni lavorativi a seconda della provincia. Buenos Aires città e area metropolitana di solito sono più veloci.' },
          { q: 'Spedite all\'estero?', a: 'Sì, spediamo in tutto il mondo. Controlla tempi e costi nella nostra pagina Spedizioni internazionali.' },
          { q: 'Posso tracciare il mio ordine?', a: 'Sì. Una volta spedito, ti mandiamo il numero di tracciamento via WhatsApp.' },
        ],
      },
      {
        category: 'Prodotti & Taglie',
        items: [
          { q: 'Come faccio a sapere quale taglia scegliere?', a: 'Ogni prodotto ha una guida alle taglie nella sua pagina. In caso di dubbi, scrivici su WhatsApp.' },
          { q: 'I prodotti sono limitati?', a: 'Sì. Lanciamo drop con stock limitato. Quando una taglia si esaurisce, non viene riassortita fino al drop successivo.' },
          { q: 'Come mi prendo cura dei capi?', a: 'Lavaggio a mano o in lavatrice a freddo, al rovescio. Non usare l\'asciugatrice. Vedi le istruzioni di cura specifiche di ogni prodotto.' },
        ],
      },
      {
        category: 'Resi & Cambi',
        items: [
          { q: 'Posso cambiare il mio ordine?', a: 'Accettiamo cambi di taglia entro 30 giorni di calendario dall\'acquisto, purché il capo sia mai indossato, con le etichette, e la nuova taglia sia disponibile. Scrivici su WhatsApp o Instagram con il numero dell\'ordine. Consulta la nostra politica sui cambi.' },
          { q: 'Cosa faccio se ho ricevuto un prodotto difettoso?', a: 'Scrivici subito su WhatsApp o Instagram con le foto del problema. Lo risolviamo.' },
        ],
      },
    ],
    ctaQuestion: 'Non trovi quello che cerchi?',
    ctaButton: 'Contattaci',
  },
};
