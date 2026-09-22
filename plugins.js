const PANEL_HTML="\n<section class=\"jdplug-dialog\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"jdplugTitle\">\n  <header class=\"jdplug-header\">\n    <button type=\"button\" class=\"jdplug-icon-btn\" id=\"jdplugBack\" aria-label=\"Back\">‹</button>\n    <h2 id=\"jdplugTitle\">Plugins</h2>\n    <button type=\"button\" class=\"jdplug-icon-btn\" id=\"jdplugClose\" aria-label=\"Close\">×</button>\n  </header>\n\n  <div class=\"jdplug-top-tabs\" id=\"jdplugTabs\">\n    <button type=\"button\" class=\"jdplug-top-tab active\" id=\"jdplugTabPlugins\">Plugins</button>\n    <button type=\"button\" class=\"jdplug-top-tab\" id=\"jdplugTabSkills\">Skills</button>\n  </div>\n\n  <div class=\"jdplug-scroll\">\n    <section class=\"jdplug-view\" id=\"jdplugDirectory\">\n      <div class=\"jdplug-icon-strip\" id=\"jdplugIconStrip\" aria-label=\"Plugin shortcuts\"></div>\n      <h3 class=\"jdplug-heading\" id=\"jdplugDirectoryTitle\">Plugins</h3>\n      <p class=\"jdplug-subtitle\" id=\"jdplugDirectoryHint\">Work with JepongDevxyz AI across your favorite tools.</p>\n      <label class=\"jdplug-search\"><span aria-hidden=\"true\">⌕</span><input id=\"jdplugSearch\" type=\"search\" autocomplete=\"off\" placeholder=\"Search plugins\" aria-label=\"Search plugins and skills\"></label>\n\n      <p class=\"jdplug-group\" id=\"jdplugInstalledLabel\">Installed</p>\n      <div class=\"jdplug-list\" id=\"jdplugInstalled\"></div>\n\n      <p class=\"jdplug-group\" id=\"jdplugAvailableLabel\">Popular</p>\n      <div class=\"jdplug-list\" id=\"jdplugAvailable\"></div>\n    </section>\n\n    <section class=\"jdplug-view\" id=\"jdplugDetail\" hidden>\n      <div class=\"jdplug-detail-top\">\n        <div class=\"jdplug-hero\">\n          <div class=\"jdplug-entry-icon\" id=\"jdplugHeroIcon\" aria-hidden=\"true\"></div>\n          <h3 id=\"jdplugHeroTitle\"></h3>\n          <p id=\"jdplugHeroTagline\"></p>\n        </div>\n        <div class=\"jdplug-hero-actions\">\n          <button type=\"button\" class=\"jdplug-button\" id=\"jdplugOverflow\" aria-label=\"Plugin options\">•••</button>\n          <button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugTry\">Install</button>\n          <button type=\"button\" class=\"jdplug-button\" id=\"jdplugManage\" hidden>Manage</button>\n        </div>\n      </div>\n\n      <div class=\"jdplug-demo\" id=\"jdplugDemo\"></div>\n      <p class=\"jdplug-description\" id=\"jdplugDescription\"></p>\n\n      <div id=\"jdplugGithubSummary\">\n        <p class=\"jdplug-section-label\">Repository</p>\n        <div class=\"jdplug-card\"><strong id=\"jdplugCurrentRepo\">No repository selected</strong><p id=\"jdplugRepoSummary\">Install GitHub, then connect or open a repository in Manage.</p></div>\n      </div>\n\n      <div id=\"jdplugSkillSummary\" hidden>\n        <p class=\"jdplug-section-label\">Skills</p>\n        <div class=\"jdplug-skill-chips\" id=\"jdplugDetailSkillList\"></div>\n      </div>\n\n      <div class=\"jdplug-hint\" id=\"jdplugDetailNote\"></div>\n      <button type=\"button\" class=\"jdplug-button jdplug-uninstall\" id=\"jdplugUninstall\" hidden>Uninstall plugin</button>\n    </section>\n\n    <section class=\"jdplug-view\" id=\"jdplugManageView\" hidden>\n      <h3 class=\"jdplug-heading\" id=\"jdplugManageTitle\">Settings</h3>\n      <p class=\"jdplug-subtitle\" id=\"jdplugManageSubtitle\"></p>\n\n      <div id=\"jdplugGithubManage\">\n        <div class=\"jdplug-card jdplug-account-card\">\n          <div id=\"jdplugGithubSignedOut\">\n            <strong>GitHub account</strong>\n            <p>Connect your GitHub account through GitHub OAuth. Your access token stays server-side in an encrypted HttpOnly cookie.</p>\n            <button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugConnectGithub\">Connect GitHub</button>\n            <p id=\"jdplugConnectionReady\" class=\"jdplug-muted\" role=\"status\">Checking account connection availability…</p>\n          </div>\n          <div id=\"jdplugGithubSignedIn\" hidden>\n            <div class=\"jdplug-account-row\">\n              <img id=\"jdplugGithubAvatar\" class=\"jdplug-account-avatar\" alt=\"\" referrerpolicy=\"no-referrer\">\n              <div class=\"jdplug-account-copy\"><strong id=\"jdplugGithubLogin\">GitHub</strong><p id=\"jdplugGithubScopes\">Connected</p></div>\n            </div>\n            <div class=\"jdplug-row\"><button type=\"button\" class=\"jdplug-button\" id=\"jdplugRefreshRepos\">Refresh repositories</button><button type=\"button\" class=\"jdplug-button\" id=\"jdplugDisconnectGithub\">Disconnect</button></div>\n          </div>\n        </div>\n\n        \n        <div class=\"jdplug-card jdplug-app-install\" id=\"jdplugGitHubAppCard\" hidden>\n          <strong>JepongDevxyz AI — GitHub App</strong>\n          <p>Install our GitHub App to choose All repositories or Only select repositories using GitHub's own permissions screen. This is separate from the ChatGPT Codex Connector.</p>\n          <p id=\"jdplugAppStatus\" class=\"jdplug-muted\" role=\"status\">Checking GitHub App installation…</p>\n          <p id=\"jdplugAppPermissions\" class=\"jdplug-muted\" hidden></p>\n          <div class=\"jdplug-row\">\n            <button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugInstallApp\">Install GitHub App</button>\n            <a id=\"jdplugManageApp\" class=\"jdplug-button\" href=\"https://github.com/settings/installations\" target=\"_blank\" rel=\"noopener noreferrer\" hidden>Manage permissions on GitHub</a>\n          </div>\n          <p class=\"jdplug-muted\">Repository access, suspension and removal are managed by GitHub. The app will verify your installation and never trust a URL installation ID by itself.</p>\n        </div>\n\n        <div class=\"jdplug-card\" id=\"jdplugAccountReposCard\" hidden>\n          <strong>Your repositories</strong>\n          <p>Select a repository available to the connected account.</p>\n          <select class=\"jdplug-select\" id=\"jdplugAccountRepos\" aria-label=\"Connected GitHub repositories\"></select>\n        </div>\n\n        <div class=\"jdplug-card\">\n          <strong>Repository</strong>\n          <p>Browse public repositories without signing in, or use a connected GitHub account for repositories it can access.</p>\n          <label class=\"jdplug-field\" for=\"jdplugRepoInput\">Repository URL or owner/repository</label>\n          <div class=\"jdplug-row\"><input class=\"jdplug-input\" id=\"jdplugRepoInput\" autocomplete=\"off\" spellcheck=\"false\" maxlength=\"210\" placeholder=\"owner/repository\"><button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugLoadRepo\">Open</button></div>\n          <p id=\"jdplugRepoDescription\" class=\"jdplug-muted\"></p>\n          <div class=\"jdplug-row\"><select class=\"jdplug-select\" id=\"jdplugBranch\" aria-label=\"GitHub branch\"></select><button type=\"button\" class=\"jdplug-button\" id=\"jdplugPRs\">Open PRs</button></div>\n          <p class=\"jdplug-muted\" id=\"jdplugLocation\"></p>\n          <div class=\"jdplug-file-list\" id=\"jdplugResults\" aria-label=\"Repository files\"></div>\n          <pre class=\"jdplug-preview\" id=\"jdplugPreview\" hidden></pre>\n          <div class=\"jdplug-row\"><label for=\"jdplugGitEnabled\">Use selected repository/file in chat</label><input type=\"checkbox\" id=\"jdplugGitEnabled\"></div>\n          <p class=\"jdplug-muted\" id=\"jdplugSelected\">Not included in chat.</p>\n        </div>\n      </div>\n\n      <div id=\"jdplugSuperManage\" hidden>\n        <div class=\"jdplug-card\">\n          <strong>Superpowers workflow</strong>\n          <p>Enable structured coding guidance and choose the active skill.</p>\n          <div class=\"jdplug-row\"><label for=\"jdplugSuperEnabled\">Enable coding workflow</label><input type=\"checkbox\" id=\"jdplugSuperEnabled\"></div>\n          <label class=\"jdplug-field\" for=\"jdplugPhase\">Active coding skill</label>\n          <select class=\"jdplug-select\" id=\"jdplugPhase\"></select>\n        </div>\n        <p class=\"jdplug-section-label\">Skills</p>\n        <div class=\"jdplug-skill-chips\" id=\"jdplugManageSkillList\"></div>\n      </div>\n\n      <div class=\"jdplug-card\" id=\"jdplugAgentCard\" hidden>\n        <strong>Coding agent</strong>\n        <p>Use your selected AI model to inspect real GitHub source, choose relevant files, and draft a reviewed multi-file change. The coding agent never writes to GitHub or claims tests passed without explicit approval and results.</p>\n        <button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugOpenAgent\">Start coding task</button>\n      </div>\n      <div class=\"jdplug-card jdplug-workspace-card\" id=\"jdplugWorkspacePanel\" hidden>\n        <strong>GitHub Issues &amp; Pull Request Review</strong>\n        <p>Inspect real repository issues and PR changes, and submit an issue or review after approving the exact GitHub operation.</p>\n        <div class=\"jdplug-row\"><button type=\"button\" class=\"jdplug-button\" id=\"jdplugLoadIssues\">Issues</button><button type=\"button\" class=\"jdplug-button\" id=\"jdplugLoadPRs\">Pull requests</button></div>\n        <div class=\"jdplug-file-list\" id=\"jdplugWorkspaceResults\" aria-label=\"GitHub issues and pull requests\"></div>\n        <label class=\"jdplug-field\" for=\"jdplugIssueTitle\">New issue title</label>\n        <input class=\"jdplug-input\" id=\"jdplugIssueTitle\" maxlength=\"250\" placeholder=\"Describe the issue\">\n        <label class=\"jdplug-field\" for=\"jdplugIssueBody\">Issue details</label>\n        <textarea class=\"jdplug-input jdplug-workspace-text\" id=\"jdplugIssueBody\" maxlength=\"10000\" rows=\"3\" placeholder=\"What is broken? Expected behavior?\"></textarea>\n        <button type=\"button\" class=\"jdplug-button\" id=\"jdplugCreateIssue\">Create issue…</button>\n        <div id=\"jdplugWorkspaceSelected\" hidden>\n          <p class=\"jdplug-section-label\" id=\"jdplugWorkspaceHeading\"></p>\n          <pre class=\"jdplug-preview\" id=\"jdplugWorkspaceDetails\"></pre>\n          <div class=\"jdplug-row\" id=\"jdplugIssueControls\" hidden><button type=\"button\" class=\"jdplug-button\" id=\"jdplugIssueToggle\">Close issue</button></div>\n          <div class=\"jdplug-row\" id=\"jdplugPRControls\" hidden><button type=\"button\" class=\"jdplug-button\" id=\"jdplugInspectPR\">Inspect changed files</button><button type=\"button\" class=\"jdplug-button\" id=\"jdplugCheckPR\">Check CI</button></div>\n          <pre class=\"jdplug-preview\" id=\"jdplugWorkspaceDiff\" hidden></pre>\n          <label class=\"jdplug-field\" for=\"jdplugWorkspaceComment\">Issue comment or PR review</label>\n          <textarea class=\"jdplug-input jdplug-workspace-text\" id=\"jdplugWorkspaceComment\" maxlength=\"12000\" rows=\"3\" placeholder=\"Write the exact comment to send to GitHub\"></textarea>\n          <div class=\"jdplug-row\"><select class=\"jdplug-select\" id=\"jdplugReviewEvent\" hidden aria-label=\"Pull request review action\">\n            <option value=\"COMMENT\">Comment</option><option value=\"REQUEST_CHANGES\">Request changes</option><option value=\"APPROVE\">Approve</option>\n          </select><button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugPostWorkspace\">Submit to GitHub…</button></div>\n        </div>\n        <p class=\"jdplug-status\" id=\"jdplugWorkspaceStatus\" role=\"status\" aria-live=\"polite\"></p>\n        <div id=\"jdplugWorkspaceLinks\"></div>\n      </div>\n      <div class=\"jdplug-card jdplug-execution-card\" id=\"jdplugExecutionPanel\" hidden>\n        <strong>Run project tests</strong>\n        <p>Run an existing GitHub Actions test workflow with your connected GitHub account. The model does not run commands directly or change repository files.</p>\n        <p class=\"jdplug-muted\" id=\"jdplugExecutionRepo\">Select a GitHub repository first.</p>\n        <div class=\"jdplug-row\"><button type=\"button\" class=\"jdplug-button\" id=\"jdplugLoadWorkflows\">Find test workflows</button><button type=\"button\" class=\"jdplug-button\" id=\"jdplugCheckRuns\" hidden>Check runs</button></div>\n        <label for=\"jdplugWorkflowSelect\" class=\"jdplug-field\">Verification workflow</label>\n        <select class=\"jdplug-select\" id=\"jdplugWorkflowSelect\" aria-label=\"Test workflow\"><option value=\"\">Choose a workflow…</option></select>\n        <p class=\"jdplug-muted\" id=\"jdplugExecutionBranch\"></p>\n        <button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugDispatchWorkflow\" disabled>Run tests</button>\n        <p class=\"jdplug-status\" id=\"jdplugExecutionStatus\" role=\"status\" aria-live=\"polite\"></p>\n        <div class=\"jdplug-file-list\" id=\"jdplugRunList\" aria-label=\"Recent workflow executions\"></div>\n      </div>\n      <div class=\"jdplug-card\" id=\"jdplugProposalPanel\" hidden>\n        <strong>Propose a code change</strong>\n        <p>Stage AI-generated or manually edited source, preview the original versus proposed content, and explicitly approve a new GitHub pull request. No changes are made to main automatically.</p>\n        <label class=\"jdplug-field\" for=\"jdplugChangePath\">Repository file path</label>\n        <input class=\"jdplug-input\" id=\"jdplugChangePath\" placeholder=\"src/example.js\" autocomplete=\"off\" spellcheck=\"false\">\n        <label class=\"jdplug-field\" for=\"jdplugChangeSource\">Complete replacement file source (max 80 KB)</label>\n        <textarea class=\"jdplug-input jdplug-change-source\" id=\"jdplugChangeSource\" rows=\"7\" spellcheck=\"false\" placeholder=\"Paste a complete file from an AI response, or edit it here.\"></textarea>\n        <button type=\"button\" class=\"jdplug-button\" id=\"jdplugPreviewChange\">Preview proposed change</button>\n        <div id=\"jdplugChangePreview\" hidden>\n          <p class=\"jdplug-muted\" id=\"jdplugChangeSummary\"></p>\n          <p class=\"jdplug-field\">Original file (preview)</p>\n          <pre class=\"jdplug-preview\" id=\"jdplugBeforeSource\"></pre>\n          <p class=\"jdplug-field\">Proposed file (preview)</p>\n          <pre class=\"jdplug-preview\" id=\"jdplugAfterSource\"></pre>\n          <p class=\"jdplug-muted\">Review the complete code and GitHub pull-request diff before merging. Workflow files and secrets cannot be changed through this tool.</p>\n          <button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugSubmitChange\">Create proposal PR</button>\n        </div>\n        <p class=\"jdplug-status\" id=\"jdplugChangeStatus\" role=\"status\" aria-live=\"polite\"></p>\n        <div id=\"jdplugChangeResult\"></div>\n        <div class=\"jdplug-batch\">\n          <p class=\"jdplug-section-label\">Multi-file coding proposal</p>\n          <p>Enter a file path and complete code above, then add it to a reviewed batch. Up to 8 files are committed together on a separate branch and offered as one PR.</p>\n          <button type=\"button\" class=\"jdplug-button\" id=\"jdplugBatchAdd\">Add current file to batch</button>\n          <div class=\"jdplug-file-list\" id=\"jdplugBatchQueue\" aria-label=\"Files staged for one pull request\"></div>\n          <button type=\"button\" class=\"jdplug-button\" id=\"jdplugBatchPreview\" disabled>Preview all staged files</button>\n          <div id=\"jdplugBatchReview\" hidden>\n            <p class=\"jdplug-muted\" id=\"jdplugBatchSummary\"></p>\n            <div id=\"jdplugBatchDiffs\"></div>\n            <button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugBatchCreate\">Create reviewed multi-file PR…</button>\n          </div>\n          <p class=\"jdplug-status\" id=\"jdplugBatchStatus\" role=\"status\" aria-live=\"polite\"></p>\n          <div id=\"jdplugBatchResult\"></div>\n        </div>\n      </div>\n      <p class=\"jdplug-status\" id=\"jdplugStatus\" role=\"status\" aria-live=\"polite\"></p>\n      <button type=\"button\" class=\"jdplug-button jdplug-uninstall\" id=\"jdplugManageUninstall\">Uninstall plugin</button>\n    </section>\n  </div>\n\n  <div class=\"jdplug-confirm\" id=\"jdplugWorkspaceConfirm\" hidden role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"jdplugWorkspaceConfirmTitle\">\n    <div class=\"jdplug-confirm-card\">\n      <h3 id=\"jdplugWorkspaceConfirmTitle\">Confirm GitHub action</h3>\n      <p id=\"jdplugWorkspaceConfirmText\"></p>\n      <div class=\"jdplug-confirm-actions\"><button type=\"button\" class=\"jdplug-button\" id=\"jdplugWorkspaceCancel\">Cancel</button>\n        <button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugWorkspaceApprove\">Confirm</button></div>\n    </div>\n  </div>\n  <div class=\"jdplug-confirm\" id=\"jdplugBatchConfirm\" hidden role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"jdplugBatchConfirmTitle\">\n    <div class=\"jdplug-confirm-card\">\n      <h3 id=\"jdplugBatchConfirmTitle\">Create multi-file PR?</h3>\n      <p id=\"jdplugBatchConfirmText\"></p>\n      <div class=\"jdplug-confirm-actions\">\n        <button type=\"button\" class=\"jdplug-button\" id=\"jdplugBatchCancel\">Cancel</button>\n        <button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugBatchApprove\">Create PR</button>\n      </div>\n    </div>\n  </div>\n  <div class=\"jdplug-confirm\" id=\"jdplugProposalConfirm\" hidden role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"jdplugProposalTitle\">\n    <div class=\"jdplug-confirm-card\">\n      <h3 id=\"jdplugProposalTitle\">Create GitHub pull request?</h3>\n      <p id=\"jdplugProposalDescription\"></p>\n      <div class=\"jdplug-confirm-actions\"><button type=\"button\" class=\"jdplug-button\" id=\"jdplugCancelProposal\">Cancel</button><button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugApproveProposal\">Create PR</button></div>\n    </div>\n  </div>\n  <div class=\"jdplug-confirm\" id=\"jdplugExecuteConfirm\" hidden role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"jdplugExecuteTitle\">\n    <div class=\"jdplug-confirm-card\">\n      <h3 id=\"jdplugExecuteTitle\">Run GitHub Actions?</h3>\n      <p id=\"jdplugExecuteDescription\"></p>\n      <div class=\"jdplug-confirm-actions\"><button type=\"button\" class=\"jdplug-button\" id=\"jdplugCancelExecution\">Cancel</button><button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugApproveExecution\">Run tests</button></div>\n    </div>\n  </div>\n  <div class=\"jdplug-confirm\" id=\"jdplugConfirm\" hidden role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"jdplugConfirmTitle\">\n    <div class=\"jdplug-confirm-card\">\n      <div class=\"jdplug-entry-icon\" id=\"jdplugConfirmIcon\" aria-hidden=\"true\"></div>\n      <h3 id=\"jdplugConfirmTitle\">Install plugin?</h3>\n      <p id=\"jdplugConfirmDescription\"></p>\n      <div class=\"jdplug-confirm-actions\"><button type=\"button\" class=\"jdplug-button\" id=\"jdplugCancelInstall\">Cancel</button><button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugConfirmInstall\">Install</button></div>\n    </div>\n  </div>\n</section>";

