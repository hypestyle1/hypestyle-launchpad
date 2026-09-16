import { Language } from '@/context/LocaleContext';

// Traducción liviana de la INTERFAZ (no del catálogo: los nombres y las
// descripciones de producto siguen viniendo de WooCommerce en español). La
// clave es el texto en español (idioma base); cada idioma agrega su columna.
// Si falta la traducción, cae al español.
//
// Idiomas soportados: los de LANGUAGES en LocaleContext (ES/EN/PT/DE/FR/IT).
// El Footer llegó a ofrecer DE/FR/IT sin que existieran en el tipo Language ni
// acá — se veían en el selector y no hacían nada. Desde el 15/09/2026 tienen su
// columna completa. Si se suma un idioma, va en LANGUAGES y con su columna
// completa acá, no solo en el selector. Si se suma una clave, van las cinco
// columnas: una clave con la columna a medias se ve en español para ese idioma
// sin ningún aviso.
type Dict = Record<string, Partial<Record<Exclude<Language, 'ES'>, string>>>;

const DICT: Dict = {
  // — Navbar —
  'Colecciones': { EN: 'Collections', PT: 'Coleções', DE: 'Kollektionen', FR: 'Collections', IT: 'Collezioni' },
  'Básicos': { EN: 'Basics', PT: 'Básicos', DE: 'Basics', FR: 'Basiques', IT: 'Basic' },
  'Políticas': { EN: 'Policies', PT: 'Políticas', DE: 'Richtlinien', FR: 'Politiques', IT: 'Politiche' },
  'Quiénes Somos': { EN: 'About Us', PT: 'Sobre Nós', DE: 'Über uns', FR: 'À propos', IT: 'Chi siamo' },
  'Contacto': { EN: 'Contact', PT: 'Contato', DE: 'Kontakt', FR: 'Contact', IT: 'Contatti' },
  'Ver todo': { EN: 'View all', PT: 'Ver tudo', DE: 'Alle ansehen', FR: 'Tout voir', IT: 'Vedi tutto' },
  'Ver más': { EN: 'View more', PT: 'Ver mais', DE: 'Mehr ansehen', FR: 'Voir plus', IT: 'Vedi di più' },
  'Ver todos los productos': { EN: 'View all products', PT: 'Ver todos os produtos', DE: 'Alle Produkte ansehen', FR: 'Voir tous les produits', IT: 'Vedi tutti i prodotti' },
  'Explorar': { EN: 'Explore', PT: 'Explorar', DE: 'Entdecken', FR: 'Explorer', IT: 'Esplora' },
  'Categorías': { EN: 'Categories', PT: 'Categorias', DE: 'Kategorien', FR: 'Catégories', IT: 'Categorie' },
  'Colección': { EN: 'Collection', PT: 'Coleção', DE: 'Kollektion', FR: 'Collection', IT: 'Collezione' },
  'Ver colección →': { EN: 'View collection →', PT: 'Ver coleção →', DE: 'Kollektion ansehen →', FR: 'Voir la collection →', IT: 'Vedi la collezione →' },
  'Ver todo en': { EN: 'View all in', PT: 'Ver tudo em', DE: 'Alles ansehen in', FR: 'Tout voir dans', IT: 'Vedi tutto in' },
  'Arriba': { EN: 'Tops', PT: 'Parte de cima', DE: 'Oberteile', FR: 'Hauts', IT: 'Parte superiore' },
  'Abajo': { EN: 'Bottoms', PT: 'Parte de baixo', DE: 'Unterteile', FR: 'Bas', IT: 'Parte inferiore' },
  'Accesorios': { EN: 'Accessories', PT: 'Acessórios', DE: 'Accessoires', FR: 'Accessoires', IT: 'Accessori' },
  'Remeras': { EN: 'Tees', PT: 'Camisetas', DE: 'T-Shirts', FR: 'T-shirts', IT: 'T-shirt' },
  'Pantalones': { EN: 'Pants', PT: 'Calças', DE: 'Hosen', FR: 'Pantalons', IT: 'Pantaloni' },
  'Gorras': { EN: 'Caps', PT: 'Bonés', DE: 'Caps', FR: 'Casquettes', IT: 'Cappellini' },
  'Buscar productos...': { EN: 'Search products...', PT: 'Buscar produtos...', DE: 'Produkte suchen...', FR: 'Rechercher des produits...', IT: 'Cerca prodotti...' },
  'Sin resultados para': { EN: 'No results for', PT: 'Sem resultados para', DE: 'Keine Ergebnisse für', FR: 'Aucun résultat pour', IT: 'Nessun risultato per' },

  // — ProductCard —
  'Agregar': { EN: 'Add', PT: 'Adicionar', DE: 'Hinzufügen', FR: 'Ajouter', IT: 'Aggiungi' },
  'Sin stock': { EN: 'Out of stock', PT: 'Esgotado', DE: 'Ausverkauft', FR: 'Épuisé', IT: 'Esaurito' },
  '✓ agregado': { EN: '✓ added', PT: '✓ adicionado', DE: '✓ hinzugefügt', FR: '✓ ajouté', IT: '✓ aggiunto' },
  'Personalizable': { EN: 'Customizable', PT: 'Personalizável', DE: 'Personalisierbar', FR: 'Personnalisable', IT: 'Personalizzabile' },

  // — CartDrawer —
  'Carrito': { EN: 'Cart', PT: 'Carrinho', DE: 'Warenkorb', FR: 'Panier', IT: 'Carrello' },
  '¡Conseguiste envío gratis!': { EN: 'You unlocked free shipping!', PT: 'Você ganhou frete grátis!', DE: 'Du hast kostenlosen Versand freigeschaltet!', FR: 'Tu as débloqué la livraison gratuite !', IT: 'Hai sbloccato la spedizione gratuita!' },
  'Añadí': { EN: 'Add', PT: 'Adicione', DE: 'Füge', FR: 'Ajoute', IT: 'Aggiungi' },
  'y conseguí': { EN: 'and get', PT: 'e ganhe', DE: 'hinzu und erhalte', FR: 'et profite de la', IT: 'e ottieni la' },
  'envío gratis': { EN: 'free shipping', PT: 'frete grátis', DE: 'kostenlosen Versand', FR: 'livraison gratuite', IT: 'spedizione gratuita' },
  'Tu carrito está vacío': { EN: 'Your cart is empty', PT: 'Seu carrinho está vazio', DE: 'Dein Warenkorb ist leer', FR: 'Ton panier est vide', IT: 'Il tuo carrello è vuoto' },
  'Seguir comprando': { EN: 'Continue shopping', PT: 'Continuar comprando', DE: 'Weiter einkaufen', FR: 'Continuer mes achats', IT: 'Continua gli acquisti' },
  'o regalá una gift card': { EN: 'or give a gift card', PT: 'ou presenteie um gift card', DE: 'oder verschenke eine Gift Card', FR: 'ou offre une gift card', IT: 'o regala una gift card' },
  'Regalá crédito · de $50.000 en adelante': { EN: 'Give store credit · from $50,000', PT: 'Presenteie crédito · a partir de $50.000', DE: 'Guthaben verschenken · ab $50.000', FR: 'Offre du crédit · à partir de $50.000', IT: 'Regala credito · da $50.000 in su' },
  'Gift Card · regalá crédito de a $50.000': { EN: 'Gift Card · store credit from $50,000', PT: 'Gift Card · crédito a partir de $50.000', DE: 'Gift Card · Guthaben ab $50.000', FR: 'Gift Card · crédit à partir de $50.000', IT: 'Gift Card · credito da $50.000' },
  'Enviando...': { EN: 'Sending...', PT: 'Enviando...', DE: 'Wird gesendet...', FR: 'Envoi en cours...', IT: 'Invio in corso...' },
  'Talle': { EN: 'Size', PT: 'Tamanho', DE: 'Größe', FR: 'Taille', IT: 'Taglia' },
  'Dorsal': { EN: 'Custom', PT: 'Personalização', DE: 'Personalisierung', FR: 'Personnalisation', IT: 'Personalizzazione' },
  'Eliminar': { EN: 'Remove', PT: 'Remover', DE: 'Entfernen', FR: 'Supprimer', IT: 'Rimuovi' },
  'Completa el look': { EN: 'Complete the look', PT: 'Complete o look', DE: 'Mach den Look komplett', FR: 'Complète le look', IT: 'Completa il look' },
  'Subtotal': { EN: 'Subtotal', PT: 'Subtotal', DE: 'Zwischensumme', FR: 'Sous-total', IT: 'Subtotale' },
  'Envío gratis aplicado': { EN: 'Free shipping applied', PT: 'Frete grátis aplicado', DE: 'Kostenloser Versand angewendet', FR: 'Livraison gratuite appliquée', IT: 'Spedizione gratuita applicata' },
  'Envío calculado en el checkout': { EN: 'Shipping calculated at checkout', PT: 'Frete calculado no checkout', DE: 'Versand wird beim Checkout berechnet', FR: 'Livraison calculée au paiement', IT: 'Spedizione calcolata al checkout' },
  'Iniciar compra': { EN: 'Checkout', PT: 'Finalizar compra', DE: 'Zur Kasse', FR: 'Commander', IT: 'Vai al checkout' },

  // — AnnouncementBar —
  'Envío gratis desde $180.000': { EN: 'Free shipping over $180.000', PT: 'Frete grátis a partir de $180.000', DE: 'Kostenloser Versand ab $180.000', FR: 'Livraison gratuite dès $180.000', IT: 'Spedizione gratuita da $180.000' },
  'Hasta 3 cuotas sin interés': { EN: 'Up to 3 interest-free installments', PT: 'Até 3x sem juros', DE: 'Bis zu 3 zinsfreie Raten', FR: "Jusqu'à 3 fois sans frais", IT: 'Fino a 3 rate senza interessi' },
  'Worldwide Shipping vía FedEx': { EN: 'Worldwide shipping via FedEx', PT: 'Envio mundial via FedEx', DE: 'Weltweiter Versand mit FedEx', FR: 'Livraison mondiale via FedEx', IT: 'Spedizione in tutto il mondo con FedEx' },
  '30 días para cambios y devoluciones': { EN: '30 days for exchanges & returns', PT: '30 dias para trocas e devoluções', DE: '30 Tage für Umtausch und Rückgabe', FR: '30 jours pour échanges et retours', IT: '30 giorni per cambi e resi' },

  // — SpotifyPlayer —
  'Sonando en Hype': { EN: 'Now playing at Hype', PT: 'Tocando na Hype', DE: 'Läuft gerade bei Hype', FR: 'En écoute chez Hype', IT: 'In riproduzione da Hype' },
  'Cerrar': { EN: 'Close', PT: 'Fechar', DE: 'Schließen', FR: 'Fermer', IT: 'Chiudi' },

  // — Footer —
  'Sets': {},
  'Envíos internacionales': { EN: 'International shipping', PT: 'Envios internacionais', DE: 'Internationaler Versand', FR: 'Livraisons internationales', IT: 'Spedizioni internazionali' },
  'Devoluciones': { EN: 'Returns', PT: 'Devoluções', DE: 'Rückgaben', FR: 'Retours', IT: 'Resi' },
  'RRSS': { EN: 'Social', PT: 'Redes', DE: 'Social Media', FR: 'Réseaux', IT: 'Social' },
  'Suscribite y obtené un 10% de descuento': { EN: 'Subscribe and get 10% off', PT: 'Assine e ganhe 10% de desconto', DE: 'Abonnieren und 10 % Rabatt sichern', FR: 'Abonne-toi et profite de 10 % de réduction', IT: 'Iscriviti e ottieni il 10% di sconto' },
  '*No es acumulable con otras promociones': { EN: '*Not combinable with other promotions', PT: '*Não acumulável com outras promoções', DE: '*Nicht mit anderen Aktionen kombinierbar', FR: '*Non cumulable avec d’autres promotions', IT: '*Non cumulabile con altre promozioni' },
  '✓ ¡Listo! Ya sos parte del círculo.': { EN: "✓ Done! You're part of the circle.", PT: '✓ Pronto! Você já faz parte do círculo.', DE: '✓ Fertig! Du gehörst jetzt zum Kreis.', FR: '✓ C’est fait ! Tu fais partie du cercle.', IT: '✓ Fatto! Ora fai parte del cerchio.' },
  'Streetwear desde Buenos Aires. Drops limitados.': { EN: 'Streetwear from Buenos Aires. Limited drops.', PT: 'Streetwear de Buenos Aires. Drops limitados.', DE: 'Streetwear aus Buenos Aires. Limitierte Drops.', FR: 'Streetwear depuis Buenos Aires. Drops limités.', IT: 'Streetwear da Buenos Aires. Drop limitati.' },
  'Envíos a todo el mundo.': { EN: 'Worldwide shipping.', PT: 'Enviamos para o mundo todo.', DE: 'Weltweiter Versand.', FR: 'Livraison dans le monde entier.', IT: 'Spedizioni in tutto il mondo.' },

  // — /worldwide —
  // Es la única página pensada para el que compra de afuera y estaba entera en
  // español, incluso para alguien que ya había puesto el sitio en inglés.
  'Envíos Internacionales': { EN: 'International Shipping', PT: 'Envios Internacionais', DE: 'Internationaler Versand', FR: 'Livraisons Internationales', IT: 'Spedizioni Internazionali' },
  'Llevamos Hypestyle a todo el mundo. Drops limitados, sin importar dónde estés.': {
    EN: 'We ship Hypestyle worldwide. Limited drops, wherever you are.',
    PT: 'Levamos a Hypestyle para o mundo todo. Drops limitados, onde quer que você esteja.',
    DE: 'Wir bringen Hypestyle in die ganze Welt. Limitierte Drops, egal wo du bist.',
    FR: 'Nous expédions Hypestyle dans le monde entier. Drops limités, où que tu sois.',
    IT: 'Portiamo Hypestyle in tutto il mondo. Drop limitati, ovunque tu sia.',
  },
  'Zonas de envío': { EN: 'Shipping zones', PT: 'Zonas de envio', DE: 'Versandzonen', FR: 'Zones de livraison', IT: 'Zone di spedizione' },
  'Preguntas frecuentes': { EN: 'Frequently asked questions', PT: 'Perguntas frequentes', DE: 'Häufige Fragen', FR: 'Questions fréquentes', IT: 'Domande frequenti' },
  '¿Dudas con tu pedido internacional?': {
    EN: 'Questions about your international order?',
    PT: 'Dúvidas sobre seu pedido internacional?',
    DE: 'Fragen zu deiner internationalen Bestellung?',
    FR: 'Des questions sur ta commande internationale ?',
    IT: 'Dubbi sul tuo ordine internazionale?',
  },
  'Contactanos por WhatsApp': { EN: 'Contact us on WhatsApp', PT: 'Fale conosco no WhatsApp', DE: 'Schreib uns auf WhatsApp', FR: 'Contacte-nous sur WhatsApp', IT: 'Contattaci su WhatsApp' },

  // Zonas — son las cuatro del tarifario de Boxfly (ver lib/shipping-intl).
  // Si cambian ahí, hay que cambiarlas acá también: los textos de lib/worldwide
  // son las claves de este diccionario.
  'América': { EN: 'Americas', PT: 'América', DE: 'Amerika', FR: 'Amériques', IT: 'America' },
  'Estados Unidos, Canadá, México, Brasil, Chile, Uruguay, Colombia, Perú y más': {
    EN: 'United States, Canada, Mexico, Brazil, Chile, Uruguay, Colombia, Peru and more',
    PT: 'Estados Unidos, Canadá, México, Brasil, Chile, Uruguai, Colômbia, Peru e mais',
    DE: 'USA, Kanada, Mexiko, Brasilien, Chile, Uruguay, Kolumbien, Peru und mehr',
    FR: 'États-Unis, Canada, Mexique, Brésil, Chili, Uruguay, Colombie, Pérou et plus',
    IT: 'Stati Uniti, Canada, Messico, Brasile, Cile, Uruguay, Colombia, Perù e altri',
  },
  'Europa': { EN: 'Europe', PT: 'Europa', DE: 'Europa', FR: 'Europe', IT: 'Europa' },
  'España, Italia, Francia, Alemania, Reino Unido, Portugal y más': {
    EN: 'Spain, Italy, France, Germany, United Kingdom, Portugal and more',
    PT: 'Espanha, Itália, França, Alemanha, Reino Unido, Portugal e mais',
    DE: 'Spanien, Italien, Frankreich, Deutschland, Großbritannien, Portugal und mehr',
    FR: 'Espagne, Italie, France, Allemagne, Royaume-Uni, Portugal et plus',
    IT: 'Spagna, Italia, Francia, Germania, Regno Unito, Portogallo e altri',
  },
  'Asia': { EN: 'Asia', PT: 'Ásia', DE: 'Asien', FR: 'Asie', IT: 'Asia' },
  'Japón, Corea del Sur, Singapur, Hong Kong, India, Emiratos Árabes e Israel': {
    EN: 'Japan, South Korea, Singapore, Hong Kong, India, United Arab Emirates and Israel',
    PT: 'Japão, Coreia do Sul, Singapura, Hong Kong, Índia, Emirados Árabes e Israel',
    DE: 'Japan, Südkorea, Singapur, Hongkong, Indien, Vereinigte Arabische Emirate und Israel',
    FR: 'Japon, Corée du Sud, Singapour, Hong Kong, Inde, Émirats arabes unis et Israël',
    IT: 'Giappone, Corea del Sud, Singapore, Hong Kong, India, Emirati Arabi e Israele',
  },
  'Oceanía': { EN: 'Oceania', PT: 'Oceania', DE: 'Ozeanien', FR: 'Océanie', IT: 'Oceania' },
  'Australia y Nueva Zelanda': { EN: 'Australia and New Zealand', PT: 'Austrália e Nova Zelândia', DE: 'Australien und Neuseeland', FR: 'Australie et Nouvelle-Zélande', IT: 'Australia e Nuova Zelanda' },
  '7–15 días hábiles': { EN: '7–15 business days', PT: '7–15 dias úteis', DE: '7–15 Werktage', FR: '7–15 jours ouvrés', IT: '7–15 giorni lavorativi' },
  '10–18 días hábiles': { EN: '10–18 business days', PT: '10–18 dias úteis', DE: '10–18 Werktage', FR: '10–18 jours ouvrés', IT: '10–18 giorni lavorativi' },
  '12–20 días hábiles': { EN: '12–20 business days', PT: '12–20 dias úteis', DE: '12–20 Werktage', FR: '12–20 jours ouvrés', IT: '12–20 giorni lavorativi' },
  '12–22 días hábiles': { EN: '12–22 business days', PT: '12–22 dias úteis', DE: '12–22 Werktage', FR: '12–22 jours ouvrés', IT: '12–22 giorni lavorativi' },
  'FedEx': { EN: 'FedEx', PT: 'FedEx', DE: 'FedEx', FR: 'FedEx', IT: 'FedEx' },

  // FAQ de envíos
  '¿Cuándo se despacha mi pedido?': { EN: 'When is my order shipped?', PT: 'Quando meu pedido é enviado?', DE: 'Wann wird meine Bestellung verschickt?', FR: 'Quand ma commande est-elle expédiée ?', IT: 'Quando viene spedito il mio ordine?' },
  'Los pedidos se despachan dentro de los 2–3 días hábiles posteriores a la confirmación del pago.': {
    EN: 'Orders ship within 2–3 business days after payment is confirmed.',
    PT: 'Os pedidos são enviados em até 2–3 dias úteis após a confirmação do pagamento.',
    DE: 'Bestellungen werden innerhalb von 2–3 Werktagen nach Zahlungsbestätigung verschickt.',
    FR: 'Les commandes sont expédiées sous 2 à 3 jours ouvrés après confirmation du paiement.',
    IT: 'Gli ordini vengono spediti entro 2–3 giorni lavorativi dalla conferma del pagamento.',
  },
  '¿Puedo rastrear mi envío?': { EN: 'Can I track my shipment?', PT: 'Posso rastrear meu envio?', DE: 'Kann ich meine Sendung verfolgen?', FR: 'Puis-je suivre mon colis ?', IT: 'Posso tracciare la mia spedizione?' },
  'Sí. Una vez despachado, te enviamos el número de seguimiento por WhatsApp o email.': {
    EN: 'Yes. Once shipped, we send you the tracking number by WhatsApp or email.',
    PT: 'Sim. Assim que enviado, mandamos o código de rastreio por WhatsApp ou e-mail.',
    DE: 'Ja. Sobald die Bestellung verschickt ist, schicken wir dir die Sendungsnummer per WhatsApp oder E-Mail.',
    FR: 'Oui. Une fois expédiée, nous t’envoyons le numéro de suivi par WhatsApp ou e-mail.',
    IT: 'Sì. Una volta spedito, ti inviamo il numero di tracciamento via WhatsApp o e-mail.',
  },
  '¿Qué pasa si hay demoras en aduana?': { EN: 'What if there are customs delays?', PT: 'E se houver atrasos na alfândega?', DE: 'Was passiert bei Verzögerungen beim Zoll?', FR: 'Et en cas de retard à la douane ?', IT: 'E se ci sono ritardi in dogana?' },
  'Los tiempos de aduana son ajenos a Hypestyle. En caso de demoras, te acompañamos en el seguimiento.': {
    EN: 'Customs times are outside Hypestyle’s control. If there are delays, we help you follow up.',
    PT: 'Os prazos da alfândega não dependem da Hypestyle. Se houver atrasos, acompanhamos você no processo.',
    DE: 'Die Zollzeiten liegen außerhalb der Kontrolle von Hypestyle. Bei Verzögerungen helfen wir dir beim Nachverfolgen.',
    FR: 'Les délais de douane ne dépendent pas de Hypestyle. En cas de retard, nous t’accompagnons dans le suivi.',
    IT: 'I tempi della dogana non dipendono da Hypestyle. In caso di ritardi, ti accompagniamo nel monitoraggio.',
  },
  '¿Los aranceles de importación están incluidos?': {
    EN: 'Are import duties included?',
    PT: 'As taxas de importação estão incluídas?',
    DE: 'Sind die Einfuhrzölle inbegriffen?',
    FR: 'Les droits d’importation sont-ils inclus ?',
    IT: 'I dazi di importazione sono inclusi?',
  },
  'Los impuestos de importación quedan a cargo de quien recibe, según la normativa de cada país. El precio del envío sí incluye el flete, el seguro por pérdida o daño y los impuestos de exportación de Argentina.': {
    EN: 'Import taxes are paid by the recipient, under each country’s regulations. The shipping price does include freight, insurance against loss or damage, and Argentine export taxes.',
    PT: 'Os impostos de importação ficam por conta de quem recebe, conforme a legislação de cada país. O preço do envio inclui frete, seguro contra perda ou dano e os impostos de exportação da Argentina.',
    DE: 'Die Einfuhrabgaben trägt der Empfänger gemäß den Vorschriften des jeweiligen Landes. Der Versandpreis beinhaltet die Fracht, die Versicherung gegen Verlust oder Beschädigung und die argentinischen Ausfuhrabgaben.',
    FR: 'Les taxes d’importation sont à la charge du destinataire, selon la réglementation de chaque pays. Le prix de la livraison inclut le fret, l’assurance contre la perte ou les dommages et les taxes d’exportation argentines.',
    IT: 'Le tasse di importazione sono a carico di chi riceve, secondo la normativa di ogni paese. Il prezzo della spedizione include il trasporto, l’assicurazione contro perdita o danni e le tasse di esportazione argentine.',
  },
  '¿Cuánto sale el envío?': { EN: 'How much is shipping?', PT: 'Quanto custa o envio?', DE: 'Was kostet der Versand?', FR: 'Combien coûte la livraison ?', IT: 'Quanto costa la spedizione?' },
  'Se calcula en el checkout según lo que lleves y a qué país va, y se paga junto con el pedido. El precio queda cerrado antes de pagar.': {
    EN: 'It is calculated at checkout based on what you order and where it ships, and you pay it with your order. The price is final before you pay.',
    PT: 'É calculado no checkout conforme o que você leva e o país de destino, e você paga junto com o pedido. O preço fica fechado antes do pagamento.',
    DE: 'Er wird beim Checkout anhand deiner Bestellung und des Ziellands berechnet und zusammen mit der Bestellung bezahlt. Der Preis steht vor der Zahlung fest.',
    FR: 'Elle est calculée au paiement selon ce que tu commandes et le pays de destination, et se règle avec la commande. Le prix est fixé avant de payer.',
    IT: 'Viene calcolata al checkout in base a cosa ordini e al paese di destinazione, e si paga insieme all’ordine. Il prezzo è definitivo prima del pagamento.',
  },
  // — Crea contenido con Hype (formulario público de creadores) —
  // Una creadora extranjera no pudo completar el formulario viejo porque
  // estaba entero en español, no encontró cómo traducirlo y se fue. Estas
  // claves son las que hacen que eso no vuelva a pasar.
  'Crea contenido': { EN: 'Create content', PT: 'Crie conteúdo', DE: 'Erstelle Content', FR: 'Crée du contenu', IT: 'Crea contenuti' },
  'con Hype': { EN: 'with Hype', PT: 'com Hype', DE: 'mit Hype', FR: 'avec Hype', IT: 'con Hype' },
  'Buscamos gente que entienda la marca y quiera construir algo con nosotros. No nos importa cuánta gente te sigue: nos importa lo que hacés y cómo lo hacés.': {
    EN: 'We are looking for people who get the brand and want to build something with us. How many people follow you is not what matters: what you make and how you make it, is.',
    PT: 'Procuramos pessoas que entendam a marca e queiram construir algo conosco. Não importa quanta gente te segue: importa o que você faz e como faz.',
    DE: 'Wir suchen Leute, die die Marke verstehen und mit uns etwas aufbauen wollen. Wie viele dir folgen, ist uns egal: uns interessiert, was du machst und wie du es machst.',
    FR: 'Nous cherchons des gens qui comprennent la marque et veulent construire quelque chose avec nous. Peu importe combien de personnes te suivent : ce qui compte, c’est ce que tu fais et comment tu le fais.',
    IT: 'Cerchiamo persone che capiscano il brand e vogliano costruire qualcosa con noi. Non ci importa quanta gente ti segue: ci importa cosa fai e come lo fai.',
  },
  'Quién sos': { EN: 'About you', PT: 'Sobre você', DE: 'Über dich', FR: 'Qui es-tu', IT: 'Chi sei' },
  'Nombre y apellido': { EN: 'Full name', PT: 'Nome completo', DE: 'Vor- und Nachname', FR: 'Nom et prénom', IT: 'Nome e cognome' },
  'Mail': { EN: 'Email', PT: 'E-mail', DE: 'E-Mail', FR: 'E-mail', IT: 'E-mail' },
  'WhatsApp': { EN: 'WhatsApp', PT: 'WhatsApp', DE: 'WhatsApp', FR: 'WhatsApp', IT: 'WhatsApp' },
  'Ciudad': { EN: 'City', PT: 'Cidade', DE: 'Stadt', FR: 'Ville', IT: 'Città' },
  'Edad': { EN: 'Age', PT: 'Idade', DE: 'Alter', FR: 'Âge', IT: 'Età' },
  'Como sos menor de 18, necesitamos los datos de un adulto responsable para poder trabajar juntos.': {
    EN: 'Since you are under 18, we need the details of a responsible adult so we can work together.',
    PT: 'Como você é menor de 18, precisamos dos dados de um adulto responsável para trabalharmos juntos.',
    DE: 'Da du unter 18 bist, brauchen wir die Daten einer verantwortlichen erwachsenen Person, um zusammenarbeiten zu können.',
    FR: 'Comme tu as moins de 18 ans, nous avons besoin des coordonnées d’un adulte responsable pour pouvoir travailler ensemble.',
    IT: 'Dato che hai meno di 18 anni, abbiamo bisogno dei dati di un adulto responsabile per poter lavorare insieme.',
  },
  'Nombre del adulto responsable': { EN: 'Name of the responsible adult', PT: 'Nome do adulto responsável', DE: 'Name der verantwortlichen erwachsenen Person', FR: 'Nom de l’adulte responsable', IT: 'Nome dell’adulto responsabile' },
  'Su teléfono o mail': { EN: 'Their phone or email', PT: 'Telefone ou e-mail dele(a)', DE: 'Telefon oder E-Mail dieser Person', FR: 'Son téléphone ou e-mail', IT: 'Il suo telefono o e-mail' },
  'Dónde te encontramos': { EN: 'Where we find you', PT: 'Onde te encontramos', DE: 'Wo wir dich finden', FR: 'Où te trouver', IT: 'Dove ti troviamo' },
  '@ de Instagram': { EN: 'Instagram handle', PT: '@ do Instagram', DE: 'Instagram-Name', FR: '@ Instagram', IT: '@ di Instagram' },
  '@ de TikTok': { EN: 'TikTok handle', PT: '@ do TikTok', DE: 'TikTok-Name', FR: '@ TikTok', IT: '@ di TikTok' },
  'Tu trabajo': { EN: 'Your work', PT: 'Seu trabalho', DE: 'Deine Arbeit', FR: 'Ton travail', IT: 'Il tuo lavoro' },
  'Pegá dos o tres links a piezas tuyas de las que estés orgulloso': {
    EN: 'Paste two or three links to work you are proud of',
    PT: 'Cole dois ou três links de trabalhos dos quais você se orgulha',
    DE: 'Füge zwei oder drei Links zu Arbeiten ein, auf die du stolz bist',
    FR: 'Colle deux ou trois liens vers des créations dont tu es fier·e',
    IT: 'Incolla due o tre link a lavori di cui vai fiero',
  },
  'Un reel, una foto, lo que sea que muestre cómo trabajás.': {
    EN: 'A reel, a photo, anything that shows how you work.',
    PT: 'Um reel, uma foto, qualquer coisa que mostre como você trabalha.',
    DE: 'Ein Reel, ein Foto, irgendwas, das zeigt, wie du arbeitest.',
    FR: 'Un reel, une photo, tout ce qui montre comment tu travailles.',
    IT: 'Un reel, una foto, qualsiasi cosa che mostri come lavori.',
  },
  '¿Con qué frecuencia podés producir?': { EN: 'How often can you produce?', PT: 'Com que frequência você pode produzir?', DE: 'Wie oft kannst du produzieren?', FR: 'À quelle fréquence peux-tu produire ?', IT: 'Con che frequenza puoi produrre?' },
  'Una pieza por mes': { EN: 'One piece a month', PT: 'Uma peça por mês', DE: 'Ein Stück pro Monat', FR: 'Une création par mois', IT: 'Un contenuto al mese' },
  'Dos o tres por mes': { EN: 'Two or three a month', PT: 'Duas ou três por mês', DE: 'Zwei oder drei pro Monat', FR: 'Deux ou trois par mois', IT: 'Due o tre al mese' },
  'Todas las semanas': { EN: 'Every week', PT: 'Toda semana', DE: 'Jede Woche', FR: 'Toutes les semaines', IT: 'Ogni settimana' },
  '¿Con qué grabás y editás?': { EN: 'What do you shoot and edit with?', PT: 'Com o que você grava e edita?', DE: 'Womit filmst und schneidest du?', FR: 'Avec quoi filmes-tu et montes-tu ?', IT: 'Con cosa giri e monti?' },
  'Celular, edito yo': { EN: 'Phone, I edit', PT: 'Celular, eu edito', DE: 'Handy, ich schneide selbst', FR: 'Téléphone, je monte moi-même', IT: 'Telefono, monto io' },
  'Celular, me edita alguien': { EN: 'Phone, someone edits for me', PT: 'Celular, alguém edita para mim', DE: 'Handy, jemand schneidet für mich', FR: 'Téléphone, quelqu’un monte pour moi', IT: 'Telefono, monta qualcun altro' },
  'Cámara, edito yo': { EN: 'Camera, I edit', PT: 'Câmera, eu edito', DE: 'Kamera, ich schneide selbst', FR: 'Caméra, je monte moi-même', IT: 'Fotocamera, monto io' },
  'Cámara, trabajo con un editor': { EN: 'Camera, I work with an editor', PT: 'Câmera, trabalho com um editor', DE: 'Kamera, ich arbeite mit einem Cutter', FR: 'Caméra, je travaille avec un monteur', IT: 'Fotocamera, lavoro con un editor' },
  'Vos y la marca': { EN: 'You and the brand', PT: 'Você e a marca', DE: 'Du und die Marke', FR: 'Toi et la marque', IT: 'Tu e il brand' },
  '¿Por qué querés crear con Hype?': { EN: 'Why do you want to create with Hype?', PT: 'Por que você quer criar com a Hype?', DE: 'Warum willst du mit Hype kreieren?', FR: 'Pourquoi veux-tu créer avec Hype ?', IT: 'Perché vuoi creare con Hype?' },
  '¿Qué prenda de Hype te pondrías mañana, y por qué esa?': {
    EN: 'Which Hype piece would you wear tomorrow, and why that one?',
    PT: 'Qual peça da Hype você usaria amanhã, e por que essa?',
    DE: 'Welches Hype-Teil würdest du morgen tragen, und warum genau das?',
    FR: 'Quelle pièce Hype porterais-tu demain, et pourquoi celle-là ?',
    IT: 'Quale capo Hype indosseresti domani, e perché proprio quello?',
  },
  '¿Qué talle usás?': { EN: 'What size do you wear?', PT: 'Que tamanho você usa?', DE: 'Welche Größe trägst du?', FR: 'Quelle taille portes-tu ?', IT: 'Che taglia porti?' },
  '¿Cómo te identificás? (opcional)': { EN: 'How do you identify? (optional)', PT: 'Como você se identifica? (opcional)', DE: 'Wie identifizierst du dich? (optional)', FR: 'Comment t’identifies-tu ? (facultatif)', IT: 'Come ti identifichi? (facoltativo)' },
  'Mujer': { EN: 'Woman', PT: 'Mulher', DE: 'Frau', FR: 'Femme', IT: 'Donna' },
  'Hombre': { EN: 'Man', PT: 'Homem', DE: 'Mann', FR: 'Homme', IT: 'Uomo' },
  'Otro': { EN: 'Other', PT: 'Outro', DE: 'Andere', FR: 'Autre', IT: 'Altro' },
  '¿Trabajaste con otras marcas? (opcional)': {
    EN: 'Have you worked with other brands? (optional)',
    PT: 'Você já trabalhou com outras marcas? (opcional)',
    DE: 'Hast du schon mit anderen Marken gearbeitet? (optional)',
    FR: 'As-tu déjà travaillé avec d’autres marques ? (facultatif)',
    IT: 'Hai lavorato con altri brand? (facoltativo)',
  },
  'Enviar postulación': { EN: 'Send application', PT: 'Enviar candidatura', DE: 'Bewerbung senden', FR: 'Envoyer ma candidature', IT: 'Invia candidatura' },
  'La revisa nuestra content manager. Si hay match, te escribimos.': {
    EN: 'Our content manager reviews it. If there is a match, we will write to you.',
    PT: 'Nossa content manager revisa. Se houver match, entramos em contato.',
    DE: 'Unsere Content Managerin schaut sie sich an. Wenn es passt, melden wir uns bei dir.',
    FR: 'Notre content manager la lit. S’il y a un match, on t’écrit.',
    IT: 'La legge la nostra content manager. Se c’è un match, ti scriviamo.',
  },
  'Recibimos tu postulación': { EN: 'We got your application', PT: 'Recebemos sua candidatura', DE: 'Wir haben deine Bewerbung erhalten', FR: 'Nous avons reçu ta candidature', IT: 'Abbiamo ricevuto la tua candidatura' },
  'Actualizamos tu postulación': { EN: 'We updated your application', PT: 'Atualizamos sua candidatura', DE: 'Wir haben deine Bewerbung aktualisiert', FR: 'Nous avons mis à jour ta candidature', IT: 'Abbiamo aggiornato la tua candidatura' },
  'Volver al sitio': { EN: 'Back to the site', PT: 'Voltar ao site', DE: 'Zurück zur Website', FR: 'Retour au site', IT: 'Torna al sito' },
  'Nos falta': { EN: 'We still need', PT: 'Ainda falta', DE: 'Uns fehlt noch', FR: 'Il nous manque', IT: 'Ci manca' },
  'tu nombre': { EN: 'your name', PT: 'seu nome', DE: 'dein Name', FR: 'ton nom', IT: 'il tuo nome' },
  'un mail válido': { EN: 'a valid email', PT: 'um e-mail válido', DE: 'eine gültige E-Mail', FR: 'un e-mail valide', IT: 'un’e-mail valida' },
  'al menos una cuenta': { EN: 'at least one account', PT: 'ao menos uma conta', DE: 'mindestens ein Konto', FR: 'au moins un compte', IT: 'almeno un account' },
  'por qué querés crear con nosotros': { EN: 'why you want to create with us', PT: 'por que você quer criar conosco', DE: 'warum du mit uns kreieren willst', FR: 'pourquoi tu veux créer avec nous', IT: 'perché vuoi creare con noi' },
  'los datos de un adulto responsable': { EN: 'the details of a responsible adult', PT: 'os dados de um adulto responsável', DE: 'die Daten einer verantwortlichen erwachsenen Person', FR: 'les coordonnées d’un adulte responsable', IT: 'i dati di un adulto responsabile' },
  'No pudimos enviar tu postulación': { EN: 'We could not send your application', PT: 'Não conseguimos enviar sua candidatura', DE: 'Wir konnten deine Bewerbung nicht senden', FR: 'Nous n’avons pas pu envoyer ta candidature', IT: 'Non siamo riusciti a inviare la tua candidatura' },
  'Idioma': { EN: 'Language', PT: 'Idioma', DE: 'Sprache', FR: 'Langue', IT: 'Lingua' },

  // — LocalePopup (selector del Navbar) —
  'Idioma y moneda': { EN: 'Language and currency', PT: 'Idioma e moeda', DE: 'Sprache und Währung', FR: 'Langue et devise', IT: 'Lingua e valuta' },
  'Moneda': { EN: 'Currency', PT: 'Moeda', DE: 'Währung', FR: 'Devise', IT: 'Valuta' },
  'Pesos argentinos': { EN: 'Argentine pesos', PT: 'Pesos argentinos', DE: 'Argentinische Pesos', FR: 'Pesos argentins', IT: 'Pesos argentini' },
  'Dólares': { EN: 'US dollars', PT: 'Dólares', DE: 'US-Dollar', FR: 'Dollars américains', IT: 'Dollari USA' },
  'Euros': { EN: 'Euros', PT: 'Euros', DE: 'Euro', FR: 'Euros', IT: 'Euro' },

};

export function translate(text: string, lang: Language): string {
  if (lang === 'ES') return text;
  return DICT[text]?.[lang] ?? text;
}

/**
 * Solo para tests y auditoría: qué claves del diccionario no tienen columna
 * para un idioma. Devuelve vacío cuando la columna está completa.
 */
export function missingTranslations(lang: Exclude<Language, 'ES'>): string[] {
  return Object.entries(DICT)
    .filter(([, cols]) => Object.keys(cols).length > 0 && !cols[lang])
    .map(([key]) => key);
}
