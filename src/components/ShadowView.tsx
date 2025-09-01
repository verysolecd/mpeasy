import React, { useEffect, useRef } from 'react';

interface ShadowViewProps {
  html: string;
  css: string;
  isDarkMode: boolean;
  codeThemeUrl: string;
}

const ShadowView: React.FC<ShadowViewProps> = (props) => {
  const { 
    html, css, isDarkMode, codeThemeUrl
  } = props;
  const shadowHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shadowHostRef.current) {
      if (!shadowHostRef.current.shadowRoot) {
        shadowHostRef.current.attachShadow({ mode: 'open' });
      }

      const shadowRoot = shadowHostRef.current.shadowRoot;
      if (shadowRoot) {
        shadowRoot.innerHTML = '';

        const styleElement = document.createElement('style');
        styleElement.textContent = css;
        shadowRoot.appendChild(styleElement);

        if (codeThemeUrl) {
            const codeThemeLink = document.createElement('link');
            codeThemeLink.rel = 'stylesheet';
            codeThemeLink.href = codeThemeUrl;
            shadowRoot.appendChild(codeThemeLink);
        }
        
        const contentElement = document.createElement('div');
        
        let className = ``; // Renderer now applies all styles, except dark mode
        if (isDarkMode) className += ' dark';
        contentElement.className = className.trim();

        contentElement.innerHTML = html;

        shadowRoot.appendChild(contentElement);
      }
    }
  }, [html, css, isDarkMode, codeThemeUrl]);

  return <div ref={shadowHostRef} style={{ height: '100%', width: '100%' }} />;
};

export default ShadowView;