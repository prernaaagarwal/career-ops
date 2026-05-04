#!/usr/bin/env node
/**
 * One-shot batch CV builder for the 2026-05-04 sweep.
 * Reads the Careem CV as base HTML, swaps the Objective paragraph and Skills
 * lines for each of 16 roles, writes per-role HTML to output/, then runs
 * generate-pdf.mjs to produce the matching PDF.
 *
 * Run: node batch/build-cvs-2026-05-04.mjs
 */

import { readFile, writeFile } from 'fs/promises';
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BASE_HTML = resolve(ROOT, 'output/cv-prernaa-agarwal-careem-2026-04-23.html');
const OUTPUT_DIR = resolve(ROOT, 'output');
const DATE = '2026-05-04';

// Skill bucket → 6 lines emphasizing matching domain. Keeps consistent style
// (same length, same Title-Case, same "Languages" closer in the template).
const SKILLS = {
  convAI: [
    'Conversational AI Product Strategy (IVA, Voice Bots, Chatbots, NLU)',
    'Intent-Based Automation, Multilingual NLP, Speech & Sentiment Analytics',
    'CCaaS Platform Roadmap, Salesforce CoPilot, Next Best Action Loops',
    'Agentic Workflows, RAG, LLM Evals, Hallucination & Safety Guardrails',
    'Cross-Functional Leadership (Engineering, Design, Data Science, Ops)',
    'Engagement, Retention, AHT, CSAT — Product Analytics & A/B Experimentation',
  ],
  genAI: [
    'Generative AI Product Vision, Roadmap Ownership, Enterprise GenAI Adoption',
    'LLM-Backed Discovery, RAG, Agentic Loops, Eval Frameworks',
    'Salesforce CoPilot, IVA, NBA Automation, Intent-Based AI',
    'Cross-Functional Leadership (Engineering, Design, Data Science)',
    'Data-Led Decision Making, Predictive Analytics, 0PD/1PD/2PD Loops',
    'UAE Data Residency, GDPR, PDPL, Enterprise Regulatory Governance',
  ],
  salesforceCRM: [
    'Salesforce Service Cloud, Sales Cloud, CoPilot, Agentforce — Product Strategy',
    'CRM Roadmap Ownership, Customer 360, Intent-Based Automation',
    'Conversational AI, IVA, NBA, Multilingual NLP for Customer Experience',
    'Cross-Functional Leadership (Engineering, Solution Engineering, Ops)',
    'Data-Led Decision Making, A/B Experimentation, Funnel & Retention Analytics',
    'GDPR, PDPL, UAE Data Residency, Enterprise Compliance & Governance',
  ],
  aiTransformation: [
    'AI Transformation Strategy, Enterprise AI Adoption, Change Management',
    'GenAI Product Vision, CoPilot Rollout, Salesforce AI Roadmap',
    'Conversational AI, IVA, NBA Loops, Intent-Based Automation',
    'Cross-Functional Leadership (Engineering, Design, Data, Operations)',
    'Data-Led Decision Making, Predictive Analytics, KPI Frameworks',
    'GDPR, PDPL, UAE Data Residency, Enterprise Regulatory Governance',
  ],
  martechAdtech: [
    'Martech / AdTech Product Strategy, B2B SaaS Roadmap Ownership',
    'Marketing Automation, Multi-Channel Campaign Orchestration (Voice, SMS, WhatsApp)',
    'AI-Driven Personalization, Predictive Analytics, 0PD/1PD/2PD Data Loops',
    'CRM Integration, Salesforce CoPilot, Marketing Cloud, ABM Workflows',
    'Cross-Functional Leadership (Engineering, Design, Marketing, Data Science)',
    'Lead Conversion, Engagement, ROI — A/B Experimentation & Funnel Analytics',
  ],
  genericAIPM: [
    'AI Product Strategy, Roadmap Ownership, B2B SaaS GTM',
    'GenAI, Conversational AI, Salesforce CoPilot, IVA, Intent-Based Automation',
    'Cross-Functional Leadership (Engineering, Design, Data Science)',
    'Data-Led Decision Making, Predictive Analytics, A/B Experimentation',
    'User Engagement, Retention, Activation — Product Analytics & KPIs',
    'GDPR, PDPL, UAE Data Residency, Enterprise Regulatory Governance',
  ],
};

