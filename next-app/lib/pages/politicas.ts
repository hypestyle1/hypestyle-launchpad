import type { Localized, Section } from './types';

export type PoliticasContent = {
  heroTitle: string;
  heroText: string;
  sections: Section[];
  acceptanceLabel: string;
  acceptanceText: string;
  ctaQuestion: string;
  ctaButton: string;
};

const WA = 'https://wa.me/5491178292430';
const IG = 'https://instagram.com/hypestylearg';

export const POLITICAS: Localized<PoliticasContent> = {
  ES: {
    heroTitle: 'Políticas de cambios, devoluciones y envíos',
    heroText:
      'En HYPESTYLE® trabajamos para que cada pedido llegue correctamente desde el primer envío. A continuación detallamos nuestras políticas de cambios, devoluciones y envíos. Te pedimos que las leas atentamente antes de realizar tu compra.',
    sections: [
      {
        title: '¿Cómo solicitar un cambio?',
        blocks: [
          { ol: [
            'Escribinos por WhatsApp o Instagram con tu número de pedido y el producto que querés cambiar.',
            'Te confirmamos si hay stock del talle nuevo y lo reservamos.',
            'Generamos la etiqueta de Andreani y te despachamos el talle nuevo. El cambio se hace en el momento: cuando lo recibís, entregás ahí mismo el paquete con la prenda a cambiar. El envío corre por tu cuenta y te pasamos el monto exacto antes de confirmar.',
            'Si estás en CABA o alrededores, también podemos coordinar el cambio con una moto.',
          ] },
          { p: 'No tenemos local ni showroom: la venta y los cambios son únicamente online.' },
        ],
      },
      {
        title: 'Producto con falla o error nuestro',
        blocks: [
          { p: 'Si el producto presenta una falla de fabricación, o te enviamos un talle o producto distinto al que pediste, el cambio se realiza sin costo para vos.' },
          { p: 'Para gestionar el cambio, contactanos por WhatsApp o Instagram con fotos o videos que muestren claramente el defecto o el error. Nosotros nos encargamos del retiro y del envío del producto de reemplazo.' },
        ],
      },
      {
        title: 'Cambios por talle',
        blocks: [
          { p: 'Los cambios por talle aplican únicamente para el mismo producto y están sujetos a disponibilidad de stock.' },
          { p: 'El artículo debe ser devuelto en perfectas condiciones: sin uso, sin manchas, sin olores, con todas sus etiquetas y en su empaque original.' },
          { p: 'Cuando el cambio es por una elección de talle del comprador, los costos de envío del cambio (Andreani o moto) corren por su cuenta. Si el error fue nuestro o la prenda tiene falla, el cambio es sin costo.', strong: true },
        ],
      },
      {
        title: 'Productos en Sale / Outlet / Promociones',
        blocks: [
          { p: 'Los productos adquiridos en SALE, OUTLET o con descuentos especiales **no tienen cambio ni devolución**, salvo por falla de fabricación comprobable.' },
        ],
      },
      {
        title: 'Drops limitados y ediciones especiales',
        blocks: [
          { p: 'Los drops limitados y ediciones especiales no tienen garantía de reposición.' },
          { p: 'No aplica cambio ni devolución, excepto en caso de defectos de fabricación.' },
        ],
      },
      {
        title: 'Variaciones de medidas',
        blocks: [
          { p: 'Las prendas pueden presentar variaciones de 1 a 2 cm respecto a la tabla de talles, propias del proceso de confección. Estas variaciones no son consideradas falla de fabricación.' },
        ],
      },
      {
        title: 'Condiciones del producto',
        blocks: [
          { p: 'Para que un cambio sea aceptado, el producto debe cumplir todas estas condiciones:' },
          { ul: ['Sin uso ni desgaste visible', 'Sin manchas ni olores', 'Con todas sus etiquetas originales', 'En su empaque original'] },
        ],
      },
      {
        title: 'Plazos',
        blocks: [
          { p: 'Tenés hasta **30 días corridos** desde la fecha de compra para solicitar un cambio. Pasado ese plazo no se aceptarán solicitudes.' },
        ],
      },
      {
        title: 'Entregas no concretadas / Reenvíos',
        blocks: [
          { p: 'Si el envío no pudo concretarse por dirección incorrecta o ausencia del destinatario, el costo del segundo intento de envío corre por cuenta del cliente.' },
        ],
      },
      {
        title: 'Costos no reembolsables',
        blocks: [
          { p: 'Los gastos de envío originales no se devuelven bajo ningún concepto, independientemente del motivo del cambio.' },
        ],
      },
      {
        title: 'Canales oficiales de atención',
        blocks: [
          { p: 'Toda consulta o gestión debe realizarse exclusivamente a través de nuestros canales oficiales. Las cuentas personales de los integrantes del equipo no son canales válidos de atención.' },
          { p: `Canales oficiales: [WhatsApp](${WA}) e Instagram [@hypestylearg](${IG}).` },
        ],
      },
      {
        title: 'Sobre devoluciones de dinero',
        blocks: [
          { p: 'Actualmente no realizamos devoluciones de dinero. Todos los casos se resuelven mediante cambio de producto.' },
        ],
      },
    ],
    acceptanceLabel: 'Aceptación de políticas',
    acceptanceText:
      'Al realizar una compra en HYPESTYLE®, el cliente declara haber leído y aceptado todas las políticas de cambios, devoluciones y envíos aquí detalladas.',
    ctaQuestion: '¿Tenés una consulta puntual?',
    ctaButton: 'Contactarnos por Instagram',
  },

  EN: {
    heroTitle: 'Exchange, return and shipping policies',
    heroText:
      'At HYPESTYLE® we work so that every order arrives right the first time. Below are our exchange, return and shipping policies. Please read them carefully before placing your order.',
    sections: [
      {
        title: 'How do I request an exchange?',
        blocks: [
          { ol: [
            'Message us on WhatsApp or Instagram with your order number and the item you want to exchange.',
            'We confirm whether the new size is in stock and reserve it for you.',
            'We generate the Andreani label and ship the new size. The exchange happens on the spot: when you receive it, you hand over the package with the item you are returning. Shipping is at your expense, and we send you the exact amount before confirming.',
            'If you are in Buenos Aires City or nearby, we can also arrange the exchange by courier.',
          ] },
          { p: 'We have no store or showroom: sales and exchanges are online only.' },
        ],
      },
      {
        title: 'Faulty product or our mistake',
        blocks: [
          { p: 'If the product has a manufacturing defect, or we sent you a different size or item than the one you ordered, the exchange is free of charge.' },
          { p: 'To arrange it, contact us on WhatsApp or Instagram with photos or videos that clearly show the defect or the mistake. We take care of the pickup and of shipping the replacement.' },
        ],
      },
      {
        title: 'Size exchanges',
        blocks: [
          { p: 'Size exchanges apply only to the same product and are subject to stock availability.' },
          { p: 'The item must be returned in perfect condition: unworn, with no stains or odours, with all its tags and in its original packaging.' },
          { p: "When the exchange is due to the buyer's size choice, the shipping costs of the exchange (Andreani or courier) are at the buyer's expense. If the mistake was ours or the item is faulty, the exchange is free.", strong: true },
        ],
      },
      {
        title: 'Sale / Outlet / Promotional items',
        blocks: [
          { p: 'Items bought on SALE, OUTLET or with special discounts **cannot be exchanged or returned**, except for a verifiable manufacturing defect.' },
        ],
      },
      {
        title: 'Limited drops and special editions',
        blocks: [
          { p: 'Limited drops and special editions have no restock guarantee.' },
          { p: 'No exchanges or returns apply, except in the case of manufacturing defects.' },
        ],
      },
      {
        title: 'Measurement variations',
        blocks: [
          { p: 'Garments may vary by 1 to 2 cm from the size chart, which is inherent to the manufacturing process. These variations are not considered a manufacturing defect.' },
        ],
      },
      {
        title: 'Product conditions',
        blocks: [
          { p: 'For an exchange to be accepted, the product must meet all of these conditions:' },
          { ul: ['Unworn, with no visible wear', 'No stains or odours', 'With all its original tags', 'In its original packaging'] },
        ],
      },
      {
        title: 'Time limits',
        blocks: [
          { p: 'You have up to **30 calendar days** from the purchase date to request an exchange. Requests after that period will not be accepted.' },
        ],
      },
      {
        title: 'Failed deliveries / Reshipments',
        blocks: [
          { p: "If the delivery could not be completed due to an incorrect address or the recipient being absent, the cost of the second delivery attempt is at the customer's expense." },
        ],
      },
      {
        title: 'Non-refundable costs',
        blocks: [
          { p: 'The original shipping costs are never refunded, regardless of the reason for the exchange.' },
        ],
      },
      {
        title: 'Official support channels',
        blocks: [
          { p: "All enquiries and requests must go exclusively through our official channels. Team members' personal accounts are not valid support channels." },
          { p: `Official channels: [WhatsApp](${WA}) and Instagram [@hypestylearg](${IG}).` },
        ],
      },
      {
        title: 'About refunds',
        blocks: [
          { p: 'We currently do not issue refunds. Every case is resolved through a product exchange.' },
        ],
      },
    ],
    acceptanceLabel: 'Acceptance of policies',
    acceptanceText:
      'By placing an order at HYPESTYLE®, the customer declares that they have read and accepted all the exchange, return and shipping policies detailed here.',
    ctaQuestion: 'Have a specific question?',
    ctaButton: 'Contact us on Instagram',
  },

  PT: {
    heroTitle: 'Políticas de trocas, devoluções e envios',
    heroText:
      'Na HYPESTYLE® trabalhamos para que cada pedido chegue certo desde o primeiro envio. A seguir detalhamos nossas políticas de trocas, devoluções e envios. Pedimos que você as leia com atenção antes de comprar.',
    sections: [
      {
        title: 'Como solicitar uma troca?',
        blocks: [
          { ol: [
            'Escreva para nós pelo WhatsApp ou Instagram com o número do pedido e o produto que você quer trocar.',
            'Confirmamos se há estoque do tamanho novo e o reservamos.',
            'Geramos a etiqueta da Andreani e enviamos o tamanho novo. A troca é feita na hora: quando você recebe, entrega ali mesmo o pacote com a peça a trocar. O envio é por sua conta e passamos o valor exato antes de confirmar.',
            'Se você está em Buenos Aires (CABA) ou arredores, também podemos combinar a troca por motoboy.',
          ] },
          { p: 'Não temos loja nem showroom: a venda e as trocas são somente online.' },
        ],
      },
      {
        title: 'Produto com defeito ou erro nosso',
        blocks: [
          { p: 'Se o produto apresenta defeito de fabricação, ou enviamos um tamanho ou produto diferente do que você pediu, a troca é sem custo para você.' },
          { p: 'Para fazer a troca, entre em contato pelo WhatsApp ou Instagram com fotos ou vídeos que mostrem claramente o defeito ou o erro. Nós cuidamos da retirada e do envio do produto de substituição.' },
        ],
      },
      {
        title: 'Trocas por tamanho',
        blocks: [
          { p: 'As trocas por tamanho valem somente para o mesmo produto e estão sujeitas à disponibilidade de estoque.' },
          { p: 'O artigo deve ser devolvido em perfeitas condições: sem uso, sem manchas, sem odores, com todas as etiquetas e na embalagem original.' },
          { p: 'Quando a troca é por escolha de tamanho do comprador, os custos de envio da troca (Andreani ou motoboy) são por conta dele. Se o erro foi nosso ou a peça tem defeito, a troca é sem custo.', strong: true },
        ],
      },
      {
        title: 'Produtos em Sale / Outlet / Promoções',
        blocks: [
          { p: 'Os produtos comprados em SALE, OUTLET ou com descontos especiais **não têm troca nem devolução**, salvo por defeito de fabricação comprovável.' },
        ],
      },
      {
        title: 'Drops limitados e edições especiais',
        blocks: [
          { p: 'Os drops limitados e as edições especiais não têm garantia de reposição.' },
          { p: 'Não se aplica troca nem devolução, exceto em caso de defeito de fabricação.' },
        ],
      },
      {
        title: 'Variações de medidas',
        blocks: [
          { p: 'As peças podem apresentar variações de 1 a 2 cm em relação à tabela de tamanhos, próprias do processo de confecção. Essas variações não são consideradas defeito de fabricação.' },
        ],
      },
      {
        title: 'Condições do produto',
        blocks: [
          { p: 'Para que uma troca seja aceita, o produto deve cumprir todas estas condições:' },
          { ul: ['Sem uso nem desgaste visível', 'Sem manchas nem odores', 'Com todas as etiquetas originais', 'Na embalagem original'] },
        ],
      },
      {
        title: 'Prazos',
        blocks: [
          { p: 'Você tem até **30 dias corridos** a partir da data da compra para solicitar uma troca. Depois desse prazo não aceitamos solicitações.' },
        ],
      },
      {
        title: 'Entregas não realizadas / Reenvios',
        blocks: [
          { p: 'Se o envio não pôde ser concluído por endereço incorreto ou ausência do destinatário, o custo da segunda tentativa de entrega é por conta do cliente.' },
        ],
      },
      {
        title: 'Custos não reembolsáveis',
        blocks: [
          { p: 'Os custos de envio originais não são devolvidos em nenhuma hipótese, independentemente do motivo da troca.' },
        ],
      },
      {
        title: 'Canais oficiais de atendimento',
        blocks: [
          { p: 'Toda consulta ou solicitação deve ser feita exclusivamente pelos nossos canais oficiais. As contas pessoais dos integrantes da equipe não são canais válidos de atendimento.' },
          { p: `Canais oficiais: [WhatsApp](${WA}) e Instagram [@hypestylearg](${IG}).` },
        ],
      },
      {
        title: 'Sobre devolução de dinheiro',
        blocks: [
          { p: 'Atualmente não fazemos devolução de dinheiro. Todos os casos são resolvidos com troca de produto.' },
        ],
      },
    ],
    acceptanceLabel: 'Aceitação das políticas',
    acceptanceText:
      'Ao comprar na HYPESTYLE®, o cliente declara ter lido e aceitado todas as políticas de trocas, devoluções e envios aqui detalhadas.',
    ctaQuestion: 'Tem uma dúvida específica?',
    ctaButton: 'Fale conosco no Instagram',
  },

  DE: {
    heroTitle: 'Umtausch-, Rückgabe- und Versandbedingungen',
    heroText:
      'Bei HYPESTYLE® arbeiten wir daran, dass jede Bestellung schon beim ersten Versand richtig ankommt. Hier findest du unsere Bedingungen für Umtausch, Rückgabe und Versand. Bitte lies sie aufmerksam, bevor du bestellst.',
    sections: [
      {
        title: 'Wie beantrage ich einen Umtausch?',
        blocks: [
          { ol: [
            'Schreib uns per WhatsApp oder Instagram mit deiner Bestellnummer und dem Artikel, den du umtauschen möchtest.',
            'Wir bestätigen, ob die neue Größe auf Lager ist, und reservieren sie für dich.',
            'Wir erstellen das Andreani-Etikett und schicken dir die neue Größe. Der Umtausch erfolgt direkt bei der Übergabe: Wenn du das Paket erhältst, gibst du das Paket mit dem umzutauschenden Artikel sofort ab. Der Versand geht zu deinen Lasten; den genauen Betrag nennen wir dir vor der Bestätigung.',
            'Wenn du in Buenos Aires (CABA) oder Umgebung bist, können wir den Umtausch auch per Kurier organisieren.',
          ] },
          { p: 'Wir haben kein Geschäft und keinen Showroom: Verkauf und Umtausch laufen ausschließlich online.' },
        ],
      },
      {
        title: 'Fehlerhaftes Produkt oder unser Fehler',
        blocks: [
          { p: 'Hat das Produkt einen Herstellungsfehler oder haben wir dir eine andere Größe oder einen anderen Artikel als bestellt geschickt, ist der Umtausch für dich kostenlos.' },
          { p: 'Kontaktiere uns dafür per WhatsApp oder Instagram mit Fotos oder Videos, die den Mangel oder den Fehler deutlich zeigen. Wir kümmern uns um die Abholung und den Versand des Ersatzprodukts.' },
        ],
      },
      {
        title: 'Umtausch der Größe',
        blocks: [
          { p: 'Ein Größenumtausch gilt nur für dasselbe Produkt und hängt von der Verfügbarkeit ab.' },
          { p: 'Der Artikel muss in einwandfreiem Zustand zurückgegeben werden: ungetragen, ohne Flecken, ohne Gerüche, mit allen Etiketten und in der Originalverpackung.' },
          { p: 'Beruht der Umtausch auf der Größenwahl des Käufers, trägt dieser die Versandkosten des Umtauschs (Andreani oder Kurier). War der Fehler unserer oder ist der Artikel mangelhaft, ist der Umtausch kostenlos.', strong: true },
        ],
      },
      {
        title: 'Sale / Outlet / Aktionsartikel',
        blocks: [
          { p: 'Artikel aus dem SALE, OUTLET oder mit Sonderrabatten sind **vom Umtausch und von der Rückgabe ausgeschlossen**, außer bei nachweisbarem Herstellungsfehler.' },
        ],
      },
      {
        title: 'Limitierte Drops und Sondereditionen',
        blocks: [
          { p: 'Limitierte Drops und Sondereditionen haben keine Nachschubgarantie.' },
          { p: 'Umtausch und Rückgabe sind ausgeschlossen, außer bei Herstellungsfehlern.' },
        ],
      },
      {
        title: 'Maßabweichungen',
        blocks: [
          { p: 'Die Kleidungsstücke können produktionsbedingt um 1 bis 2 cm von der Größentabelle abweichen. Solche Abweichungen gelten nicht als Herstellungsfehler.' },
        ],
      },
      {
        title: 'Zustand des Produkts',
        blocks: [
          { p: 'Damit ein Umtausch akzeptiert wird, muss das Produkt alle diese Bedingungen erfüllen:' },
          { ul: ['Ungetragen und ohne sichtbare Abnutzung', 'Ohne Flecken oder Gerüche', 'Mit allen Originaletiketten', 'In der Originalverpackung'] },
        ],
      },
      {
        title: 'Fristen',
        blocks: [
          { p: 'Du hast bis zu **30 Kalendertage** ab dem Kaufdatum, um einen Umtausch zu beantragen. Nach Ablauf dieser Frist werden keine Anfragen mehr angenommen.' },
        ],
      },
      {
        title: 'Nicht erfolgte Zustellung / Erneuter Versand',
        blocks: [
          { p: 'Konnte die Lieferung wegen einer falschen Adresse oder Abwesenheit des Empfängers nicht zugestellt werden, trägt der Kunde die Kosten des zweiten Zustellversuchs.' },
        ],
      },
      {
        title: 'Nicht erstattungsfähige Kosten',
        blocks: [
          { p: 'Die ursprünglichen Versandkosten werden in keinem Fall erstattet, unabhängig vom Grund des Umtauschs.' },
        ],
      },
      {
        title: 'Offizielle Kontaktkanäle',
        blocks: [
          { p: 'Alle Anfragen müssen ausschließlich über unsere offiziellen Kanäle erfolgen. Die persönlichen Konten von Teammitgliedern sind keine gültigen Kontaktkanäle.' },
          { p: `Offizielle Kanäle: [WhatsApp](${WA}) und Instagram [@hypestylearg](${IG}).` },
        ],
      },
      {
        title: 'Rückerstattungen',
        blocks: [
          { p: 'Derzeit leisten wir keine Rückerstattungen. Alle Fälle werden durch einen Produktumtausch gelöst.' },
        ],
      },
    ],
    acceptanceLabel: 'Anerkennung der Bedingungen',
    acceptanceText:
      'Mit einer Bestellung bei HYPESTYLE® erklärt der Kunde, alle hier aufgeführten Umtausch-, Rückgabe- und Versandbedingungen gelesen und akzeptiert zu haben.',
    ctaQuestion: 'Hast du eine konkrete Frage?',
    ctaButton: 'Schreib uns auf Instagram',
  },

  FR: {
    heroTitle: "Politique d'échanges, de retours et de livraison",
    heroText:
      "Chez HYPESTYLE® nous travaillons pour que chaque commande arrive correctement dès le premier envoi. Voici le détail de notre politique d'échanges, de retours et de livraison. Merci de la lire attentivement avant de commander.",
    sections: [
      {
        title: 'Comment demander un échange ?',
        blocks: [
          { ol: [
            'Écris-nous sur WhatsApp ou Instagram avec ton numéro de commande et le produit que tu veux échanger.',
            'Nous confirmons si la nouvelle taille est en stock et nous la réservons.',
            "Nous générons l'étiquette Andreani et nous t'expédions la nouvelle taille. L'échange se fait sur le moment : à la réception, tu remets directement le colis avec l'article à échanger. La livraison est à ta charge et nous t'indiquons le montant exact avant de confirmer.",
            "Si tu es à Buenos Aires (CABA) ou aux alentours, nous pouvons aussi organiser l'échange par coursier.",
          ] },
          { p: "Nous n'avons ni boutique ni showroom : la vente et les échanges se font uniquement en ligne." },
        ],
      },
      {
        title: 'Produit défectueux ou erreur de notre part',
        blocks: [
          { p: "Si le produit présente un défaut de fabrication, ou si nous t'avons envoyé une taille ou un produit différent de ta commande, l'échange est sans frais pour toi." },
          { p: "Pour le gérer, contacte-nous sur WhatsApp ou Instagram avec des photos ou vidéos montrant clairement le défaut ou l'erreur. Nous nous chargeons de l'enlèvement et de l'envoi du produit de remplacement." },
        ],
      },
      {
        title: 'Échanges de taille',
        blocks: [
          { p: "Les échanges de taille ne s'appliquent qu'au même produit et dépendent de la disponibilité du stock." },
          { p: "L'article doit être retourné en parfait état : non porté, sans taches, sans odeurs, avec toutes ses étiquettes et dans son emballage d'origine." },
          { p: "Lorsque l'échange résulte d'un choix de taille de l'acheteur, les frais de livraison de l'échange (Andreani ou coursier) sont à sa charge. Si l'erreur vient de nous ou si l'article est défectueux, l'échange est gratuit.", strong: true },
        ],
      },
      {
        title: 'Produits en Sale / Outlet / Promotions',
        blocks: [
          { p: 'Les produits achetés en SALE, OUTLET ou avec des remises spéciales **ne sont ni échangeables ni remboursables**, sauf en cas de défaut de fabrication avéré.' },
        ],
      },
      {
        title: 'Drops limités et éditions spéciales',
        blocks: [
          { p: "Les drops limités et les éditions spéciales n'ont aucune garantie de réassort." },
          { p: "Aucun échange ni retour n'est possible, sauf en cas de défaut de fabrication." },
        ],
      },
      {
        title: 'Variations de mesures',
        blocks: [
          { p: 'Les vêtements peuvent présenter des écarts de 1 à 2 cm par rapport au guide des tailles, inhérents au processus de confection. Ces écarts ne sont pas considérés comme un défaut de fabrication.' },
        ],
      },
      {
        title: 'État du produit',
        blocks: [
          { p: "Pour qu'un échange soit accepté, le produit doit remplir toutes ces conditions :" },
          { ul: ['Non porté et sans usure visible', 'Sans taches ni odeurs', "Avec toutes ses étiquettes d'origine", "Dans son emballage d'origine"] },
        ],
      },
      {
        title: 'Délais',
        blocks: [
          { p: "Tu disposes de **30 jours calendaires** à compter de la date d'achat pour demander un échange. Passé ce délai, aucune demande ne sera acceptée." },
        ],
      },
      {
        title: 'Livraisons non abouties / Réexpéditions',
        blocks: [
          { p: "Si la livraison n'a pas pu être effectuée à cause d'une adresse incorrecte ou de l'absence du destinataire, le coût de la seconde tentative de livraison est à la charge du client." },
        ],
      },
      {
        title: 'Frais non remboursables',
        blocks: [
          { p: "Les frais de livraison initiaux ne sont remboursés en aucun cas, quel que soit le motif de l'échange." },
        ],
      },
      {
        title: 'Canaux officiels de contact',
        blocks: [
          { p: "Toute demande doit passer exclusivement par nos canaux officiels. Les comptes personnels des membres de l'équipe ne sont pas des canaux de contact valables." },
          { p: `Canaux officiels : [WhatsApp](${WA}) et Instagram [@hypestylearg](${IG}).` },
        ],
      },
      {
        title: 'À propos des remboursements',
        blocks: [
          { p: "Nous n'effectuons actuellement aucun remboursement. Tous les cas sont résolus par un échange de produit." },
        ],
      },
    ],
    acceptanceLabel: 'Acceptation de la politique',
    acceptanceText:
      "En passant commande chez HYPESTYLE®, le client déclare avoir lu et accepté l'ensemble de la politique d'échanges, de retours et de livraison détaillée ici.",
    ctaQuestion: 'Tu as une question précise ?',
    ctaButton: 'Nous contacter sur Instagram',
  },

  IT: {
    heroTitle: 'Politiche di cambi, resi e spedizioni',
    heroText:
      'In HYPESTYLE® lavoriamo perché ogni ordine arrivi bene già dalla prima spedizione. Qui sotto trovi le nostre politiche di cambi, resi e spedizioni. Ti chiediamo di leggerle con attenzione prima di acquistare.',
    sections: [
      {
        title: 'Come richiedere un cambio?',
        blocks: [
          { ol: [
            "Scrivici su WhatsApp o Instagram con il numero dell'ordine e il prodotto che vuoi cambiare.",
            'Ti confermiamo se la nuova taglia è disponibile e la riserviamo.',
            "Generiamo l'etichetta Andreani e ti spediamo la nuova taglia. Il cambio avviene sul momento: quando ricevi il pacco, consegni subito quello con il capo da cambiare. La spedizione è a carico tuo e ti comunichiamo l'importo esatto prima di confermare.",
            'Se sei a Buenos Aires (CABA) o dintorni, possiamo organizzare il cambio anche con un corriere in moto.',
          ] },
          { p: 'Non abbiamo negozio né showroom: la vendita e i cambi sono solo online.' },
        ],
      },
      {
        title: 'Prodotto difettoso o nostro errore',
        blocks: [
          { p: 'Se il prodotto presenta un difetto di fabbricazione, o ti abbiamo inviato una taglia o un prodotto diverso da quello ordinato, il cambio è senza costi per te.' },
          { p: "Per gestirlo, contattaci su WhatsApp o Instagram con foto o video che mostrino chiaramente il difetto o l'errore. Ci occupiamo noi del ritiro e della spedizione del prodotto sostitutivo." },
        ],
      },
      {
        title: 'Cambi di taglia',
        blocks: [
          { p: 'I cambi di taglia valgono solo per lo stesso prodotto e dipendono dalla disponibilità di magazzino.' },
          { p: "L'articolo deve essere restituito in perfette condizioni: mai indossato, senza macchie, senza odori, con tutte le etichette e nella confezione originale." },
          { p: "Quando il cambio dipende dalla scelta della taglia da parte dell'acquirente, i costi di spedizione del cambio (Andreani o corriere) sono a suo carico. Se l'errore è stato nostro o il capo è difettoso, il cambio è gratuito.", strong: true },
        ],
      },
      {
        title: 'Prodotti in Sale / Outlet / Promozioni',
        blocks: [
          { p: 'I prodotti acquistati in SALE, OUTLET o con sconti speciali **non possono essere cambiati né resi**, salvo difetto di fabbricazione verificabile.' },
        ],
      },
      {
        title: 'Drop limitati ed edizioni speciali',
        blocks: [
          { p: 'I drop limitati e le edizioni speciali non hanno garanzia di riassortimento.' },
          { p: 'Non è previsto cambio né reso, salvo in caso di difetti di fabbricazione.' },
        ],
      },
      {
        title: 'Variazioni di misure',
        blocks: [
          { p: 'I capi possono presentare variazioni di 1-2 cm rispetto alla tabella taglie, tipiche del processo di confezione. Queste variazioni non sono considerate difetto di fabbricazione.' },
        ],
      },
      {
        title: 'Condizioni del prodotto',
        blocks: [
          { p: 'Perché un cambio venga accettato, il prodotto deve rispettare tutte queste condizioni:' },
          { ul: ['Mai indossato e senza usura visibile', 'Senza macchie né odori', 'Con tutte le etichette originali', 'Nella confezione originale'] },
        ],
      },
      {
        title: 'Tempi',
        blocks: [
          { p: 'Hai fino a **30 giorni di calendario** dalla data di acquisto per richiedere un cambio. Oltre questo termine le richieste non verranno accettate.' },
        ],
      },
      {
        title: 'Consegne non riuscite / Rispedizioni',
        blocks: [
          { p: 'Se la consegna non è andata a buon fine per indirizzo errato o assenza del destinatario, il costo del secondo tentativo è a carico del cliente.' },
        ],
      },
      {
        title: 'Costi non rimborsabili',
        blocks: [
          { p: 'Le spese di spedizione originali non vengono rimborsate in nessun caso, indipendentemente dal motivo del cambio.' },
        ],
      },
      {
        title: 'Canali ufficiali di assistenza',
        blocks: [
          { p: 'Ogni richiesta deve passare esclusivamente dai nostri canali ufficiali. Gli account personali dei membri del team non sono canali di assistenza validi.' },
          { p: `Canali ufficiali: [WhatsApp](${WA}) e Instagram [@hypestylearg](${IG}).` },
        ],
      },
      {
        title: 'Sui rimborsi',
        blocks: [
          { p: 'Al momento non effettuiamo rimborsi. Tutti i casi si risolvono con un cambio di prodotto.' },
        ],
      },
    ],
    acceptanceLabel: 'Accettazione delle politiche',
    acceptanceText:
      'Acquistando su HYPESTYLE®, il cliente dichiara di aver letto e accettato tutte le politiche di cambi, resi e spedizioni qui descritte.',
    ctaQuestion: 'Hai una domanda specifica?',
    ctaButton: 'Contattaci su Instagram',
  },
};
