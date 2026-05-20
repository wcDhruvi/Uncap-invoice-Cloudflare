// src/routes/AppRoutes.js
import { baseUrl } from "../utils/Constent";

export const appRoutes = {
  // ── Main ─────────────────────────────────────────────────────────────────
  dashboard:        `${baseUrl}`,
  orders:           `${baseUrl}orders`,

  // ── Settings ──────────────────────────────────────────────────────────────
  settings:         `${baseUrl}settings`,
  emailSettings:    `${baseUrl}settings/email-settings`,
  templateSettings: `${baseUrl}settings/template-settings`,
  designSettings:   `${baseUrl}settings/design-settings`,
  companySettings:  `${baseUrl}settings/company-settings`,
  languageSettings: `${baseUrl}settings/language-settings`,
  faqs:             `${baseUrl}settings/faqs`,
  plans:            `${baseUrl}settings/plans`,
  support:          `${baseUrl}settings/support`,
  installation:     `${baseUrl}settings/installation`,
};