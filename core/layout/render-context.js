import React from 'react';

export const RendererContext = React.createContext({
  pageNumber: null,
  totalSlides: null,
  label: 'Page',
  previewChrome: false,
  showDiagnostics: false,
  showRegionOutlines: false,
  brandSnapshot: null
});

export const RendererProvider = ({ value, children }) => (
  React.createElement(RendererContext.Provider, { value }, children)
);
