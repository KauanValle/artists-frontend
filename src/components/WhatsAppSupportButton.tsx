import { MessageCircle } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

export const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? '41987555406'
export function WhatsAppSupportButton() {
    const message = "Olá! Gostaria de mais informações sobre o Reprissa.";

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Conversar pelo WhatsApp"
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-[#20BA5A]"
            >
            <FaWhatsapp size={30} strokeWidth={2.5} />
        </a>
);
}
