import React, { useEffect, useRef } from 'react';

interface ShadowViewProps {
  html: string;
  css: string;
  isDarkMode: boolean;
}

const ShadowView: React.FC<ShadowViewProps> = ({ html, css, isDarkMode }) => {
  const shadowHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shadowHostRef.current) {
      // Check if shadow root already exists
      if (!shadowHostRef.current.shadowRoot) {
        shadowHostRef.current.attachShadow({ mode: 'open' });
      }

      const shadowRoot = shadowHostRef.current.shadowRoot;
      if (shadowRoot) {
        const styleElement = document.createElement('style');
        styleElement.textContent = css;
        
        const contentElement = document.createElement('div');
        // Add the markdown-body class and conditionally the dark class
        contentElement.className = isDarkMode ? 'markdown-body dark' : 'markdown-body';
        contentElement.innerHTML = html;

        shadowRoot.innerHTML = '';
        shadowRoot.appendChild(styleElement);
        shadowRoot.appendChild(contentElement);
      }
    }
  }, [html, css, isDarkMode]);

  return <div ref={shadowHostRef} style={{ height: '100%', width: '100%' }} />;
};

export default ShadowView;