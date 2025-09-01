import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import App from '../view';

// Store the root so we can re-render
let root: Root | null = null;

interface AppProps {
  fileContent: string;
  cssContent: string;
}

export function renderApp(container: HTMLElement, props: AppProps): Root {
    if (!root) {
        root = createRoot(container);
    }
    root.render(
        <React.StrictMode>
            <App {...props} />
        </React.StrictMode>
    );
    return root;
}
