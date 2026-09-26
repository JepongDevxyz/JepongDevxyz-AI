import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

for(const id of ['jdFirstRunWelcome','jdLegalConsent','jdLegalPolicy','jdTermsArticle','jdPrivacyArticle']){
  assert(html.includes(`id="${id}"`), 'missing legal/onboarding surface: '+id);
}

assert(html.includes("const JD_LEGAL_VERSION='2026-09-26'"),'versioned legal acceptance missing');
assert(html.includes("const JD_LEGAL_ACCEPTANCE_KEY='jd_legal_acceptance_v1'"),'legal acceptance storage key missing');
assert(html.includes('safeSetLocalStorage(JD_LEGAL_ACCEPTANCE_KEY'), 'Agree must persist acceptance safely');
assert(html.includes('syncJdFirstRunOnboarding();'), 'first-run gate must run on startup');

assert(html.includes('onclick="openJdLegalConsent()"'),'Start Chat must open consent dialog');
assert(html.includes('onclick="jdDeclineLegalConsent()"'),'Disagree action missing');
assert(html.includes('onclick="jdAcceptLegalConsent()"'),'Agree action missing');

assert(html.includes("openJdLegalPolicy('terms')"),'Terms of Service navigation missing');
assert(html.includes("openJdLegalPolicy('privacy')"),'Privacy Policy navigation missing');
assert((html.match(/<strong>Terms of Service<\/strong>/g)||[]).length>=1,'Terms settings row missing');
assert((html.match(/<strong>Privacy Policy<\/strong>/g)||[]).length>=1,'Privacy settings row missing');

assert(html.includes('.jd-first-run{'),'first-run UI styles missing');
assert(html.includes('background:var(--bg-color)'),'onboarding must inherit JepongDevxyz background token');
assert(html.includes('background:var(--accent-gradient)'),'onboarding must use JepongDevxyz accent gradient');
assert(html.includes('body.theme-light .jd-consent-card'),'light-theme legal dialog compatibility missing');

assert(html.includes('AI can make mistakes'),'AI warning copy missing');
assert(html.includes('Third-party providers and plugins'),'Terms provider section missing');
assert(html.includes('AI providers and tools'),'Privacy provider section missing');
assert(html.includes('Account authentication'),'Privacy auth section missing');

console.log('PASS: JepongDevxyz first-run Welcome, Terms, Privacy, consent gate, settings links, and theme integration.');
