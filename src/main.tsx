/**
 * WebWaka Professional — Frontend Entry Point
 * Blueprint Reference: Part 9.1 — Mobile First, PWA First, Offline First, Nigeria First
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { LegalPracticeUI } from './modules/legal-practice/ui';

// Remove loading screen once React mounts
const loadingEl = document.getElementById('app-loading');
if (loadingEl) loadingEl.style.display = 'none';

// Read tenant/auth context from URL params or session storage
// In production, these would be injected by the platform shell
const urlParams = new URLSearchParams(window.location.search);
const tenantId = urlParams.get('tenantId') ?? sessionStorage.getItem('ww_tenant_id') ?? 'demo_tenant';
const userId = urlParams.get('userId') ?? sessionStorage.getItem('ww_user_id') ?? 'demo_user';
const authToken = urlParams.get('token') ?? sessionStorage.getItem('ww_auth_token') ?? '';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
const initialLanguage = (localStorage.getItem('ww_language') ?? 'en') as 'en' | 'yo' | 'ig' | 'ha';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

const root = createRoot(rootEl);
root.render(
  <React.StrictMode>
    <LegalPracticeUI
      tenantId={tenantId}
      userId={userId}
      apiBaseUrl={apiBaseUrl}
      authToken={authToken}
      initialLanguage={initialLanguage}
    />
  </React.StrictMode>
);