// 16 roles from today's sweep. Each gets a tailored Objective and a Skills bucket.
// Objective references the role's domain + a Prernaa proof-point.
const ROLES = [
  {
    slug: 'metadome-ai',
    objective:
      "Senior Product Manager with 10 years scaling Conversational AI, IVA, and Multilingual NLP for enterprise B2B SaaS. At MetLife, owned the CCaaS/IVA roadmap and Salesforce CoPilot rollout — delivering a <strong>43% operational efficiency gain</strong>, <strong>30% AHT reduction</strong>, and <strong>24% engagement uplift</strong>. At Sprinklr, led conversational and CCaaS delivery for <strong>25 enterprise accounts</strong> with a <strong>50% performance lift</strong>. Targeted to Metadome.ai's Conversational AI / GenAI Product Manager mandate — owning roadmap for chatbots, voice bots, and NLU-powered customer experiences across Indian and global enterprises.",
    skills: SKILLS.convAI,
  },
  {
    slug: 'ge-vernova',
    objective:
      "Senior Product Manager with 10 years building enterprise GenAI, AI Transformation, and B2B SaaS platforms. At MetLife, partnered with Engineering and Data Science on Generative AI discovery, data-grounding, and CoPilot vision — delivering a <strong>43% operational efficiency gain</strong> and <strong>24% engagement uplift</strong>. At Kimberly-Clark, owned an <strong>$18M global AI portfolio</strong> across Digitech and Martech, expanding market share by <strong>30%</strong>. Aligned to GE Vernova's GenAI Product Manager mandate — translating LLM and agentic AI capabilities into measurable business outcomes for industrial enterprise clients.",
    skills: SKILLS.genAI,
  },
  {
    slug: 'consultbae-b2b-saas',
    objective:
      "Lead Product Manager with 10 years delivering B2B SaaS, MarTech, and AdTech roadmaps for global enterprise. At Kimberly-Clark, led a <strong>$18M global Salesforce AI portfolio</strong> across Digitech and Martech, expanding market share by <strong>30%</strong> and lifting profitability by <strong>15%</strong> via 0PD/1PD/2PD personalization loops. At Sprinklr, orchestrated MarTech/AdTech delivery for <strong>25 high-ARR accounts</strong>, onboarding <strong>10 new enterprise customers</strong>. Aligned to ConsultBae's Lead PM mandate for B2B SaaS / AdTech / MediaTech / Marketing Technology — owning roadmap and stakeholder strategy for a global media platform.",
    skills: SKILLS.martechAdtech,
  },
  {
    slug: 'pwc-acceleration-centres',
    objective:
      "Senior AI Product Manager with 10 years rolling out enterprise AI Transformation, GenAI, and Conversational AI programs. At MetLife, led Salesforce CoPilot and IVA strategy, delivering a <strong>43% operational efficiency gain</strong> across US commercial teams. At Kimberly-Clark, owned an <strong>$18M global AI portfolio</strong> across Digitech and Martech, expanding market share by <strong>30%</strong>. Aligned to PwC Acceleration Centres' AI Product Manager mandate — defining and shipping consulting-grade AI products that drive measurable transformation outcomes for global enterprise clients.",
    skills: SKILLS.aiTransformation,
  },
  {
    slug: 'binary-star-searchx',
    objective:
      "AI Product Manager with 10 years owning roadmap for Conversational AI, GenAI, and B2B SaaS platforms. At MetLife, deployed Salesforce CoPilot and multilingual IVAs for intent-based automation, achieving a <strong>43% operational efficiency gain</strong> and <strong>30% AHT reduction</strong>. At Kimberly-Clark, scaled multi-channel AI conversational tools (Voice, SMS, WhatsApp) for B2C, lifting engagement by <strong>24%</strong>. Aligned to the AI Product Manager mandate — owning roadmap and strategy for AI products in GenAI and conversational bots across B2B SaaS.",
    skills: SKILLS.genericAIPM,
  },
  {
    slug: 'wolters-kluwer',
    objective:
      "Senior Product Manager with 10 years delivering AI-led B2B SaaS, CRM, and CX platforms in regulated industries. At MetLife, orchestrated AI product roadmap for an <strong>$18M global portfolio</strong>, achieving <strong>43% operational efficiency</strong> and <strong>30% market penetration growth</strong>. At Kimberly-Clark, governed AI lifecycle across international regulatory environments with full GDPR/PDPL compliance. CSPO-aligned, agile delivery experience across 25+ high-ARR projects. Aligned to Wolters Kluwer's Senior PM mandate — owning roadmap and stakeholder execution in a global regulated-content business.",
    skills: SKILLS.genericAIPM,
  },
  {
    slug: 'clara-ai',
    objective:
      "Founding-mindset Product Manager with 10 years shipping enterprise AI products from 0→1. At MetLife, launched Salesforce CoPilot and multilingual IVAs from discovery through GA, delivering a <strong>43% operational efficiency gain</strong>. At Sprinklr, drove product strategy for <strong>25 enterprise accounts</strong>, onboarding <strong>10 new customers</strong>. Strong in agentic workflows, RAG, LLM evals, and bilingual NLP — exactly the muscle Clara AI needs to ship a Founding PM-led GenAI product to first paying customers.",
    skills: SKILLS.genericAIPM,
  },
  {
    slug: 'apparel-group',
    objective:
      "AI & Transformation Product Manager with 10 years driving enterprise AI adoption across global B2C and B2B portfolios. At MetLife, led Salesforce CoPilot and IVA rollout — delivering a <strong>43% operational efficiency gain</strong> and <strong>30% market penetration growth</strong>. At Kimberly-Clark, owned an <strong>$18M global AI portfolio</strong> across Digitech and Martech, expanding market share by <strong>30%</strong>. Bilingual NLP, UAE Data Residency, GDPR/PDPL compliance — directly aligned to Apparel Group's PM AI & Transformation mandate for the Dubai-headquartered global retail group.",
    skills: SKILLS.aiTransformation,
  },
  {
    slug: 'salesforce-service-cloud',
    objective:
      "Senior Product Manager with 10 years owning Salesforce CRM, Service Cloud, and Agentforce-style AI agent platforms. At MetLife, deployed Salesforce CoPilot and multilingual IVAs for intent-based case automation — delivering a <strong>43% operational efficiency gain</strong>, <strong>30% AHT reduction</strong>, and <strong>24% engagement uplift</strong>. At Kimberly-Clark, defined a global Salesforce AI vision across Digitech and Martech, expanding market share by <strong>30%</strong>. Aligned to Salesforce's Senior PM Service Cloud mandate — shipping AI-grounded Service Cloud features for enterprise customers in Bangalore/Hyderabad.",
    skills: SKILLS.salesforceCRM,
  },
  {
    slug: 'salesforce-bangalore',
    objective:
      "Senior Product Manager with 10 years delivering Salesforce-native AI products across Sales, Service, and Marketing Cloud. At MetLife, orchestrated Salesforce CoPilot, IVA, and NBA roadmaps for an <strong>$18M global portfolio</strong> — achieving <strong>43% operational efficiency gain</strong> and <strong>15% profitability lift</strong>. At Kimberly-Clark, set a global Salesforce AI vision across Digitech and Martech, expanding market share by <strong>30%</strong>. Aligned to Salesforce's Senior PM mandate in India — shipping AI-grounded enterprise features that move customer-impact KPIs.",
    skills: SKILLS.salesforceCRM,
  },
  {
    slug: 'senseforth-ai',
    objective:
      "Senior Product Manager with 10 years specializing in Conversational AI, IVA, and Multilingual NLP for global enterprise. At MetLife, owned the CCaaS/IVA roadmap and Salesforce CoPilot rollout — delivering a <strong>43% operational efficiency gain</strong>, <strong>30% AHT reduction</strong>, and <strong>24% engagement uplift</strong>. At Sprinklr, led conversational and CCaaS delivery for <strong>25 enterprise accounts</strong> with a <strong>50% performance lift</strong>. Aligned to Senseforth.ai's Senior PM mandate — owning roadmap for an Indian-built Conversational AI platform serving global enterprise customers.",
    skills: SKILLS.convAI,
  },
  {
    slug: 'callhub',
    objective:
      "Product Manager with 10 years building B2B SaaS, CCaaS, and multi-channel communication platforms. At MetLife, deployed multilingual IVAs and Salesforce CoPilot — achieving a <strong>43% operational efficiency gain</strong>. At Kimberly-Clark, scaled multi-channel AI conversational tools (Voice, SMS, WhatsApp) for global B2C, lifting engagement by <strong>24%</strong>. At Sprinklr, delivered CCaaS and Salesforce CRM for <strong>25 high-ARR accounts</strong>. Aligned to CallHub's Product Manager mandate — owning roadmap for a cloud-based communication and digital organizing platform serving political, nonprofit, and union teams.",
    skills: SKILLS.martechAdtech,
  },
  {
    slug: 'socialpilot',
    objective:
      "Product Manager with 10 years delivering Martech / B2B SaaS roadmaps for global growth. At Kimberly-Clark, owned an <strong>$18M global Salesforce AI portfolio</strong> across Digitech and Martech, expanding market share by <strong>30%</strong> and ROI by <strong>30%</strong>. At Sprinklr, led MarTech/AdTech and CCaaS strategy across <strong>25 high-ARR accounts</strong>, onboarding <strong>10 new customers</strong> with a <strong>50% performance lift</strong>. Aligned to SocialPilot's Product Manager mandate — owning roadmap for a bootstrapped, profitable B2B SaaS Martech platform with remote India operations.",
    skills: SKILLS.martechAdtech,
  },
  {
    slug: 'gedu-services',
    objective:
      "AI Product Owner with 10 years bridging business stakeholders, data science, engineering, and end-users. At MetLife, owned the Salesforce CoPilot, IVA, and NBA roadmap — delivering a <strong>43% operational efficiency gain</strong>, <strong>24% engagement uplift</strong>, and <strong>15% profitability lift</strong>. At Kimberly-Clark, governed AI lifecycle across regulated international markets with GDPR/PDPL compliance. Aligned to Gedu Services' AI Product Owner mandate — leading vision, strategy, and execution of AI-driven products across the organization.",
    skills: SKILLS.genericAIPM,
  },
  {
    slug: 'rabobank',
    objective:
      "Product Manager with 10 years delivering GenAI, Conversational AI, and CRM products for regulated enterprise. At MetLife, deployed Salesforce CoPilot and multilingual IVAs for intent-based case automation — delivering a <strong>43% operational efficiency gain</strong>, <strong>24% engagement uplift</strong>, and <strong>30% AHT reduction</strong>. At Kimberly-Clark, owned an <strong>$18M global Salesforce AI portfolio</strong> with full GDPR/PDPL compliance. Aligned to Rabobank's PM GenAI / Conversational AI / CRM mandate — shipping AI-grounded customer-facing features for Dutch and global banking customers.",
    skills: SKILLS.salesforceCRM,
  },
  {
    slug: 'builder-ai',
    objective:
      "Senior Product Manager with 10 years specializing in Conversational AI, Chatbots, and Multilingual NLP for global enterprise. At MetLife, owned the CCaaS/IVA roadmap and Salesforce CoPilot rollout — delivering a <strong>43% operational efficiency gain</strong>, <strong>30% AHT reduction</strong>, and <strong>24% engagement uplift</strong>. At Kimberly-Clark, deployed multi-channel AI conversational tools (Voice, SMS, WhatsApp) globally. Aligned to Builder.ai's Senior PM Chatbot / Conversational AI mandate — owning roadmap for an Indian-founded, London-HQ AI platform serving global SMB and enterprise customers.",
    skills: SKILLS.convAI,
  },
];

