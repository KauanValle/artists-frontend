
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallAppButton() {
    const [prompt, setPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);

    const [installed, setInstalled] = useState(false);
    const [help, setHelp] = useState(false);

    const isIOS =
        /iphone|ipad|ipod/i.test(navigator.userAgent);
    
    console.log(isIOS)

    useEffect(() => {
        const checkInstalled = () => {
            const standalone =
                window.matchMedia('(display-mode: standalone)').matches ||
                (navigator as any).standalone === true;

            setInstalled(standalone);
        };

        checkInstalled();

        const handlePrompt = (event: Event) => {
            event.preventDefault();
            setPrompt(event as BeforeInstallPromptEvent);
        };

        const handleInstalled = () => {
            setInstalled(true);
            setPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handlePrompt);
        window.addEventListener('appinstalled', handleInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handlePrompt);
            window.removeEventListener('appinstalled', handleInstalled);
        };
    }, []);

    const install = async () => {
        // iPhone: instalação manual
        if (isIOS) {
            setHelp(true);
            return;
        }

        // Android e computadores
        if (prompt) {
            try {
                await prompt.prompt();

                const result = await prompt.userChoice;

                if (result.outcome === 'accepted') {
                    setInstalled(true);
                }

                setPrompt(null);
            } catch (error) {
                console.error('Erro ao instalar PWA:', error);
            }

            return;
        }

        // O navegador ainda não disponibilizou a instalação
        console.warn(
            'Instalação nativa indisponível. Verifique os requisitos do PWA.'
        );
    };

    if (installed) return null;

    return (
        <>
            <button
                onClick={install}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '20px',
                    zIndex: 99999,
                    background: '#7436A8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px 22px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(0,0,0,.3)'
                }}
            >
                ↓ Instalar aplicativo
            </button>

            {help && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,.7)',
                    zIndex: 100000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20
                }}>
                    <div style={{
                        background: '#171717',
                        color: '#fff',
                        padding: 24,
                        borderRadius: 16,
                        maxWidth: 360,
                        width: '100%'
                    }}>
                        <h2>Instale a Reprissa</h2>

                        {isIOS ? (
                            <p>
                                No Safari, toque em Compartilhar e depois
                                em "Adicionar à Tela de Início".
                            </p>
                        ) : (
                            <p>
                                No navegador, abra o menu (⋮) e procure
                                a opção "Instalar Reprissa" ou
                                "Instalar página como app".
                            </p>
                        )}

                        <button
                            onClick={() => setHelp(false)}
                            style={{
                                background: '#7436A8',
                                color: '#fff',
                                border: 0,
                                padding: 12,
                                borderRadius: 8,
                                width: '100%',
                                cursor: 'pointer'
                            }}
                        >
                            Entendi
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
