'use client';

const WA_NUMBER  = '5491178292430'; // ← reemplazado con el número de Hypestyle
const WA_MESSAGE = encodeURIComponent('Hola! Tengo una consulta sobre un pedido de Hypestyle.');

export default function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-6 right-5 z-[90] w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform duration-200"
      style={{ background: '#25D366' }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.304A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.95 7.95 0 01-4.054-1.107l-.29-.174-2.954.774.789-2.882-.19-.296A7.95 7.95 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8zm4.406-5.884c-.242-.121-1.43-.706-1.652-.786-.221-.08-.382-.12-.543.122-.16.24-.624.786-.765.948-.14.16-.281.18-.523.06-.242-.12-1.02-.376-1.943-1.198-.718-.64-1.203-1.431-1.344-1.673-.14-.241-.015-.372.106-.492.109-.108.242-.281.362-.422.121-.14.161-.24.242-.402.08-.16.04-.301-.02-.422-.06-.12-.543-1.31-.744-1.794-.196-.47-.395-.406-.543-.413l-.462-.008c-.16 0-.422.06-.643.301-.22.24-.844.825-.844 2.013s.864 2.335.985 2.496c.12.16 1.7 2.594 4.12 3.638.576.248 1.025.397 1.375.508.578.184 1.104.158 1.52.096.463-.069 1.43-.585 1.632-1.15.2-.564.2-1.047.14-1.15-.06-.1-.221-.16-.463-.28z"/>
      </svg>
    </a>
  );
}
