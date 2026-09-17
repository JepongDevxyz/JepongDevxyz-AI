const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
function expect(cond,msg){if(!cond){console.error('FAIL:',msg);process.exitCode=1}else console.log('PASS:',msg)}
expect(!html.includes('id="personalizationSearchInput"'),'Personalization page no longer contains the legacy settings search bar');
expect(!html.includes('id="personalizationTabs"'),'Personalization page no longer contains legacy tabs');
expect(!html.includes('id="psVoiceTabBtn"') && !html.includes('id="psPetTabBtn"') && !html.includes('id="psPersonalizationTabBtn"'),'Legacy Personalization/Voice/Pet tab buttons are removed');
expect(/<h2>Personalization<\/h2>/.test(html),'Dedicated Personalization header is shown');
expect(html.includes('onclick="backToSettingsFromPersonalization()"'),'Personalization header back button returns to the new Settings home');
expect(!html.includes('id="psVoiceSection"') && !html.includes('id="psPetSection"'),'Voice and Pet sections are removed from the Personalization page');
expect(html.includes('onclick="backFromVoiceSettingsPage()"'),'Voice page back button returns through the new Settings flow');
expect(html.includes('onclick="backFromPetSettingsPage()"'),'Pet page back button returns through the new Settings flow');
expect(/function backToSettingsFromPersonalization\(\)[\s\S]*?openSettingsModal\(\)/.test(html),'Personalization back navigation opens Settings home');
expect(/function backFromVoiceSettingsPage\(\)[\s\S]*?openSettingsModal\(\)/.test(html),'Voice back navigation opens Settings home');
expect(/function backFromPetSettingsPage\(\)[\s\S]*?openSettingsModal\(\)/.test(html),'Pet back navigation opens Settings home');
if(process.exitCode) process.exit(process.exitCode);
