import { MPEasySettings } from "../settings";

export function generateDynamicStyles(settings: MPEasySettings): string {
  const { fontSize, primaryColor, isUseIndent, customCss, customCodeBlockCss } = settings;

  let dynamicCss = `:root {
    --mpe-font-size: ${fontSize};
    --mpe-primary-color: ${primaryColor};
    --mpe-text-indent: ${isUseIndent ? '2em' : '0'};
  }

  /* Custom CSS from settings */
  ${customCss || ''}

  /* Custom Code Block CSS from settings */
  ${customCodeBlockCss || ''}
  `;

  return `<style>${dynamicCss}</style>`;
}