/* Mobile Plugins + Skills marketplace for JepongDevxyz AI. GitHub uses an official OAuth web flow; Superpowers remains a built-in conversational workflow. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const STORAGE_KEY='jepong_plugins_directory_v2';
  const phases=[
    {id:'auto',name:'Automatic skill selection',description:'Choose the relevant coding workflow automatically from each chat message.'},
    {id:'plan',name:'Brainstorming & planning',description:'Clarify the goal, inspect available evidence, and outline the implementation.'},
    {id:'implement',name:'Executing plans / TDD',description:'Write a focused implementation plan and specify tests before claiming it works.'},
    {id:'debug',name:'Diagnosing problems',description:'Reproduce and narrow down bugs using actual error messages and relevant source.'},
    {id:'review',name:'Reviewing & finishing',description:'Review the changed code, identify remaining risks, and verify before release.'}
  ];
  const skillPlugins={
    mattpocock:{name:'Matt Pocock Skills',tagline:'Engineering workflows for real projects',description:'Engineering-oriented workflows for diagnosis, TDD, code review, architecture, specs, tickets, research, implementation and handoff.',icon:'MP',className:'super',source:'mattpocock/skills'},
    uiuxpro:{name:'UI/UX Pro Max',tagline:'Design systems, UX and interface guidance',description:'Applies UI/UX design intelligence for layouts, accessibility, typography, palettes, components, charts and implementation across common web stacks.',icon:'UX',className:'super',source:'nextlevelbuilder/ui-ux-pro-max-skill'},
    caveman:{name:'Caveman',tagline:'Concise coding answers without filler',description:'Keeps coding responses terse and evidence-focused while preserving useful code, paths, errors and technical explanations.',icon:'CV',className:'super',source:'Shawnchee/caveman-skill'},
    humanizer:{name:'Humanizer',tagline:'Make AI-written prose sound more natural',description:'Revises prose to reduce robotic or formulaic AI-writing patterns while preserving the original meaning and factual content.',icon:'HU',className:'super',source:'blader/humanizer'},
    findskills:{name:'Find Skills',tagline:'Discover an appropriate agent skill',description:'Helps identify the most relevant installed skill for a task and explains when no installed skill is a good match.',icon:'FS',className:'super',source:'vercel-labs/skills/find-skills'},
    deployvercel:{name:'Deploy to Vercel',tagline:'Plan and verify Vercel deployments',description:'Guides Vercel deployment workflows, preferring preview deployments and verified project state. It never claims a deployment occurred without real deployment evidence.',icon:'▲',className:'super',source:'vercel-labs/agent-skills/deploy-to-vercel'},
    brainstorming:{name:'Brainstorming',tagline:'Turn ideas into checkable designs',description:'Clarifies intent, constraints and success criteria before implementation, then turns the result into a concrete design.',icon:'💡',className:'super',source:'obra/superpowers/brainstorming'},
    tdd:{name:'TDD',tagline:'Test-driven implementation workflow',description:'Uses a red-green-refactor style workflow where practical and never claims tests passed without real execution evidence.',icon:'✓',className:'super',source:'obra/superpowers/test-driven-development'},
    excalidraw:{name:'Excalidraw',tagline:'Design editable Excalidraw diagrams',description:'Plans clear diagrams and can generate editable Excalidraw-compatible source when the selected coding workflow has enough project context.',icon:'EX',className:'super',source:'coleam00/excalidraw-diagram-skill'},
    remotion:{name:'Remotion',tagline:'Create and review Remotion video code',description:'Applies Remotion best practices for compositions, animation, timing, media, captions and rendering workflows without pretending a render ran when it did not.',icon:'▶',className:'super',source:'remotion-dev/skills'},
    webquality:{name:'Web Quality',tagline:'Performance, accessibility and SEO review',description:'Reviews web projects using evidence-oriented performance, Core Web Vitals, accessibility, SEO and best-practice criteria.',icon:'WQ',className:'super',source:'addyosmani/web-quality-skills'}
  };
  const catalogue={
    github:{name:'GitHub',tagline:'Triage PRs, issues, CI, and publish flows',description:'Use GitHub with JepongDevxyz AI to inspect repositories, understand source files, review branches and pull requests, and bring selected repository context into chat.',icon:'GH',className:'git'},
    superpowers:{name:'Superpowers',tagline:'Make your agents better devs',description:'Use Superpowers to guide coding work through brainstorming, implementation planning, test-driven development, systematic debugging, code review, and finishing workflows.',icon:'⚡',className:'super',source:'obra/superpowers'},
    ...skillPlugins
  };
  const skillPluginIds=Object.keys(skillPlugins);
  const defaultInstalled=Object.fromEntries(Object.keys(catalogue).map(id=>[id,false]));
  const defaultState={repo:'',path:'',ref:'',directory:'',github:false,repoLoaded:false,superpowers:false,phase:'auto',installed:{...defaultInstalled},accountConnected:false,accountUser:null,accountScopes:[],accountRepos:[],githubConnectionReady:null,githubAppStatus:null};
  const state=Object.assign({},defaultState);
  let tab='plugins',view='directory',selected='github',busy=false,pendingPluginAction=null;
  let availableTestWorkflows=[],selectedExecutionRef='',pendingExecution=null;
  let stagedProposal=null,pendingProposal=null;
  let batchFiles=[],pendingBatch=null;
  let workspaceSelection=null,pendingWorkspaceAction=null;
  let savedGithubSelection=false,githubRestorePromise=Promise.resolve();
  const history=[];
  function text(id,value){const el=$(id);if(el)el.textContent=String(value||'');}
  function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({repo:state.repo,ref:state.ref,path:state.path,installed:Object.fromEntries(Object.keys(catalogue).map(id=>[id,state.installed?.[id]===true])),github:!!state.installed.github&&state.github,superpowers:!!state.installed.superpowers&&state.superpowers,phase:state.phase}));}catch(_){}}
  function restore(){try{const s=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(s&&typeof s==='object'){state.repo=typeof s.repo==='string'?s.repo:'';state.installed=Object.fromEntries(Object.keys(catalogue).map(id=>[id,s.installed?.[id]===true]));state.ref=typeof s.ref==='string'?s.ref:'';state.path=typeof s.path==='string'?s.path:'';state.github=false;state.superpowers=state.installed.superpowers&&s.superpowers===true;state.phase=phases.some(p=>p.id===s.phase)?s.phase:'auto';savedGithubSelection=state.installed.github&&s.github===true&&!!state.repo;}}catch(_){}}
  restore();
  githubRestorePromise=restoreGithubContext();

  async function restoreGithubContext(){
    if(!savedGithubSelection||!installed('github')||!state.repo)return;
    const savedRepo=state.repo;
    try{
      const response=await fetch('/api/plugins',{
        method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'repo',repo:savedRepo})
      });
      if(!response.ok)throw new Error('Saved repository is not accessible.');
      const info=await response.json();
      if(!info?.repo||info.repo.toLowerCase()!==savedRepo.toLowerCase())throw new Error('Saved repository changed.');
      if(state.repo!==savedRepo||!installed('github'))return;
      state.repoLoaded=true;state.github=true;
      if(!state.ref)state.ref=info.defaultBranch||'';
    }catch(_){state.repoLoaded=false;state.github=false;state.path='';}
  }

  function notice(message,error=false){text('jdplugStatus',message);$('jdplugStatus')?.classList.toggle('error',!!error);}
  function setBusy(flag){busy=!!flag;document.querySelectorAll('#jdplugPanel .jdplug-button, #jdplugPanel .jdplug-entry').forEach(el=>{if(el.tagName==='BUTTON')el.disabled=busy;});}
  function makeButton(label,handler,className='jdplug-button'){const el=document.createElement('button');el.type='button';el.className=className;el.textContent=label;el.addEventListener('click',handler);return el;}
  function icon(className,character){const el=document.createElement('span');el.className='jdplug-entry-icon '+className;el.textContent=character;el.setAttribute('aria-hidden','true');return el;}
  function makeEntry(data,handler,small=''){const row=makeButton('',handler,'jdplug-entry');row.append(icon(data.className,data.icon));const copy=document.createElement('span');copy.className='jdplug-entry-copy';const strong=document.createElement('strong');strong.textContent=data.name;const desc=document.createElement('small');desc.textContent=small||data.tagline;copy.append(strong,desc);const trail=document.createElement('span');trail.className='jdplug-entry-trail';trail.textContent='›';row.append(copy,trail);return row;}
  function showPluginConfirmation(id,action='install'){
    if(!catalogue[id])return;
    if(action==='install'&&installed(id)){selected=id;openDetail(id);return;}
    if(action==='uninstall'&&!installed(id))return;
    pendingPluginAction={id,action};
    const c=catalogue[id];
    const uninstall=action==='uninstall';
    text('jdplugConfirmIcon',c.icon);
    $('jdplugConfirmIcon').className='jdplug-entry-icon '+c.className;
    text('jdplugConfirmTitle',(uninstall?'Uninstall ':'Install ')+c.name+'?');
    text('jdplugConfirmDescription',uninstall
      ? id==='github'
        ? 'This removes GitHub from this browser and disconnects the linked GitHub account. Repository context will stop being sent to chat.'
        : 'This removes the Superpowers coding workflow from this browser and disables its skills in chat.'
      : id==='github'
        ? 'Adds the GitHub repository browser to your installed plugins. You can inspect public repositories or connect your GitHub account separately. This step does not authorize account access.'
        : 'Adds the Superpowers coding workflow and makes its planning, implementation, debugging and review skills available in chat. No code is executed by installing.');
    text('jdplugConfirmInstall',uninstall?'Uninstall':'Install');
    $('jdplugConfirmInstall').disabled=false;
    $('jdplugConfirm').hidden=false;
    $('jdplugConfirmInstall').focus();
  }
  function hidePluginConfirmation(){
    pendingPluginAction=null;
    const confirm=$('jdplugConfirm');if(confirm)confirm.hidden=true;
  }
  async function confirmPluginAction(){
    if(!pendingPluginAction)return;
    const {id,action}=pendingPluginAction;
    const control=$('jdplugConfirmInstall');if(control)control.disabled=true;
    if(action==='uninstall'){
      if(id==='github'&&state.accountConnected){
        try{
          const result=await fetch('/api/github-oauth-session',{method:'DELETE',credentials:'same-origin',headers:{Accept:'application/json'}});
          if(!result.ok)throw new Error('Could not disconnect the GitHub account. Try again.');
        }catch(error){
          if(control)control.disabled=false;
          notice(error?.message||'Could not disconnect GitHub. Try again.',true);
          text('jdplugConfirmDescription','GitHub could not be disconnected. Check your connection and try Uninstall again.');
          return;
        }
      }
      state.installed[id]=false;
      if(id==='github'){
        batchFiles=[];pendingBatch=null;clearBatchConfirmation();savedGithubSelection=false;availableTestWorkflows=[];selectedExecutionRef='';
        state.github=false;state.repoLoaded=false;state.repo='';state.path='';state.ref='';state.directory='';
        state.accountConnected=false;state.accountUser=null;state.accountScopes=[];state.accountRepos=[];state.githubAppStatus=null;
        $('jdplugResults')?.replaceChildren();
        $('jdplugPreview').hidden=true;
        $('jdplugGitEnabled').checked=false;
      }else if(id==='superpowers'){state.superpowers=false;}
      persist();hidePluginConfirmation();view='directory';history.length=0;render();
      notice(catalogue[id].name+' uninstalled.');
      if(typeof window.showModernToast==='function')window.showModernToast(catalogue[id].name+' uninstalled');
      return;
    }
    state.installed[id]=true;
    if(id==='superpowers')state.superpowers=true;
    persist();hidePluginConfirmation();render();
    notice(catalogue[id].name+' installed. You can now use it in chat.');
    if(typeof window.showModernToast==='function')window.showModernToast(catalogue[id].name+' installed');
  }
  function installed(id){return state.installed?.[id]===true;}
  function enabled(id){return installed(id);}
  function catalogueItem(id){
    const container=document.createElement('div');container.className='jdplug-list-item';
    container.append(makeEntry(catalogue[id],()=>openDetail(id),catalogue[id].tagline));
    const trailing=makeButton(installed(id)?'⋯':'+',installed(id)?()=>{
      document.querySelectorAll('.jdplug-entry-menu').forEach(item=>{if(item!==menu)item.hidden=true;});
      menu.hidden=!menu.hidden;
    }:()=>showPluginConfirmation(id,'install'),'jdplug-entry-trailing');
    trailing.setAttribute('aria-label',(installed(id)?'Manage ':'Install ')+catalogue[id].name);
    const menu=document.createElement('div');menu.className='jdplug-entry-menu';menu.hidden=true;
    if(installed(id)){
      if(id==='github'||id==='superpowers')menu.append(makeButton('Manage',()=>{menu.hidden=true;selected=id;openManage();},'jdplug-menu-action'));
      menu.append(makeButton('Uninstall',()=>{menu.hidden=true;showPluginConfirmation(id,'uninstall');},'jdplug-menu-action danger'));
    }
    container.append(trailing,menu);
    return container;
  }
  function renderIconStrip(){
    const strip=$('jdplugIconStrip');if(!strip)return;strip.replaceChildren();
    for(const id of Object.keys(catalogue).slice(0,8)){
      const c=catalogue[id],button=makeButton('',()=>openDetail(id),'jdplug-strip-item '+c.className);
      button.textContent=c.icon;button.setAttribute('aria-label',c.name);strip.append(button);
    }
  }
  function renderDirectory(){
    const skills=tab==='skills';
    text('jdplugDirectoryTitle',skills?'Skills':'Plugins');
    text('jdplugDirectoryHint',skills?'Installed skills are automatically available to every model when relevant.':'Connect tools and install capabilities. JepongDevxyz AI automatically uses installed plugins when a request needs them.');
    $('jdplugSearch').placeholder=skills?'Search skills':'Search plugins';
    renderIconStrip();
    const query=$('jdplugSearch').value.trim().toLowerCase();
    const installedList=$('jdplugInstalled'),available=$('jdplugAvailable');
    installedList.replaceChildren();available.replaceChildren();
    if(skills){
      for(const phase of phases){
        if(!(phase.name+' '+phase.description).toLowerCase().includes(query))continue;
        const data={name:phase.name,tagline:phase.description,className:'super',icon:'⚡'};
        const list=installed('superpowers')&&state.superpowers&&state.phase===phase.id?installedList:available;
        list.append(makeEntry(data,()=>{if(!installed('superpowers')){selected='superpowers';showPluginConfirmation('superpowers','install');return;}state.phase=phase.id;state.superpowers=true;persist();openDetail('superpowers');},phase.description));
      }
    }else{
      for(const id of Object.keys(catalogue)){
        const data=catalogue[id];
        if(!(data.name+' '+data.tagline+' '+data.description).toLowerCase().includes(query))continue;
        (installed(id)?installedList:available).append(catalogueItem(id));
      }
    }
    if(!installedList.children.length){const empty=document.createElement('div');empty.className='jdplug-empty';empty.textContent=skills?'No active skill yet.':'No plugins installed yet.';installedList.append(empty);}
    if(!available.children.length){const empty=document.createElement('div');empty.className='jdplug-empty';empty.textContent='Nothing else matches your search.';available.append(empty);}
    text('jdplugInstalledLabel',skills?'Active':'Installed');
    text('jdplugAvailableLabel',skills?'Available skills':'Discover');
    $('jdplugTabPlugins').classList.toggle('active',!skills);$('jdplugTabSkills').classList.toggle('active',skills);
  }
  function nav(next,id){if(view!==next||selected!==id)history.push({view,selected,tab});view=next;selected=id||selected;render();}
  function back(){if(pendingPluginAction){hidePluginConfirmation();return;}if(history.length){const p=history.pop();view=p.view;selected=p.selected;tab=p.tab;render();}else if(view!=='directory'){view='directory';render();}else close();}
  function renderDemo(){
    const demo=$('jdplugDemo');if(!demo)return;demo.replaceChildren();
    if(selected!=='github'&&selected!=='superpowers'){
      const plugin=catalogue[selected];
      const cards=[['Automatic','Available to every model after installation.'],['When relevant','JepongDevxyz AI can apply '+plugin.name+' automatically without @mentions or manual selection.']];
      for(const [lead,body] of cards){const card=document.createElement('div');card.className='jdplug-demo-card';const strong=document.createElement('strong');strong.textContent=lead;const span=document.createElement('span');span.textContent=' '+body;card.append(strong,span);demo.append(card);}return;
    }
    const cards=selected==='github'
      ? [
          ['Explain how authentication works in','github.com/grafana/grafana'],
          ['Worked for 12 seconds','Grafana uses a pluggable authentication pipeline. JepongDevxyz AI can inspect the selected repository source and explain the implementation.']
        ]
      : [
          ['@Superpowers','I’ve got an idea for something I’d like to build.'],
          ['@Superpowers','Let’s add a feature to this project.']
        ];
    for(const [lead,body] of cards){
      const card=document.createElement('div');card.className='jdplug-demo-card';
      const strong=document.createElement('strong');strong.textContent=lead;
      const span=document.createElement('span');span.textContent=' '+body;
      const arrow=document.createElement('span');arrow.className='jdplug-demo-arrow';arrow.textContent='→';
      card.append(strong,span,arrow);demo.append(card);
    }
  }
  function render(){
    const panel=$('jdplugPanel');
    panel?.classList.toggle('directory-mode',view==='directory');
    panel?.classList.toggle('detail-mode',view==='detail');
    panel?.classList.toggle('manage-mode',view==='manage');
    $('jdplugDirectory').hidden=view!=='directory';$('jdplugDetail').hidden=view!=='detail';$('jdplugManageView').hidden=view!=='manage';
    $('jdplugTabs').hidden=view!=='directory';
    $('jdplugClose').hidden=true;
    text('jdplugBack',view==='directory'?'☰':'‹');
    text('jdplugTitle',view==='directory'?'':view==='detail'?'Plugins':'Plugins');
    if(view==='directory'){renderDirectory();return;}
    if(view==='detail'){
      const c=catalogue[selected];text('jdplugHeroIcon',c.icon);
      $('jdplugHeroIcon').className='jdplug-entry-icon '+c.className;
      text('jdplugHeroTitle',c.name);text('jdplugHeroTagline',c.tagline);text('jdplugDescription',c.description);
      $('jdplugGithubSummary').hidden=selected!=='github';$('jdplugSkillSummary').hidden=selected!=='superpowers';
      const isInstalled=installed(selected);
      $('jdplugTry').textContent=isInstalled?'Installed':'Install'; $('jdplugTry').disabled=isInstalled;
      $('jdplugManage').hidden=true;
      $('jdplugOverflow').hidden=!isInstalled;
      $('jdplugUninstall').hidden=true;
      renderDemo();
      if(selected==='github'){
        text('jdplugCurrentRepo',state.repoLoaded?state.repo:'No repository selected');
        text('jdplugRepoSummary',state.repoLoaded?(state.path?'Selected file: '+state.path:'Default branch: '+state.ref):(isInstalled?'Open or connect a repository in Manage.':'Install GitHub first, then connect or open a repository.'));
      }else renderSkillRows('jdplugDetailSkillList',true);
      text('jdplugDetailNote',selected==='github'
        ? (state.accountConnected?'Connected to GitHub. Chat source browsing is read-only; reviewed PR proposals and CI execution require separate confirmation.':'Install the plugin first. Connecting your GitHub account is a separate authorization step.')
        : selected==='superpowers' ? 'Superpowers is a built-in coding workflow. Installing enables its skills in this browser.' : 'Installed skill plugin source: '+(c.source||'built-in')+'. Its workflow is applied to chat while installed; external actions still require real connected tools and evidence.');
    }else{
      text('jdplugManageTitle',catalogue[selected].name);
      text('jdplugManageSubtitle',selected==='github'?'Manage account access and repository context.':'Manage the installed coding workflow and active skill.');
      $('jdplugGithubManage').hidden=selected!=='github';$('jdplugSuperManage').hidden=selected!=='superpowers';
      $('jdplugManageUninstall').hidden=!installed(selected);
      const agentCard=$('jdplugAgentCard');
      if(agentCard)agentCard.hidden=!(installed('github')&&installed('superpowers')&&installed(selected));
      const workspacePanel=$('jdplugWorkspacePanel');
      if(workspacePanel)workspacePanel.hidden=!(installed('github')&&installed(selected));
      const proposalPanel=$('jdplugProposalPanel');
      if(proposalPanel){
        proposalPanel.hidden=!(installed('github')&&installed(selected));
        if(stagedProposal&&!$('jdplugChangeSource').value)$('jdplugChangeSource').value=stagedProposal;
      }
      const runner=$('jdplugExecutionPanel');
      if(runner){
        runner.hidden=!(installed('github')&&installed(selected));
        text('jdplugExecutionRepo',state.repoLoaded?'Repository: '+state.repo:'Open a GitHub repository in the GitHub plugin first.');
        text('jdplugExecutionBranch',state.repoLoaded?'Branch: '+(state.ref||'default'):'');
        $('jdplugDispatchWorkflow').disabled=!(state.accountConnected&&state.repoLoaded&&availableTestWorkflows.length);
      }
      if(selected==='github'){$('jdplugRepoInput').value=state.repo;selectedInfo();renderGithubAccount();}
      else{$('jdplugSuperEnabled').checked=state.superpowers;$('jdplugPhase').value=state.phase;renderSkillRows('jdplugManageSkillList',true);}
    }
  }
  function renderSkillRows(id,asChips=false){const list=$(id);list.replaceChildren();
    for(const phase of phases){
      const handler=()=>{if(!installed('superpowers')){selected='superpowers';showPluginConfirmation('superpowers','install');return;}state.phase=phase.id;state.superpowers=true;persist();$('jdplugPhase').value=phase.id;render();notice('Skill selected: '+phase.name);};
      if(asChips){
        const chip=makeButton((phase.id==='plan'?'✏️ ':phase.id==='implement'?'🛠️ ':phase.id==='debug'?'🔍 ':'✅ ')+phase.name,handler,'jdplug-skill-chip');
        if(installed('superpowers')&&state.superpowers&&state.phase===phase.id)chip.setAttribute('aria-current','true');
        list.append(chip);
      }else{
        list.append(makeEntry({name:phase.name,tagline:phase.description,className:'super',icon:'⚡'},handler,phase.description+(installed('superpowers')&&state.superpowers&&state.phase===phase.id?' · Active':'')));
      }
    }
  }
  function openDetail(id){nav('detail',id);}
  function openManage(){if(!installed(selected)){showPluginConfirmation(selected,'install');return;}if(selected!=='github'&&selected!=='superpowers'){openDetail(selected);return;}nav('manage',selected);}
  function statusForChat(){text('jdplugSelected',installed('github')&&state.github&&state.repoLoaded?'In chat: '+state.repo+(state.path?' / '+state.path:'')+(state.ref?' @ '+state.ref:''):'Not included in chat.');}
  function selectedInfo(){statusForChat();$('jdplugGitEnabled').checked=installed('github')&&state.github&&state.repoLoaded;}
  function renderGithubAccount(){
    const signedOut=$('jdplugGithubSignedOut'), signedIn=$('jdplugGithubSignedIn'), reposCard=$('jdplugAccountReposCard');
    if(!signedOut||!signedIn)return;
    if(installed('github')&&!state.accountConnected&&state.githubConnectionReady===null)checkGithubReadiness();
    if(!installed('github')){signedOut.hidden=true;signedIn.hidden=true;if(reposCard)reposCard.hidden=true;return;}
    signedOut.hidden=!!state.accountConnected;signedIn.hidden=!state.accountConnected;
    if(reposCard)reposCard.hidden=!state.accountConnected;
    renderGithubAppStatus();
    if(state.accountConnected&&state.accountUser){
      text('jdplugGithubLogin',state.accountUser.login||'GitHub');
      text('jdplugGithubScopes',state.accountScopes.length?'Scopes: '+state.accountScopes.join(', '):'Connected with account identity access');
      const avatar=$('jdplugGithubAvatar');if(avatar){avatar.src=state.accountUser.avatar||'';avatar.alt=(state.accountUser.login||'GitHub')+' avatar';}
    }
    const select=$('jdplugAccountRepos');
    if(select&&state.accountConnected){
      select.replaceChildren();
      const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=state.accountRepos.length?'Choose repository…':'No repositories loaded';select.append(placeholder);
      for(const item of state.accountRepos){
        const option=document.createElement('option');option.value=item.repo;option.textContent=(item.private?'🔒 ':'')+item.repo;select.append(option);
      }
      if(state.repo)select.value=state.repo;
    }
  }

  function renderGithubAppStatus(){
    const card=$('jdplugGitHubAppCard');
    if(!card)return;
    card.hidden=!installed('github');
    const app=state.githubAppStatus;
    const connected=!!state.accountConnected;
    const install=$('jdplugInstallApp'),manage=$('jdplugManageApp');
    install.hidden=!!app?.installed;
    install.disabled=!connected||app?.configured===false;
    manage.hidden=!app?.installed;
    if(manage.hidden)manage.removeAttribute?.('href');
    else manage.href=app.manageUrl;
    const permissions=$('jdplugAppPermissions');
    permissions.hidden=!app?.installed;
    if(app?.installed){
      const level=app.repositorySelection==='selected'?'Only select repositories':'All repositories';
      text('jdplugAppStatus','Installed for '+(app.account?.login||'your GitHub account')+' · '+level);
      text('jdplugAppPermissions','GitHub-granted permissions: '+Object.entries(app.permissions||{}).map(([key,value])=>key+': '+value).join(' · '));
    }else if(!connected){
      text('jdplugAppStatus','Connect your GitHub account above before installing the GitHub App.');
    }else if(app?.configured===false){
      text('jdplugAppStatus','The site owner must register the JepongDevxyz AI GitHub App and configure its private key in Vercel before installation is available.');
    }else if(app?.configured===true){
      text('jdplugAppStatus','Not installed yet. GitHub will ask which repositories and permissions to grant.');
    }else{
      text('jdplugAppStatus','Checking GitHub App installation…');
    }
  }
  async function refreshGithubAppStatus({loadRepos=false}={}){
    if(!installed('github')||!state.accountConnected){
      state.githubAppStatus=null;renderGithubAppStatus();return null;
    }
    try{
      const response=await fetch('/api/github-app-status',{method:'GET',credentials:'same-origin',headers:{Accept:'application/json'}});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'GitHub App status could not be verified.');
      state.githubAppStatus=data;
      renderGithubAppStatus();
      if(loadRepos&&data.installed)await loadAccountRepos();
      return data;
    }catch(error){
      state.githubAppStatus=null;renderGithubAppStatus();
      text('jdplugAppStatus',error?.message||'Could not verify the installation.');
      return null;
    }
  }
  function installGithubApp(){
    if(!installed('github')){selected='github';showPluginConfirmation('github','install');return;}
    if(!state.accountConnected){notice('Connect your GitHub account first.',true);return;}
    if(state.githubAppStatus?.configured===false){notice('GitHub App setup is not configured by the site owner yet.',true);return;}
    window.location.assign('/api/github-app-install');
  }
  async function refreshGithubSession({loadRepos=false}={}){
    try{
      const response=await fetch('/api/github-oauth-session',{method:'GET',credentials:'same-origin',headers:{Accept:'application/json'}});
      const data=await response.json().catch(()=>({connected:false}));
      state.accountConnected=!!(response.ok&&data.connected);
      state.accountUser=state.accountConnected?(data.user||null):null;
      state.accountScopes=state.accountConnected&&Array.isArray(data.scopes)?data.scopes:[];
      if(!state.accountConnected){state.accountRepos=[];state.githubAppStatus=null;}
      renderGithubAccount();renderDirectory();
      if(state.accountConnected){
        await refreshGithubAppStatus({loadRepos:false});
        if(loadRepos)await loadAccountRepos();
      }
      return state.accountConnected;
    }catch(_){state.accountConnected=false;state.accountUser=null;state.accountScopes=[];state.accountRepos=[];state.githubAppStatus=null;renderGithubAccount();return false;}
  }
  async function checkGithubReadiness(){
    const indicator=$('jdplugConnectionReady');
    try{
      const response=await fetch('/api/plugins',{method:'GET',credentials:'same-origin',headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error('Readiness unavailable');
      const data=await response.json();
      state.githubConnectionReady=data?.github?.accountConnectionConfigured===true;
      if(indicator)indicator.textContent=state.githubConnectionReady
        ? 'GitHub account connection is available.'
        : 'GitHub account connection requires OAuth setup by the site owner. Public repositories can still be browsed without signing in.';
    }catch(_){
      state.githubConnectionReady=null;
      if(indicator)indicator.textContent='Could not verify account connection availability. Public repository browsing remains available.';
    }
    return state.githubConnectionReady;
  }
  async function connectGithub(){
    if(!installed('github')){showPluginConfirmation('github','install');return;}
    const ready=await checkGithubReadiness();
    if(ready===false){
      notice('GitHub account connection is not configured yet. The site owner must set GitHub OAuth environment variables. You can still open a public repository below.',true);
      return;
    }
    const returnTo=location.pathname+location.search+location.hash;
    location.href='/api/github-oauth-start?return_to='+encodeURIComponent(returnTo);
  }
  async function disconnectGithub(){
    setBusy(true);notice('Disconnecting GitHub…');
    try{
      const response=await fetch('/api/github-oauth-session',{method:'DELETE',credentials:'same-origin',headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error('GitHub disconnect failed. Try again.');
      state.accountConnected=false;state.accountUser=null;state.accountScopes=[];state.accountRepos=[];state.githubAppStatus=null;state.github=false;persist();renderGithubAccount();renderDirectory();statusForChat();notice('GitHub disconnected.');
    }catch(_){notice('Could not disconnect GitHub.',true);}
    finally{setBusy(false);}
  }
  async function loadAccountRepos(){
    if(!installed('github')){showPluginConfirmation('github','install');return;}
    if(!state.accountConnected){notice('Connect GitHub first.',true);return;}
    const data=await call('repos');if(!data)return;
    state.accountRepos=Array.isArray(data.repositories)?data.repositories:[];
    renderGithubAccount();
    notice(state.accountRepos.length+' repositories loaded.');
  }
  async function call(action,extras={}){
    if(!installed('github')){notice('Install GitHub before using its tools.',true);return null;}
    if(busy)return null;setBusy(true);notice('Reading GitHub…');
    try{const response=await fetch('/api/plugins',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({action,repo:state.repo},extras))});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'GitHub request failed.');
      notice(action==='read'?'File loaded.':'GitHub '+action+' completed.');return data;
    }catch(error){notice(error.message||'GitHub unavailable.',true);return null;}
    finally{setBusy(false);}
  }
  function shortFileName(path){return String(path||'').split('/').pop()||'';}
  async function browse(path){
    const data=await call('list',{path,ref:state.ref});if(!data)return;
    state.directory=path;const area=$('jdplugResults');area.replaceChildren();text('jdplugLocation',state.repo+'/'+path);
    if(path)area.append(makeButton('‹ Parent folder',()=>browse(path.split('/').slice(0,-1).join('/'))));
    for(const entry of data.entries||[]){
      if(!['dir','file'].includes(entry.type))continue;
      const row=makeButton('',()=>entry.type==='dir'?browse(entry.path):read(entry.path),'jdplug-entry');
      const label=document.createElement('span');label.textContent=(entry.type==='dir'?'▣ ':'□ ')+entry.name;
      const hint=document.createElement('small');hint.textContent=entry.type==='dir'?'›':String(entry.size||0)+' B';
      row.append(label,hint);area.append(row);
    }
    if(!area.children.length)area.textContent='No files in this folder.';
  }
  async function read(path){const data=await call('read',{path,ref:state.ref});if(!data)return;
    state.path=data.path;state.github=true;persist();$('jdplugGitEnabled').checked=true;
    text('jdplugPreview',String(data.content||'').slice(0,8000));$('jdplugPreview').hidden=false;statusForChat();
    notice('Read '+data.path+'. The AI will request this source again for chat.');
  }
  async function openRepo(){
    if(!installed('github')){showPluginConfirmation('github','install');return;}
    const input=$('jdplugRepoInput').value.trim();
    if(!/^(?:https:\/\/github\.com\/)?[\w.-]+\/[\w.-]+\/?$/.test(input)){notice('Enter a public repository URL or owner/repository.',true);return;}
    state.repo=input.replace(/^https:\/\/github\.com\//,'').replace(/\/$/,'');
    state.repoLoaded=false;state.github=false;state.path='';state.ref='';state.directory='';savedGithubSelection=false;
    availableTestWorkflows=[];selectedExecutionRef='';
    $('jdplugGitEnabled').checked=false;$('jdplugPreview').hidden=true;statusForChat();
    const info=await call('repo');if(!info)return;state.repoLoaded=true;state.repo=info.repo;
    $('jdplugRepoInput').value=info.repo;persist();
    text('jdplugRepoDescription',[info.description,'Default branch: '+info.defaultBranch].filter(Boolean).join(' · '));
    const branchData=await call('branches');const select=$('jdplugBranch');select.replaceChildren();
    for(const item of branchData?.branches||[]){const option=document.createElement('option');option.value=item.name;option.textContent=item.name;select.append(option);}
    state.ref=info.defaultBranch;select.value=info.defaultBranch;
    await browse('');
    if(view==='manage')render();
  }
  async function prs(){if(!state.repoLoaded){notice('Open a repository first.',true);return;}
    const data=await call('prs');if(!data)return;const area=$('jdplugResults');area.replaceChildren();
    text('jdplugLocation','Open PRs · '+state.repo);area.append(makeButton('‹ Files',()=>browse(state.directory)));
    for(const pr of data.pullRequests||[]){const link=document.createElement('a');link.className='jdplug-entry';link.textContent='#'+pr.number+' '+pr.title;link.href=pr.url;link.target='_blank';link.rel='noopener noreferrer';area.append(link);}
    if(!(data.pullRequests||[]).length)area.append(document.createTextNode('No open pull requests.'));
  }
  function tryInChat(){
    if(!installed(selected)){showPluginConfirmation(selected,'install');return;}
    let prompt='';
    if(selected==='github'){
      if(!state.repoLoaded){openManage();notice('Open a GitHub repository before trying it in chat.',true);return;}
      state.github=true;prompt='Inspect the selected GitHub repository '+state.repo+(state.path?' and the file '+state.path:'')+'. Explain the source and suggest next steps based only on code you actually read.';
    }else if(selected==='superpowers'){
      state.superpowers=true;
      const phase=phases.find(p=>p.id===state.phase)||phases[0];
      prompt='Use the Superpowers '+phase.name.toLowerCase()+' workflow for my coding task. First ask what project or bug I want help with if I have not provided it.';
    }else{
      const plugin=catalogue[selected];
      prompt='Use the '+plugin.name+' plugin for this request. Apply its workflow accurately and do not claim external actions, tests, renders, audits, or deployments happened unless there is real tool evidence.';
    }
    persist();close();
    const input=$('userInput');
    if(input){input.value=prompt;input.dispatchEvent(new Event('input',{bubbles:true}));if(typeof window.autoResizeTextarea==='function')window.autoResizeTextarea(input);input.focus();}
  }



  function workspaceNotice(message,error=false){
    const el=$('jdplugWorkspaceStatus');
    if(el){el.textContent=String(message||'');el.classList.toggle('error',!!error);}
  }
  function workspaceLink(url,label){
    if(!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(?:issues|pull|actions)\//.test(String(url||'')))return;
    const a=document.createElement('a');a.className='jdplug-entry';a.href=url;a.target='_blank';
    a.rel='noopener noreferrer';a.textContent=label; $('jdplugWorkspaceLinks').append(a);
  }
  async function workspaceApi(action,payload={}){
    if(!installed('github')||!state.accountConnected||!state.repoLoaded)
      throw new Error('Install GitHub, connect your account and open a permitted repository first.');
    const response=await fetch('/api/plugin-workspace',{method:'POST',credentials:'same-origin',
      headers:{'Content-Type':'application/json'},body:JSON.stringify({repo:state.repo,action,...payload})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'GitHub repository operation failed.');
    return data;
  }
  function resetWorkspaceSelection(){
    workspaceSelection=null;$('jdplugWorkspaceSelected').hidden=true;
    $('jdplugWorkspaceDiff').hidden=true;$('jdplugWorkspaceComment').value='';
    hideWorkspaceConfirmation();
  }
  async function loadWorkspace(action){
    if(!installed('github')||!state.accountConnected||!state.repoLoaded){
      workspaceNotice('Connect GitHub and open a repository in Manage first.',true);return;
    }
    workspaceNotice('Reading GitHub '+(action==='listPR'?'pull requests':'issues')+'…');
    resetWorkspaceSelection();
    const area=$('jdplugWorkspaceResults');area.replaceChildren();
    try{
      const data=await workspaceApi(action);
      const type=action==='listPR'?'pr':'issue';
      const items=type==='pr'?data.pullRequests:data.issues;
      for(const item of items||[]){
        const button=makeButton('#'+item.number+' '+item.title,()=>selectWorkspaceItem(type,item),'jdplug-entry');
        area.append(button);
      }
      if(!area.children.length)area.textContent='No open '+(type==='pr'?'pull requests':'issues')+' were returned.';
      workspaceNotice('GitHub returned '+(items||[]).length+' open '+(type==='pr'?'pull requests':'issues')+'.');
    }catch(error){workspaceNotice(error.message||'GitHub read failed.',true);}
  }
  async function selectWorkspaceItem(type,item){
    workspaceSelection={type,number:item.number,state:item.state,repo:state.repo,head:item.head?.sha||''};
    $('jdplugWorkspaceSelected').hidden=false;
    $('jdplugWorkspaceDiff').hidden=true;
    $('jdplugIssueControls').hidden=type!=='issue';
    $('jdplugPRControls').hidden=type!=='pr';
    $('jdplugReviewEvent').hidden=type!=='pr';
    $('jdplugIssueToggle').textContent=item.state==='closed'?'Reopen issue':'Close issue';
    text('jdplugWorkspaceHeading','#'+item.number+' · '+item.title);
    text('jdplugWorkspaceDetails',item.body||'(No description)');
    $('jdplugWorkspaceComment').value='';
    workspaceNotice(type==='pr'?'Inspect the diff and CI before reviewing.':'You can comment or change this issue’s state.');
  }
  async function inspectPullRequest(){
    const item=workspaceSelection;if(!item||item.type!=='pr')return;
    workspaceNotice('Reading actual pull-request file changes…');
    try{
      const data=await workspaceApi('prFiles',{number:item.number});
      if(!workspaceSelection||workspaceSelection.number!==item.number)return;
      const lines=(data.files||[]).map(file=>file.filename+' · +'+file.additions+' / -'+file.deletions+'\n'+(file.patch||'(GitHub did not return a text patch)'));
      text('jdplugWorkspaceDiff',lines.join('\n\n').slice(0,28000)||'No changed files reported.');
      $('jdplugWorkspaceDiff').hidden=false;workspaceNotice('Real GitHub pull-request file changes loaded.');
    }catch(error){workspaceNotice(error.message||'Could not load PR file changes.',true);}
  }
  async function checkPullRequest(){
    const item=workspaceSelection;if(!item||item.type!=='pr'||!item.head){workspaceNotice('Pull request head commit is unavailable.',true);return;}
    workspaceNotice('Reading GitHub check runs…');
    try{
      const result=await workspaceApi('checks',{sha:item.head});
      const checks=result.checks||[];
      const rows=checks.map(x=>x.name+': '+(x.conclusion||x.status));
      text('jdplugWorkspaceDiff',rows.join('\n')||'No GitHub check runs were returned.');
      $('jdplugWorkspaceDiff').hidden=false;
      workspaceNotice('Check status retrieved. Only completed successful checks count as passed.');
    }catch(error){workspaceNotice(error.message||'Cannot read GitHub checks. Grant Checks read permission.',true);}
  }
  function hideWorkspaceConfirmation(){
    pendingWorkspaceAction=null;
    if($('jdplugWorkspaceConfirm'))$('jdplugWorkspaceConfirm').hidden=true;
  }
  function confirmWorkspaceAction(action){
    if(!installed('github')||!state.accountConnected||!state.repoLoaded){
      workspaceNotice('Connect GitHub and open a repository first.',true);return;
    }
    const item=workspaceSelection;
    const args={};
    if(action==='createIssue'){
      args.title=$('jdplugIssueTitle').value.trim();args.description=$('jdplugIssueBody').value.trim();
      if(!args.title){workspaceNotice('Enter an issue title.',true);return;}
    }else{
      if(!item||item.repo!==state.repo){workspaceNotice('Choose a GitHub issue or PR first.',true);return;}
      args.number=item.number;
      if(action==='updateIssue')args.state=item.state==='closed'?'open':'closed';
      if(action==='commentIssue'||action==='reviewPR'){
        args.comment=$('jdplugWorkspaceComment').value.trim();
        if(!args.comment){workspaceNotice('Write the exact GitHub comment first.',true);return;}
        if(action==='reviewPR')args.event=$('jdplugReviewEvent').value;
      }
    }
    pendingWorkspaceAction={repo:state.repo,action,args,summary:action==='createIssue'?'Create issue: '+args.title:
      action==='updateIssue'?'Set issue #'+args.number+' to '+args.state:
      action==='commentIssue'?'Comment on issue #'+args.number+': '+args.comment:
      'Review PR #'+args.number+' ('+args.event+'): '+args.comment};
    text('jdplugWorkspaceConfirmTitle','Confirm GitHub '+action);
    text('jdplugWorkspaceConfirmText','Repository: '+state.repo+'\n'+pendingWorkspaceAction.summary);
    $('jdplugWorkspaceConfirm').hidden=false;
    $('jdplugWorkspaceApprove').disabled=false;
    $('jdplugWorkspaceApprove').focus();
  }
  async function submitWorkspaceAction(){
    const pending=pendingWorkspaceAction;
    if(!pending)return;
    hideWorkspaceConfirmation();
    if(pending.repo!==state.repo){workspaceNotice('Repository changed. Retry the action.',true);return;}
    const button=$('jdplugPostWorkspace');button.disabled=true;
    workspaceNotice('Sending approved change to GitHub…');
    try{
      const result=await workspaceApi(pending.action,{...pending.args,confirm:true});
      const output=result.issue?.url||result.comment?.url||result.review?.url;
      const label=result.issue?'GitHub issue #'+result.issue.number:result.review?'GitHub PR review':'GitHub issue comment';
      $('jdplugWorkspaceLinks').replaceChildren();
      workspaceLink(output,'Open '+label+' on GitHub');
      workspaceNotice(label+' saved on GitHub.');
      if(pending.action==='createIssue'){$('jdplugIssueTitle').value='';$('jdplugIssueBody').value='';}
      if(pending.action==='updateIssue'&&workspaceSelection)workspaceSelection.state=result.issue?.state||workspaceSelection.state;
      if(pending.action!=='createIssue'&&pending.action!=='updateIssue')$('jdplugWorkspaceComment').value='';
    }catch(error){workspaceNotice(error.message||'GitHub write failed.',true);}
    finally{button.disabled=false;}
  }

  function batchNotice(message,error=false){
    const el=$('jdplugBatchStatus');
    if(el){el.textContent=String(message||'');el.classList.toggle('error',!!error);}
  }
  function clearBatchConfirmation(){
    if($('jdplugBatchConfirm'))$('jdplugBatchConfirm').hidden=true;
  }
  function clearBatchPreview(){
    pendingBatch=null;clearBatchConfirmation();
    if($('jdplugBatchReview'))$('jdplugBatchReview').hidden=true;
  }
  function renderBatchQueue(){
    const queue=$('jdplugBatchQueue');queue.replaceChildren();
    for(const file of batchFiles){
      const item=document.createElement('div');item.className='jdplug-row';
      const info=document.createElement('span');info.className='jdplug-muted';
      info.textContent=file.path+' · '+new TextEncoder().encode(file.content).length+' bytes';
      const remove=makeButton('Remove',()=>{
        batchFiles=batchFiles.filter(x=>x.path!==file.path);
        clearBatchPreview();renderBatchQueue();
      },'jdplug-button');
      item.append(info,remove);queue.append(item);
    }
    if(!batchFiles.length)queue.textContent='No staged files yet.';
    $('jdplugBatchPreview').disabled=!batchFiles.length;
  }
  function addBatchFile(){
    const path=$('jdplugChangePath').value.trim(),content=$('jdplugChangeSource').value;
    if(!path||!content){batchNotice('Enter a source file path and its complete file content above.',true);return;}
    if(!installed('github')){batchNotice('Install GitHub first.',true);return;}
    const size=new TextEncoder().encode(content).length;
    if(size>42000){batchNotice('Multi-file proposals support up to 42 KB per file.',true);return;}
    if(batchFiles.some(x=>x.path.toLowerCase()===path.toLowerCase())){batchNotice('This file is already staged. Remove it to replace the content.',true);return;}
    if(batchFiles.length===8){batchNotice('One reviewed PR can contain up to 8 source files.',true);return;}
    batchFiles.push({path,content});clearBatchPreview();renderBatchQueue();
    batchNotice(path+' staged. Add another file or preview the complete batch.');
  }
  async function batchApi(action,extra={}){
    if(!installed('github')||!state.accountConnected||!state.repoLoaded)
      throw new Error('Install GitHub, connect your account, and open an authorized repository first.');
    const response=await fetch('/api/plugin-batch-proposals',{
      method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action,repo:state.repo,...extra})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'GitHub multi-file proposal unavailable.');
    return data;
  }
  async function previewBatch(){
    clearBatchPreview();
    if(!batchFiles.length){batchNotice('Stage at least one complete source file.',true);return;}
    const button=$('jdplugBatchPreview');button.disabled=true;
    batchNotice('Reading originals and preparing an exact multi-file preview…');
    try{
      const files=batchFiles.map(x=>({path:x.path,content:x.content}));
      const response=await batchApi('preview',{files});
      pendingBatch={repo:state.repo,files,approval:response.approval,base:response.base,expiresAt:response.expiresAt};
      text('jdplugBatchSummary','Repository: '+state.repo+' · Base: '+response.base+' · Files: '+files.length);
      const area=$('jdplugBatchDiffs');area.replaceChildren();
      for(const item of response.files||[]){
        const heading=document.createElement('p');heading.className='jdplug-field';
        heading.textContent=item.path+(item.exists?' · update':' · new file')+(item.truncated?' · preview excerpt':'');
        const before=document.createElement('pre');before.className='jdplug-preview';before.textContent=item.before||'(New file)';
        const after=document.createElement('pre');after.className='jdplug-preview';after.textContent=item.after;
        area.append(heading,before,after);
      }
      $('jdplugBatchReview').hidden=false;
      batchNotice('Review every staged file and the full source before confirming the PR.');
    }catch(error){batchNotice(error.message||'Could not inspect the source files.',true);}
    finally{button.disabled=!batchFiles.length;}
  }
  function confirmBatch(){
    const approved=pendingBatch;
    if(!approved||approved.repo!==state.repo||
      JSON.stringify(approved.files)!==JSON.stringify(batchFiles)){
      batchNotice('Source files or repository changed. Preview the batch again.',true);return;
    }
    text('jdplugBatchConfirmText','Repository: '+approved.repo+'\nBase: '+approved.base+
      '\nFiles: '+approved.files.map(f=>f.path).join(', ')+
      '\nGitHub will create one commit on a new proposal branch and a PR. Nothing is merged automatically.');
    $('jdplugBatchConfirm').hidden=false;$('jdplugBatchApprove').focus();
  }
  async function submitBatch(){
    const approved=pendingBatch;clearBatchConfirmation();
    if(!approved)return;
    if(approved.repo!==state.repo||JSON.stringify(approved.files)!==JSON.stringify(batchFiles)){
      batchNotice('Batch changed since preview. Preview again.',true);return;
    }
    pendingBatch=null;const button=$('jdplugBatchCreate');button.disabled=true;
    batchNotice('Creating the user-reviewed GitHub multi-file pull request…');
    try{
      const result=await batchApi('propose',{files:approved.files,approval:approved.approval,confirm:true});
      if(!result.created||!result.pullRequest?.url)throw new Error('GitHub did not confirm the pull request.');
      const area=$('jdplugBatchResult');area.replaceChildren();
      const anchor=document.createElement('a');anchor.className='jdplug-entry';
      anchor.href=result.pullRequest.url;anchor.target='_blank';anchor.rel='noopener noreferrer';
      anchor.textContent='Open multi-file PR #'+result.pullRequest.number;
      area.append(anchor);batchFiles=[];renderBatchQueue();clearBatchPreview();
      batchNotice('GitHub created one proposal commit for '+result.changedFiles.length+' files. Review its PR diff and real CI before merging.');
    }catch(error){batchNotice(error.message||'Could not create the multi-file PR.',true);}
    finally{button.disabled=false;}
  }
  function proposalNotice(message,error=false){
    const el=$('jdplugChangeStatus');
    if(el){el.textContent=String(message||'');el.classList.toggle('error',!!error);}
  }
  async function proposalApi(action,extra={}){
    if(!installed('github')||!state.accountConnected||!state.repoLoaded)throw new Error('Install GitHub, connect your account and select a repository before proposing code.');
    const response=await fetch('/api/plugin-proposals',{
      method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action,repo:state.repo,...extra})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'GitHub proposal failed.');
    return data;
  }
  async function previewProposedChange(){
    pendingProposal=null;$('jdplugChangePreview').hidden=true;
    const path=$('jdplugChangePath').value.trim();
    const content=$('jdplugChangeSource').value;
    if(!path||!content.trim()){proposalNotice('Enter a source file path and the complete proposed code.',true);return;}
    const btn=$('jdplugPreviewChange');btn.disabled=true;
    proposalNotice('Checking the current GitHub file and preparing a preview…');
    try{
      const data=await proposalApi('preview',{path,content});
      pendingProposal={repo:state.repo,path,content,approval:data.approval,base:data.base,expiresAt:data.expiresAt};
      text('jdplugChangeSummary',(data.exists?'Update existing file':'Create new file')+' · '+data.path+' · '+data.base+
        ' · '+data.preview.originalLines+' → '+data.preview.proposedLines+' lines'+(data.preview.truncated?' · excerpt shown only':''));
      text('jdplugBeforeSource',data.preview.before||'(New file)');
      text('jdplugAfterSource',data.preview.after);
      $('jdplugChangePreview').hidden=false;
      proposalNotice('Preview ready. Confirm only after reviewing the entire proposed source.');
    }catch(error){proposalNotice(error.message||'Could not preview the file.',true);}
    finally{btn.disabled=false;}
  }
  function confirmProposedChange(){
    if(!pendingProposal||pendingProposal.repo!==state.repo||pendingProposal.path!==$('jdplugChangePath').value.trim()||pendingProposal.content!==$('jdplugChangeSource').value){
      proposalNotice('Preview the current proposed source before proceeding.',true);return;
    }
    text('jdplugProposalDescription','Repository: '+pendingProposal.repo+'\nFile: '+pendingProposal.path+
      '\nBase branch: '+pendingProposal.base+
      '\nA new proposal branch and pull request will be created. Nothing will be merged automatically.');
    $('jdplugProposalConfirm').hidden=false;$('jdplugApproveProposal').disabled=false;
    $('jdplugApproveProposal').focus();
  }
  async function submitProposedChange(){
    const approved=pendingProposal;
    if(!approved)return;
    pendingProposal=null;$('jdplugProposalConfirm').hidden=true;
    const btn=$('jdplugSubmitChange');btn.disabled=true;proposalNotice('Creating reviewed GitHub proposal…');
    try{
      if(approved.content!==$('jdplugChangeSource').value||approved.path!==$('jdplugChangePath').value.trim()||approved.repo!==state.repo)
        throw new Error('Proposal changed since preview. Preview again.');
      const result=await proposalApi('propose',{path:approved.path,content:approved.content,approval:approved.approval,confirm:true});
      if(!result.created||!result.pullRequest?.url)throw new Error('No pull request was confirmed.');
      const area=$('jdplugChangeResult');area.replaceChildren();
      const a=document.createElement('a');a.className='jdplug-entry';a.href=result.pullRequest.url;a.target='_blank';a.rel='noopener noreferrer';
      a.textContent='Open PR #'+result.pullRequest.number+' · '+result.pullRequest.title;area.append(a);
      proposalNotice('GitHub PR created. Review the diff and run CI before merging.');
      $('jdplugChangePreview').hidden=true;stagedProposal=null;
    }catch(error){proposalNotice(error.message||'Could not create the pull request.',true);}
    finally{btn.disabled=false;}
  }
  function executionNotice(message,error=false){
    const el=$('jdplugExecutionStatus');
    if(el){el.textContent=String(message||'');el.classList.toggle('error',!!error);}
  }
  async function executeApi(action,extra={}){
    if(!installed('github')||!state.accountConnected||!state.repoLoaded){
      executionNotice('Install and connect GitHub, then open a repository before running project tests.',true);
      return null;
    }
    const response=await fetch('/api/plugin-execute',{
      method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action,repo:state.repo,...extra})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'GitHub Actions request failed.');
    return data;
  }
  async function loadTestWorkflows(){
    if(!installed('github')){selected='github';showPluginConfirmation('github','install');return;}
    if(!state.accountConnected){executionNotice('Connect GitHub before running a workflow.',true);return;}
    if(!state.repoLoaded){executionNotice('Open your repository in GitHub → Manage first.',true);return;}
    const control=$('jdplugLoadWorkflows');control.disabled=true;
    executionNotice('Checking available test workflows…');
    try{
      const data=await executeApi('list');
      if(!data)return;
      availableTestWorkflows=Array.isArray(data.workflows)?data.workflows:[];
      selectedExecutionRef=state.ref||data.defaultBranch;
      const select=$('jdplugWorkflowSelect');select.replaceChildren();
      const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose a test workflow…';select.append(placeholder);
      for(const workflow of availableTestWorkflows){
        const option=document.createElement('option');option.value=String(workflow.id);option.textContent=workflow.name;select.append(option);
      }
      text('jdplugExecutionBranch','Branch: '+selectedExecutionRef);
      $('jdplugDispatchWorkflow').disabled=!availableTestWorkflows.length;
      if(availableTestWorkflows.length===1)select.value=String(availableTestWorkflows[0].id);
      $('jdplugDispatchWorkflow').disabled=!select.value;
      executionNotice(availableTestWorkflows.length?'Choose a workflow and confirm before running tests.':'No active test workflow found. Add workflow_dispatch to a test workflow in this repository.');
    }catch(error){availableTestWorkflows=[];$('jdplugDispatchWorkflow').disabled=true;executionNotice(error.message||'Failed to load workflows.',true);}
    finally{control.disabled=false;}
  }
  function confirmRunTests(){
    const id=Number($('jdplugWorkflowSelect').value);
    const workflow=availableTestWorkflows.find(x=>x.id===id);
    if(!workflow||!installed('github')||!state.accountConnected||!state.repoLoaded){
      executionNotice('Connect GitHub and select a valid test workflow first.',true);return;
    }
    const ref=selectedExecutionRef||state.ref;
    if(!ref){executionNotice('Select a branch in GitHub → Manage first.',true);return;}
    pendingExecution={repo:state.repo,ref,workflowId:id,workflowName:workflow.name};
    text('jdplugExecuteDescription','Repository: '+pendingExecution.repo+'\nWorkflow: '+workflow.name+'\nBranch: '+ref+'\nThis runs existing GitHub Actions code in your repository. It will not write source files or merge branches.');
    $('jdplugExecuteConfirm').hidden=false;
    $('jdplugApproveExecution').disabled=false;
    $('jdplugApproveExecution').focus();
  }
  async function dispatchTests(){
    const approved=pendingExecution;
    if(!approved)return;
    pendingExecution=null;
    $('jdplugExecuteConfirm').hidden=true;
    const control=$('jdplugDispatchWorkflow');control.disabled=true;
    executionNotice('Requesting GitHub Actions run…');
    try{
      // Explicit user click is required. Models cannot invoke workflow dispatch.
      if(approved.repo!==state.repo||!installed('github')||!state.accountConnected)throw new Error('Repository or GitHub session changed. Reload workflows and retry.');
      const data=await executeApi('dispatch',{workflowId:approved.workflowId,ref:approved.ref,confirm:true});
      if(!data?.accepted)throw new Error('GitHub did not accept this run.');
      executionNotice('GitHub accepted the run request. Check the actual workflow result below.');
      $('jdplugCheckRuns').hidden=false;
      await checkTestRuns();
    }catch(error){executionNotice(error.message||'GitHub Actions failed.',true);}
    finally{control.disabled=false;}
  }
  async function checkTestRuns(){
    const id=Number($('jdplugWorkflowSelect').value);
    if(!availableTestWorkflows.some(x=>x.id===id)){executionNotice('Choose a test workflow first.',true);return;}
    try{
      const result=await executeApi('runs',{workflowId:id});
      if(!result)return;
      const area=$('jdplugRunList');area.replaceChildren();
      for(const run of result.runs||[]){
        const a=document.createElement('a');
        a.className='jdplug-entry';
        a.href=run.url;a.target='_blank';a.rel='noopener noreferrer';
        a.textContent=run.name+' · '+run.branch+' · '+(run.conclusion||run.status)+' · '+(run.createdAt||'');
        area.append(a);
      }
      if(!area.children.length)area.textContent='No workflow runs reported yet. Refresh after a few seconds.';
      else executionNotice('GitHub Actions run status refreshed. A completed successful run is required before claiming tests passed.');
    }catch(error){executionNotice(error.message||'Could not read workflow results.',true);}
  }
  function init(){
    if($('jdplugPanel'))return;
    const overlay=document.createElement('div');overlay.id='jdplugPanel';overlay.className='jdplug-overlay';overlay.innerHTML=PANEL_HTML;document.body.append(overlay);
    $('jdplugClose').addEventListener('click',close);$('jdplugBack').addEventListener('click',back);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
    $('jdplugTabPlugins').addEventListener('click',()=>{tab='plugins';$('jdplugSearch').value='';render();});
    $('jdplugTabSkills').addEventListener('click',()=>{tab='skills';$('jdplugSearch').value='';render();});
    $('jdplugSearch').addEventListener('input',renderDirectory);
    $('jdplugManage').addEventListener('click',openManage);$('jdplugTry').addEventListener('click',tryInChat);
    $('jdplugOverflow').addEventListener('click',()=>openManage());
    $('jdplugUninstall').addEventListener('click',()=>showPluginConfirmation(selected,'uninstall'));
    $('jdplugManageUninstall').addEventListener('click',()=>showPluginConfirmation(selected,'uninstall'));
    $('jdplugLoadWorkflows').addEventListener('click',loadTestWorkflows);
    $('jdplugWorkflowSelect').addEventListener('change',()=>{$('jdplugDispatchWorkflow').disabled=!($('jdplugWorkflowSelect').value&&state.accountConnected&&state.repoLoaded);});
    $('jdplugDispatchWorkflow').addEventListener('click',confirmRunTests);
    $('jdplugCancelExecution').addEventListener('click',()=>{pendingExecution=null;$('jdplugExecuteConfirm').hidden=true;});
    $('jdplugApproveExecution').addEventListener('click',dispatchTests);
    $('jdplugCheckRuns').addEventListener('click',checkTestRuns);
    $('jdplugOpenAgent').addEventListener('click',()=>window.JDCodingAgent?.open?.());
    $('jdplugLoadIssues').addEventListener('click',()=>loadWorkspace('listIssues'));
    $('jdplugLoadPRs').addEventListener('click',()=>loadWorkspace('listPR'));
    $('jdplugCreateIssue').addEventListener('click',()=>confirmWorkspaceAction('createIssue'));
    $('jdplugIssueToggle').addEventListener('click',()=>confirmWorkspaceAction('updateIssue'));
    $('jdplugInspectPR').addEventListener('click',inspectPullRequest);
    $('jdplugCheckPR').addEventListener('click',checkPullRequest);
    $('jdplugPostWorkspace').addEventListener('click',()=>confirmWorkspaceAction(workspaceSelection?.type==='pr'?'reviewPR':'commentIssue'));
    $('jdplugWorkspaceCancel').addEventListener('click',hideWorkspaceConfirmation);
    $('jdplugWorkspaceApprove').addEventListener('click',submitWorkspaceAction);
    for(const id of ['jdplugIssueTitle','jdplugIssueBody','jdplugWorkspaceComment','jdplugReviewEvent'])
      $(id).addEventListener('input',hideWorkspaceConfirmation);
    $('jdplugPreviewChange').addEventListener('click',previewProposedChange);
    $('jdplugBatchAdd').addEventListener('click',addBatchFile);
    $('jdplugBatchPreview').addEventListener('click',previewBatch);
    $('jdplugBatchCreate').addEventListener('click',confirmBatch);
    $('jdplugBatchCancel').addEventListener('click',clearBatchConfirmation);
    $('jdplugBatchApprove').addEventListener('click',submitBatch);
    $('jdplugSubmitChange').addEventListener('click',confirmProposedChange);
    $('jdplugCancelProposal').addEventListener('click',()=>{pendingProposal=null;$('jdplugProposalConfirm').hidden=true;});
    $('jdplugApproveProposal').addEventListener('click',submitProposedChange);
    for(const id of ['jdplugChangePath','jdplugChangeSource'])$(id).addEventListener('input',()=>{
      pendingProposal=null;$('jdplugChangePreview').hidden=true;
    });
    $('jdplugCancelInstall').addEventListener('click',hidePluginConfirmation);
    $('jdplugConfirmInstall').addEventListener('click',confirmPluginAction);
    $('jdplugConnectGithub').addEventListener('click',connectGithub);
    $('jdplugInstallApp').addEventListener('click',installGithubApp);
    $('jdplugDisconnectGithub').addEventListener('click',disconnectGithub);
    $('jdplugRefreshRepos').addEventListener('click',loadAccountRepos);
    $('jdplugAccountRepos').addEventListener('change',e=>{if(e.target.value){$('jdplugRepoInput').value=e.target.value;openRepo();}});
    $('jdplugLoadRepo').addEventListener('click',openRepo);
    $('jdplugRepoInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();openRepo();}});
    $('jdplugPRs').addEventListener('click',prs);
    $('jdplugBranch').addEventListener('change',e=>{state.ref=e.target.value;state.path='';$('jdplugPreview').hidden=true;statusForChat();browse('');});
    $('jdplugGitEnabled').addEventListener('change',e=>{state.github=installed('github')&&e.target.checked&&state.repoLoaded;if(e.target.checked&&(!installed('github')||!state.repoLoaded)){e.target.checked=false;notice(installed('github')?'Open a repository first.':'Install GitHub first.',true);}persist();statusForChat();});
    $('jdplugSuperEnabled').addEventListener('change',e=>{if(!installed('superpowers')){e.target.checked=false;showPluginConfirmation('superpowers','install');return;}state.superpowers=e.target.checked;persist();notice(state.superpowers?'Superpowers workflow enabled.':'Superpowers workflow disabled.');});
    const phaseSelect=$('jdplugPhase');for(const phase of phases){const option=document.createElement('option');option.value=phase.id;option.textContent=phase.name;phaseSelect.append(option);}
    phaseSelect.addEventListener('change',e=>{state.phase=e.target.value;persist();renderSkillRows('jdplugManageSkillList');notice('Active skill: '+(phases.find(p=>p.id===state.phase)?.name||state.phase));});
  }
  function open(tabName){
    if(typeof window.closeComposerTools==='function')window.closeComposerTools();
    if(typeof window.closeSettingsModal==='function')window.closeSettingsModal();
    init();tab=tabName==='skills'?'skills':'plugins';view='directory';history.length=0;render();
    $('jdplugPanel').classList.add('open');$('jdplugClose').focus();
    refreshGithubSession({loadRepos:false});
    if(!state.repo)try{state.repo=localStorage.getItem('jepong_plugin_public_repo')||'';}catch(_){}
    $('jdplugRepoInput').value=state.repo;
  }
  function close(){hidePluginConfirmation();hideWorkspaceConfirmation();clearBatchConfirmation();pendingBatch=null;pendingExecution=null;pendingProposal=null;
    if($('jdplugExecuteConfirm'))$('jdplugExecuteConfirm').hidden=true;
    if($('jdplugProposalConfirm'))$('jdplugProposalConfirm').hidden=true;
    $('jdplugPanel')?.classList.remove('open');}
  window.JDPlugins=Object.freeze({open,close,ready(){return githubRestorePromise;},openAgent(task=''){
    if(!installed('github')||!installed('superpowers')){
      open('plugins');
      selected=installed('github')?'superpowers':'github';
      showPluginConfirmation(selected,'install');
      return;
    }
    window.JDCodingAgent?.open?.(task);
  },stageAgentFiles(files){
    if(!installed('github')||!installed('superpowers'))return false;
    if(!Array.isArray(files)||!files.length||files.length>3)return false;
    const clean=files.map(f=>({path:f.path,content:f.content}));
    if(clean.some(f=>typeof f.path!=='string'||typeof f.content!=='string'))return false;
    batchFiles=clean;
    stagedProposal=null;
    open('plugins');selected='github';view='manage';render();
    $('jdplugChangePath').value=batchFiles[0].path;
    $('jdplugChangeSource').value=batchFiles[0].content;
    renderBatchQueue();clearBatchPreview();
    batchNotice('Coding agent staged '+batchFiles.length+' proposed source files. Preview all staged files and explicitly approve the GitHub PR.');
    return true;
  },stageChange(code){
    stagedProposal=String(code||'').slice(0,80000);
    open('plugins');
    if(!installed('github')){selected='github';showPluginConfirmation('github','install');return;}
    selected='github';view='manage';render();
    $('jdplugChangeSource').value=stagedProposal;
    $('jdplugChangePreview').hidden=true;
    $('jdplugChangeSource').focus();
  },openWorkspace(type='issues'){
    open('plugins');
    if(!installed('github')){selected='github';showPluginConfirmation('github','install');return;}
    selected='github';view='manage';render();
    if(state.accountConnected&&state.repoLoaded){
      loadWorkspace(type==='pr'?'listPR':'listIssues');
    }else workspaceNotice('Connect GitHub and open a repository in Manage to use Issues or PR reviews.',true);
  },openRunner(){
    open('plugins');
    if(!installed('github')){selected='github';showPluginConfirmation('github','install');return;}
    selected=installed('superpowers')?'superpowers':'github';
    view='manage';render();
    if(state.repoLoaded&&state.accountConnected)loadTestWorkflows();
  },contextForChat(){
    return {superpowers:{enabled:installed('superpowers')&&state.superpowers,phase:state.phase},skills:skillPluginIds.filter(id=>installed(id)),github:{enabled:installed('github')&&state.github&&state.repoLoaded,repo:state.repo,path:state.path,ref:state.ref}};
  }});

  // Complete the OAuth round trip without leaving stale query parameters in the chat URL.
  try{
    const params=new URLSearchParams(location.search);
    const githubResult=params.get('github');
    const appResult=params.get('github_app');
    const githubError=params.get('github_error')||'GitHub authorization failed.';
    if(githubResult==='connected'||githubResult==='error'||appResult==='installed'||appResult==='not_installed'||appResult==='verify'){
      setTimeout(async()=>{
        open('plugins');selected='github';view='manage';render();
        await refreshGithubSession({loadRepos:githubResult==='connected'||appResult==='installed'});
        if(appResult==='installed'&&state.githubAppStatus?.installed)notice('GitHub App installation verified. Select a permitted repository below.');
        else if(appResult&&appResult!=='installed')notice('GitHub App setup is not confirmed. Check the account and installation status.',true);
        else if(githubResult==='connected')notice('GitHub account connected.');
        else if(githubResult==='error')notice(githubError,true);
      },0);
      params.delete('github');params.delete('github_error');params.delete('github_app');
      const clean=location.pathname+(params.toString()?'?'+params.toString():'')+location.hash;
      window.history.replaceState(window.history.state,'',clean);
    }
  }catch(_){}
})();
