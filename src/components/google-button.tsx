import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/services";
import { extractApiError } from "@/services/api";

// Configurado no .env (VITE_GOOGLE_CLIENT_ID); ausente = botão do Google não renderiza.
export const googleClientIdConfigurado = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
    if (window.google?.accounts?.id) {
        return Promise.resolve();
    }

    if (!googleScriptPromise) {
        googleScriptPromise = new Promise((resolve, reject) => {
            let script = document.querySelector<HTMLScriptElement>(
                'script[src="https://accounts.google.com/gsi/client"]'
            );

            if (!script) {
                script = document.createElement("script");
                script.src = "https://accounts.google.com/gsi/client";
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);
            }

            script.addEventListener("load", () => resolve(), { once: true });
            script.addEventListener(
                "error",
                () => reject(new Error("Falha ao carregar Google Identity Services")),
                { once: true }
            );
        });
    }

    return googleScriptPromise;
}

/**
 * Botão "Continuar com o Google": autentica via Google Identity Services e envia
 * o ID token ao backend (`/api/auth/google`), que valida, loga (ou cria) a conta
 * e devolve a sessão. Novas contas seguem para "Completar o seu perfil";
 * contas existentes entram direto.
 */
export function GoogleLogin() {
    const buttonRef = useRef<HTMLDivElement>(null);
    const { applySession } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return;
        let mounted = true;
        let observer: ResizeObserver | null = null;

        async function initializeGoogle() {
            try {
                await loadGoogleScript();

                if (!mounted || !buttonRef.current) return;

                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID!,
                    callback: async (response) => {
                        try {
                            const { data } = await authApi.google(response.credential);
                            const user = applySession(data);
                            toast.success(`Bem-vindo(a), ${user.displayName}!`);
                            navigate(user.perfilCompleto ? "/" : "/completar-perfil", { replace: true });
                        } catch (err) {
                            toast.error(extractApiError(err));
                        }
                    },
                });

                const renderButton = () => {
                    if (!mounted || !buttonRef.current) return;

                    const width = Math.floor(
                        buttonRef.current.getBoundingClientRect().width
                    );

                    if (width <= 0) return;

                    buttonRef.current.innerHTML = "";

                    window.google.accounts.id.renderButton(
                        buttonRef.current,
                        {
                            theme: "outline",
                            size: "large",
                            text: "continue_with",
                            shape: "pill",
                            width: Math.min(width, 200),
                        }
                    );
                };

                observer = new ResizeObserver(renderButton);
                observer.observe(buttonRef.current);

                renderButton();

            } catch (error) {
                console.error("Erro ao inicializar Google:", error);
            }
        }

        initializeGoogle();

        return () => {
            mounted = false;
            observer?.disconnect();
        };
    }, [applySession, navigate]);

    if (!GOOGLE_CLIENT_ID) return null;

    return (
        <div
            ref={buttonRef}
            className="google-login-button"
        />
    );
}