function buildHTML(base, role) {
  // Replace Objective span content (single line in source).
  let out = base.replace(
    /(<span class="top-label">Objective-<\/span> <span class="top-text">)[\s\S]*?(<\/span>\s*<\/div>)/,
    `$1${role.objective}$2`
  );

  // Replace the 6 skill rows (between <div class="top-label">Skills-</div> and the languages-row).
  const skillsBlock = role.skills.map((s) => `    <div class="skill-row">${s}</div>`).join('\n');
  out = out.replace(
    /(<div class="top-label">Skills-<\/div>)[\s\S]*?(<div class="languages-row">)/,
    `$1\n${skillsBlock}\n    $2`
  );

  return out;
}

function runPDF(htmlPath, pdfPath) {
  return new Promise((resolveP, rejectP) => {
    const proc = spawn('node', ['generate-pdf.mjs', htmlPath, pdfPath], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolveP();
      else rejectP(new Error(`generate-pdf exit ${code}: ${stderr.slice(-200)}`));
    });
  });
}

async function main() {
  const base = await readFile(BASE_HTML, 'utf-8');
  console.log(`Base HTML: ${BASE_HTML} (${base.length} bytes)`);
  console.log(`Generating ${ROLES.length} tailored CVs for ${DATE}...\n`);

  const results = [];
  let i = 1;
  for (const role of ROLES) {
    const htmlPath = resolve(OUTPUT_DIR, `cv-prernaa-agarwal-${role.slug}-${DATE}.html`);
    const pdfPath = resolve(OUTPUT_DIR, `cv-prernaa-agarwal-${role.slug}-${DATE}.pdf`);
    const html = buildHTML(base, role);
    await writeFile(htmlPath, html, 'utf-8');
    process.stdout.write(`[${i.toString().padStart(2, ' ')}/${ROLES.length}] ${role.slug.padEnd(28, ' ')} `);
    try {
      await runPDF(htmlPath, pdfPath);
      console.log('OK');
      results.push({ slug: role.slug, ok: true, pdf: pdfPath });
    } catch (err) {
      console.log(`FAIL — ${err.message}`);
      results.push({ slug: role.slug, ok: false, error: err.message });
    }
    i++;
  }

  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Done. ${ok} succeeded, ${fail} failed.`);
  if (fail > 0) {
    console.log('Failures:');
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  - ${r.slug}: ${r.error}`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
