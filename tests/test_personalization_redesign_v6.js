const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const api=fs.readFileSync('api/chat.js','utf8');
const must=[
  'personalization-v6-page',
  'ps-personality-hero',
  'ps-style-summary',
  'ps-writing-controls',
  'ps-about-you-card',
  'ps-custom-instructions-card',
  'Customize how JepongDevxyz AI responds to you',
  'Your changes are saved automatically on this device.'
];
for(const s of must){if(!html.includes(s)){console.error('MISSING',s);process.exit(1)}}
for(const id of ['psBaseStyleBtn','psWarmBtn','psEnthusiasticBtn','psHeadersBtn','psEmojiBtn','psCustomInstructions','psNickname','psOccupation','psMoreAbout']){
 const n=(html.match(new RegExp(`id=["']${id}["']`,'g'))||[]).length;
 if(n!==1){console.error('ID_COUNT',id,n);process.exit(1)}
}
if(!api.includes("Use a ${style.toLowerCase()} communication style.")){console.error('backend personalization mapping missing');process.exit(1)}
console.log('PASS personalization redesign v6 contract');
