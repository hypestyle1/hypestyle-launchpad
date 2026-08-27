// Semillas de Operating Costs. SÓLO datos confirmados + observados + placeholders
// SIN monto (MISSING) — nunca se inventa un monto. La UI usa esto como estado
// inicial hasta que se guarda en la option `hs_operating_costs`.

import type { OperatingCost } from './operating-costs';

let _seq = 0;
export function newCostId(): string { _seq = (_seq + 1) % 1e6; return 'oc_' + Date.now().toString(36) + _seq.toString(36); }
export function newPeriodId(): string { _seq = (_seq + 1) % 1e6; return 'ocp_' + Date.now().toString(36) + _seq.toString(36); }

const FROM = '2026-08-01'; // arranque del tracking

export const DEFAULT_OPERATING_COSTS: OperatingCost[] = [
  {
    id: 'oc_n8n', name: 'n8n Cloud Pro', provider: 'n8n', category: 'automation',
    costType: 'fixed', frequency: 'monthly', profitLevel: 'operating',
    source: 'configured', quality: 'configured', taxTreatment: 'economic_cost', active: true, bot: true,
    periods: [{ id: 'ocp_n8n_1', amount: 65, currency: 'USD', validFrom: FROM, validTo: null }],
    notes: 'Plan Pro. Corre los workflows del bot y automatizaciones.',
  },
  {
    id: 'oc_upstash', name: 'Upstash Redis', provider: 'Upstash', category: 'infrastructure',
    costType: 'fixed', frequency: 'monthly', profitLevel: 'operating',
    source: 'configured', quality: 'configured', taxTreatment: 'economic_cost', active: true, bot: true,
    periods: [{ id: 'ocp_ups_1', amount: 0, currency: 'USD', validFrom: FROM, validTo: null }],
    notes: 'Free tier. Cero CONFIRMADO (no es un dato faltante).',
  },
  {
    id: 'oc_anthropic', name: 'Anthropic API', provider: 'Anthropic', category: 'ai',
    costType: 'variable', frequency: 'usage', profitLevel: 'operating',
    source: 'observed', quality: 'estimated', taxTreatment: 'economic_cost', active: true, bot: true,
    periods: [{ id: 'ocp_ant_1', amount: 7.30, currency: 'USD', validFrom: FROM, validTo: null, rate: 0.0106, usageMetric: 'per_message' }],
    notes: 'Costo del modelo del bot. Rate ~USD 0,0106/mensaje OBSERVADO (no oficial). Reemplazar por provider usage cuando esté disponible.',
  },
  {
    id: 'oc_openai', name: 'OpenAI API', provider: 'OpenAI', category: 'ai',
    costType: 'variable', frequency: 'usage', profitLevel: 'operating',
    source: 'observed', quality: 'configured', taxTreatment: 'economic_cost', active: true, bot: true,
    periods: [{ id: 'ocp_oai_1', amount: 0, currency: 'USD', validFrom: FROM, validTo: null, usageMetric: 'per_message' }],
    notes: 'Transcripción y traducción. Cero CONFIRMADO por ahora.',
  },
  // ── Placeholders SIN monto (MISSING) — carga manual, no se inventa ──
  { id: 'oc_brevo', name: 'Brevo', provider: 'Brevo', category: 'marketing_infra', costType: 'fixed', frequency: 'monthly', profitLevel: 'operating', source: 'manual', quality: 'missing', taxTreatment: 'unknown', active: true, periods: [{ id: 'ocp_brevo_1', amount: null, currency: 'USD', validFrom: FROM, validTo: null }], notes: 'Email/marketing. Cargar monto real.' },
  { id: 'oc_hostinger', name: 'Hostinger', provider: 'Hostinger', category: 'infrastructure', costType: 'fixed', frequency: 'monthly', profitLevel: 'operating', source: 'manual', quality: 'missing', taxTreatment: 'unknown', active: true, periods: [{ id: 'ocp_host_1', amount: null, currency: 'USD', validFrom: FROM, validTo: null }], notes: 'Hosting del backend WordPress.' },
  { id: 'oc_vercel', name: 'Vercel', provider: 'Vercel', category: 'infrastructure', costType: 'fixed', frequency: 'monthly', profitLevel: 'operating', source: 'manual', quality: 'missing', taxTreatment: 'unknown', active: true, periods: [{ id: 'ocp_vercel_1', amount: null, currency: 'USD', validFrom: FROM, validTo: null }], notes: 'Hosting del frontend. Separado de Hostinger.' },
  { id: 'oc_dominio', name: 'Dominio hypestyle.com.ar', provider: 'Registrar', category: 'infrastructure', costType: 'fixed', frequency: 'annual', profitLevel: 'operating', source: 'manual', quality: 'missing', taxTreatment: 'unknown', active: true, periods: [{ id: 'ocp_dom_1', amount: null, currency: 'USD', validFrom: FROM, validTo: null }], notes: 'Costo anual, se prorratea.' },
  { id: 'oc_claude', name: 'Claude (suscripción)', provider: 'Anthropic', category: 'ai', costType: 'fixed', frequency: 'monthly', profitLevel: 'operating', source: 'manual', quality: 'missing', taxTreatment: 'unknown', active: true, periods: [{ id: 'ocp_claude_1', amount: null, currency: 'USD', validFrom: FROM, validTo: null }], notes: 'SaaS. Distinto de Anthropic API (usage).' },
  { id: 'oc_chatgpt', name: 'ChatGPT (suscripción)', provider: 'OpenAI', category: 'ai', costType: 'fixed', frequency: 'monthly', profitLevel: 'operating', source: 'manual', quality: 'missing', taxTreatment: 'unknown', active: true, periods: [{ id: 'ocp_gpt_1', amount: null, currency: 'USD', validFrom: FROM, validTo: null }], notes: 'SaaS. Distinto de OpenAI API (usage).' },
];
