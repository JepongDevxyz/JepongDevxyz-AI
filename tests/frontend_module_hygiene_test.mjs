import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const plugins=readFileSync(new URL('../plugins.js',import.meta.url),'utf8');
const motion=readFileSync(new URL('../motion-ux.js',import.meta.url),'utf8');

assert(plugins.includes('function storageGet(') && plugins.includes('function storageSet(') && plugins.includes('function storageJson('),
  'Plugins must use self-contained safe storage helpers');
assert(!plugins.replaceAll('window.localStorage','').includes('localStorage.'),
  'Plugins must not bypass its safe storage helpers');
assert(!plugins.includes('JSON.parse(localStorage.getItem('),
  'Plugin state restore must not directly parse localStorage');

assert(motion.includes('const MAX_SCROLL_SNAPSHOTS=80'),'Scroll state history must be bounded');
assert(motion.includes('function pruneScrollStates('),'Scroll state pruning helper missing');
assert(motion.includes('lifecycleBound:false'),'Global scroll lifecycle listener guard missing');
assert(motion.includes('if(!state.lifecycleBound){'),'Global page lifecycle listeners must bind only once');
assert(!motion.replaceAll('window.localStorage','').includes('localStorage.'),
  'Motion UX must not bypass its safe storage helpers');

console.log('PASS: frontend modules use bounded safe storage and avoid duplicate global scroll lifecycle listeners.');
