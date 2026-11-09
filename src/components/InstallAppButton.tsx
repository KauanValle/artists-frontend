
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
    }>;
}

export function InstallAppButton() {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);

    const [installed, setInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [dismissed, setDismissed] = useState(() => localStorage.getItem('install-btn-dismissed') === '1');

    useEffect(() => {
        const checkInstallation = () => {
            const standalone =
                window.matchMedia('(display-mode: standalone)').matches ||
                (navigator as any).standalone === true;

            setInstalled(standalone);
        };

        const ios =
            /iphone|ipad|ipod/i.test(navigator.userAgent);

        setIsIOS(ios);
        checkInstallation();

        const mediaQuery =
            window.matchMedia('(display-mode: standalone)');

        mediaQuery.addEventListener('change', checkInstallation);

        const handleBeforeInstall = (event: Event) => {
            event.preventDefault();
            setDeferredPrompt(event as BeforeInstallPromptEvent);
        };

        const handleInstalled = () => {
            setInstalled(true);
            setDeferredPrompt(null);
            setIsOpen(false);
        };

        window.addEventListener(
            'beforeinstallprompt',
            handleBeforeInstall
        );

        window.addEventListener('appinstalled', handleInstalled);

        return () => {
            mediaQuery.removeEventListener('change', checkInstallation);

            window.removeEventListener(
                'beforeinstallprompt',
                handleBeforeInstall
            );

            window.removeEventListener(
                'appinstalled',
                handleInstalled
            );
        };
    }, []);

    const handleInstall = async () => {
        if (isIOS) {
            setIsOpen(true);
            return;
        }

        if (deferredPrompt) {
            try {
                await deferredPrompt.prompt();

                const result = await deferredPrompt.userChoice;

                if (result.outcome === 'accepted') {
                    setInstalled(true);
                }

                setDeferredPrompt(null);
            } catch (error) {
                console.error('Erro ao instalar:', error);
                setIsOpen(true);
            }

            return;
        }

        // Caso o navegador ainda não disponibilize
        // a instalação nativa, mostramos as instruções.
        setIsOpen(true);
    };

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDismissed(true);
        localStorage.setItem('install-btn-dismissed', '1');
    };

    if (installed || dismissed) return null;

    return (
        <>
            {/* Botão fixo */}
            <div className="fixed bottom-20 left-5 z-[9999] flex items-center gap-1.5 lg:bottom-5">
                <button
                    onClick={handleInstall}
                    className="flex items-center gap-2.5 rounded-xl border-none bg-[#7436A8] px-[22px] py-3.5 text-sm font-bold text-white shadow-[0_6px_25px_rgba(116,54,168,0.35)]"
                >
                    <span style={{ fontSize: '18px' }}>↓</span>
                    Instalar aplicativo
                </button>
                <button
                    onClick={handleDismiss}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-xs text-white/80 backdrop-blur hover:bg-black/80 hover:text-white"
                    aria-label="Fechar"
                    title="Fechar"
                >
                    ✕
                </button>
            </div>

            {/* Tutorial de instalação */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 10000,
                        background: 'rgba(0,0,0,0.75)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: '390px',
                            background: '#17151B',
                            border: '1px solid #302638',
                            borderRadius: '22px',
                            padding: '26px',
                            color: '#fff',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                        }}
                    >
                        {/* Cabeçalho */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{
                                background: '#7436A8',
                                width: '46px',
                                height: '46px',
                                borderRadius: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px',
                                fontWeight: 800
                            }}>
                                R
                            </div>

                            <button
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: '#29252E',
                                    border: 'none',
                                    color: '#aaa',
                                    borderRadius: '50%',
                                    width: '34px',
                                    height: '34px',
                                    cursor: 'pointer',
                                    fontSize: '18px'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <h2 style={{
                            fontSize: '23px',
                            margin: '22px 0 8px',
                            fontWeight: 800
                        }}>
                            Tenha a Reprissa sempre com você!
                        </h2>

                        <p style={{
                            color: '#AAA4B1',
                            fontSize: '14px',
                            lineHeight: 1.6,
                            marginBottom: '25px'
                        }}>
                            Adicione nosso aplicativo à tela inicial e
                            tenha seus shows, propostas e agenda sempre
                            ao seu alcance.
                        </p>

                        {isIOS ? (
                            <>
                                <div style={{
                                    background: '#25212B',
                                    borderRadius: '14px',
                                    padding: '17px',
                                    marginBottom: '13px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '13px'
                                    }}>
                                        <span style={{ fontSize: '25px' }}>↥</span>
                                        <div>
                                            <strong>1. Toque em Compartilhar</strong>
                                            <p style={{
                                                color: '#AAA4B1',
                                                fontSize: '13px',
                                                margin: '5px 0 0'
                                            }}>
                                                No menu inferior do Safari.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    background: '#25212B',
                                    borderRadius: '14px',
                                    padding: '17px',
                                    marginBottom: '22px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '13px'
                                    }}>
                                        <span style={{ fontSize: '25px' }}>⊞</span>
                                        <div>
                                            <strong>2. Adicionar à Tela de Início</strong>
                                            <p style={{
                                                color: '#AAA4B1',
                                                fontSize: '13px',
                                                margin: '5px 0 0'
                                            }}>
                                                Depois, confirme em Adicionar.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{
                                    background: '#25212B',
                                    borderRadius: '14px',
                                    padding: '17px',
                                    marginBottom: '22px'
                                }}>
                                    <strong>Instalação pelo navegador</strong>
                                    <p style={{
                                        color: '#AAA4B1',
                                        fontSize: '13px',
                                        lineHeight: 1.6,
                                        margin: '8px 0 0'
                                    }}>
                                        Abra o menu do navegador (⋮) e procure
                                        por "Instalar Reprissa" ou
                                        "Instalar página como aplicativo".
                                    </p>
                                </div>
                            </>
                        )}

                        <button
                            onClick={() => setIsOpen(false)}
                            style={{
                                width: '100%',
                                padding: '15px',
                                border: 'none',
                                borderRadius: '12px',
                                background: '#7436A8',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            Entendi, vou instalar!
                        </button>

                        <p style={{
                            textAlign: 'center',
                            color: '#77717E',
                            fontSize: '11px',
                            marginTop: '15px',
                            marginBottom: 0
                        }}>
                            REPRISSA • SUA CARREIRA EM OUTRO NÍVEL
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
