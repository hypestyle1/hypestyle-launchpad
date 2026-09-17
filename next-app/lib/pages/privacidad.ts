import type { Localized, Section } from './types';

export type PrivacidadContent = {
  heroTitle: string;
  heroText: string;
  sections: Section[];
  updatedLabel: string;
  updatedText: string;
  ctaQuestion: string;
  ctaButton: string;
};

const IG = 'https://instagram.com/hypestylearg';

export const PRIVACIDAD: Localized<PrivacidadContent> = {
  ES: {
    heroTitle: 'Política de privacidad',
    heroText:
      'En HYPESTYLE® respetamos tu privacidad. Acá te contamos qué información recolectamos, cómo la usamos y qué derechos tenés sobre ella.',
    sections: [
      {
        title: '¿Qué información recolectamos?',
        blocks: [
          { p: 'Cuando comprás en HYPESTYLE® o interactuás con nuestros canales de atención, podemos recolectar:' },
          { ul: [
            'Datos de contacto: nombre, email, teléfono, dirección de envío y facturación.',
            'Datos de la compra: productos, talles, montos, método de pago (no almacenamos números de tarjeta; eso lo procesa directamente la pasarela de pago).',
            'Mensajes que nos enviás por WhatsApp, Instagram o el formulario de contacto, incluyendo imágenes, audios o documentos que compartas para resolver tu consulta.',
            'Datos de navegación en el sitio (páginas visitadas, dispositivo, cookies) a través de Meta Pixel y herramientas de analítica.',
          ] },
        ],
      },
      {
        title: '¿Para qué usamos tu información?',
        blocks: [
          { p: 'Usamos tus datos exclusivamente para:' },
          { ul: [
            'Procesar, preparar y despachar tu pedido.',
            'Responder tus consultas de atención al cliente, incluyendo a través de nuestro asistente automatizado de WhatsApp/Instagram.',
            'Enviarte notificaciones sobre el estado de tu compra (confirmación, envío, entrega).',
            'Mejorar nuestras campañas publicitarias en Meta (Facebook/Instagram) mediante datos agregados y anónimos de navegación.',
            'Enviarte comunicaciones de marketing por email, solo si diste tu consentimiento (podés darte de baja en cualquier momento).',
          ] },
          { p: 'No vendemos tu información personal a terceros.' },
        ],
      },
      {
        title: 'Asistente automatizado (WhatsApp / Instagram)',
        blocks: [
          { p: 'Parte de nuestra atención al cliente por WhatsApp e Instagram es gestionada por un asistente automatizado que utiliza inteligencia artificial (Anthropic Claude) para responder consultas frecuentes: estado de pedidos, stock, talles y productos.' },
          { p: 'Si nos escribís una imagen, audio o documento (por ejemplo, para reportar una falla o un comprobante), esos archivos se procesan automáticamente para poder darte una respuesta, mediante servicios de terceros (Anthropic y OpenAI para transcripción de audio). No los usamos con ningún otro fin ni los compartimos fuera de ese proceso.' },
          { p: 'Si tu consulta requiere intervención humana, el asistente deriva la conversación a una persona del equipo.' },
        ],
      },
      {
        title: '¿Con quién compartimos tus datos?',
        blocks: [
          { p: 'Para poder operar la tienda, compartimos información puntual con proveedores que nos prestan servicio, únicamente en la medida necesaria para cumplir su función:' },
          { ul: [
            'Pasarelas de pago (Mercado Pago, PayPal, Getnet, Talo Pay) para procesar tu compra.',
            'Correo Argentino / Andreani para la logística de envío.',
            'Meta (Facebook/Instagram/WhatsApp) para publicidad y para el funcionamiento de nuestros canales de atención.',
            'Proveedores de email transaccional (Brevo) para mandarte confirmaciones y novedades de tu pedido.',
            'Proveedores de inteligencia artificial (Anthropic, OpenAI) para el funcionamiento del asistente de atención automatizado.',
          ] },
          { p: 'Todos estos proveedores tienen sus propias políticas de privacidad y solo acceden a los datos estrictamente necesarios para prestar su servicio.' },
        ],
      },
      {
        title: 'Cookies y Meta Pixel',
        blocks: [
          { p: 'Nuestro sitio usa cookies propias y de terceros, incluyendo Meta Pixel, para entender cómo se navega el sitio y medir el rendimiento de nuestras campañas publicitarias. Podés gestionar tus preferencias de cookies desde el banner que aparece al ingresar al sitio, o desde la configuración de tu navegador.' },
        ],
      },
      {
        title: '¿Cuánto tiempo conservamos tus datos?',
        blocks: [
          { p: 'Conservamos los datos de tus compras mientras sea necesario para cumplir obligaciones legales, impositivas y de garantía. Las conversaciones de atención al cliente se conservan por un tiempo razonable para poder darte seguimiento a futuras consultas relacionadas con tu compra.' },
        ],
      },
      {
        title: 'Tus derechos',
        blocks: [
          { p: 'De acuerdo con la Ley 25.326 de Protección de Datos Personales de Argentina, tenés derecho a acceder, rectificar, actualizar o solicitar la eliminación de tus datos personales.' },
          { p: 'La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales.' },
          { p: `Para ejercer estos derechos, escribinos por nuestro canal oficial: [@hypestylearg](${IG}) en Instagram.` },
        ],
      },
      {
        title: 'Menores de edad',
        blocks: [
          { p: 'Nuestros productos y servicios están dirigidos a personas mayores de 18 años. No recolectamos intencionalmente datos de menores de edad sin el consentimiento de sus padres o tutores.' },
        ],
      },
      {
        title: 'Cambios en esta política',
        blocks: [
          { p: 'Podemos actualizar esta política de privacidad ocasionalmente para reflejar cambios en nuestras prácticas o por motivos legales u operativos. La fecha de última actualización figura al pie de esta página.' },
        ],
      },
    ],
    updatedLabel: 'Última actualización',
    updatedText: 'Julio de 2026.',
    ctaQuestion: '¿Tenés una consulta sobre tus datos personales?',
    ctaButton: 'Contactarnos por Instagram',
  },

  EN: {
    heroTitle: 'Privacy policy',
    heroText:
      'At HYPESTYLE® we respect your privacy. Here we explain what information we collect, how we use it and what rights you have over it.',
    sections: [
      {
        title: 'What information do we collect?',
        blocks: [
          { p: 'When you buy at HYPESTYLE® or interact with our support channels, we may collect:' },
          { ul: [
            'Contact details: name, email, phone number, shipping and billing address.',
            'Purchase details: products, sizes, amounts, payment method (we do not store card numbers; the payment gateway processes them directly).',
            'Messages you send us on WhatsApp, Instagram or the contact form, including images, audio or documents you share to resolve your enquiry.',
            'Browsing data on the site (pages visited, device, cookies) through Meta Pixel and analytics tools.',
          ] },
        ],
      },
      {
        title: 'What do we use your information for?',
        blocks: [
          { p: 'We use your data exclusively to:' },
          { ul: [
            'Process, prepare and ship your order.',
            'Answer your customer support enquiries, including through our automated WhatsApp/Instagram assistant.',
            'Send you notifications about the status of your purchase (confirmation, shipping, delivery).',
            'Improve our advertising campaigns on Meta (Facebook/Instagram) using aggregated, anonymous browsing data.',
            'Send you marketing emails, only if you gave your consent (you can unsubscribe at any time).',
          ] },
          { p: 'We do not sell your personal information to third parties.' },
        ],
      },
      {
        title: 'Automated assistant (WhatsApp / Instagram)',
        blocks: [
          { p: 'Part of our customer support on WhatsApp and Instagram is handled by an automated assistant that uses artificial intelligence (Anthropic Claude) to answer frequent questions: order status, stock, sizes and products.' },
          { p: 'If you send us an image, audio or document (for example, to report a defect or a payment receipt), those files are processed automatically so we can respond, through third-party services (Anthropic, and OpenAI for audio transcription). We do not use them for any other purpose or share them outside that process.' },
          { p: 'If your enquiry requires a human, the assistant hands the conversation over to a member of the team.' },
        ],
      },
      {
        title: 'Who do we share your data with?',
        blocks: [
          { p: 'To run the store, we share specific information with service providers, only to the extent needed for them to do their job:' },
          { ul: [
            'Payment gateways (Mercado Pago, PayPal, Getnet, Talo Pay) to process your purchase.',
            'Correo Argentino / Andreani for shipping logistics.',
            'Meta (Facebook/Instagram/WhatsApp) for advertising and for the operation of our support channels.',
            'Transactional email providers (Brevo) to send you confirmations and updates about your order.',
            'Artificial intelligence providers (Anthropic, OpenAI) for the operation of the automated support assistant.',
          ] },
          { p: 'All these providers have their own privacy policies and only access the data strictly needed to provide their service.' },
        ],
      },
      {
        title: 'Cookies and Meta Pixel',
        blocks: [
          { p: 'Our site uses first- and third-party cookies, including Meta Pixel, to understand how the site is browsed and to measure the performance of our advertising campaigns. You can manage your cookie preferences from the banner shown when you enter the site, or from your browser settings.' },
        ],
      },
      {
        title: 'How long do we keep your data?',
        blocks: [
          { p: 'We keep your purchase data for as long as needed to meet legal, tax and warranty obligations. Customer support conversations are kept for a reasonable period so we can follow up on future enquiries related to your purchase.' },
        ],
      },
      {
        title: 'Your rights',
        blocks: [
          { p: 'Under Argentine Personal Data Protection Law 25.326, you have the right to access, rectify, update or request the deletion of your personal data.' },
          { p: 'The Agency for Access to Public Information, as the supervisory body for Law 25.326, is empowered to handle complaints and claims regarding non-compliance with personal data protection rules.' },
          { p: `To exercise these rights, write to us through our official channel: [@hypestylearg](${IG}) on Instagram.` },
        ],
      },
      {
        title: 'Minors',
        blocks: [
          { p: 'Our products and services are aimed at people over 18. We do not knowingly collect data from minors without the consent of their parents or guardians.' },
        ],
      },
      {
        title: 'Changes to this policy',
        blocks: [
          { p: 'We may update this privacy policy from time to time to reflect changes in our practices or for legal or operational reasons. The date of the last update is shown at the bottom of this page.' },
        ],
      },
    ],
    updatedLabel: 'Last updated',
    updatedText: 'July 2026.',
    ctaQuestion: 'Have a question about your personal data?',
    ctaButton: 'Contact us on Instagram',
  },

  PT: {
    heroTitle: 'Política de privacidade',
    heroText:
      'Na HYPESTYLE® respeitamos a sua privacidade. Aqui contamos quais informações coletamos, como as usamos e quais direitos você tem sobre elas.',
    sections: [
      {
        title: 'Quais informações coletamos?',
        blocks: [
          { p: 'Quando você compra na HYPESTYLE® ou interage com nossos canais de atendimento, podemos coletar:' },
          { ul: [
            'Dados de contato: nome, e-mail, telefone, endereço de envio e de faturamento.',
            'Dados da compra: produtos, tamanhos, valores, forma de pagamento (não armazenamos números de cartão; isso é processado diretamente pela plataforma de pagamento).',
            'Mensagens que você nos envia pelo WhatsApp, Instagram ou formulário de contato, incluindo imagens, áudios ou documentos compartilhados para resolver sua consulta.',
            'Dados de navegação no site (páginas visitadas, dispositivo, cookies) por meio do Meta Pixel e ferramentas de análise.',
          ] },
        ],
      },
      {
        title: 'Para que usamos suas informações?',
        blocks: [
          { p: 'Usamos seus dados exclusivamente para:' },
          { ul: [
            'Processar, preparar e despachar seu pedido.',
            'Responder suas consultas de atendimento, inclusive por meio do nosso assistente automatizado de WhatsApp/Instagram.',
            'Enviar notificações sobre o status da sua compra (confirmação, envio, entrega).',
            'Melhorar nossas campanhas publicitárias na Meta (Facebook/Instagram) com dados de navegação agregados e anônimos.',
            'Enviar comunicações de marketing por e-mail, somente se você deu consentimento (pode cancelar a qualquer momento).',
          ] },
          { p: 'Não vendemos suas informações pessoais a terceiros.' },
        ],
      },
      {
        title: 'Assistente automatizado (WhatsApp / Instagram)',
        blocks: [
          { p: 'Parte do nosso atendimento pelo WhatsApp e Instagram é feita por um assistente automatizado que usa inteligência artificial (Anthropic Claude) para responder dúvidas frequentes: status de pedidos, estoque, tamanhos e produtos.' },
          { p: 'Se você nos envia uma imagem, áudio ou documento (por exemplo, para relatar um defeito ou um comprovante), esses arquivos são processados automaticamente para podermos responder, por meio de serviços de terceiros (Anthropic e OpenAI para transcrição de áudio). Não os usamos para nenhum outro fim nem os compartilhamos fora desse processo.' },
          { p: 'Se sua consulta precisa de intervenção humana, o assistente encaminha a conversa para uma pessoa da equipe.' },
        ],
      },
      {
        title: 'Com quem compartilhamos seus dados?',
        blocks: [
          { p: 'Para operar a loja, compartilhamos informações pontuais com fornecedores que nos prestam serviço, apenas na medida necessária para cumprir sua função:' },
          { ul: [
            'Plataformas de pagamento (Mercado Pago, PayPal, Getnet, Talo Pay) para processar sua compra.',
            'Correo Argentino / Andreani para a logística de envio.',
            'Meta (Facebook/Instagram/WhatsApp) para publicidade e para o funcionamento dos nossos canais de atendimento.',
            'Provedores de e-mail transacional (Brevo) para enviar confirmações e novidades do seu pedido.',
            'Provedores de inteligência artificial (Anthropic, OpenAI) para o funcionamento do assistente automatizado.',
          ] },
          { p: 'Todos esses fornecedores têm suas próprias políticas de privacidade e só acessam os dados estritamente necessários para prestar o serviço.' },
        ],
      },
      {
        title: 'Cookies e Meta Pixel',
        blocks: [
          { p: 'Nosso site usa cookies próprios e de terceiros, incluindo o Meta Pixel, para entender como o site é navegado e medir o desempenho das nossas campanhas. Você pode gerenciar suas preferências de cookies no banner que aparece ao entrar no site ou nas configurações do navegador.' },
        ],
      },
      {
        title: 'Por quanto tempo guardamos seus dados?',
        blocks: [
          { p: 'Guardamos os dados das suas compras pelo tempo necessário para cumprir obrigações legais, fiscais e de garantia. As conversas de atendimento são guardadas por um período razoável para dar continuidade a futuras consultas relacionadas à sua compra.' },
        ],
      },
      {
        title: 'Seus direitos',
        blocks: [
          { p: 'De acordo com a Lei 25.326 de Proteção de Dados Pessoais da Argentina, você tem direito a acessar, corrigir, atualizar ou solicitar a exclusão dos seus dados pessoais.' },
          { p: 'A Agência de Acesso à Informação Pública, como órgão de controle da Lei nº 25.326, tem a atribuição de atender denúncias e reclamações relativas ao descumprimento das normas de proteção de dados pessoais.' },
          { p: `Para exercer esses direitos, escreva pelo nosso canal oficial: [@hypestylearg](${IG}) no Instagram.` },
        ],
      },
      {
        title: 'Menores de idade',
        blocks: [
          { p: 'Nossos produtos e serviços são destinados a maiores de 18 anos. Não coletamos intencionalmente dados de menores sem o consentimento dos pais ou responsáveis.' },
        ],
      },
      {
        title: 'Alterações nesta política',
        blocks: [
          { p: 'Podemos atualizar esta política de privacidade ocasionalmente para refletir mudanças nas nossas práticas ou por motivos legais ou operacionais. A data da última atualização está no final desta página.' },
        ],
      },
    ],
    updatedLabel: 'Última atualização',
    updatedText: 'Julho de 2026.',
    ctaQuestion: 'Tem uma dúvida sobre seus dados pessoais?',
    ctaButton: 'Fale conosco no Instagram',
  },

  DE: {
    heroTitle: 'Datenschutzerklärung',
    heroText:
      'Bei HYPESTYLE® respektieren wir deine Privatsphäre. Hier erklären wir, welche Daten wir erheben, wie wir sie nutzen und welche Rechte du daran hast.',
    sections: [
      {
        title: 'Welche Daten erheben wir?',
        blocks: [
          { p: 'Wenn du bei HYPESTYLE® kaufst oder unsere Kontaktkanäle nutzt, können wir Folgendes erheben:' },
          { ul: [
            'Kontaktdaten: Name, E-Mail, Telefon, Liefer- und Rechnungsadresse.',
            'Kaufdaten: Produkte, Größen, Beträge, Zahlungsart (Kartennummern speichern wir nicht; die verarbeitet direkt der Zahlungsanbieter).',
            'Nachrichten, die du uns per WhatsApp, Instagram oder Kontaktformular schickst, einschließlich Bilder, Audios oder Dokumente, die du zur Klärung deiner Anfrage teilst.',
            'Nutzungsdaten auf der Website (besuchte Seiten, Gerät, Cookies) über Meta Pixel und Analyse-Tools.',
          ] },
        ],
      },
      {
        title: 'Wofür nutzen wir deine Daten?',
        blocks: [
          { p: 'Wir nutzen deine Daten ausschließlich, um:' },
          { ul: [
            'Deine Bestellung zu bearbeiten, vorzubereiten und zu versenden.',
            'Deine Kundenanfragen zu beantworten, auch über unseren automatisierten WhatsApp-/Instagram-Assistenten.',
            'Dir Benachrichtigungen zum Status deiner Bestellung zu senden (Bestätigung, Versand, Zustellung).',
            'Unsere Werbekampagnen auf Meta (Facebook/Instagram) mit aggregierten, anonymen Nutzungsdaten zu verbessern.',
            'Dir Marketing-E-Mails zu senden, nur wenn du eingewilligt hast (du kannst dich jederzeit abmelden).',
          ] },
          { p: 'Wir verkaufen deine persönlichen Daten nicht an Dritte.' },
        ],
      },
      {
        title: 'Automatisierter Assistent (WhatsApp / Instagram)',
        blocks: [
          { p: 'Ein Teil unseres Kundenservice auf WhatsApp und Instagram wird von einem automatisierten Assistenten übernommen, der künstliche Intelligenz (Anthropic Claude) nutzt, um häufige Fragen zu beantworten: Bestellstatus, Verfügbarkeit, Größen und Produkte.' },
          { p: 'Wenn du uns ein Bild, eine Audionachricht oder ein Dokument schickst (zum Beispiel, um einen Mangel oder einen Zahlungsbeleg zu melden), werden diese Dateien automatisch verarbeitet, damit wir dir antworten können, über Dienste Dritter (Anthropic sowie OpenAI für die Audiotranskription). Wir nutzen sie zu keinem anderen Zweck und geben sie außerhalb dieses Prozesses nicht weiter.' },
          { p: 'Wenn deine Anfrage einen Menschen erfordert, leitet der Assistent das Gespräch an ein Teammitglied weiter.' },
        ],
      },
      {
        title: 'Mit wem teilen wir deine Daten?',
        blocks: [
          { p: 'Um den Shop zu betreiben, teilen wir bestimmte Daten mit Dienstleistern, nur soweit es für ihre Aufgabe nötig ist:' },
          { ul: [
            'Zahlungsanbieter (Mercado Pago, PayPal, Getnet, Talo Pay) zur Abwicklung deines Kaufs.',
            'Correo Argentino / Andreani für die Versandlogistik.',
            'Meta (Facebook/Instagram/WhatsApp) für Werbung und für den Betrieb unserer Kontaktkanäle.',
            'Anbieter für Transaktions-E-Mails (Brevo), um dir Bestätigungen und Neuigkeiten zu deiner Bestellung zu schicken.',
            'KI-Anbieter (Anthropic, OpenAI) für den Betrieb des automatisierten Assistenten.',
          ] },
          { p: 'Alle diese Anbieter haben eigene Datenschutzrichtlinien und greifen nur auf die Daten zu, die für ihre Leistung unbedingt nötig sind.' },
        ],
      },
      {
        title: 'Cookies und Meta Pixel',
        blocks: [
          { p: 'Unsere Website verwendet eigene Cookies und Cookies Dritter, darunter Meta Pixel, um zu verstehen, wie die Seite genutzt wird, und die Leistung unserer Werbekampagnen zu messen. Du kannst deine Cookie-Einstellungen über das Banner beim Betreten der Seite oder in deinem Browser verwalten.' },
        ],
      },
      {
        title: 'Wie lange bewahren wir deine Daten auf?',
        blocks: [
          { p: 'Wir bewahren deine Kaufdaten so lange auf, wie es zur Erfüllung gesetzlicher, steuerlicher und Gewährleistungspflichten nötig ist. Kundenservice-Gespräche werden für einen angemessenen Zeitraum aufbewahrt, um künftige Anfragen zu deinem Kauf nachverfolgen zu können.' },
        ],
      },
      {
        title: 'Deine Rechte',
        blocks: [
          { p: 'Nach dem argentinischen Datenschutzgesetz 25.326 hast du das Recht, auf deine personenbezogenen Daten zuzugreifen, sie zu berichtigen, zu aktualisieren oder ihre Löschung zu verlangen.' },
          { p: 'Die Agentur für den Zugang zu öffentlichen Informationen ist als Aufsichtsbehörde des Gesetzes Nr. 25.326 befugt, Beschwerden wegen Verstößen gegen die Datenschutzvorschriften zu bearbeiten.' },
          { p: `Um diese Rechte auszuüben, schreib uns über unseren offiziellen Kanal: [@hypestylearg](${IG}) auf Instagram.` },
        ],
      },
      {
        title: 'Minderjährige',
        blocks: [
          { p: 'Unsere Produkte und Dienste richten sich an Personen über 18 Jahre. Wir erheben nicht wissentlich Daten von Minderjährigen ohne Zustimmung der Eltern oder Erziehungsberechtigten.' },
        ],
      },
      {
        title: 'Änderungen dieser Erklärung',
        blocks: [
          { p: 'Wir können diese Datenschutzerklärung gelegentlich aktualisieren, um Änderungen unserer Praxis oder rechtliche bzw. betriebliche Gründe abzubilden. Das Datum der letzten Aktualisierung steht am Ende dieser Seite.' },
        ],
      },
    ],
    updatedLabel: 'Letzte Aktualisierung',
    updatedText: 'Juli 2026.',
    ctaQuestion: 'Hast du eine Frage zu deinen Daten?',
    ctaButton: 'Schreib uns auf Instagram',
  },

  FR: {
    heroTitle: 'Politique de confidentialité',
    heroText:
      "Chez HYPESTYLE® nous respectons ta vie privée. Voici quelles informations nous collectons, comment nous les utilisons et quels droits tu as dessus.",
    sections: [
      {
        title: 'Quelles informations collectons-nous ?',
        blocks: [
          { p: 'Lorsque tu achètes chez HYPESTYLE® ou que tu utilises nos canaux de contact, nous pouvons collecter :' },
          { ul: [
            'Coordonnées : nom, e-mail, téléphone, adresse de livraison et de facturation.',
            "Données d'achat : produits, tailles, montants, moyen de paiement (nous ne stockons pas les numéros de carte ; ils sont traités directement par la plateforme de paiement).",
            'Messages que tu nous envoies sur WhatsApp, Instagram ou via le formulaire de contact, y compris les images, audios ou documents partagés pour résoudre ta demande.',
            'Données de navigation sur le site (pages visitées, appareil, cookies) via Meta Pixel et des outils d\'analyse.',
          ] },
        ],
      },
      {
        title: 'À quoi servent tes informations ?',
        blocks: [
          { p: 'Nous utilisons tes données exclusivement pour :' },
          { ul: [
            'Traiter, préparer et expédier ta commande.',
            'Répondre à tes demandes de service client, y compris via notre assistant automatisé WhatsApp/Instagram.',
            "T'envoyer des notifications sur l'état de ta commande (confirmation, expédition, livraison).",
            'Améliorer nos campagnes publicitaires sur Meta (Facebook/Instagram) à partir de données de navigation agrégées et anonymes.',
            "T'envoyer des communications marketing par e-mail, uniquement si tu as donné ton consentement (tu peux te désabonner à tout moment).",
          ] },
          { p: 'Nous ne vendons pas tes informations personnelles à des tiers.' },
        ],
      },
      {
        title: 'Assistant automatisé (WhatsApp / Instagram)',
        blocks: [
          { p: "Une partie de notre service client sur WhatsApp et Instagram est gérée par un assistant automatisé qui utilise l'intelligence artificielle (Anthropic Claude) pour répondre aux questions fréquentes : état des commandes, stock, tailles et produits." },
          { p: "Si tu nous envoies une image, un audio ou un document (par exemple pour signaler un défaut ou un justificatif de paiement), ces fichiers sont traités automatiquement pour pouvoir te répondre, via des services tiers (Anthropic, et OpenAI pour la transcription audio). Nous ne les utilisons à aucune autre fin et ne les partageons pas en dehors de ce processus." },
          { p: "Si ta demande nécessite une intervention humaine, l'assistant transmet la conversation à une personne de l'équipe." },
        ],
      },
      {
        title: 'Avec qui partageons-nous tes données ?',
        blocks: [
          { p: "Pour faire fonctionner la boutique, nous partageons des informations ponctuelles avec des prestataires, uniquement dans la mesure nécessaire à leur mission :" },
          { ul: [
            'Plateformes de paiement (Mercado Pago, PayPal, Getnet, Talo Pay) pour traiter ton achat.',
            'Correo Argentino / Andreani pour la logistique de livraison.',
            'Meta (Facebook/Instagram/WhatsApp) pour la publicité et le fonctionnement de nos canaux de contact.',
            "Prestataires d'e-mails transactionnels (Brevo) pour t'envoyer les confirmations et les nouvelles de ta commande.",
            "Fournisseurs d'intelligence artificielle (Anthropic, OpenAI) pour le fonctionnement de l'assistant automatisé.",
          ] },
          { p: 'Tous ces prestataires ont leur propre politique de confidentialité et n\'accèdent qu\'aux données strictement nécessaires à leur service.' },
        ],
      },
      {
        title: 'Cookies et Meta Pixel',
        blocks: [
          { p: "Notre site utilise des cookies propres et tiers, dont Meta Pixel, pour comprendre la navigation sur le site et mesurer la performance de nos campagnes publicitaires. Tu peux gérer tes préférences de cookies depuis le bandeau affiché à l'entrée du site ou dans les paramètres de ton navigateur." },
        ],
      },
      {
        title: 'Combien de temps conservons-nous tes données ?',
        blocks: [
          { p: "Nous conservons les données de tes achats aussi longtemps que nécessaire pour respecter nos obligations légales, fiscales et de garantie. Les conversations du service client sont conservées pendant une durée raisonnable afin de pouvoir assurer le suivi de futures demandes liées à ton achat." },
        ],
      },
      {
        title: 'Tes droits',
        blocks: [
          { p: "Conformément à la loi argentine 25.326 sur la protection des données personnelles, tu as le droit d'accéder à tes données, de les rectifier, de les mettre à jour ou d'en demander la suppression." },
          { p: "L'Agence d'accès à l'information publique, en tant qu'organe de contrôle de la loi n° 25.326, est habilitée à traiter les plaintes et réclamations relatives au non-respect des règles de protection des données personnelles." },
          { p: `Pour exercer ces droits, écris-nous via notre canal officiel : [@hypestylearg](${IG}) sur Instagram.` },
        ],
      },
      {
        title: 'Mineurs',
        blocks: [
          { p: "Nos produits et services s'adressent aux personnes de plus de 18 ans. Nous ne collectons pas sciemment de données de mineurs sans le consentement de leurs parents ou tuteurs." },
        ],
      },
      {
        title: 'Modifications de cette politique',
        blocks: [
          { p: "Nous pouvons mettre à jour cette politique de confidentialité de temps à autre pour refléter des changements dans nos pratiques ou pour des raisons légales ou opérationnelles. La date de la dernière mise à jour figure en bas de cette page." },
        ],
      },
    ],
    updatedLabel: 'Dernière mise à jour',
    updatedText: 'Juillet 2026.',
    ctaQuestion: 'Tu as une question sur tes données personnelles ?',
    ctaButton: 'Nous contacter sur Instagram',
  },

  IT: {
    heroTitle: 'Informativa sulla privacy',
    heroText:
      'In HYPESTYLE® rispettiamo la tua privacy. Qui ti spieghiamo quali informazioni raccogliamo, come le usiamo e quali diritti hai su di esse.',
    sections: [
      {
        title: 'Quali informazioni raccogliamo?',
        blocks: [
          { p: 'Quando acquisti su HYPESTYLE® o interagisci con i nostri canali di assistenza, possiamo raccogliere:' },
          { ul: [
            'Dati di contatto: nome, e-mail, telefono, indirizzo di spedizione e di fatturazione.',
            "Dati dell'acquisto: prodotti, taglie, importi, metodo di pagamento (non conserviamo i numeri di carta; li elabora direttamente la piattaforma di pagamento).",
            'Messaggi che ci invii su WhatsApp, Instagram o tramite il modulo di contatto, incluse immagini, audio o documenti condivisi per risolvere la tua richiesta.',
            'Dati di navigazione sul sito (pagine visitate, dispositivo, cookie) tramite Meta Pixel e strumenti di analisi.',
          ] },
        ],
      },
      {
        title: 'Per cosa usiamo le tue informazioni?',
        blocks: [
          { p: 'Usiamo i tuoi dati esclusivamente per:' },
          { ul: [
            'Elaborare, preparare e spedire il tuo ordine.',
            'Rispondere alle tue richieste di assistenza, anche tramite il nostro assistente automatico su WhatsApp/Instagram.',
            "Inviarti notifiche sullo stato dell'acquisto (conferma, spedizione, consegna).",
            'Migliorare le nostre campagne pubblicitarie su Meta (Facebook/Instagram) con dati di navigazione aggregati e anonimi.',
            'Inviarti comunicazioni di marketing via e-mail, solo se hai dato il consenso (puoi disiscriverti in qualsiasi momento).',
          ] },
          { p: 'Non vendiamo le tue informazioni personali a terzi.' },
        ],
      },
      {
        title: 'Assistente automatico (WhatsApp / Instagram)',
        blocks: [
          { p: "Parte della nostra assistenza clienti su WhatsApp e Instagram è gestita da un assistente automatico che usa l'intelligenza artificiale (Anthropic Claude) per rispondere alle domande frequenti: stato degli ordini, disponibilità, taglie e prodotti." },
          { p: "Se ci invii un'immagine, un audio o un documento (per esempio per segnalare un difetto o una ricevuta di pagamento), quei file vengono elaborati automaticamente per poterti rispondere, tramite servizi di terzi (Anthropic e OpenAI per la trascrizione audio). Non li usiamo per nessun altro scopo né li condividiamo al di fuori di quel processo." },
          { p: "Se la tua richiesta ha bisogno di una persona, l'assistente passa la conversazione a un membro del team." },
        ],
      },
      {
        title: 'Con chi condividiamo i tuoi dati?',
        blocks: [
          { p: 'Per far funzionare il negozio, condividiamo informazioni specifiche con fornitori che ci prestano servizio, solo nella misura necessaria a svolgere la loro funzione:' },
          { ul: [
            'Piattaforme di pagamento (Mercado Pago, PayPal, Getnet, Talo Pay) per elaborare il tuo acquisto.',
            'Correo Argentino / Andreani per la logistica delle spedizioni.',
            'Meta (Facebook/Instagram/WhatsApp) per la pubblicità e per il funzionamento dei nostri canali di assistenza.',
            'Fornitori di e-mail transazionali (Brevo) per inviarti conferme e aggiornamenti sul tuo ordine.',
            "Fornitori di intelligenza artificiale (Anthropic, OpenAI) per il funzionamento dell'assistente automatico.",
          ] },
          { p: 'Tutti questi fornitori hanno le proprie informative sulla privacy e accedono solo ai dati strettamente necessari per il loro servizio.' },
        ],
      },
      {
        title: 'Cookie e Meta Pixel',
        blocks: [
          { p: "Il nostro sito usa cookie propri e di terzi, incluso Meta Pixel, per capire come viene navigato il sito e misurare le prestazioni delle nostre campagne pubblicitarie. Puoi gestire le preferenze sui cookie dal banner che compare entrando nel sito o dalle impostazioni del browser." },
        ],
      },
      {
        title: 'Per quanto tempo conserviamo i tuoi dati?',
        blocks: [
          { p: "Conserviamo i dati dei tuoi acquisti per il tempo necessario ad adempiere agli obblighi legali, fiscali e di garanzia. Le conversazioni di assistenza vengono conservate per un periodo ragionevole per poter dare seguito a future richieste legate al tuo acquisto." },
        ],
      },
      {
        title: 'I tuoi diritti',
        blocks: [
          { p: 'In base alla Legge argentina 25.326 sulla protezione dei dati personali, hai il diritto di accedere, rettificare, aggiornare o chiedere la cancellazione dei tuoi dati personali.' },
          { p: "L'Agenzia per l'accesso all'informazione pubblica, in qualità di organo di controllo della Legge n. 25.326, ha il compito di gestire le denunce e i reclami relativi al mancato rispetto delle norme sulla protezione dei dati personali." },
          { p: `Per esercitare questi diritti, scrivici sul nostro canale ufficiale: [@hypestylearg](${IG}) su Instagram.` },
        ],
      },
      {
        title: 'Minori',
        blocks: [
          { p: 'I nostri prodotti e servizi sono rivolti a persone maggiori di 18 anni. Non raccogliamo intenzionalmente dati di minori senza il consenso dei genitori o tutori.' },
        ],
      },
      {
        title: 'Modifiche a questa informativa',
        blocks: [
          { p: "Possiamo aggiornare occasionalmente questa informativa per riflettere cambiamenti nelle nostre pratiche o per motivi legali od operativi. La data dell'ultimo aggiornamento è in fondo a questa pagina." },
        ],
      },
    ],
    updatedLabel: 'Ultimo aggiornamento',
    updatedText: 'Luglio 2026.',
    ctaQuestion: 'Hai una domanda sui tuoi dati personali?',
    ctaButton: 'Contattaci su Instagram',
  },
};
