import type { Localized } from './types';

export type ContactoContent = {
  heroLabel: string;
  heroTitle: string;
  heroText: string;
  formLabel: string;
  thanksTitle: string;
  thanksText: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  submit: string;
  channelsLabel: string;
  channels: { label: string; description: string; action: string }[];
};

// El orden de `channels` es el de la página: WhatsApp, Email, Creadores. El
// href y el ícono viven en el componente; acá solo va el texto.
export const CONTACTO: Localized<ContactoContent> = {
  ES: {
    heroLabel: 'Contacto',
    heroTitle: 'Hablemos',
    heroText: 'Estamos para ayudarte.',
    formLabel: 'Formulario de contacto',
    thanksTitle: '¡Gracias!',
    thanksText: 'Te respondemos en las próximas 24 hs.',
    nameLabel: 'Nombre',
    namePlaceholder: 'Tu nombre',
    emailLabel: 'Email',
    emailPlaceholder: 'tu@email.com',
    messageLabel: 'Mensaje',
    messagePlaceholder: '¿En qué te podemos ayudar?',
    submit: 'Enviar mensaje',
    channelsLabel: 'Canales de atención',
    channels: [
      { label: 'WhatsApp', description: 'La forma más rápida. Respondemos en minutos.', action: 'Escribinos' },
      { label: 'Email', description: 'Para consultas formales o B2B.', action: 'hypestylearg@gmail.com' },
      { label: 'Creadores de contenido', description: '¿Tu estilo va con el universo STYLE&CULTURE? Sumate.', action: 'Postulate acá' },
    ],
  },
  EN: {
    heroLabel: 'Contact',
    heroTitle: "Let's talk",
    heroText: "We're here to help.",
    formLabel: 'Contact form',
    thanksTitle: 'Thank you!',
    thanksText: "We'll get back to you within 24 hours.",
    nameLabel: 'Name',
    namePlaceholder: 'Your name',
    emailLabel: 'Email',
    emailPlaceholder: 'you@email.com',
    messageLabel: 'Message',
    messagePlaceholder: 'How can we help you?',
    submit: 'Send message',
    channelsLabel: 'Support channels',
    channels: [
      { label: 'WhatsApp', description: 'The fastest way. We reply within minutes.', action: 'Message us' },
      { label: 'Email', description: 'For formal or B2B enquiries.', action: 'hypestylearg@gmail.com' },
      { label: 'Content creators', description: 'Does your style fit the STYLE&CULTURE universe? Join us.', action: 'Apply here' },
    ],
  },
  PT: {
    heroLabel: 'Contato',
    heroTitle: 'Vamos conversar',
    heroText: 'Estamos aqui para ajudar.',
    formLabel: 'Formulário de contato',
    thanksTitle: 'Obrigado!',
    thanksText: 'Respondemos nas próximas 24 h.',
    nameLabel: 'Nome',
    namePlaceholder: 'Seu nome',
    emailLabel: 'E-mail',
    emailPlaceholder: 'voce@email.com',
    messageLabel: 'Mensagem',
    messagePlaceholder: 'Como podemos ajudar?',
    submit: 'Enviar mensagem',
    channelsLabel: 'Canais de atendimento',
    channels: [
      { label: 'WhatsApp', description: 'A forma mais rápida. Respondemos em minutos.', action: 'Escreva para nós' },
      { label: 'E-mail', description: 'Para consultas formais ou B2B.', action: 'hypestylearg@gmail.com' },
      { label: 'Criadores de conteúdo', description: 'Seu estilo combina com o universo STYLE&CULTURE? Junte-se a nós.', action: 'Candidate-se aqui' },
    ],
  },
  DE: {
    heroLabel: 'Kontakt',
    heroTitle: 'Reden wir',
    heroText: 'Wir sind für dich da.',
    formLabel: 'Kontaktformular',
    thanksTitle: 'Danke!',
    thanksText: 'Wir antworten dir innerhalb von 24 Stunden.',
    nameLabel: 'Name',
    namePlaceholder: 'Dein Name',
    emailLabel: 'E-Mail',
    emailPlaceholder: 'du@email.com',
    messageLabel: 'Nachricht',
    messagePlaceholder: 'Wobei können wir dir helfen?',
    submit: 'Nachricht senden',
    channelsLabel: 'Kontaktkanäle',
    channels: [
      { label: 'WhatsApp', description: 'Der schnellste Weg. Wir antworten in Minuten.', action: 'Schreib uns' },
      { label: 'E-Mail', description: 'Für formelle oder B2B-Anfragen.', action: 'hypestylearg@gmail.com' },
      { label: 'Content Creator', description: 'Passt dein Stil zum STYLE&CULTURE-Universum? Mach mit.', action: 'Hier bewerben' },
    ],
  },
  FR: {
    heroLabel: 'Contact',
    heroTitle: 'Parlons-en',
    heroText: 'Nous sommes là pour t\'aider.',
    formLabel: 'Formulaire de contact',
    thanksTitle: 'Merci !',
    thanksText: 'Nous te répondons sous 24 h.',
    nameLabel: 'Nom',
    namePlaceholder: 'Ton nom',
    emailLabel: 'E-mail',
    emailPlaceholder: 'toi@email.com',
    messageLabel: 'Message',
    messagePlaceholder: 'Comment pouvons-nous t\'aider ?',
    submit: 'Envoyer le message',
    channelsLabel: 'Canaux de contact',
    channels: [
      { label: 'WhatsApp', description: 'Le plus rapide. Nous répondons en quelques minutes.', action: 'Écris-nous' },
      { label: 'E-mail', description: 'Pour les demandes formelles ou B2B.', action: 'hypestylearg@gmail.com' },
      { label: 'Créateurs de contenu', description: "Ton style colle à l'univers STYLE&CULTURE ? Rejoins-nous.", action: 'Postule ici' },
    ],
  },
  IT: {
    heroLabel: 'Contatti',
    heroTitle: 'Parliamone',
    heroText: 'Siamo qui per aiutarti.',
    formLabel: 'Modulo di contatto',
    thanksTitle: 'Grazie!',
    thanksText: 'Ti rispondiamo entro 24 ore.',
    nameLabel: 'Nome',
    namePlaceholder: 'Il tuo nome',
    emailLabel: 'E-mail',
    emailPlaceholder: 'tu@email.com',
    messageLabel: 'Messaggio',
    messagePlaceholder: 'Come possiamo aiutarti?',
    submit: 'Invia messaggio',
    channelsLabel: 'Canali di assistenza',
    channels: [
      { label: 'WhatsApp', description: 'Il modo più veloce. Rispondiamo in pochi minuti.', action: 'Scrivici' },
      { label: 'E-mail', description: 'Per richieste formali o B2B.', action: 'hypestylearg@gmail.com' },
      { label: 'Content creator', description: 'Il tuo stile è in linea con l\'universo STYLE&CULTURE? Unisciti a noi.', action: 'Candidati qui' },
    ],
  },
};
