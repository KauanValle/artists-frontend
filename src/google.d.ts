interface Window {
    google: {
        accounts: {
            id: {
                initialize: (config: {
                    client_id: string;
                    callback: (response: {
                        credential: string;
                        select_by: string;
                    }) => void;
                }) => void;

                renderButton: (
                    element: HTMLElement,
                    options: {
                        theme?: string;
                        size?: string;
                        text?: string;
                        shape?: string;
                        width?: number;
                    }
                ) => void;
            };
        };
    };
}