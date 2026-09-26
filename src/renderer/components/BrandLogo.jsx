import React from 'react';

export default function BrandLogo({ size = 32, style }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}branding/logo-128.png`}
      srcSet={`${import.meta.env.BASE_URL}branding/logo-256.png 2x`}
      alt="JS Nexus logo"
      width={size}
      height={size}
      draggable={false}
      style={{ display: 'inline-block', objectFit: 'contain', flexShrink: 0, ...style }}
    />
  );
}
