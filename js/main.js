7/* ═══════════════════════════════════════════
   DEUTSCHGEO — FULL APPLICATION JS
   SRS · Audio · Achievements · Chart
   PWA · Keyboard · Import/Export
   Pagination (20/page) · Daily Phrases
   Structured Learning · Learned-only quizzes
═══════════════════════════════════════════ */

// ────────────────────────────────────────────
// STATE
// ────────────────────────────────────────────
let state = {
  name:"", xp:0, streak:0, lastVisit:"",
  learnedWords:[],      // word ids marked learned
  reinforceWords:[],    // word ids that should reappear in study
  reviewWords:{},       // {wordId: {interval,due,ease,reps}}
  difficultWords:[],    // word ids rated "hard" repeatedly
  priorityWords:[],     // word ids that must reappear soon
  favoriteWords:[],
  testsCompleted:0,
  lastPage:"home",
  theme:"default",
  flashCategory:"all",
  vocabFilter:"all",
  vocabCategory:"all",
  quizType:"de-ka",
  grammarViewed:0,
  viewedGrammarRules:[],
  grammarExerciseIdx:0,
  grammarTopic:"all",
  grammarMistakes:[],
  audioMode:"listen",
  dailyGoal:10,
  dailyPractice:{},     // {"YYYY-MM-DD": [wordId]}
  dailyGoalHistory:{},  // {"YYYY-MM-DD": goal}
  dailyGoalMonthOffset:0,
  strictStreakAnchor:"",
  speakingHistory:[],
  placementLevel:"",
  placementAnswers:[],
  placementDone:false,
  writingIdx:0,
  writingHistory:[],
  dictationIdx:0,
  dictationHistory:[],
  grammarReview:{},
  wordNotes:{},
  selectedNoteWord:"",
  dialogueScenario:0,
  dialogueStep:0,
  dialogueHistory:[],
  readingAnswers:{},
  perfectQuiz:0,
  unlockedAchievements:[],
  weeklyXP:{},          // {"YYYY-MM-DD": xp}
  currentVocabPage:1,
};

function saveState(){ localStorage.setItem("dg_state_v3", JSON.stringify(state)); }
function loadState(){
  const s = localStorage.getItem("dg_state_v3");
  if(s){ try{ state = {...state, ...JSON.parse(s)}; }catch(e){} }
}

// ────────────────────────────────────────────
// DATA
// ────────────────────────────────────────────
let VOCABULARY = [];
let DAILY_PHRASES = [];
let ACHIEVEMENTS_DEF = [];

function uniqueStrings(arr){
  return [...new Set((arr||[]).filter(Boolean))];
}
function normalizeWordDisplay(w){
  const de = (w?.de||"").trim();
  const article = (w?.article||"").trim();
  if(!article) return de;
  if(de.toLowerCase().startsWith(article.toLowerCase()+" ")) return de;
  return `${article} ${de}`;
}
function getWordId(wordOrId){
  return typeof wordOrId==="object" ? (wordOrId?.id || wordOrId?.de || "") : wordOrId;
}
function findWord(wordOrId){
  const key=getWordId(wordOrId);
  return VOCABULARY.find(w=>getWordId(w)===key) || VOCABULARY.find(w=>w.de===key);
}
function normalizeWordKey(wordOrId){
  const w=findWord(wordOrId);
  return w ? getWordId(w) : getWordId(wordOrId);
}
function wordLabel(wordOrId){
  const w=findWord(wordOrId);
  return w ? normalizeWordDisplay(w) : getWordId(wordOrId);
}
function normalizeWordList(list, valid){
  return uniqueStrings(list).map(normalizeWordKey).filter(id=>valid.has(id));
}
function normalizeState(){
  const valid = new Set((VOCABULARY||[]).map(getWordId));
  state.difficultWords = normalizeWordList(state.difficultWords, valid);
  state.priorityWords = normalizeWordList(state.priorityWords, valid);
  state.favoriteWords = normalizeWordList(state.favoriteWords, valid);
  state.learnedWords = normalizeWordList(state.learnedWords, valid).filter(id=>!state.difficultWords.includes(id));
  state.reinforceWords = normalizeWordList(state.reinforceWords, valid).filter(id=>!state.difficultWords.includes(id));
  state.viewedGrammarRules = uniqueStrings(state.viewedGrammarRules);
  state.grammarTopic = state.grammarTopic || "all";
  state.grammarMistakes = Array.isArray(state.grammarMistakes) ? state.grammarMistakes.slice(-80) : [];
  const goal=parseInt(state.dailyGoal||10, 10);
  state.dailyGoal = Math.max(1, Math.min(100, isNaN(goal)?10:goal));
  state.dailyPractice = state.dailyPractice || {};
  state.dailyGoalHistory = state.dailyGoalHistory || {};
  state.dailyGoalMonthOffset = parseInt(state.dailyGoalMonthOffset||0, 10) || 0;
  for(const day of Object.keys(state.dailyPractice)){
    state.dailyPractice[day] = normalizeWordList(state.dailyPractice[day], valid);
    if(!state.dailyGoalHistory[day]) state.dailyGoalHistory[day]=state.dailyGoal;
  }
  state.speakingHistory = Array.isArray(state.speakingHistory) ? state.speakingHistory.slice(-50) : [];
  state.placementAnswers = Array.isArray(state.placementAnswers) ? state.placementAnswers : [];
  state.writingHistory = Array.isArray(state.writingHistory) ? state.writingHistory.slice(-80) : [];
  state.dictationHistory = Array.isArray(state.dictationHistory) ? state.dictationHistory.slice(-80) : [];
  state.grammarReview = state.grammarReview || {};
  state.wordNotes = state.wordNotes || {};
  state.dialogueHistory = Array.isArray(state.dialogueHistory) ? state.dialogueHistory.slice(-50) : [];
  state.readingAnswers = state.readingAnswers || {};
  state.selectedNoteWord = valid.has(state.selectedNoteWord) ? state.selectedNoteWord : "";
  const migratedReview={};
  for(const key of Object.keys(state.reviewWords||{})){
    const id=normalizeWordKey(key);
    if(valid.has(id)) migratedReview[id]=state.reviewWords[key];
  }
  state.reviewWords=migratedReview;
}

// ────────────────────────────────────────────
// SRS — SM-2 VARIANT
// ────────────────────────────────────────────
function getSRSData(wordOrId){
  const id=normalizeWordKey(wordOrId);
  return state.reviewWords[id] || {interval:0, due:null, ease:2.5, reps:0};
}
function dedupeVocab(list){
  const seen=new Set();
  return list.filter(w=>w && !seen.has(getWordId(w)) && (seen.add(getWordId(w)),true));
}
function getPriorityVocab(filterFn=()=>true){
  return dedupeVocab(
    state.priorityWords
      .map(id=>findWord(id))
      .filter(Boolean)
      .filter(filterFn)
  );
}
function getLearnedSample(filterFn=()=>true, limit=8){
  return shuffle(
    getLearnedVocab()
      .filter(w=>!state.priorityWords.includes(getWordId(w)))
      .filter(filterFn)
  ).slice(0, limit);
}
function getReinforceVocab(filterFn=()=>true){
  return dedupeVocab(
    state.reinforceWords
      .map(id=>findWord(id))
      .filter(Boolean)
      .filter(filterFn)
  );
}
function getReviewWords(filterFn=()=>true){
  return dedupeVocab([
    ...getPriorityVocab(filterFn),
    ...getDueWords().filter(filterFn),
    ...getReinforceVocab(filterFn),
    ...getUnstartedWords().filter(filterFn),
  ]);
}
function buildStudyPool(filterFn=()=>true){
  return shuffle(getReviewWords(filterFn));
}
function updateSRS(wordOrId, rating, showMsg=true){
  // rating 0=hard,1=ok,2=easy
  const id=normalizeWordKey(wordOrId);
  const label=wordLabel(id);
  let {interval,ease,reps} = getSRSData(id);

  const addUnique = (arr, val) => { if(!arr.includes(val)) arr.push(val); };
  const remove = (arr, val) => arr.filter(w=>w!==val);

  if(rating===0){
    interval = Math.max(1, Math.min(interval || 1, 1));
    reps = 0;
    ease = Math.max(1.3, ease - 0.2);
    state.learnedWords = remove(state.learnedWords, id);
    state.reinforceWords = remove(state.reinforceWords, id);
    addUnique(state.difficultWords, id);
    state.priorityWords = [id, ...state.priorityWords.filter(w=>w!==id)];
  } else {
    reps++;
    if(rating===1){
      interval = reps===1 ? 1 : reps===2 ? 3 : Math.round(interval * ease);
      ease = Math.max(1.3, ease - 0.05);
      addUnique(state.reinforceWords, id);
    } else {
      interval = reps===1 ? 1 : reps===2 ? 4 : Math.round(interval * ease * 1.1);
      ease = Math.min(3.0, ease + 0.1);
      state.reinforceWords = remove(state.reinforceWords, id);
    }
    if(rating===2){
      addUnique(state.learnedWords, id);
      if(showMsg) showToast(`✅ "${label}" ნასწავლად მოინიშნა!`);
    } else {
      addUnique(state.reinforceWords, id);
      if(showMsg) showToast(`✅ "${label}" გასამეორებლად მოინიშნა!`);
    }
    state.difficultWords = remove(state.difficultWords, id);
    state.priorityWords = state.priorityWords.filter(w=>w!==id);
    checkAchievements();
  }

  const due = new Date();
  due.setDate(due.getDate()+interval);
  state.reviewWords[id] = {interval, due:due.toISOString(), ease, reps};
  saveState();
}

function isDue(wordOrId){
  const d=getSRSData(wordOrId);
  if(!d.due) return false;
  return new Date(d.due) <= new Date();
}
function getDueWords(){ return VOCABULARY.filter(w=>isDue(w)); }
function getLearnedVocab(){ return VOCABULARY.filter(w=>state.learnedWords.includes(getWordId(w))); }
function getUnstartedWords(){ return VOCABULARY.filter(w=>!state.reviewWords[getWordId(w)]&&!state.learnedWords.includes(getWordId(w))); }

// ────────────────────────────────────────────
// XP & LEVELS
// ────────────────────────────────────────────
const LEVEL_DEFS = [
  {from:0,next:100,label:"დონე 1 · Anfänger"},
  {from:100,next:300,label:"დონე 2 · Grundkenntnisse"},
  {from:300,next:600,label:"დონე 3 · Elementar (A1)"},
  {from:600,next:1000,label:"დონე 4 · Grundstufe (A2)"},
  {from:1000,next:1800,label:"დონე 5 · Mittelstufe (B1)"},
  {from:1800,next:3000,label:"დონე 6 · Oberstufe (B2)"},
  {from:3000,next:5000,label:"დონე 7 · Fortgeschritten (C1)"},
  {from:5000,next:9999,label:"დონე 8 · Meister (C2)"},
];
function getLevel(){ return LEVEL_DEFS.find(l=>state.xp<l.next)||LEVEL_DEFS[LEVEL_DEFS.length-1]; }

function addXP(amount, showMsg=true){
  state.xp += amount;
  const today = new Date().toISOString().split("T")[0];
  state.weeklyXP[today] = (state.weeklyXP[today]||0)+amount;
  saveState(); updateUI();
  if(showMsg) showToast(`+${amount} XP ⚡`);
}

function toDateKey(d){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function todayKey(){ return toDateKey(new Date()); }
function dateKeyFromOffset(offset){
  const d=new Date();
  d.setDate(d.getDate()+offset);
  return toDateKey(d);
}
function getGoalForDate(key){
  return Math.max(1, state.dailyGoalHistory?.[key] || state.dailyGoal || 10);
}
function getTodayPracticeIds(){
  const key=todayKey();
  state.dailyPractice = state.dailyPractice || {};
  state.dailyGoalHistory = state.dailyGoalHistory || {};
  if(!state.dailyGoalHistory[key]) state.dailyGoalHistory[key]=state.dailyGoal||10;
  state.dailyPractice[key] = uniqueStrings(state.dailyPractice[key]||[]);
  return state.dailyPractice[key];
}
function isDailyGoalMet(key){
  return (state.dailyPractice?.[key]?.length||0) >= getGoalForDate(key);
}
function syncStrictStreak(){
  let offset=isDailyGoalMet(todayKey()) ? 0 : -1;
  let streak=0, anchor="";
  for(let guard=0; guard<370; guard++, offset--){
    const key=dateKeyFromOffset(offset);
    if(!isDailyGoalMet(key)) break;
    streak++;
    if(!anchor) anchor=key;
  }
  state.streak=streak;
  state.strictStreakAnchor=anchor;
  return streak;
}
function markDailyPractice(wordOrId){
  const id=normalizeWordKey(wordOrId);
  if(!findWord(id)) return;
  const today=getTodayPracticeIds();
  const wasMet=isDailyGoalMet(todayKey());
  if(!today.includes(id)){
    today.push(id);
    syncStrictStreak();
    const nowMet=isDailyGoalMet(todayKey());
    if(!wasMet && nowMet) showToast("🎯 დღიური მიზანი შესრულებულია!");
    checkAchievements();
    saveState();
  }
  renderDailyGoal();
}
function renderDailyGoal(){
  const el=document.getElementById("daily-goal");
  if(!el) return;
  const count=getTodayPracticeIds().length;
  const goal=Math.max(1, state.dailyGoal||10);
  const pct=Math.min(100, Math.round((count/goal)*100));
  const now=new Date();
  const first=new Date(now.getFullYear(), now.getMonth(), 1);
  const monthName=first.toLocaleDateString("ka-GE",{month:"long",year:"numeric"});
  const daysInMonth=new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const leadingBlanks=(first.getDay()+6)%7;
  const days=Array.from({length:leadingBlanks},()=>({empty:true}));
  for(let day=1; day<=daysInMonth; day++){
    const d=new Date(now.getFullYear(), now.getMonth(), day);
    const key=toDateKey(d);
    const done=(state.dailyPractice?.[key]?.length||0);
    const dayGoal=getGoalForDate(key);
    days.push({key, day, done, goal:dayGoal, met:done>=dayGoal, today:key===todayKey(), future:d>now});
  }
  el.innerHTML=`
    <div class="daily-goal-top">
      <div>
        <div class="daily-goal-title">🎯 დღიური მიზანი</div>
        <div class="daily-goal-sub">${count}/${goal} სიტყვა დღეს · streak ითვლება მხოლოდ შესრულებულ დღეებზე</div>
      </div>
      <button class="daily-goal-action" onclick="startLearningSession()">სწავლა</button>
    </div>
    <div class="daily-goal-bar"><div class="daily-goal-fill" style="width:${pct}%"></div></div>
    <div class="daily-cal-head">
      <span>${monthName}</span>
      <span>${days.filter(d=>d.met).length}/${daysInMonth} დღე შესრულებულია</span>
    </div>
    <div class="daily-calendar month-view">
      ${["ორ","სა","ოთ","ხუ","პა","შა","კვ"].map(w=>`<div class="daily-weekday">${w}</div>`).join("")}
      ${days.map(d=>d.empty?`<div class="daily-cal-day empty"></div>`:`
      <div class="daily-cal-day ${d.met?"met":d.done>0?"partial":""} ${d.today?"today":""} ${d.future?"future":""}" title="${d.key}: ${d.done}/${d.goal}">
        <div class="daily-cal-dot">${d.day}</div>
        <div class="daily-cal-label">${d.done}/${d.goal}</div>
      </div>`).join("")}</div>
    <div class="daily-goal-note">${pct>=100?"მიზანი შესრულებულია ✅":"გააგრძელე: ყოველი უნიკალური სიტყვა დღიურ მიზანში ითვლება."}</div>`;
}

// ────────────────────────────────────────────
// AUDIO TTS
// ────────────────────────────────────────────
function speak(text, rate=0.85){
  if(!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang="de-DE"; u.rate=rate;
  const vs = speechSynthesis.getVoices();
  const de = vs.find(v=>v.lang==="de-DE"||v.lang==="de-AT"||v.lang==="de-CH");
  if(de) u.voice=de;
  speechSynthesis.speak(u);
}

// ────────────────────────────────────────────
// ACHIEVEMENTS
// ────────────────────────────────────────────
function checkAchievements(){
  if(!ACHIEVEMENTS_DEF.length) return;
  ACHIEVEMENTS_DEF.forEach(ach=>{
    if(state.unlockedAchievements.includes(ach.id)) return;
    let met=false;
    const [key,val] = ach.condition.split(">=");
    const n = parseInt(val);
    if(key==="learnedWords") met=state.learnedWords.length>=n;
    else if(key==="streak") met=state.streak>=n;
    else if(key==="xp") met=state.xp>=n;
    else if(key==="testsCompleted") met=state.testsCompleted>=n;
    else if(key==="perfectQuiz") met=(state.perfectQuiz||0)>=n;
    else if(key==="favoriteWords") met=state.favoriteWords.length>=n;
    else if(key==="grammarViewed") met=(state.grammarViewed||0)>=n;
    if(met){
      state.unlockedAchievements.push(ach.id);
      if(ach.xp>0){ state.xp+=ach.xp; updateUI(); }
      saveState();
      showAchievementPopup(ach);
    }
  });
}
let _achTimer;
function showAchievementPopup(ach){
  const pop = document.getElementById("achievement-popup");
  if(!pop) return;
  pop.innerHTML=`<div class="ach-pop-title">🏆 მიღწევა განბლოკილია!</div>
    <div class="ach-pop-body">
      <div class="ach-pop-icon">${ach.icon}</div>
      <div><div class="ach-pop-name">${ach.name}</div><div class="ach-pop-desc">${ach.desc}</div></div>
    </div>`;
  pop.classList.add("show");
  clearTimeout(_achTimer);
  _achTimer = setTimeout(()=>pop.classList.remove("show"),4000);
}

// ────────────────────────────────────────────
// STREAK
// ────────────────────────────────────────────
function updateStreak(){ syncStrictStreak(); return false; }

// ────────────────────────────────────────────
// LOAD DATA & INIT
// ────────────────────────────────────────────
async function loadData(){
  try{
    const [vr,pr,ar] = await Promise.all([
      fetch("json/vocabulary.json"),
      fetch("json/daily_phrases.json"),
      fetch("json/achievements.json")
    ]);
    VOCABULARY = await vr.json();
    DAILY_PHRASES = await pr.json();
    ACHIEVEMENTS_DEF = await ar.json();
  }catch(e){
    console.warn("JSON fetch failed — using inline fallbacks");
    VOCABULARY = window.VOCAB_INLINE||[];
    DAILY_PHRASES = window.PHRASES_INLINE||[];
    ACHIEVEMENTS_DEF = window.ACH_INLINE||[];
  }
}

loadState();
applyTheme(state.theme||"default");

window.addEventListener("DOMContentLoaded", async ()=>{
  await loadData();
  if(!state.name){
    document.getElementById("welcome-overlay").style.display="flex";
  } else {
    document.getElementById("welcome-overlay").style.display="none";
    initApp();
  }
  document.getElementById("name-input").addEventListener("keydown", e=>{ if(e.key==="Enter") startApp(); });
  document.addEventListener("keydown", handleKeyboard);
  if(window.speechSynthesis) speechSynthesis.onvoiceschanged=()=>{};
});

function startApp(){
  const val = document.getElementById("name-input").value.trim();
  if(!val){ document.getElementById("name-input").style.borderColor="#f87171"; return; }
  state.name=val; syncStrictStreak(); saveState();
  document.getElementById("welcome-overlay").style.display="none";
  initApp();
}

function initApp(){
  normalizeState();
  syncStrictStreak();
  saveState();
  buildCategories();
  buildSettings();
  renderDailyPhrase();
  renderDailyGoal();
  renderVocab();
  renderGrammar();
  renderGrammarExercise();
  renderFlashcard();
  renderQuiz();
  renderAudioPractice();
  renderTests();
  renderPhonetics();
  renderQuickLessons();
  renderWeeklyChart();
  renderAchievements();
  updateUI();
  navigate(state.lastPage||"home");
  checkAchievements();
}

// ────────────────────────────────────────────
// UI UPDATE
// ────────────────────────────────────────────
function updateUI(){
  const name = state.name||"სტუდენტი";
  const q = id => document.getElementById(id);
  if(q("header-greeting")) q("header-greeting").textContent=`გამარჯობა, ${name}!`;
  if(q("header-xp")) q("header-xp").textContent=`${state.xp} XP`;
  if(q("streak-display")) q("streak-display").textContent=`🔥 ${state.streak} დღე`;
  if(q("home-title")) q("home-title").textContent=`გამარჯობა, ${name}! 👋`;
  if(q("stat-words")) q("stat-words").textContent=state.learnedWords.length;
  if(q("stat-xp")) q("stat-xp").textContent=state.xp;
  if(q("stat-tests")) q("stat-tests").textContent=state.testsCompleted;
  if(q("stat-streak")) q("stat-streak").textContent=state.streak;
  if(q("rs-avatar")) q("rs-avatar").textContent=name[0].toUpperCase();
  if(q("rs-name")) q("rs-name").textContent=name;
  const lv = getLevel();
  if(q("rs-level")) q("rs-level").textContent=lv.label;
  if(q("rs-xp-cur")) q("rs-xp-cur").textContent=`${state.xp} XP`;
  if(q("rs-xp-next")) q("rs-xp-next").textContent=`${lv.next} XP`;
  const pct = Math.min(100,((state.xp-lv.from)/(lv.next-lv.from))*100);
  if(q("rs-xp-bar")) q("rs-xp-bar").style.width=pct+"%";
  if(q("name-setting")) q("name-setting").value=state.name;

  const due = getReviewWords().length;
  if(q("flash-due-badge")) q("flash-due-badge").textContent=due>0?due:"";

  const total=VOCABULARY.length;
  const learnedPct=total?Math.round((state.learnedWords.length/total)*100):0;
  if(q("home-progress-fill")) q("home-progress-fill").style.width=learnedPct+"%";
  if(q("home-progress-text")) q("home-progress-text").textContent=`${state.learnedWords.length} / ${total} სიტყვა ნასწავლია (${learnedPct}%)`;
  if(q("daily-goal-setting")) q("daily-goal-setting").value=state.dailyGoal||10;
  renderDailyGoal();
}

// ────────────────────────────────────────────
// NAVIGATION
// ────────────────────────────────────────────
function navigate(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".rs-nav-item").forEach(i=>i.classList.remove("active"));
  const pg=document.getElementById("page-"+page);
  if(pg) pg.classList.add("active");
  const nav=document.querySelector(`[data-page="${page}"]`);
  if(nav) nav.classList.add("active");
  state.lastPage=page; saveState();
  closeAllSidebars();
  if(page==="flash") renderFlashcard();
  if(page==="quiz") renderQuiz();
  if(page==="audio") renderAudioPractice();
  if(page==="vocab") renderVocab();
  if(page==="grammar") renderGrammarExercise();
  if(page==="home"){ renderWeeklyChart(); renderDailyPhrase(); renderDailyGoal(); }
  if(page==="placement") renderPlacementTest();
  if(page==="dashboard") renderWeakDashboard();
  if(page==="writing") renderWritingPractice();
  if(page==="dialogues") renderDialogues();
  if(page==="reading") renderReadingTexts();
  if(page==="notes") renderNotes();
  if(page==="achievements") renderAchievements();
  if(page==="tests") renderTests();
}

// ────────────────────────────────────────────
// DAILY PHRASE
// ────────────────────────────────────────────
function renderDailyPhrase(){
  const el=document.getElementById("daily-phrase");
  if(!el||!DAILY_PHRASES.length) return;
  const idx=Math.floor(Date.now()/86400000)%DAILY_PHRASES.length;
  const p=DAILY_PHRASES[idx];
  el.innerHTML=`
    <div class="daily-phrase-label">📅 დღის ფრაზა</div>
    <div class="daily-phrase-de">${p.de}</div>
    <div class="daily-phrase-ka">${p.ka}</div>
    <div class="daily-phrase-phonetic">${p.phonetic}</div>
    <button class="learn-audio-btn" style="margin-top:10px;margin-bottom:0;" onclick="speak('${p.de.replace(/'/g,"\\'")}')">🔊 მოუსმინე</button>`;
}

// ────────────────────────────────────────────
// WEEKLY CHART
// ────────────────────────────────────────────
function renderWeeklyChart(){
  const el=document.getElementById("weekly-chart");
  if(!el) return;
  const days=["კვ","ო","სა","ო","ხ","პ","შ"];
  const today=new Date();
  let bars=[], maxXP=1;
  for(let i=6;i>=0;i--){
    const d=new Date(today); d.setDate(d.getDate()-i);
    const key=d.toISOString().split("T")[0];
    const xp=state.weeklyXP[key]||0;
    if(xp>maxXP) maxXP=xp;
    bars.push({xp, label:days[d.getDay()], isToday:i===0});
  }
  el.innerHTML=bars.map(b=>`
    <div class="chart-bar-wrap">
      <div class="chart-val">${b.xp>0?b.xp:""}</div>
      <div class="chart-bar ${b.isToday?"today":""}" style="height:${Math.max(3,(b.xp/maxXP)*70)}px"></div>
      <div class="chart-label">${b.label}</div>
    </div>`).join("");
}

// ────────────────────────────────────────────
// CATEGORIES
// ────────────────────────────────────────────
const CATEGORIES_META={
  "მისალმება":{icon:"👋"},"ზოგადი":{icon:"💬"},"ადამიანი":{icon:"👤"},
  "ოჯახი":{icon:"👨‍👩‍👧"},"სახლი":{icon:"🏠"},"რიცხვები":{icon:"🔢"},
  "ფერები":{icon:"🎨"},"საჭმელ-სასმელი":{icon:"🍽️"},"კვირის დღეები":{icon:"📅"},
  "თვეები":{icon:"🗓️"},"ზმნები":{icon:"⚡"},"ზედსართავები":{icon:"✨"},
  "წინდებულები":{icon:"📍"},"ცხოველები":{icon:"🐾"},"სხეულის ნაწილები":{icon:"🫀"},
  "ტანსაცმელი":{icon:"👗"},"ტრანსპორტი":{icon:"🚗"},"ემოციები":{icon:"😊"},
  "ბუნება":{icon:"🌿"},"ამინდი":{icon:"🌤️"},"სამსახური":{icon:"💼"},
  "ტექნოლოგია":{icon:"💻"},"ადგილები":{icon:"📍"},"განათლება":{icon:"🎓"},
  "ჯანმრთელობა":{icon:"🏥"},"ქვეყნები":{icon:"🌍"},"შოპინგი":{icon:"🛍️"},
  "დრო":{icon:"⏰"},"მოგზაურობა":{icon:"🧳"},"მიმართულება":{icon:"🧭"},
  "ზმნიზედა":{icon:"↔️"},"კავშირები":{icon:"🔗"},"ფული":{icon:"💶"},
  "კომუნიკაცია":{icon:"🗣️"},"სოციალური":{icon:"🤝"},"ყოველდღიური":{icon:"☕"},
  "B1 ლექსიკა":{icon:"📗"},"B2 ლექსიკა":{icon:"📘"},"C1/C2 ლექსიკა":{icon:"📙"},
};

function buildCategories(){
  const cats={};
  VOCABULARY.forEach(w=>{ if(!cats[w.cat]) cats[w.cat]=[]; cats[w.cat].push(w); });
  const el=document.getElementById("cat-list");
  el.innerHTML="";
  for(const [cat,words] of Object.entries(cats)){
    const meta=CATEGORIES_META[cat]||{icon:"📂"};
    const learned=words.filter(w=>state.learnedWords.includes(getWordId(w))).length;
    const div=document.createElement("div");
    div.className="cat-group"; div.dataset.cat=cat.toLowerCase();
    div.innerHTML=`
      <div class="cat-group-header" onclick="toggleCat(this)">
        <div class="cat-group-title"><span class="icon">${meta.icon}</span>${cat}</div>
        <span class="cat-arrow">▶</span>
      </div>
      <div class="cat-items">
        <div class="cat-item" onclick="filterByCategory('${cat.replace(/'/g,"\\'")}')">
          <span>ყველა სიტყვა</span>
          <span class="cat-item-level">${learned}/${words.length}</span>
        </div>
        ${[...new Set(words.map(w=>w.level))].map(lv=>`
          <div class="cat-item" onclick="filterByCategoryLevel('${cat.replace(/'/g,"\\'")}','${lv}')">
            <span>${lv}</span>
            <span class="cat-item-level">${words.filter(w=>w.level===lv).length}</span>
          </div>`).join("")}
      </div>`;
    el.appendChild(div);
  }
}

function toggleCat(h){ h.parentElement.classList.toggle("open"); }
function filterCategories(val){
  document.querySelectorAll(".cat-group").forEach(g=>{
    g.style.display=g.dataset.cat.includes(val.toLowerCase())?"":"none";
  });
}
function filterByCategory(cat){
  state.vocabCategory=cat;
  state.vocabFilter="all";
  state.currentVocabPage=1;
  saveState();
  closeAllSidebars();
  navigate("vocab");
  setTimeout(renderVocab,100);
}
function filterByCategoryLevel(cat,level){
  state.vocabCategory=cat;
  state.vocabFilter=level;
  state.currentVocabPage=1;
  saveState();
  closeAllSidebars();
  navigate("vocab");
  setTimeout(renderVocab,100);
}

// ────────────────────────────────────────────
// VOCABULARY — PAGINATION 20/page
// ────────────────────────────────────────────
const VOCAB_LEVELS=["all","A1","A2","B1","B2","C1","C2"];
const PAGE_SIZE=20;

function renderVocab(){
  const statusFilters=["fav","learned","review"];
  const knownFilters=[...VOCAB_LEVELS,...statusFilters];
  let categoryFilter=state.vocabCategory||"all";
  let modeFilter=state.vocabFilter||"all";
  if(!knownFilters.includes(modeFilter)){
    categoryFilter=modeFilter;
    modeFilter="all";
    state.vocabCategory=categoryFilter;
    state.vocabFilter=modeFilter;
  }

  const filters=document.getElementById("vocab-filters");
  if(filters){
    const categoryPill=categoryFilter!=="all"
      ? `<button class="vfb-btn active" onclick="clearVocabCategory()">📂 ${categoryFilter} ×</button>`
      : "";
    filters.innerHTML=categoryPill
      + VOCAB_LEVELS.map(l=>`<button class="vfb-btn ${modeFilter===l?"active":""}" data-filter="${l}" onclick="setVocabFilter('${l}')">${l==="all"?"ყველა დონე":l}</button>`).join("")
      +`<button class="vfb-btn" data-filter="fav" onclick="setVocabFilter('fav')">❤️ ფავ.</button>`
      +`<button class="vfb-btn" data-filter="learned" onclick="setVocabFilter('learned')">✅ ნასწავლი</button>`
      +`<button class="vfb-btn" data-filter="review" onclick="setVocabFilter('review')">🔄 გასამეო.</button>`;
  }
  document.querySelectorAll("#vocab-filters .vfb-btn[data-filter]").forEach(b=>b.classList.toggle("active",b.dataset.filter===modeFilter));
  const q=(document.getElementById("vocab-search")?.value||"").toLowerCase();
  let words=VOCABULARY.filter(w=>{
    if(categoryFilter!=="all" && w.cat!==categoryFilter) return false;
    const id=getWordId(w);
    if(modeFilter==="fav") return state.favoriteWords.includes(id);
    if(modeFilter==="learned") return state.learnedWords.includes(id);
    if(modeFilter==="review") return isDue(w) || state.priorityWords.includes(id) || state.reinforceWords.includes(id);
    return modeFilter==="all"||w.level===modeFilter;
  }).filter(w=>!q||w.de.toLowerCase().includes(q)||w.ka.toLowerCase().includes(q));

  const total=words.length;
  const totalPages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  if(state.currentVocabPage>totalPages) state.currentVocabPage=1;
  const start=(state.currentVocabPage-1)*PAGE_SIZE;
  const pageWords=words.slice(start,start+PAGE_SIZE);

  const grid=document.getElementById("vocab-grid");
  grid.innerHTML=pageWords.map(w=>{
    const id=getWordId(w);
    const isLearned=state.learnedWords.includes(id);
    const isDueNow=isDue(w);
    const isPriority=state.priorityWords.includes(id);
    let badge="";
    if(isLearned) badge=`<span class="vocab-status-badge learned">✅</span>`;
    else if(isDueNow || isPriority) badge=`<span class="vocab-status-badge review">🔄</span>`;
    const deText=normalizeWordDisplay(w);
    return `<div class="vocab-card ${isLearned?"learned-word":(isDueNow||isPriority)?"srs-due":""}">
      ${badge}
      <div class="vocab-de">${deText}</div>
      <div class="vocab-phonetic">${w.phonetic}</div>
      <div class="vocab-ka">${w.ka}</div>
      ${w.example?`<div style="font-size:0.72rem;color:var(--text3);margin-top:4px;font-style:italic;">${w.example}</div>`:""}
      <span class="vocab-fav ${state.favoriteWords.includes(id)?"active":""}" onclick="toggleFav(event,'${id}')">❤️</span>
      <button class="vocab-note-btn ${state.wordNotes?.[id]?"active":""}" onclick="openWordNote(event,'${id}')" title="შენიშვნა">🗒️</button>
      <button class="vocab-audio-btn" onclick="event.stopPropagation();speak('${deText.replace(/'/g,"\\'")}')">🔊</button>
    </div>`;
  }).join("")||`<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text3);">სიტყვა ვერ მოიძებნა</div>`;

  renderPagination(totalPages);
  const ci=document.getElementById("vocab-count-info");
  if(ci) ci.textContent=`${total} სიტყვა${categoryFilter!=="all"?` · ${categoryFilter}`:""}${q?" (ძებნა)":""}`;
}

function renderPagination(totalPages){
  const el=document.getElementById("vocab-pagination");
  if(!el) return;
  if(totalPages<=1){ el.innerHTML=""; return; }
  const cur=state.currentVocabPage;
  let btns=`<button class="page-btn" onclick="setVocabPage(${cur-1})" ${cur===1?"disabled":""}>‹</button>`;
  for(let i=1;i<=totalPages;i++){
    if(i===1||i===totalPages||(i>=cur-2&&i<=cur+2))
      btns+=`<button class="page-btn ${i===cur?"active":""}" onclick="setVocabPage(${i})">${i}</button>`;
    else if(i===cur-3||i===cur+3) btns+=`<span style="padding:0 4px;color:var(--text3)">…</span>`;
  }
  btns+=`<button class="page-btn" onclick="setVocabPage(${cur+1})" ${cur===totalPages?"disabled":""}>›</button>`;
  el.innerHTML=btns;
}
function setVocabPage(p){ if(p<1) return; state.currentVocabPage=p; renderVocab(); document.getElementById("page-vocab")?.scrollTo(0,0); }
function setVocabFilter(f){ state.vocabFilter=f; state.currentVocabPage=1; saveState(); renderVocab(); }
function clearVocabCategory(){ state.vocabCategory="all"; state.currentVocabPage=1; saveState(); renderVocab(); }
function toggleFav(e,id){
  e.stopPropagation();
  id=normalizeWordKey(id);
  const i=state.favoriteWords.indexOf(id);
  if(i>-1) state.favoriteWords.splice(i,1);
  else{ state.favoriteWords.push(id); addXP(2,false); }
  saveState(); checkAchievements(); renderVocab();
}

// ────────────────────────────────────────────
// STRUCTURED LEARNING SESSION
// ────────────────────────────────────────────
let learnWords=[], learnIdx=0, learnSessionAwarded=false;

function startLearningSession(){
  learnSessionAwarded=false;
  learnWords = buildStudyPool(()=>true).slice(0, 20);
  if(!learnWords.length){
    navigate("learn");
    const allDone = VOCABULARY.length>0 && !getReviewWords(()=>true).length;
    document.getElementById("learn-session-area").innerHTML = allDone
      ?`<div class="learn-complete-card"><div class="learn-complete-emoji">🎓</div><div class="learn-complete-title">ყველა სიტყვა ნასწავლია!</div><button class="primary-btn" style="margin-top:16px;" onclick="navigate('quiz')">კვიზი →</button></div>`
      :`<div class="learn-complete-card"><div class="learn-complete-emoji">✨</div><div class="learn-complete-title">გამეორება საჭირო არ არის!</div><p style="color:var(--text2);margin-top:8px;">ყველა სიტყვა განმეორებულია. დაბრუნდი ხვალ.</p><button class="primary-btn" style="margin-top:16px;" onclick="navigate('vocab')">ლექსიკონი →</button></div>`;
    return;
  }
  learnIdx=0;
  navigate("learn");
  renderLearnWord();
}

function renderLearnWord(){
  const area=document.getElementById("learn-session-area");
  if(!area) return;
  if(learnIdx>=learnWords.length){
    area.innerHTML=`<div class="learn-complete-card">
      <div class="learn-complete-emoji">🎉</div>
      <div class="learn-complete-title">სესია დასრულდა!</div>
      <p style="color:var(--text2);margin-top:8px;">გაიარეთ ${learnWords.length} სიტყვა!</p>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:20px;flex-wrap:wrap;">
        <button class="primary-btn" onclick="startLearningSession()">🔁 ახალი სესია</button>
        <button class="learn-nav-btn prev" onclick="navigate('quiz')">🎮 კვიზი</button>
      </div></div>`;
    if(!learnSessionAwarded){
      learnSessionAwarded = true;
      addXP(10);
      checkAchievements();
      renderWeeklyChart();
    }
    return;
  }
  const w=learnWords[learnIdx];
  const isLearned=state.learnedWords.includes(getWordId(w));
  const srs=getSRSData(w);
  const deText=normalizeWordDisplay(w);
  area.innerHTML=`
    <div class="learn-session-card">
      <div class="learn-progress-info">
        <span class="learn-progress-text">${learnIdx+1} / ${learnWords.length}</span>
        <span class="learn-mark-btn ${isLearned?"learned":"not-learned"}">${isLearned?"✅ ნასწავლი":"⬜ ჯერ არ ისწავლია"}</span>
      </div>
      <div class="fc-category">${w.cat} · <span class="badge-${w.level.toLowerCase()}">${w.level}</span></div>
      <div class="learn-word-de">${deText}</div>
      <div class="learn-word-phonetic">${w.phonetic}</div>
      <div class="learn-word-ka">${w.ka}</div>
      ${w.example?`<div class="learn-word-example">"${w.example}"</div>`:""}
      <button class="learn-audio-btn" onclick="speak('${deText.replace(/'/g,"\\'")}')">🔊 მოუსმინე</button>
      <div style="font-size:0.75rem;color:var(--text3);margin-bottom:10px;">📊 SRS: ${srs.reps} გამ. · ინტ. ${srs.interval||0}დ.</div>
      <div style="font-size:0.78rem;color:var(--text2);margin-bottom:10px;">ამ სიტყვის სირთულე:</div>
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <button class="fc-btn hard" style="flex:1;" onclick="learnRate(0)">😓 რთული</button>
        <button class="fc-btn ok" style="flex:1;" onclick="learnRate(1)">😐 ასე-ისე</button>
        <button class="fc-btn easy" style="flex:1;" onclick="learnRate(2)">😊 ადვილი</button>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="learn-nav-btn prev" onclick="learnGoBack()" ${learnIdx===0?"disabled":""}>← წინა</button>
        <button class="learn-nav-btn next" onclick="learnSkip()">გამოტოვება →</button>
      </div>
    </div>`;
}
function learnRate(r){
  if(learnIdx>=learnWords.length) return;
  const xpM=[2,5,10];
  const current=learnWords[learnIdx];
  addXP(xpM[r],false);
  updateSRS(current,r);
  markDailyPractice(current);
  if(r===0){
    learnWords.splice(learnIdx+1,0,current);
    learnIdx++;
  } else {
    learnIdx++;
  }
  renderLearnWord();
}
function learnGoBack(){ if(learnIdx>0){ learnIdx--; renderLearnWord(); } }
function learnSkip(){ learnIdx++; renderLearnWord(); }

// ────────────────────────────────────────────
// GRAMMAR
// ────────────────────────────────────────────
const GRAMMAR_RULES=[
  {title:"არტიკლები: der, die, das",icon:"📌",level:"A1",body:`<p style="font-size:0.85rem;color:var(--text2);margin:12px 0;line-height:1.7;">გერმანულ ენაში სამი განსაზღვრული არტიკლია: <strong>der</strong> (მამრ.), <strong>die</strong> (მდედ./მრ.რ.), <strong>das</strong> (საშ.).</p><table class="grammar-table"><tr><th>სქესი</th><th>განსაზ.</th><th>განუსაზ.</th><th>მაგ.</th></tr><tr><td>მამრობითი</td><td>der</td><td>ein</td><td>der Mann</td></tr><tr><td>მდედრობითი</td><td>die</td><td>eine</td><td>die Frau</td></tr><tr><td>საშ.</td><td>das</td><td>ein</td><td>das Kind</td></tr><tr><td>მრ. რ.</td><td>die</td><td>—</td><td>die Männer</td></tr></table><div class="grammar-note">💡 -ung, -heit, -keit, -schaft → ყოველთვის die.</div>`},
  {title:"Kasus: ბრუნვები",icon:"🔄",level:"A2",body:`<table class="grammar-table"><tr><th>ბრუნვა</th><th>der(m)</th><th>die(f)</th><th>das(n)</th><th>die(pl)</th></tr><tr><td>Nominativ</td><td>der</td><td>die</td><td>das</td><td>die</td></tr><tr><td>Akkusativ</td><td>den</td><td>die</td><td>das</td><td>die</td></tr><tr><td>Dativ</td><td>dem</td><td>der</td><td>dem</td><td>den</td></tr><tr><td>Genitiv</td><td>des</td><td>der</td><td>des</td><td>der</td></tr></table><div class="grammar-example"><div class="de">Der Mann sieht den Hund.</div><div class="ka">კაცი ხედავს ძაღლს. (Mann=Nom, Hund=Akk)</div></div>`},
  {title:"Präsens: sein და haben",icon:"⏱️",level:"A1",body:`<table class="grammar-table"><tr><th>პირი</th><th>sein</th><th>haben</th></tr><tr><td>ich</td><td>bin</td><td>habe</td></tr><tr><td>du</td><td>bist</td><td>hast</td></tr><tr><td>er/sie/es</td><td>ist</td><td>hat</td></tr><tr><td>wir</td><td>sind</td><td>haben</td></tr><tr><td>ihr</td><td>seid</td><td>habt</td></tr><tr><td>sie/Sie</td><td>sind</td><td>haben</td></tr></table>`},
  {title:"Satzstellung: V2 წესი",icon:"📐",level:"A2",body:`<table class="grammar-table"><tr><th>პოზ.1</th><th>ზმნა</th><th>სუბ.</th><th>დანარ.</th></tr><tr><td>Ich</td><td>gehe</td><td>—</td><td>heute nach Hause.</td></tr><tr><td>Heute</td><td>gehe</td><td>ich</td><td>nach Hause.</td></tr></table><div class="grammar-note">💡 ქვე-წინადადებებში ზმნა ბოლოს: "Ich weiß, dass er <strong>kommt</strong>."</div>`},
  {title:"Modalverben: მოდალური ზმნები",icon:"🎯",level:"A2",body:`<table class="grammar-table"><tr><th>ზმნა</th><th>მნიშვ.</th><th>ich</th><th>du</th><th>er/sie</th></tr><tr><td>können</td><td>შეძლება</td><td>kann</td><td>kannst</td><td>kann</td></tr><tr><td>müssen</td><td>სავალდ.</td><td>muss</td><td>musst</td><td>muss</td></tr><tr><td>wollen</td><td>სურვილი</td><td>will</td><td>willst</td><td>will</td></tr><tr><td>dürfen</td><td>ნებართვა</td><td>darf</td><td>darfst</td><td>darf</td></tr><tr><td>mögen</td><td>მოწონება</td><td>mag</td><td>magst</td><td>mag</td></tr></table>`},
  {title:"Perfekt: ნამდვილი წარსული",icon:"⌛",level:"A2",body:`<table class="grammar-table"><tr><th>ინფ.</th><th>Partizip II</th><th>დამხ.</th><th>მაგ.</th></tr><tr><td>machen</td><td>gemacht</td><td>haben</td><td>Ich habe gemacht.</td></tr><tr><td>gehen</td><td>gegangen</td><td>sein</td><td>Ich bin gegangen.</td></tr><tr><td>essen</td><td>gegessen</td><td>haben</td><td>Er hat gegessen.</td></tr></table><div class="grammar-note">💡 sein-ით: გადაადგილ. ზმნები (gehen, fahren, kommen...)</div>`},
  {title:"Konjunktiv II: ირეალური პირობა",icon:"🌀",level:"B1",body:`<table class="grammar-table"><tr><th>პირი</th><th>würde+Inf.</th><th>wäre</th><th>hätte</th></tr><tr><td>ich</td><td>würde gehen</td><td>wäre</td><td>hätte</td></tr><tr><td>du</td><td>würdest gehen</td><td>wärst</td><td>hättest</td></tr></table><div class="grammar-example"><div class="de">Wenn ich Zeit hätte, würde ich lernen.</div><div class="ka">რომ დრო მქონდეს, ვისწავლიდი.</div></div>`},
  {title:"Adjektivdeklination: ზედსართ. ბრუნება",icon:"🎭",level:"B1",body:`<table class="grammar-table"><tr><th></th><th>მამრ.(Nom)</th><th>მდედ.(Nom)</th><th>საშ.(Nom)</th></tr><tr><td>განსაზ.</td><td>der alte Mann</td><td>die alte Frau</td><td>das alte Kind</td></tr><tr><td>განუსაზ.</td><td>ein alter Mann</td><td>eine alte Frau</td><td>ein altes Kind</td></tr></table>`},
  {title:"Passiv: პასიური გვარი",icon:"🔁",level:"B2",body:`<table class="grammar-table"><tr><th>დრო</th><th>ფორმა</th><th>მაგ.</th></tr><tr><td>Präsens</td><td>wird+P.II</td><td>Das Buch wird gelesen.</td></tr><tr><td>Perfekt</td><td>wurde+P.II</td><td>Das Buch wurde gelesen.</td></tr></table>`},
  {title:"Komposita: სიტყვათა შეკვრა",icon:"🔧",level:"B2",body:`<div class="grammar-example"><div class="de">Krankenhaus = krank + Haus</div><div class="ka">საავადმყოფო</div></div><div class="grammar-example"><div class="de">Bahnhof = Bahn + Hof</div><div class="ka">სადგური</div></div><div class="grammar-note">💡 კომპოზიტის სქესი = ბოლო კომპონენტის სქესი.</div>`},
];

function renderGrammar(){
  const el=document.getElementById("grammar-list");
  if(!el) return;
  el.innerHTML=GRAMMAR_RULES.map((r,i)=>`
    <div class="grammar-rule" id="gr-${i}">
      <div class="grammar-rule-header" onclick="toggleGrammar(${i})">
        <div class="grammar-rule-title"><span>${r.icon}</span>${r.title}<span class="lesson-badge badge-${r.level.toLowerCase()}">${r.level}</span></div>
        <span class="grammar-arrow">▼</span>
      </div>
      <div class="grammar-rule-body">${r.body}</div>
    </div>`).join("");
}
function toggleGrammar(i){
  const el=document.getElementById("gr-"+i);
  const wasOpen=el.classList.contains("open");
  el.classList.toggle("open");
  if(!wasOpen && !state.viewedGrammarRules.includes(String(i))){
    state.viewedGrammarRules.push(String(i));
    state.grammarViewed=state.viewedGrammarRules.length;
    addXP(3,false);
    saveState();
    checkAchievements();
  }
}

const GRAMMAR_EXERCISES=[
  {level:"A1",topic:"არტიკლები",question:"აირჩიე სწორი არტიკლი: ___ Mädchen singt.",options:["der","die","das"],correct:"das",explain:"Mädchen ყოველთვის ნეიტრალურია: das Mädchen."},
  {level:"A1",topic:"არტიკლები",question:"აირჩიე სწორი არტიკლი: ___ Wohnung ist hell.",options:["der","die","das"],correct:"die",explain:"Wohnung მდედრობითია: die Wohnung."},
  {level:"A1",topic:"არტიკლები",question:"აირჩიე სწორი არტიკლი: ___ Tisch ist groß.",options:["der","die","das"],correct:"der",explain:"Tisch მამრობითია: der Tisch."},
  {level:"A1",topic:"არტიკლები",question:"შეავსე განუსაზღვრელი არტიკლით: Das ist ___ Buch.",options:["ein","eine","einen"],correct:"ein",explain:"Buch ნეიტრალურია: das Buch, ein Buch."},
  {level:"A1",topic:"sein/haben",question:"შეავსე: Ich ___ aus Georgien.",options:["bin","bist","ist","sind"],correct:"bin",explain:"Ich-თან sein არის bin."},
  {level:"A1",topic:"sein/haben",question:"შეავსე: Wir ___ Zeit.",options:["habe","hat","haben","habt"],correct:"haben",explain:"Wir-თან haben არის haben."},
  {level:"A1",topic:"sein/haben",question:"შეავსე: Du ___ sehr freundlich.",options:["bin","bist","ist","seid"],correct:"bist",explain:"Du-თან sein არის bist."},
  {level:"A1",topic:"Präsens",question:"შეავსე: Er ___ Deutsch.",options:["lerne","lernst","lernt","lernen"],correct:"lernt",explain:"er/sie/es ფორმას ხშირად -t დაბოლოება აქვს: er lernt."},
  {level:"A1",topic:"Präsens",question:"შეავსე: Wir ___ in Berlin.",options:["wohne","wohnst","wohnt","wohnen"],correct:"wohnen",explain:"wir ფორმა ინფინიტივს ჰგავს: wir wohnen."},
  {level:"A2",topic:"Akkusativ",question:"აირჩიე სწორი ფორმა: Ich sehe ___ Mann.",options:["der","den","dem","des"],correct:"den",explain:"sehen ითხოვს Akkusativ-ს; der Mann -> den Mann."},
  {level:"A2",topic:"Akkusativ",question:"შეავსე: Ich kaufe ___ Apfel.",options:["ein","einen","einem","eine"],correct:"einen",explain:"kaufen-ის ობიექტი Akkusativ-შია: der Apfel -> einen Apfel."},
  {level:"A2",topic:"Akkusativ",question:"აირჩიე: Wir brauchen ___ Stuhl.",options:["der","den","dem","des"],correct:"den",explain:"brauchen იღებს პირდაპირ ობიექტს Akkusativ-ში."},
  {level:"A2",topic:"Dativ",question:"შეავსე: Ich helfe ___ Frau.",options:["die","der","den","das"],correct:"der",explain:"helfen ჩვეულებრივ Dativ-ს ითხოვს; die Frau -> der Frau."},
  {level:"A2",topic:"Dativ",question:"შეავსე: Das Geschenk gehört ___ Kind.",options:["das","dem","den","des"],correct:"dem",explain:"gehören Dativ-ს ითხოვს; das Kind -> dem Kind."},
  {level:"A2",topic:"Dativ",question:"შეავსე: Ich fahre mit ___ Bus.",options:["der","den","dem","das"],correct:"dem",explain:"mit ყოველთვის Dativ-ს ითხოვს; der Bus -> dem Bus."},
  {level:"A2",topic:"V2",question:"სწორი წინადადება რომელია?",options:["Heute ich gehe nach Hause.","Heute gehe ich nach Hause.","Heute nach Hause ich gehe."],correct:"Heute gehe ich nach Hause.",explain:"მთავარ წინადადებაში ზმნა მეორე პოზიციაზე დგას."},
  {level:"A2",topic:"V2",question:"სწორი წინადადება რომელია?",options:["Morgen lernen wir Deutsch.","Morgen wir lernen Deutsch.","Morgen Deutsch lernen wir."],correct:"Morgen lernen wir Deutsch.",explain:"თუ წინადადება Morgen-ით იწყება, ზმნა მაინც მეორე პოზიციაზეა."},
  {level:"A2",topic:"Nebensatz",question:"შეავსე: Ich weiß, dass er morgen ___.",options:["kommt","er kommt","kommen","kommst"],correct:"kommt",explain:"dass-ქვეწინადადებაში ზმნა ბოლოს დგას."},
  {level:"A2",topic:"Modalverben",question:"შეავსე: Ich ___ heute arbeiten.",options:["muss","musst","müssen","müsst"],correct:"muss",explain:"ich-თან müssen არის muss."},
  {level:"A2",topic:"Modalverben",question:"შეავსე: Wir ___ gut Deutsch sprechen.",options:["kann","kannst","können","könnt"],correct:"können",explain:"wir-თან können არის können."},
  {level:"B1",topic:"Perfekt",question:"შეავსე: Gestern ___ ich nach Berlin gefahren.",options:["habe","bin","war","hatte"],correct:"bin",explain:"მოძრაობის ზმნები Perfekt-ში ხშირად sein-ს იყენებს."},
  {level:"B1",topic:"Perfekt",question:"შეავსე: Ich ___ das Buch gelesen.",options:["bin","habe","war","werde"],correct:"habe",explain:"lesen Perfekt-ში haben-ს იყენებს: ich habe gelesen."},
  {level:"B1",topic:"Perfekt",question:"შეავსე: Sie ist früh ___.",options:["gekommen","gekommt","kommen","gekommtet"],correct:"gekommen",explain:"kommen-ის Partizip II არის gekommen."},
  {level:"B1",topic:"Konjunktiv II",question:"შეავსე: Wenn ich Zeit hätte, ___ ich mehr lernen.",options:["wurde","würde","werde","war"],correct:"würde",explain:"ირეალურ პირობაში ვიყენებთ würde + Infinitiv."},
  {level:"B1",topic:"Konjunktiv II",question:"შეავსე: Ich ___ gern nach Wien fahren.",options:["wurde","würde","werde","war"],correct:"würde",explain:"სურვილის ზრდილობიანი/ჰიპოთეტური ფორმა: ich würde gern..."},
  {level:"B1",topic:"Adjektivdeklination",question:"შეავსე: ein ___ Mann",options:["alte","alter","alten","altes"],correct:"alter",explain:"Nominativ masculine indefinit: ein alter Mann."},
  {level:"B1",topic:"Adjektivdeklination",question:"შეავსე: mit einem ___ Auto",options:["neue","neuer","neuen","neues"],correct:"neuen",explain:"Dativ neuter indefinit: mit einem neuen Auto."},
  {level:"B2",topic:"Passiv",question:"სწორი Passiv ფორმაა:",options:["Das Buch wird gelesen.","Das Buch liest.","Das Buch hat gelesen."],correct:"Das Buch wird gelesen.",explain:"Präsens Passiv: werden + Partizip II."},
  {level:"B2",topic:"Passiv",question:"შეავსე: Der Brief ___ gestern geschrieben.",options:["wird","wurde","hat","ist"],correct:"wurde",explain:"Präteritum Passiv: wurde + Partizip II."},
  {level:"B2",topic:"Passiv",question:"შეავსე: Die Regeln müssen ___ werden.",options:["beachtet","beachten","beachtetet","beachte"],correct:"beachtet",explain:"Modalverb + Passiv: müssen + Partizip II + werden."},
  {level:"B2",topic:"Komposita",question:"რომელი არტიკლია სწორი: ___ Krankenhaus?",options:["der","die","das"],correct:"das",explain:"კომპოზიტის სქესი ბოლო ნაწილისგან მოდის: das Haus -> das Krankenhaus."},
];
let grammarAnswered=false;
let grammarReplayMistake=null;

function getGrammarTopics(){
  return ["all", ...new Set(GRAMMAR_EXERCISES.map(e=>e.topic))];
}
function getGrammarPool(){
  const topic=state.grammarTopic||"all";
  return GRAMMAR_EXERCISES.filter(e=>topic==="all"||e.topic===topic);
}
function getExerciseFromMistake(mistake){
  if(!mistake) return null;
  const stored = mistake.options && mistake.explain
    ? {
      level:mistake.level,
      topic:mistake.topic,
      question:mistake.question,
      options:mistake.options,
      correct:mistake.correct,
      explain:mistake.explain,
      replay:true
    }
    : null;
  return stored || GRAMMAR_EXERCISES.find(e=>e.question===mistake.question) || null;
}
function renderGrammarExercise(){
  const area=document.getElementById("grammar-practice-area");
  if(!area) return;
  const pool=getGrammarPool();
  const ex=grammarReplayMistake ? getExerciseFromMistake(grammarReplayMistake) : pool[state.grammarExerciseIdx % pool.length];
  if(!ex){ grammarReplayMistake=null; renderGrammarExercise(); return; }
  grammarAnswered=false;
  area.innerHTML=`<div class="grammar-practice-card">
    <div class="grammar-topic-bar">
      ${getGrammarTopics().map(t=>`<button class="qts-btn ${state.grammarTopic===t||(!state.grammarTopic&&t==="all")?"active":""}" onclick="setGrammarTopic('${t.replace(/'/g,"\\'")}')">${t==="all"?"ყველა თემა":t}</button>`).join("")}
    </div>
    <div class="grammar-practice-head">
      <div class="grammar-practice-title">${grammarReplayMistake?"🔁 შეცდომის replay":"🧠 პრაქტიკული სავარჯიშო"} · ${ex.topic}</div>
      <span class="grammar-practice-level">${ex.level}</span>
    </div>
    <div class="quiz-question">${ex.question}</div>
    <div class="quiz-options">${shuffle([...ex.options]).map(o=>`<button class="quiz-opt" onclick="answerGrammarExercise(this,'${o.replace(/'/g,"\\'")}')">${o}</button>`).join("")}</div>
    <div class="grammar-explain" id="grammar-explain">${ex.explain}</div>
    <button class="quiz-next-btn" id="grammar-next" onclick="${grammarReplayMistake?"finishGrammarReplay()":"nextGrammarExercise()"}">${grammarReplayMistake?"Replay დასრულება":"შემდეგი →"}</button>
    ${grammarReplayMistake?`<button class="learn-nav-btn prev grammar-replay-exit" onclick="finishGrammarReplay()">რეჟიმიდან გამოსვლა</button>`:""}
    ${renderGrammarMistakeHistory()}
  </div>`;
}
function setGrammarTopic(topic){
  state.grammarTopic=topic;
  state.grammarExerciseIdx=0;
  saveState();
  renderGrammarExercise();
}
function renderGrammarMistakeHistory(){
  const mistakes=(state.grammarMistakes||[]).slice(-5).reverse();
  if(!mistakes.length) return `<div class="grammar-history empty">შეცდომების ისტორია ჯერ ცარიელია.</div>`;
  return `<div class="grammar-history">
    <div class="grammar-history-title">ბოლო შეცდომები</div>
    ${mistakes.map(m=>`<div class="grammar-history-item">
      <span>${m.topic}</span>
      <strong>${m.answer}</strong>
      <small>სწორი: ${m.correct}</small>
      <button class="grammar-replay-btn" onclick="replayGrammarMistake('${m.date}')">Replay</button>
    </div>`).join("")}
  </div>`;
}
function replayGrammarMistake(date){
  grammarReplayMistake=(state.grammarMistakes||[]).find(m=>m.date===date)||null;
  if(!grammarReplayMistake){ showToast("Replay ჩანაწერი ვერ მოიძებნა"); return; }
  renderGrammarExercise();
}
function finishGrammarReplay(){
  grammarReplayMistake=null;
  renderGrammarExercise();
}
function answerGrammarExercise(btn,answer){
  if(grammarAnswered) return;
  grammarAnswered=true;
  const pool=getGrammarPool();
  const ex=grammarReplayMistake ? getExerciseFromMistake(grammarReplayMistake) : pool[state.grammarExerciseIdx % pool.length];
  const ok=answer===ex.correct;
  document.querySelectorAll("#grammar-practice-area .quiz-opt").forEach(b=>{
    b.disabled=true;
    if(b.textContent.trim()===ex.correct) b.classList.add("correct");
    else if(b===btn&&!ok) b.classList.add("wrong");
  });
  const explain=document.getElementById("grammar-explain");
  if(explain){
    explain.classList.add("show");
    explain.textContent=(ok?"სწორია. ":"სწორი პასუხი: "+ex.correct+". ")+ex.explain;
  }
  if(grammarReplayMistake && ok){
    state.grammarMistakes=(state.grammarMistakes||[]).filter(m=>m.date!==grammarReplayMistake.date);
    saveState();
    showToast("Replay სწორად გაიარე — შეცდომა history-დან მოიხსნა ✅");
  } else if(!ok){
    state.grammarMistakes.push({date:new Date().toISOString(),topic:ex.topic,level:ex.level,question:ex.question,options:[...ex.options],answer,correct:ex.correct,explain:ex.explain});
    state.grammarMistakes=state.grammarMistakes.slice(-80);
    saveState();
  }
  if(ok) addXP(4,false);
  document.getElementById("grammar-next")?.classList.add("show");
}
function nextGrammarExercise(){
  state.grammarExerciseIdx=(state.grammarExerciseIdx||0)+1;
  saveState();
  renderGrammarExercise();
}

// ────────────────────────────────────────────
// FLASHCARDS — SRS-DRIVEN
// ────────────────────────────────────────────
let flashWords=[], flashIdx=0, isFlipped=false, flashPoolSignature="";

function getFlashPool(){
  const cat=state.flashCategory||"all";
  const f=w=>cat==="all" ? true : (VOCAB_LEVELS.slice(1).includes(cat)?w.level===cat:w.cat===cat);
  return buildStudyPool(f, 8);
}

function renderFlashcard(){
  const filterEl=document.getElementById("flash-filters");
  if(filterEl&&!filterEl.children.length){
    filterEl.innerHTML=[["all","ყველა"],...VOCAB_LEVELS.slice(1).map(l=>[l,l])].map(([v,l])=>
      `<button class="vfb-btn ${v==="all"?"active":""}" data-ff="${v}" onclick="setFlashFilter('${v}')">${l}</button>`).join("");
  }
  const reviewCount=getReviewWords().length;
  const di=document.getElementById("flash-due-info");
  if(di) di.textContent=reviewCount>0?`🔄 ${reviewCount} სიტყვა გასამეორებელია`:"✨ ყველა განმეორებულია!";

  const signature=state.flashCategory||"all";
  if(!flashWords.length || flashPoolSignature!==signature){
    flashWords=getFlashPool();
    flashIdx=0;
    flashPoolSignature=signature;
  }
  if(!flashWords.length){
    document.getElementById("flashcard-area").innerHTML=`<div style="text-align:center;padding:40px;color:var(--text2);">
      <div style="font-size:3rem;margin-bottom:12px;">✨</div>
      <div style="font-size:1rem;font-weight:600;">გასამეორებელი სიტყვა არ არის!</div>
      <button class="primary-btn" style="margin-top:16px;" onclick="startLearningSession()">🚀 სწავლის დაწყება</button></div>`;
    return;
  }
  if(flashIdx>=flashWords.length) flashIdx=0;
  isFlipped=false;
  const w=flashWords[flashIdx];
  const srs=getSRSData(w.de);
  const pct=flashWords.length?(flashIdx/flashWords.length)*100:0;
  const deText=normalizeWordDisplay(w);
  document.getElementById("flashcard-area").innerHTML=`
    <div class="flashcard-progress-bar"><div class="flashcard-progress-fill" style="width:${pct}%"></div></div>
    <div class="fc-counter">${flashIdx+1}/${flashWords.length} ${isDue(w)?'<span class="srs-due-badge">DUE</span>':''}</div>
    <div class="flashcard-scene" id="fc-scene" onclick="flipCard()">
      <div class="flashcard-inner">
        <div class="flashcard-face flashcard-front">
          <div class="fc-category">${w.cat}</div>
          <div class="fc-de">${deText}</div>
          <div class="fc-phonetic">${w.phonetic}</div>
          <div class="fc-hint">შეეხეთ / Space — გადატრიალება</div>
        </div>
        <div class="flashcard-face flashcard-back">
          <div class="fc-category">${w.level}</div>
          <div class="fc-ka">${w.ka}</div>
          <div class="fc-phonetic">${w.phonetic}</div>
          ${w.example?`<div class="fc-example">"${w.example}"</div>`:""}
          <button class="learn-audio-btn" style="margin-top:12px;" onclick="event.stopPropagation();speak('${deText.replace(/'/g,"\\'")}')">🔊</button>
        </div>
      </div>
    </div>
    <div class="flashcard-actions">
      <button class="fc-btn hard" onclick="nextFlash('hard')">😓 რთული<br><small>← ან 1</small></button>
      <button class="fc-btn ok" onclick="nextFlash('ok')">😐 ასე-ისე<br><small>↑ ან 2</small></button>
      <button class="fc-btn easy" onclick="nextFlash('easy')">😊 ადვილი<br><small>→ ან 3</small></button>
    </div>
    <div class="fc-keyboard-hint">⌨️ Space=გადატრ. · 1=რთ. · 2=ასე · 3=ადვ.</div>
    <div style="font-size:0.68rem;color:var(--text3);text-align:center;margin-top:4px;">SRS: ${srs.reps} გამ. · ${srs.interval||0}დ. ინტ.</div>`;
}
function flipCard(){ document.getElementById("fc-scene")?.classList.toggle("flipped"); isFlipped=!isFlipped; }
function nextFlash(rating){
  const rMap={hard:0,ok:1,easy:2}, xpMap={hard:2,ok:5,easy:10};
  const current=flashWords[flashIdx];
  addXP(xpMap[rating],false);
  updateSRS(current,rMap[rating]);
  markDailyPractice(current);
  if(rating==="hard"){
    flashWords.splice(flashIdx+1,0,current);
    flashIdx = Math.min(flashIdx+1, flashWords.length-1);
  } else {
    flashWords=[];
    flashPoolSignature="";
    flashIdx=0;
  }
  isFlipped=false; renderFlashcard();
}
function setFlashFilter(v){
  state.flashCategory=v; flashIdx=0; flashWords=[]; flashPoolSignature="";
  document.querySelectorAll("[data-ff]").forEach(b=>b.classList.toggle("active",b.dataset.ff===v));
  renderFlashcard();
}

// ────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ────────────────────────────────────────────
function handleKeyboard(e){
  const pg=document.querySelector(".page.active");
  if(!pg||pg.id!=="page-flash") return;
  if(e.target.tagName==="INPUT") return;
  if(e.code==="Space"){ e.preventDefault(); flipCard(); }
  else if(e.key==="1"&&isFlipped) nextFlash("hard");
  else if(e.key==="2"&&isFlipped) nextFlash("ok");
  else if(e.key==="3"&&isFlipped) nextFlash("easy");
}

// ────────────────────────────────────────────
// QUIZ — LEARNED WORDS ONLY
// ────────────────────────────────────────────
let quizSet=[], quizIdx=0, quizScore=0, quizAnswered=false, quizSessionAwarded=false;

function renderQuiz(){
  quizSessionAwarded=false;
  const typeSel=document.getElementById("quiz-types");
  if(typeSel&&!typeSel.children.length){
    typeSel.innerHTML=[["de-ka","DE → KA"],["ka-de","KA → DE"],["article","სტატია"]].map(([v,l])=>
      `<button class="qts-btn ${v==="de-ka"?"active":""}" data-qt="${v}" onclick="setQuizType('${v}')">${l}</button>`).join("");
  }
  const pool=getLearnedVocab().filter(w=>!state.difficultWords.includes(getWordId(w)));
  if(pool.length<4){
    document.getElementById("quiz-area").innerHTML=`<div class="quiz-no-words">
      <div style="font-size:2.5rem;margin-bottom:12px;">📚</div>
      <strong>კვიზი ჯერ მიუწვდომელია</strong><br><br>
      საჭიროა მინ. <strong>4 ნასწავლი სიტყვა</strong>.<br>ახლა: <strong>${pool.length}</strong><br><br>
      <button class="primary-btn" onclick="startLearningSession()">🚀 სწავლის დაწყება</button></div>`;
    return;
  }
  quizSet=pool.sort(()=>Math.random()-0.5).slice(0,Math.min(15,pool.length));
  quizIdx=0; quizScore=0; quizAnswered=false;
  renderQuizQuestion();
}
function setQuizType(t){
  document.querySelectorAll("[data-qt]").forEach(b=>b.classList.toggle("active",b.dataset.qt===t));
  state.quizType=t; renderQuiz();
}
function renderQuizQuestion(){
  const area=document.getElementById("quiz-area");
  if(quizIdx>=quizSet.length){
    const pct=Math.round((quizScore/quizSet.length)*100);
    area.innerHTML=`<div class="quiz-card"><div class="quiz-result">
      <div class="quiz-result-emoji">${pct>=80?"🎉":pct>=50?"👍":"📚"}</div>
      <div class="quiz-result-score">${pct}%</div>
      <div class="quiz-result-msg">${quizScore}/${quizSet.length} სწორი</div>
      <button class="quiz-restart" onclick="renderQuiz()">🔁 ხელახლა</button>
    </div></div>`;
    if(!quizSessionAwarded){
      quizSessionAwarded = true;
      if(pct===100){ state.perfectQuiz=(state.perfectQuiz||0)+1; }
      state.testsCompleted++;
      addXP(quizScore*8,false);
      saveState();
      checkAchievements();
    }
    return;
  }
  const w=quizSet[quizIdx], qt=state.quizType||"de-ka";
  const pool=getLearnedVocab().filter(x=>!state.difficultWords.includes(getWordId(x)));
  const pct=(quizIdx/quizSet.length)*100;
  let question,correct,options;
  if(qt==="de-ka"){
    question=normalizeWordDisplay(w); correct=w.ka;
    options=shuffle([w.ka,...getWrongAnswers(w,"ka",pool)]);
  } else if(qt==="ka-de"){
    question=w.ka; correct=w.de;
    options=shuffle([w.de,...getWrongAnswers(w,"de",pool)]);
  } else {
    question=w.de; correct=w.article||"—";
    options=["der","die","das","—"];
  }
  area.innerHTML=`<div class="quiz-card">
    <div class="quiz-progress">
      <div class="quiz-prog-bar"><div class="quiz-prog-fill" style="width:${pct}%"></div></div>
      <div class="quiz-prog-text">${quizIdx+1}/${quizSet.length}</div>
    </div>
    <div class="quiz-question">${question}</div>
    <div class="quiz-hint">${qt==="de-ka"?"🔊 "+w.phonetic:qt==="article"?"სწორი სტატია?":"გერმანულად?"}</div>
    <div class="quiz-options">${options.map(o=>`<button class="quiz-opt" onclick="answerQuiz(this,'${o.replace(/'/g,"\\'")}','${correct.replace(/'/g,"\\'")}')"> ${o}</button>`).join("")}</div>
    <div class="quiz-feedback" id="quiz-fb"></div>
    <button class="quiz-next-btn" id="quiz-next" onclick="nextQuiz()">შემდეგი →</button>
  </div>`;
}
function getWrongAnswers(w,field,pool){
  return [...new Set(
    pool.filter(x=>getWordId(x)!==getWordId(w) && x[field] && x[field]!==w[field])
      .map(x=>x[field])
  )].sort(()=>Math.random()-0.5).slice(0,3);
}
function shuffle(a){ return a.sort(()=>Math.random()-0.5); }
function answerQuiz(btn,answer,correct){
  if(quizAnswered) return; quizAnswered=true;
  const current=quizSet[quizIdx];
  const ok=answer===correct;
  document.querySelectorAll("#quiz-area .quiz-opt").forEach(b=>{
    b.disabled=true;
    if(b.textContent.trim()===correct) b.classList.add("correct");
    else if(b===btn&&!ok) b.classList.add("wrong");
  });
  const fb=document.getElementById("quiz-fb");
  fb.className="quiz-feedback show "+(ok?"ok":"bad");
  fb.textContent=ok?`✅ სწორია! +8 XP`:`❌ სწორი: ${correct}`;
  markDailyPractice(current);
  if(ok) quizScore++;
  document.getElementById("quiz-next").classList.add("show");
}
function nextQuiz(){ quizIdx++; quizAnswered=false; renderQuizQuestion(); }

// ────────────────────────────────────────────
// AUDIO PRACTICE — LISTENING & SPEAKING
// ────────────────────────────────────────────
let audioCurrent=null, audioAnswered=false;

function getAudioPool(){
  const learned=getLearnedVocab().filter(w=>!state.difficultWords.includes(getWordId(w)));
  return learned.length>=4 ? learned : VOCABULARY;
}
function pickAudioWord(){
  const pool=getAudioPool();
  if(!pool.length) return null;
  return shuffle([...pool])[0];
}
function setAudioMode(mode){
  state.audioMode=mode;
  audioCurrent=null;
  saveState();
  renderAudioPractice();
}
function renderAudioPractice(){
  const area=document.getElementById("audio-practice-area");
  if(!area) return;
  const mode=state.audioMode||"listen";
  area.innerHTML=`<div class="audio-practice-wrap">
    <div class="audio-mode-tabs">
      <button class="qts-btn ${mode==="listen"?"active":""}" onclick="setAudioMode('listen')">🎧 მოსმენა</button>
      <button class="qts-btn ${mode==="speak"?"active":""}" onclick="setAudioMode('speak')">🎙️ მეტყველება</button>
    </div>
    <div id="audio-mode-area"></div>
  </div>`;
  if(mode==="speak") renderSpeakingPractice();
  else renderListeningPractice();
}
function renderListeningPractice(){
  const area=document.getElementById("audio-mode-area");
  const pool=getAudioPool();
  if(!area) return;
  if(pool.length<4){
    area.innerHTML=`<div class="quiz-no-words"><strong>მოსმენის რეჟიმისთვის საჭიროა მინ. 4 სიტყვა.</strong><br><br><button class="primary-btn" onclick="startLearningSession()">სწავლის დაწყება</button></div>`;
    return;
  }
  audioCurrent=audioCurrent && pool.some(w=>getWordId(w)===getWordId(audioCurrent)) ? audioCurrent : pickAudioWord();
  audioAnswered=false;
  const options=shuffle([audioCurrent.ka,...getWrongAnswers(audioCurrent,"ka",pool)]);
  area.innerHTML=`<div class="audio-card">
    <div class="grammar-practice-head">
      <div class="grammar-practice-title">🎧 მოისმინე და აირჩიე მნიშვნელობა</div>
      <span class="grammar-practice-level">${audioCurrent.level}</span>
    </div>
    <button class="learn-audio-btn" onclick="speak('${normalizeWordDisplay(audioCurrent).replace(/'/g,"\\'")}')">🔊 სიტყვის მოსმენა</button>
    <div class="quiz-hint">${audioCurrent.phonetic}</div>
    <div class="quiz-options">${options.map(o=>`<button class="quiz-opt" onclick="answerListening(this,'${o.replace(/'/g,"\\'")}')">${o}</button>`).join("")}</div>
    <div class="quiz-feedback" id="listening-fb"></div>
    <button class="quiz-next-btn" id="listening-next" onclick="nextListening()">შემდეგი →</button>
  </div>`;
}
function answerListening(btn,answer){
  if(audioAnswered) return;
  audioAnswered=true;
  const ok=answer===audioCurrent.ka;
  document.querySelectorAll("#audio-mode-area .quiz-opt").forEach(b=>{
    b.disabled=true;
    if(b.textContent.trim()===audioCurrent.ka) b.classList.add("correct");
    else if(b===btn&&!ok) b.classList.add("wrong");
  });
  const fb=document.getElementById("listening-fb");
  fb.className="quiz-feedback show "+(ok?"ok":"bad");
  fb.textContent=ok?`სწორია: ${normalizeWordDisplay(audioCurrent)} · +6 XP`:`სწორია: ${normalizeWordDisplay(audioCurrent)} — ${audioCurrent.ka}`;
  if(ok) addXP(6,false);
  updateSRS(audioCurrent, ok?1:0, false);
  markDailyPractice(audioCurrent);
  document.getElementById("listening-next")?.classList.add("show");
}
function nextListening(){ audioCurrent=pickAudioWord(); renderListeningPractice(); }

function renderSpeakingPractice(){
  const area=document.getElementById("audio-mode-area");
  if(!area) return;
  audioCurrent=audioCurrent || pickAudioWord();
  if(!audioCurrent){
    area.innerHTML=`<div class="quiz-no-words">სიტყვები ვერ მოიძებნა.</div>`;
    return;
  }
  area.innerHTML=`<div class="audio-card">
    <div class="grammar-practice-head">
      <div class="grammar-practice-title">🎙️ წარმოთქვი გერმანულად</div>
      <span class="grammar-practice-level">${audioCurrent.level}</span>
    </div>
    <div class="audio-word">${normalizeWordDisplay(audioCurrent)}</div>
    <div class="audio-meta">${audioCurrent.phonetic} · ${audioCurrent.ka}</div>
    <div class="audio-actions">
      <button class="learn-audio-btn" onclick="speak('${normalizeWordDisplay(audioCurrent).replace(/'/g,"\\'")}')">🔊 ნიმუში</button>
      <button class="primary-btn" onclick="startSpeechPractice()">🎙️ ჩაწერა</button>
      <button class="learn-nav-btn prev" style="flex:0 0 auto;" onclick="nextSpeaking()">შემდეგი</button>
    </div>
    <input class="audio-input" id="speaking-input" placeholder="თუ მიკროფონი არ მუშაობს, ჩაწერე რაც წარმოთქვი..." onkeydown="if(event.key==='Enter') checkSpeakingInput()">
    <button class="primary-btn" onclick="checkSpeakingInput()">შემოწმება</button>
    <div class="speech-result" id="speech-result">მეტყველების ამოცნობა ბრაუზერზეა დამოკიდებული; fallback ველი ყოველთვის მუშაობს.</div>
    <div id="speech-history">${renderSpeechHistory()}</div>
  </div>`;
}
function normalizeSpeechText(text){
  return (text||"").toLowerCase()
    .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss")
    .replace(/\b(der|die|das)\b/g,"")
    .replace(/[^a-z0-9]+/g,"")
    .trim();
}
function levenshtein(a,b){
  const dp=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++) dp[i][0]=i;
  for(let j=0;j<=b.length;j++) dp[0][j]=j;
  for(let i=1;i<=a.length;i++){
    for(let j=1;j<=b.length;j++){
      dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    }
  }
  return dp[a.length][b.length];
}
function similarityScore(spoken,target){
  const a=normalizeSpeechText(spoken), b=normalizeSpeechText(target);
  if(!a||!b) return 0;
  if(a===b) return 100;
  const dist=levenshtein(a,b);
  const edit=Math.max(0,1-dist/Math.max(a.length,b.length))*100;
  const contains=(a.includes(b)||b.includes(a))?86:0;
  return Math.round(Math.max(edit,contains));
}
const IPA_TIP_RULES=[
  {name:"ich-Laut [ç]", ipa:/ç/, de:/ch/i, tip:w=>`${normalizeWordDisplay(w)}: IPA-ში [ç] ჩანს — ეს რბილი ich-Laut-ია, ენის შუა ნაწილი სასასთან ახლოს მიიტანე.`},
  {name:"ach-Laut [x]", ipa:/x/, de:/ch/i, tip:w=>`${normalizeWordDisplay(w)}: [x] უფრო ხისტი ach-Laut-ია, ქართულ 'ხ'-ს უახლოვდება.`},
  {name:"Umlaut ü [y]", ipa:/y|ʏ/, de:/ü/i, tip:w=>`${normalizeWordDisplay(w)}: ü-სთვის თქვი 'ი', მაგრამ ტუჩები 'უ'-სავით მომრგვალე.`},
  {name:"Umlaut ö [ø/œ]", ipa:/ø|œ/, de:/ö/i, tip:w=>`${normalizeWordDisplay(w)}: ö-სთვის თქვი 'ე', ტუჩები კი მომრგვალებული დატოვე.`},
  {name:"ä [ɛ]", ipa:/ɛ/, de:/ä/i, tip:w=>`${normalizeWordDisplay(w)}: ä ხშირად ღია 'ე'-ს ჰგავს, არა ჩვეულებრივ 'ა'-ს.`},
  {name:"ei [aɪ]", ipa:/aɪ/, de:/ei/i, tip:w=>`${normalizeWordDisplay(w)}: ei იკითხება დაახლოებით 'აი'.`},
  {name:"eu/äu [ɔɪ]", ipa:/ɔɪ|ɔʏ/, de:/eu|äu/i, tip:w=>`${normalizeWordDisplay(w)}: eu/äu იკითხება დაახლოებით 'ოი'.`},
  {name:"ie [iː]", ipa:/iː/, de:/ie/i, tip:w=>`${normalizeWordDisplay(w)}: ie ჩვეულებრივ გრძელი 'ი'-ა, გააგრძელე ხმოვანი.`},
  {name:"sch [ʃ]", ipa:/ʃ/, de:/sch|^sp|^st/i, tip:w=>`${normalizeWordDisplay(w)}: [ʃ] არის 'შ'; სიტყვის დასაწყისში sp/st ხშირად 'შპ/შტ' ჟღერს.`},
  {name:"z [ts]", ipa:/ts/, de:/z/i, tip:w=>`${normalizeWordDisplay(w)}: z გერმანულად [ts]-ია, ქართულ 'ც'-ს ჰგავს.`},
  {name:"ng [ŋ]", ipa:/ŋ/, de:/ng/i, tip:w=>`${normalizeWordDisplay(w)}: ng-ში [ŋ] ცალკე 'გ'-ად არ გაამაგრო; ხმა ცხვირიდან რბილად დასრულდეს.`},
  {name:"r [ʁ/ɐ]", ipa:/ʁ|ɐ/, de:/r/i, tip:w=>`${normalizeWordDisplay(w)}: r ხშირად ყელის [ʁ] ან სიტყვის ბოლოს სუსტი [ɐ]-ა; ზედმეტად ქართული 'რ' არ გააბრტყელო.`},
  {name:"long vowel", ipa:/ː/, de:/./, tip:w=>`${normalizeWordDisplay(w)}: IPA-ში [ː] გრძელი ხმოვანია — ხმოვანი ოდნავ გაახანგრძლივე.`},
];
function pronunciationTips(spoken,word){
  const tips=[];
  const target=normalizeWordDisplay(word);
  const t=target.toLowerCase();
  const ipa=(word?.phonetic||"").toLowerCase();
  const s=(spoken||"").toLowerCase();
  tips.push(`სამიზნე IPA: ${word?.phonetic||"—"}`);
  IPA_TIP_RULES.forEach(rule=>{
    if(tips.length>=4) return;
    if(rule.ipa.test(ipa) || rule.de.test(t)) tips.push(rule.tip(word));
  });
  if(t.includes("ß")) tips.push(`${target}: ß გრძელი/მკვეთრი 'ს'-ია და ss-სავით იკითხება.`);
  if(t.includes("w") && !s.includes("v")) tips.push(`${target}: w გერმანულად [v]-ს უახლოვდება.`);
  if(!tips.length) tips.push("სცადე ნელა: ჯერ მარცვლებად, შემდეგ მთელი სიტყვა ბუნებრივ ტემპში.");
  return tips.slice(0,3);
}
function renderSpeechHistory(){
  const items=(state.speakingHistory||[]).slice(-4).reverse();
  if(!items.length) return "";
  return `<div class="speech-history">
    <div class="grammar-history-title">ბოლო speaking მცდელობები</div>
    ${items.map(i=>`<div class="speech-history-item"><span>${i.target}</span><strong>${i.score}%</strong><small>${i.spoken||"ცარიელი"}</small></div>`).join("")}
  </div>`;
}
function finishSpeakingAttempt(spoken){
  const result=document.getElementById("speech-result");
  const target=normalizeWordDisplay(audioCurrent);
  const score=similarityScore(spoken,target);
  const ok=score>=78;
  const tips=pronunciationTips(spoken,audioCurrent);
  if(result){
    result.className="speech-result "+(ok?"ok":"bad");
    result.innerHTML=`<div><strong>${ok?"კარგია":"კიდევ სცადე"} · ${score}%</strong></div>
      <div>ამოცნობილია: "${spoken||"—"}" · სამიზნე: ${target}</div>
      <div class="speech-meter"><div class="speech-meter-fill" style="width:${score}%"></div></div>
      <ul class="speech-tips">${tips.map(t=>`<li>${t}</li>`).join("")}</ul>`;
  }
  if(ok) addXP(score>=92?10:7,false);
  state.speakingHistory.push({date:new Date().toISOString(),target,spoken,score});
  state.speakingHistory=state.speakingHistory.slice(-50);
  updateSRS(audioCurrent, ok?1:0, false);
  markDailyPractice(audioCurrent);
  const hist=document.getElementById("speech-history");
  if(hist) hist.innerHTML=renderSpeechHistory();
}
function checkSpeakingInput(){
  const val=document.getElementById("speaking-input")?.value||"";
  finishSpeakingAttempt(val);
}
function startSpeechPractice(){
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  const result=document.getElementById("speech-result");
  if(!SpeechRecognition){
    if(result){ result.className="speech-result bad"; result.textContent="ამ ბრაუზერში speech recognition მიუწვდომელია. გამოიყენე ტექსტის ველი."; }
    return;
  }
  const rec=new SpeechRecognition();
  rec.lang="de-DE";
  rec.interimResults=false;
  rec.maxAlternatives=1;
  if(result){ result.className="speech-result"; result.textContent="გისმენ..."; }
  rec.onresult=e=>{
    const transcript=e.results?.[0]?.[0]?.transcript||"";
    const input=document.getElementById("speaking-input");
    if(input) input.value=transcript;
    finishSpeakingAttempt(transcript);
  };
  rec.onerror=()=>{
    if(result){ result.className="speech-result bad"; result.textContent="მიკროფონის ამოცნობა ვერ მოხერხდა. გამოიყენე ტექსტის ველი."; }
  };
  rec.start();
}
function nextSpeaking(){ audioCurrent=pickAudioWord(); renderSpeakingPractice(); }

// ────────────────────────────────────────────
// TESTS — LEARNED WORDS ONLY
// ────────────────────────────────────────────
function renderTests(){
  const learnedPool = getLearnedVocab().filter(w=>!state.difficultWords.includes(getWordId(w)));
  const lc=learnedPool.length;
  const tests=[
    {icon:"📝",name:"A1 ტესტი",desc:"20 კითხვა.",level:"A1",min:4},
    {icon:"📋",name:"A2 ტესტი",desc:"20 კითხვა.",level:"A2",min:8},
    {icon:"📗",name:"B1 ტესტი",desc:"20 კითხვა.",level:"B1",min:10},
    {icon:"📘",name:"B2 ტესტი",desc:"20 კითხვა.",level:"B2",min:15},
    {icon:"🧩",name:"შერეული",desc:"ყველა დონე. 20 კ.",level:"all",min:4},
    {icon:"🔊",name:"სტატიების ტ.",desc:"der/die/das. 20კ.",level:"article",min:8},
    {icon:"❤️",name:"ფავ. სიტყვები",desc:"შენი ფავორიტები.",level:"fav",min:4},
  ];
  const el=document.getElementById("test-list");
  if(lc<4){
    el.innerHTML=`<div class="test-no-words" style="grid-column:1/-1;padding:40px;text-align:center;background:var(--bg2);border:1px solid var(--border);border-radius:16px;">
      <div style="font-size:2rem;margin-bottom:12px;">📚</div>
      <strong>ტესტები ჯერ მიუწვდომელია</strong><br><br>
      საჭიროა მინ. 4 ნასწავლი სიტყვა.<br>ახლა: <strong>${lc}</strong><br><br>
      <button class="primary-btn" onclick="startLearningSession()">🚀 სწავლის დაწყება</button></div>`;
    return;
  }
  el.innerHTML=tests.map(t=>{
    const pool=t.level==="fav"?learnedPool.filter(w=>state.favoriteWords.includes(getWordId(w)))
      :t.level==="all"?learnedPool
      :t.level==="article"?learnedPool.filter(w=>w.article)
      :learnedPool.filter(w=>w.level===t.level);
    const avail=pool.length, locked=avail<t.min;
    return `<div class="test-item" onclick="${locked?`showToast('საჭიროა კიდევ ${t.min-avail} სიტყვა!')`:`startTest('${t.name}','${t.level}')`}">
      <div class="test-icon">${t.icon}</div>
      <div class="test-name">${t.name}${locked?" 🔒":""}</div>
      <div class="test-desc">${t.desc}</div>
      <div class="test-meta">
        <span class="lesson-badge badge-${t.level.split("-")[0].toLowerCase()==="all"?"a1":t.level.split("-")[0].toLowerCase()}">${t.level==="all"?"A1-C2":t.level}</span>
        <span style="font-size:0.72rem;color:var(--text3);">${avail} სიტ.</span>
      </div></div>`;
  }).join("");
}
function startTest(name,level){
  const learnedPool = getLearnedVocab().filter(w=>!state.difficultWords.includes(getWordId(w)));
  const pool=level==="fav"?learnedPool.filter(w=>state.favoriteWords.includes(getWordId(w)))
    :level==="all"?learnedPool
    :level==="article"?learnedPool.filter(w=>w.article)
    :learnedPool.filter(w=>w.level===level);
  if(pool.length<4){ showToast("ამ ტესტისთვის სიტყვა არ კმარა!"); return; }
  state.quizType=level==="article"?"article":"de-ka";
  quizSet=pool.sort(()=>Math.random()-0.5).slice(0,Math.min(20,pool.length));
  quizIdx=0; quizScore=0; quizAnswered=false;
  navigate("quiz");
  document.querySelectorAll("[data-qt]").forEach(b=>b.classList.toggle("active",b.dataset.qt===state.quizType));
  showToast(`"${name}" დაიწყო! 📝`);
  renderQuizQuestion();
}

// ────────────────────────────────────────────
// PHONETICS
// ────────────────────────────────────────────
const PHONETICS_DATA=[
  {symbol:"ʀ",de:"Rot, Regen",ka:"ყელის 'ღ' ბგერა"},
  {symbol:"ü [y]",de:"fünf, über, grün",ka:"'ი' + მომრგვ. ტუჩები"},
  {symbol:"ö [ø]",de:"schön, Österreich",ka:"'ე' + მომრგვ. ტუჩები"},
  {symbol:"ä [ɛ]",de:"Männer, Mädchen",ka:"ფართო 'ე' ბგერა"},
  {symbol:"ch [ç]",de:"ich, nicht, Milch",ka:"'ი'-ს შემდ.: 'ჰ'+ი"},
  {symbol:"ch [x]",de:"Bach, nach, Buch",ka:"'ა/ო/უ'-ს შემდ.: 'ხ'"},
  {symbol:"sch [ʃ]",de:"Schule, schön",ka:"ქართული 'შ'"},
  {symbol:"sp/st [ʃp/ʃt]",de:"sprechen, Stadt",ka:"სიტ. თავში: 'შპ'/'შტ'"},
  {symbol:"z [ts]",de:"zehn, Zeit",ka:"ქართული 'ც'"},
  {symbol:"w [v]",de:"Wasser, wohnen",ka:"ქართული 'ვ'"},
  {symbol:"ei [aɪ]",de:"ein, zwei, weiß",ka:"'ეი' დიფთ."},
  {symbol:"eu/äu [ɔɪ]",de:"neu, Häuser",ka:"'ოი' დიფთ."},
  {symbol:"ie [iː]",de:"die, viel, lieben",ka:"გრძელი 'ი'"},
  {symbol:"ß [s]",de:"Straße, Fuß",ka:"გრძელი 'ს' (=ss)"},
  {symbol:"ng [ŋ]",de:"singen, lang",ka:"ინგლ. 'ng'-ს მსგ."},
  {symbol:"r [ɐ]",de:"Mutter, aber",ka:"სუსტი 'ა' (სიტ. ბოლოს)"},
];
function renderPhonetics(){
  const el=document.getElementById("phonetics-content"); if(!el) return;
  el.innerHTML=`
    <div class="section-card">
      <div class="section-card-title">🔤 გერმანული სპეციფიური ბგერები</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;">
        ${PHONETICS_DATA.map(p=>`
          <div class="phonetic-card">
            <div class="phonetic-symbol" style="cursor:pointer;" onclick="speak('${p.de.split(',')[0].trim()}')">${p.symbol}</div>
            <div class="phonetic-info"><div class="de">${p.de}</div><div class="ka">${p.ka}</div></div>
          </div>`).join("")}
      </div>
    </div>
    <div class="section-card">
      <div class="section-card-title">📏 გრძელი vs მოკლე ხმოვნები</div>
      <table class="grammar-table">
        <tr><th>ხმოვ.</th><th>გრძელი</th><th>მოკლე</th></tr>
        <tr><td>a</td><td>Vater [aː]</td><td>Mann [a]</td></tr>
        <tr><td>e</td><td>Weg [eː]</td><td>Bett [ɛ]</td></tr>
        <tr><td>i</td><td>ihm [iː]</td><td>bin [ɪ]</td></tr>
        <tr><td>o</td><td>Ohr [oː]</td><td>Gott [ɔ]</td></tr>
        <tr><td>u</td><td>gut [uː]</td><td>und [ʊ]</td></tr>
      </table>
    </div>`;
}

// ────────────────────────────────────────────
// QUICK LESSONS
// ────────────────────────────────────────────
const LESSONS_DATA=[
  {num:1,title:"გამარჯობა",meta:"A1·10 სიტ.",level:"A1",cat:"მისალმება"},
  {num:2,title:"ოჯახი",meta:"A1·12 სიტ.",level:"A1",cat:"ოჯახი"},
  {num:3,title:"სახლი",meta:"A1·11 სიტ.",level:"A1",cat:"სახლი"},
  {num:4,title:"საჭმელ-სასმელი",meta:"A1·20 სიტ.",level:"A1",cat:"საჭმელ-სასმელი"},
  {num:5,title:"ფერები",meta:"A1·11 სიტ.",level:"A1",cat:"ფერები"},
  {num:6,title:"ტრანსპორტი",meta:"A2·8 სიტ.",level:"A2",cat:"ტრანსპორტი"},
];
function renderQuickLessons(){
  const el=document.getElementById("quick-lessons"); if(!el) return;
  el.innerHTML=LESSONS_DATA.map(l=>{
    const cw=VOCABULARY.filter(w=>w.cat===l.cat);
    const ld=cw.filter(w=>state.learnedWords.includes(getWordId(w))).length;
    const done=cw.length>0&&ld===cw.length;
    return `<div class="lesson-item" onclick="startLesson('${l.cat}')">
      <div class="lesson-num ${done?"done":""}">${done?"✓":l.num}</div>
      <div class="lesson-info">
        <div class="lesson-title">${l.title}</div>
        <div class="lesson-meta">${l.meta} · ${ld}/${cw.length} ნასწ.</div>
      </div>
      <span class="lesson-badge badge-${l.level.toLowerCase()}">${l.level}</span>
    </div>`;
  }).join("");
}
function startLesson(cat){
  const cw=VOCABULARY.filter(w=>w.cat===cat);
  learnWords=buildStudyPool(w=>w.cat===cat).slice(0, 6);
  if(!learnWords.length) learnWords=cw;
  learnIdx=0;
  navigate("learn"); renderLearnWord();
  showToast(`"${cat}" გაკვეთილი დაიწყო! 🚀`);
}

// ────────────────────────────────────────────
// ACHIEVEMENTS PAGE
// ────────────────────────────────────────────
function renderAchievements(){
  const el=document.getElementById("achievements-grid");
  if(!el||!ACHIEVEMENTS_DEF.length) return;
  el.innerHTML=ACHIEVEMENTS_DEF.map(a=>{
    const u=state.unlockedAchievements.includes(a.id);
    return `<div class="achievement-card ${u?"unlocked":"locked"}">
      <div class="achievement-icon">${a.icon}</div>
      <div class="achievement-name">${a.name}</div>
      <div class="achievement-desc">${a.desc}</div>
      ${a.xp>0?`<div class="achievement-xp">+${a.xp} XP</div>`:""}
      ${u?`<div style="font-size:0.7rem;color:var(--success);margin-top:4px;">✅ განბლოკილია</div>`:""}
    </div>`;
  }).join("");
}

// ────────────────────────────────────────────
// ADVANCED LEARNING MODES
// ────────────────────────────────────────────
function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}
function escapeAttr(value){ return escapeHtml(value).replace(/`/g,"&#096;"); }
function levelBadge(level){ return `<span class="lesson-badge badge-${String(level).toLowerCase()}">${level}</span>`; }
function formatShortDate(date){
  try{ return new Date(date).toLocaleDateString("ka-GE",{month:"short",day:"numeric"}); }
  catch(e){ return ""; }
}

const PLACEMENT_QUESTIONS=[
  {level:"A1",q:"აირჩიე სწორი ფორმა: Ich ___ Giorgi.",options:["bin","bist","ist","sind"],correct:"bin"},
  {level:"A1",q:"რომელი არტიკლია სწორი: ___ Haus?",options:["der","die","das"],correct:"das"},
  {level:"A2",q:"Akkusativ: Ich sehe ___ Mann.",options:["der","den","dem","des"],correct:"den"},
  {level:"A2",q:"სწორი წინადადება რომელია?",options:["Heute ich lerne Deutsch.","Heute lerne ich Deutsch.","Heute Deutsch ich lerne."],correct:"Heute lerne ich Deutsch."},
  {level:"B1",q:"Perfekt: Ich ___ das Buch gelesen.",options:["bin","habe","werde","wurde"],correct:"habe"},
  {level:"B1",q:"Konjunktiv II: Ich ___ gern mehr Zeit haben.",options:["werde","wurde","würde","war"],correct:"würde"},
  {level:"B2",q:"Passiv: Der Vertrag ___ morgen unterschrieben.",options:["wird","ist","hat","war"],correct:"wird"},
  {level:"C1",q:"რომელი კავშირი გამოხატავს დათმობას?",options:["obwohl","weil","damit","sobald"],correct:"obwohl"},
  {level:"C2",q:"რომელია ყველაზე ბუნებრივი ფორმულირება?",options:["Das Problem ist sehr wichtig.","Die Tragweite des Problems ist nicht zu unterschätzen.","Das Problem macht viel wichtig.","Problematisch wichtig ist es."],correct:"Die Tragweite des Problems ist nicht zu unterschätzen."}
];
function placementLevelFromScore(score){
  if(score<=2) return "A1";
  if(score<=4) return "A2";
  if(score<=5) return "B1";
  if(score<=6) return "B2";
  if(score<=8) return "C1";
  return "C2";
}
function startPlacementTest(){
  state.placementAnswers=[];
  state.placementDone=false;
  state.placementLevel="";
  saveState();
  renderPlacementTest();
}
function renderPlacementTest(){
  const el=document.getElementById("placement-area");
  if(!el) return;
  const answers=state.placementAnswers||[];
  const score=answers.filter(Boolean).length;
  if(state.placementDone){
    const level=state.placementLevel||placementLevelFromScore(score);
    el.innerHTML=`<div class="feature-card wide">
      <div class="feature-head"><div><div class="feature-title">შენი სავარაუდო დონეა ${level}</div><div class="feature-sub">${score}/${PLACEMENT_QUESTIONS.length} სწორი პასუხი</div></div>${levelBadge(level)}</div>
      <div class="placement-scale">${["A1","A2","B1","B2","C1","C2"].map(l=>`<span class="${l===level?"active":""}">${l}</span>`).join("")}</div>
      <div class="feature-actions">
        <button class="primary-btn" onclick="startLearningForLevel('${level}')">ამ დონით სწავლა</button>
        <button class="learn-nav-btn prev" onclick="startPlacementTest()">თავიდან გავლა</button>
      </div>
    </div>`;
    return;
  }
  const idx=answers.length;
  const q=PLACEMENT_QUESTIONS[idx];
  if(!q){ state.placementDone=true; state.placementLevel=placementLevelFromScore(score); saveState(); renderPlacementTest(); return; }
  el.innerHTML=`<div class="feature-card wide">
    <div class="feature-head"><div><div class="feature-title">კითხვა ${idx+1}/${PLACEMENT_QUESTIONS.length}</div><div class="feature-sub">Placement test · ${q.level}</div></div>${levelBadge(q.level)}</div>
    <div class="quiz-question">${q.q}</div>
    <div class="quiz-options">${q.options.map(o=>`<button class="quiz-opt" onclick="answerPlacement('${escapeAttr(o)}')">${o}</button>`).join("")}</div>
    <div class="feature-progress"><div style="width:${Math.round((idx/PLACEMENT_QUESTIONS.length)*100)}%"></div></div>
  </div>`;
}
function answerPlacement(answer){
  const idx=(state.placementAnswers||[]).length;
  const q=PLACEMENT_QUESTIONS[idx];
  if(!q) return;
  state.placementAnswers.push(answer===q.correct);
  if(state.placementAnswers.length>=PLACEMENT_QUESTIONS.length){
    const score=state.placementAnswers.filter(Boolean).length;
    state.placementDone=true;
    state.placementLevel=placementLevelFromScore(score);
    addXP(15,false);
  }
  saveState();
  renderPlacementTest();
}
function startLearningForLevel(level){
  learnSessionAwarded=false;
  learnWords=buildStudyPool(w=>w.level===level).slice(0,20);
  if(!learnWords.length) learnWords=buildStudyPool(()=>true).slice(0,20);
  learnIdx=0;
  navigate("learn");
  renderLearnWord();
  showToast(`${level} დონით სწავლის სესია დაიწყო`);
}

function getGrammarKey(ex){ return `${ex.topic}::${ex.question}`; }
function getGrammarReviewData(ex){
  const key=getGrammarKey(ex);
  return state.grammarReview?.[key] || {interval:0,due:null,ease:2.2,reps:0,last:false};
}
function isGrammarDue(ex){
  const d=getGrammarReviewData(ex);
  return !!d.due && new Date(d.due)<=new Date();
}
function getDueGrammarExercises(){
  return GRAMMAR_EXERCISES.filter(ex=>isGrammarDue(ex) || (state.grammarMistakes||[]).some(m=>m.question===ex.question));
}
function updateGrammarSRS(ex, ok){
  state.grammarReview=state.grammarReview||{};
  const key=getGrammarKey(ex);
  let data=getGrammarReviewData(ex);
  let interval=data.interval||0, ease=data.ease||2.2, reps=data.reps||0;
  if(ok){
    reps++;
    interval=reps===1?2:reps===2?5:Math.max(7,Math.round(interval*ease));
    ease=Math.min(3, ease+0.08);
  } else {
    reps=0;
    interval=1;
    ease=Math.max(1.4, ease-0.18);
  }
  const due=new Date();
  due.setDate(due.getDate()+interval);
  state.grammarReview[key]={topic:ex.topic,level:ex.level,question:ex.question,interval,ease,reps,due:due.toISOString(),last:ok};
  saveState();
}
function renderGrammarSrsSummary(){
  const due=getDueGrammarExercises();
  const total=Object.keys(state.grammarReview||{}).length;
  return `<div class="grammar-srs-summary">
    <div><strong>${due.length}</strong><span>grammar review due</span></div>
    <div><strong>${total}</strong><span>SRS-ში</span></div>
    <button class="primary-btn" onclick="startGrammarReview()">SRS review</button>
  </div>`;
}
let grammarReviewActive=false, grammarReviewIdx=0;
function startGrammarReview(){
  const due=getDueGrammarExercises();
  if(!due.length){ showToast("Grammar SRS-ში დღეს due სავარჯიშო არ არის"); return; }
  grammarReviewActive=true;
  grammarReviewIdx=0;
  grammarReplayMistake=null;
  renderGrammarExercise();
}
function renderGrammarExercise(){
  const area=document.getElementById("grammar-practice-area");
  if(!area) return;
  const pool=grammarReviewActive ? getDueGrammarExercises() : getGrammarPool();
  const ex=grammarReplayMistake ? getExerciseFromMistake(grammarReplayMistake) : pool[(grammarReviewActive?grammarReviewIdx:state.grammarExerciseIdx) % Math.max(1,pool.length)];
  if(!ex){
    grammarReviewActive=false;
    grammarReplayMistake=null;
    area.innerHTML=`<div class="grammar-practice-card">${renderGrammarSrsSummary()}<div class="grammar-history empty">სავარჯიშო ვერ მოიძებნა.</div></div>`;
    return;
  }
  grammarAnswered=false;
  const modeTitle=grammarReplayMistake?"შეცდომის replay":grammarReviewActive?"Grammar SRS review":"პრაქტიკული სავარჯიშო";
  area.innerHTML=`<div class="grammar-practice-card">
    ${renderGrammarSrsSummary()}
    <div class="grammar-topic-bar">
      ${getGrammarTopics().map(t=>`<button class="qts-btn ${state.grammarTopic===t||(!state.grammarTopic&&t==="all")?"active":""}" onclick="setGrammarTopic('${t.replace(/'/g,"\\'")}')">${t==="all"?"ყველა თემა":t}</button>`).join("")}
    </div>
    <div class="grammar-practice-head">
      <div class="grammar-practice-title">${modeTitle} · ${ex.topic}</div>
      <span class="grammar-practice-level">${ex.level}</span>
    </div>
    <div class="quiz-question">${ex.question}</div>
    <div class="quiz-options">${shuffle([...ex.options]).map(o=>`<button class="quiz-opt" onclick="answerGrammarExercise(this,'${o.replace(/'/g,"\\'")}')">${o}</button>`).join("")}</div>
    <div class="grammar-explain" id="grammar-explain">${ex.explain}</div>
    <button class="quiz-next-btn" id="grammar-next" onclick="${grammarReplayMistake?"finishGrammarReplay()":"nextGrammarExercise()"}">${grammarReplayMistake?"Replay დასრულება":grammarReviewActive?"შემდეგი review":"შემდეგი →"}</button>
    ${grammarReplayMistake||grammarReviewActive?`<button class="learn-nav-btn prev grammar-replay-exit" onclick="finishGrammarReplay()">რეჟიმიდან გამოსვლა</button>`:""}
    ${renderGrammarMistakeHistory()}
  </div>`;
}
function finishGrammarReplay(){
  grammarReplayMistake=null;
  grammarReviewActive=false;
  renderGrammarExercise();
}
function answerGrammarExercise(btn,answer){
  if(grammarAnswered) return;
  grammarAnswered=true;
  const pool=grammarReviewActive ? getDueGrammarExercises() : getGrammarPool();
  const ex=grammarReplayMistake ? getExerciseFromMistake(grammarReplayMistake) : pool[(grammarReviewActive?grammarReviewIdx:state.grammarExerciseIdx) % Math.max(1,pool.length)];
  const ok=answer===ex.correct;
  document.querySelectorAll("#grammar-practice-area .quiz-opt").forEach(b=>{
    b.disabled=true;
    if(b.textContent.trim()===ex.correct) b.classList.add("correct");
    else if(b===btn&&!ok) b.classList.add("wrong");
  });
  const explain=document.getElementById("grammar-explain");
  if(explain){
    explain.classList.add("show");
    explain.textContent=(ok?"სწორია. ":"სწორი პასუხი: "+ex.correct+". ")+ex.explain;
  }
  updateGrammarSRS(ex, ok);
  if(grammarReplayMistake && ok){
    state.grammarMistakes=(state.grammarMistakes||[]).filter(m=>m.date!==grammarReplayMistake.date);
    saveState();
    showToast("Replay სწორად გაიარე — შეცდომა history-დან მოიხსნა");
  } else if(!ok){
    state.grammarMistakes.push({date:new Date().toISOString(),topic:ex.topic,level:ex.level,question:ex.question,options:[...ex.options],answer,correct:ex.correct,explain:ex.explain});
    state.grammarMistakes=state.grammarMistakes.slice(-80);
    saveState();
  }
  if(ok) addXP(grammarReviewActive?6:4,false);
  document.getElementById("grammar-next")?.classList.add("show");
}
function nextGrammarExercise(){
  if(grammarReviewActive){
    grammarReviewIdx++;
    if(grammarReviewIdx>=getDueGrammarExercises().length){
      grammarReviewActive=false;
      showToast("Grammar SRS review დასრულდა");
    }
  } else {
    state.grammarExerciseIdx=(state.grammarExerciseIdx||0)+1;
  }
  saveState();
  renderGrammarExercise();
}

function shiftDailyGoalMonth(delta){
  state.dailyGoalMonthOffset=(parseInt(state.dailyGoalMonthOffset||0,10)||0)+delta;
  saveState();
  renderDailyGoal();
}
function resetDailyGoalMonth(){
  state.dailyGoalMonthOffset=0;
  saveState();
  renderDailyGoal();
}
function renderDailyGoal(){
  const el=document.getElementById("daily-goal");
  if(!el) return;
  const count=getTodayPracticeIds().length;
  const goal=Math.max(1, state.dailyGoal||10);
  const pct=Math.min(100, Math.round((count/goal)*100));
  const now=new Date();
  const view=new Date(now.getFullYear(), now.getMonth()+(parseInt(state.dailyGoalMonthOffset||0,10)||0), 1);
  const monthName=view.toLocaleDateString("ka-GE",{month:"long",year:"numeric"});
  const daysInMonth=new Date(view.getFullYear(), view.getMonth()+1, 0).getDate();
  const leadingBlanks=(view.getDay()+6)%7;
  const days=Array.from({length:leadingBlanks},()=>({empty:true}));
  for(let day=1; day<=daysInMonth; day++){
    const d=new Date(view.getFullYear(), view.getMonth(), day);
    const key=toDateKey(d);
    const done=(state.dailyPractice?.[key]?.length||0);
    const dayGoal=getGoalForDate(key);
    days.push({key, day, done, goal:dayGoal, met:done>=dayGoal, today:key===todayKey(), future:d>now});
  }
  const metDays=days.filter(d=>d.met).length;
  const weekStart=new Date(now);
  weekStart.setDate(now.getDate()-((now.getDay()+6)%7));
  const weekMet=Array.from({length:7},(_,i)=>{
    const d=new Date(weekStart); d.setDate(weekStart.getDate()+i);
    return isDailyGoalMet(toDateKey(d));
  }).filter(Boolean).length;
  el.innerHTML=`
    <div class="daily-goal-top">
      <div>
        <div class="daily-goal-title">🎯 დღიური მიზანი</div>
        <div class="daily-goal-sub">${count}/${goal} სიტყვა დღეს · კვირის challenge ${weekMet}/7</div>
      </div>
      <button class="daily-goal-action" onclick="startLearningSession()">სწავლა</button>
    </div>
    <div class="daily-goal-bar"><div class="daily-goal-fill" style="width:${pct}%"></div></div>
    <div class="daily-cal-head">
      <div class="month-controls">
        <button onclick="shiftDailyGoalMonth(-1)" title="წინა თვე">‹</button>
        <span>${monthName}</span>
        <button onclick="shiftDailyGoalMonth(1)" title="შემდეგი თვე">›</button>
        ${state.dailyGoalMonthOffset?`<button onclick="resetDailyGoalMonth()">დღეს</button>`:""}
      </div>
      <span>${metDays}/${daysInMonth} დღე შესრულებულია</span>
    </div>
    <div class="daily-calendar month-view">
      ${["ორ","სა","ოთ","ხუ","პა","შა","კვ"].map(w=>`<div class="daily-weekday">${w}</div>`).join("")}
      ${days.map(d=>d.empty?`<div class="daily-cal-day empty"></div>`:`<div class="daily-cal-day ${d.met?"met":d.done>0?"partial":""} ${d.today?"today":""} ${d.future?"future":""}" title="${d.key}: ${d.done}/${d.goal}"><div class="daily-cal-dot">${d.day}</div><div class="daily-cal-label">${d.done}/${d.goal}</div></div>`).join("")}
    </div>
    <div class="daily-goal-note">${pct>=100?"მიზანი შესრულებულია":"გააგრძელე: ყოველი უნიკალური სიტყვა დღიურ მიზანში ითვლება."}</div>`;
}

function getWeakTopics(){
  const counts={};
  (state.grammarMistakes||[]).forEach(m=>{ counts[m.topic]=(counts[m.topic]||0)+1; });
  return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
}
function renderWeakDashboard(){
  const el=document.getElementById("weak-dashboard-area");
  if(!el) return;
  const weakTopics=getWeakTopics();
  const dueGrammar=getDueGrammarExercises();
  const lowSpeech=(state.speakingHistory||[]).filter(i=>i.score<78).slice(-5).reverse();
  const lowWriting=(state.writingHistory||[]).filter(i=>i.score<78).slice(-5).reverse();
  const hardWords=state.difficultWords.map(findWord).filter(Boolean).slice(0,8);
  el.innerHTML=`<div class="feature-grid">
    <div class="feature-card"><div class="feature-title">რთული სიტყვები</div><div class="metric">${hardWords.length}</div><div class="feature-sub">${hardWords.map(w=>normalizeWordDisplay(w)).join(", ")||"ჯერ ცარიელია"}</div><button class="primary-btn" onclick="reviewWeakWords()">გამეორება</button></div>
    <div class="feature-card"><div class="feature-title">Grammar SRS due</div><div class="metric">${dueGrammar.length}</div><div class="feature-sub">${dueGrammar.slice(0,3).map(e=>e.topic).join(", ")||"დღეს due არ არის"}</div><button class="primary-btn" onclick="startGrammarReview()">Review</button></div>
    <div class="feature-card"><div class="feature-title">გრამატიკის შეცდომები</div>${weakTopics.length?weakTopics.map(([t,c])=>`<button class="weak-row" onclick="focusWeakGrammar('${t.replace(/'/g,"\\'")}')"><span>${t}</span><strong>${c}</strong></button>`).join(""):`<div class="feature-sub">შეცდომები ჯერ არ არის</div>`}</div>
    <div class="feature-card"><div class="feature-title">Pronunciation</div><div class="metric">${lowSpeech.length}</div><div class="feature-sub">${lowSpeech.map(i=>`${i.target} ${i.score}%`).join(", ")||"სუფთაა"}</div><button class="primary-btn" onclick="setAudioMode('speak');navigate('audio')">Speaking</button></div>
    <div class="feature-card"><div class="feature-title">Writing</div><div class="metric">${lowWriting.length}</div><div class="feature-sub">${lowWriting.map(i=>`${i.target} ${i.score}%`).join(", ")||"სუსტი პასუხი ჯერ არ არის"}</div><button class="primary-btn" onclick="navigate('writing')">Writing</button></div>
    <div class="feature-card"><div class="feature-title">შენიშვნები</div><div class="metric">${Object.keys(state.wordNotes||{}).length}</div><div class="feature-sub">პირადი მინიშნებები სიტყვებზე</div><button class="primary-btn" onclick="navigate('notes')">ნახვა</button></div>
  </div>`;
}
function reviewWeakWords(){
  learnSessionAwarded=false;
  learnWords=dedupeVocab([...state.difficultWords,...state.priorityWords,...state.reinforceWords].map(findWord).filter(Boolean)).slice(0,20);
  if(!learnWords.length){ showToast("რთული სიტყვები ჯერ არ არის"); return; }
  learnIdx=0;
  navigate("learn");
  renderLearnWord();
}
function focusWeakGrammar(topic){
  state.grammarTopic=topic;
  saveState();
  navigate("grammar");
}

const WRITING_PROMPTS=[
  {level:"A1",ka:"მე საქართველოდან ვარ.",de:"Ich komme aus Georgien.",hint:"kommen aus + ქვეყანა"},
  {level:"A1",ka:"დღეს გერმანულს ვსწავლობ.",de:"Heute lerne ich Deutsch.",hint:"V2: Heute + ზმნა + ich"},
  {level:"A2",ka:"შემიძლია ხვალ შეხვედრაზე მოსვლა.",de:"Ich kann morgen zum Termin kommen.",hint:"Modalverb + Infinitiv ბოლოში"},
  {level:"B1",ka:"რომ მეტი დრო მქონდეს, მეტს ვისწავლიდი.",de:"Wenn ich mehr Zeit hätte, würde ich mehr lernen.",hint:"Konjunktiv II"},
  {level:"B2",ka:"წერილი გუშინ დაიწერა.",de:"Der Brief wurde gestern geschrieben.",hint:"Präteritum Passiv"},
  {level:"C1",ka:"ამ გადაწყვეტილების შედეგები არ უნდა დავაკნინოთ.",de:"Die Folgen dieser Entscheidung sollten nicht unterschätzt werden.",hint:"Passiv + unterschätzen"},
  {level:"C2",ka:"მისი არგუმენტი ერთი შეხედვით დამაჯერებელია, მაგრამ საფუძვლიან ანალიზს ვერ უძლებს.",de:"Sein Argument wirkt auf den ersten Blick überzeugend, hält einer gründlichen Analyse jedoch nicht stand.",hint:"idiom: einer Analyse standhalten"}
];
function renderWritingPractice(){
  const el=document.getElementById("writing-area");
  if(!el) return;
  const idx=state.writingIdx%WRITING_PROMPTS.length;
  const p=WRITING_PROMPTS[idx];
  const hist=(state.writingHistory||[]).slice(-4).reverse();
  el.innerHTML=`<div class="feature-card wide">
    <div class="feature-head"><div><div class="feature-title">ქართულიდან გერმანულად</div><div class="feature-sub">${p.hint}</div></div>${levelBadge(p.level)}</div>
    <div class="writing-prompt">${p.ka}</div>
    <textarea class="practice-textarea" id="writing-input" placeholder="დაწერე გერმანულად..."></textarea>
    <div class="feature-actions"><button class="primary-btn" onclick="checkWritingAnswer()">შემოწმება</button><button class="learn-nav-btn prev" onclick="nextWritingPrompt()">შემდეგი</button></div>
    <div id="writing-feedback"></div>
  </div>
  <div class="feature-card wide"><div class="feature-title">ბოლო writing პასუხები</div>${hist.length?hist.map(h=>`<div class="history-row"><span>${escapeHtml(h.target)}</span><strong>${h.score}%</strong><small>${formatShortDate(h.date)}</small></div>`).join(""):`<div class="feature-sub">ისტორია ჯერ ცარიელია</div>`}</div>`;
}
function checkWritingAnswer(){
  const p=WRITING_PROMPTS[state.writingIdx%WRITING_PROMPTS.length];
  const val=document.getElementById("writing-input")?.value||"";
  const score=similarityScore(val,p.de);
  const ok=score>=78;
  state.writingHistory.push({date:new Date().toISOString(),prompt:p.ka,target:p.de,answer:val,score,level:p.level});
  state.writingHistory=state.writingHistory.slice(-80);
  if(ok) addXP(score>=92?12:8,false);
  saveState();
  const fb=document.getElementById("writing-feedback");
  if(fb) fb.innerHTML=`<div class="speech-result ${ok?"ok":"bad"}"><strong>${ok?"კარგია":"კიდევ დასახვეწია"} · ${score}%</strong><br>სწორი ვარიანტი: ${p.de}<br><span>${writingTip(val,p.de)}</span></div>`;
}
function writingTip(answer,target){
  const a=normalizeSpeechText(answer), t=normalizeSpeechText(target);
  if(!a) return "დაიწყე ზმნის პოზიციით და წინადადების ბირთვით.";
  if(!a.includes(t.slice(0,Math.min(5,t.length)))) return "შეადარე სიტყვების რიგი და ზმნის ფორმა.";
  return "ახლოს ხარ; გადაამოწმე არტიკლები, დაბოლოებები და დიდ-მცირე ასოები.";
}
function nextWritingPrompt(){ state.writingIdx=(state.writingIdx+1)%WRITING_PROMPTS.length; saveState(); renderWritingPractice(); }

const DICTATION_FALLBACKS=[
  {de:"Ich lerne jeden Tag Deutsch.",ka:"ყოველდღე ვსწავლობ გერმანულს.",level:"A1"},
  {de:"Könnten Sie das bitte wiederholen?",ka:"შეგიძლიათ გაიმეოროთ?",level:"A2"},
  {de:"Der Termin wurde auf morgen verschoben.",ka:"შეხვედრა ხვალისთვის გადაიდო.",level:"B1"},
  {de:"Die Entscheidung hängt von mehreren Faktoren ab.",ka:"გადაწყვეტილება რამდენიმე ფაქტორზეა დამოკიდებული.",level:"B2"},
  {de:"Diese Entwicklung lässt sich kaum rückgängig machen.",ka:"ამ განვითარებას ძნელად დააბრუნებ უკან.",level:"C1"}
];
function getDictationItems(){
  const phraseItems=(DAILY_PHRASES||[]).map(p=>({de:p.de,ka:p.ka,level:"A1",phonetic:p.phonetic}));
  return [...phraseItems,...DICTATION_FALLBACKS];
}
function renderDictationPractice(){
  const area=document.getElementById("audio-mode-area");
  if(!area) return;
  const items=getDictationItems();
  const item=items[state.dictationIdx%items.length];
  const hist=(state.dictationHistory||[]).slice(-4).reverse();
  area.innerHTML=`<div class="audio-card">
    <div class="grammar-practice-head"><div class="grammar-practice-title">Dictation · მოისმინე და დაწერე</div>${levelBadge(item.level)}</div>
    <div class="audio-meta">${item.ka}${item.phonetic?` · ${item.phonetic}`:""}</div>
    <button class="learn-audio-btn" onclick="speak('${item.de.replace(/'/g,"\\'")}')">🔊 მოსმენა</button>
    <input class="audio-input" id="dictation-input" placeholder="დაწერე რაც გაიგე..." onkeydown="if(event.key==='Enter') checkDictationAnswer()">
    <div class="feature-actions"><button class="primary-btn" onclick="checkDictationAnswer()">შემოწმება</button><button class="learn-nav-btn prev" onclick="nextDictation()">შემდეგი</button></div>
    <div id="dictation-feedback"></div>
    <div class="speech-history">${hist.map(h=>`<div class="speech-history-item"><span>${escapeHtml(h.target)}</span><strong>${h.score}%</strong><small>${escapeHtml(h.answer)}</small></div>`).join("")}</div>
  </div>`;
}
function checkDictationAnswer(){
  const item=getDictationItems()[state.dictationIdx%getDictationItems().length];
  const val=document.getElementById("dictation-input")?.value||"";
  const score=similarityScore(val,item.de);
  const ok=score>=82;
  state.dictationHistory.push({date:new Date().toISOString(),target:item.de,answer:val,score});
  state.dictationHistory=state.dictationHistory.slice(-80);
  if(ok) addXP(score>=94?10:7,false);
  saveState();
  const fb=document.getElementById("dictation-feedback");
  if(fb) fb.innerHTML=`<div class="speech-result ${ok?"ok":"bad"}"><strong>${score}%</strong><br>სწორი ტექსტი: ${item.de}</div>`;
}
function nextDictation(){ state.dictationIdx=(state.dictationIdx+1)%getDictationItems().length; saveState(); renderDictationPractice(); }
function renderAudioPractice(){
  const area=document.getElementById("audio-practice-area");
  if(!area) return;
  const mode=state.audioMode||"listen";
  area.innerHTML=`<div class="audio-practice-wrap">
    <div class="audio-mode-tabs">
      <button class="qts-btn ${mode==="listen"?"active":""}" onclick="setAudioMode('listen')">🎧 მოსმენა</button>
      <button class="qts-btn ${mode==="speak"?"active":""}" onclick="setAudioMode('speak')">🎙️ მეტყველება</button>
      <button class="qts-btn ${mode==="dictation"?"active":""}" onclick="setAudioMode('dictation')">✍️ Dictation</button>
    </div>
    <div id="audio-mode-area"></div>
  </div>`;
  if(mode==="speak") renderSpeakingPractice();
  else if(mode==="dictation") renderDictationPractice();
  else renderListeningPractice();
}
function syllablesForWord(word){
  const text=normalizeWordDisplay(word).replace(/^(der|die|das)\s+/i,"");
  if(!text) return [];
  const vowels="aeiouäöüAEIOUÄÖÜ";
  const parts=[];
  let start=0, sawVowel=false;
  for(let i=0;i<text.length-1;i++){
    if(vowels.includes(text[i])) sawVowel=true;
    if(!sawVowel || vowels.includes(text[i]) || !vowels.includes(text[i+1])) continue;
    let split=i;
    if(i>start+2 && text[i].toLowerCase()==="h" && text[i-1]?.toLowerCase()==="c") split=i-1;
    if(split>start+1){
      parts.push(text.slice(start, split));
      start=split;
      sawVowel=false;
    }
  }
  parts.push(text.slice(start));
  return parts.length>1 ? parts.filter(Boolean) : text.split(/[-\s]+/).filter(Boolean);
}
function renderSyllableFeedback(word){
  const syl=syllablesForWord(word);
  return `<div class="syllable-box"><span>მარცვლები</span>${syl.map((s,i)=>`<button onclick="speak('${s.replace(/'/g,"\\'")}',0.72)" title="მარცვლის მოსმენა">${i===0?"ˈ":""}${s}</button>`).join("")}</div>`;
}
function renderSpeakingPractice(){
  const area=document.getElementById("audio-mode-area");
  if(!area) return;
  audioCurrent=audioCurrent || pickAudioWord();
  if(!audioCurrent){ area.innerHTML=`<div class="quiz-no-words">სიტყვები ვერ მოიძებნა.</div>`; return; }
  const target=normalizeWordDisplay(audioCurrent);
  area.innerHTML=`<div class="audio-card">
    <div class="grammar-practice-head"><div class="grammar-practice-title">🎙️ წარმოთქვი გერმანულად</div>${levelBadge(audioCurrent.level)}</div>
    <div class="audio-word">${target}</div>
    <div class="audio-meta">${audioCurrent.phonetic} · ${audioCurrent.ka}</div>
    ${renderSyllableFeedback(audioCurrent)}
    <div class="audio-actions">
      <button class="learn-audio-btn" onclick="speak('${target.replace(/'/g,"\\'")}')">🔊 ნიმუში</button>
      <button class="primary-btn" onclick="startSpeechPractice()">🎙️ ჩაწერა</button>
      <button class="learn-nav-btn prev" style="flex:0 0 auto;" onclick="nextSpeaking()">შემდეგი</button>
    </div>
    <input class="audio-input" id="speaking-input" placeholder="თუ მიკროფონი არ მუშაობს, ჩაწერე რაც წარმოთქვი..." onkeydown="if(event.key==='Enter') checkSpeakingInput()">
    <button class="primary-btn" onclick="checkSpeakingInput()">შემოწმება</button>
    <div class="speech-result" id="speech-result">მეტყველების ამოცნობა ბრაუზერზეა დამოკიდებული; fallback ველი ყოველთვის მუშაობს.</div>
    <div id="speech-history">${renderSpeechHistory()}</div>
  </div>`;
}
function pronunciationTips(spoken,word){
  const tips=[];
  const target=normalizeWordDisplay(word);
  const t=target.toLowerCase();
  const ipa=(word?.phonetic||"").toLowerCase();
  const s=(spoken||"").toLowerCase();
  tips.push(`სამიზნე IPA: ${word?.phonetic||"—"}`);
  tips.push(`მარცვლებად: ${syllablesForWord(word).join(" · ")}`);
  IPA_TIP_RULES.forEach(rule=>{
    if(tips.length>=5) return;
    if(rule.ipa.test(ipa) || rule.de.test(t)) tips.push(rule.tip(word));
  });
  if(t.includes("ß")) tips.push(`${target}: ß ss-სავით იკითხება.`);
  if(t.includes("w") && !s.includes("v")) tips.push(`${target}: w გერმანულად [v]-ს უახლოვდება.`);
  return tips.slice(0,4);
}

const DIALOGUE_SCENARIOS=[
  {title:"ექიმთან",level:"A2",steps:[
    {bot:"Guten Tag, was fehlt Ihnen?",options:[{text:"Ich habe seit gestern Kopfschmerzen.",ok:true,tip:"სიმპტომი მკაფიოდ თქვი."},{text:"Ich bin Kopfschmerzen.",ok:false,tip:"haben + სიმპტომი."}]},
    {bot:"Haben Sie Fieber?",options:[{text:"Ja, ich habe leichtes Fieber.",ok:true,tip:"leichtes Fieber ბუნებრივია."},{text:"Ja, ich bin heiß.",ok:false,tip:"ადამიანზე ასე არ ითქმის."}]},
    {bot:"Ich verschreibe Ihnen ein Medikament.",options:[{text:"Wie oft soll ich es einnehmen?",ok:true,tip:"einnehmen = წამლის მიღება."},{text:"Wie viel essen ich es?",ok:false,tip:"წამალზე einnehmen."}]}
  ]},
  {title:"სამსახურში",level:"B1",steps:[
    {bot:"Können Sie den Bericht bis Freitag fertigstellen?",options:[{text:"Ja, ich schaffe das bis Freitag.",ok:true,tip:"schaffen = მოსწრება."},{text:"Ja, ich mache fertig bis Freitag.",ok:false,tip:"სიტყვების რიგი და ზმნა."}]},
    {bot:"Brauchen Sie Unterstützung?",options:[{text:"Ja, bei der Datenanalyse wäre Hilfe gut.",ok:true,tip:"bei + Dativ."},{text:"Ja, Hilfe ist gut bei Daten.",ok:false,tip:"უფრო ბუნებრივი ფორმულირება აირჩიე."}]}
  ]},
  {title:"მაღაზიაში",level:"A1",steps:[
    {bot:"Kann ich Ihnen helfen?",options:[{text:"Ja, ich suche eine Jacke.",ok:true,tip:"ich suche + Akkusativ."},{text:"Ja, ich suchen Jacke.",ok:false,tip:"ich suche."}]},
    {bot:"Welche Größe brauchen Sie?",options:[{text:"Ich brauche Größe M.",ok:true,tip:"მოკლე და ბუნებრივი."},{text:"Ich bin M.",ok:false,tip:"ზომაზე brauchen/tragen."}]}
  ]},
  {title:"აეროპორტში",level:"B1",steps:[
    {bot:"Ihr Flug hat Verspätung.",options:[{text:"Wie lange dauert die Verspätung ungefähr?",ok:true,tip:"Verspätung dauern."},{text:"Wie spät ist der Flug kaputt?",ok:false,tip:"Verspätung, nicht kaputt."}]},
    {bot:"Sie können am Schalter umbuchen.",options:[{text:"Wo befindet sich der Schalter?",ok:true,tip:"sich befinden ფორმალურია."},{text:"Wo ist machen anderes Ticket?",ok:false,tip:"umbuchen გამოიყენე."}]}
  ]}
];
function renderDialogues(){
  const el=document.getElementById("dialogues-area");
  if(!el) return;
  const scenario=DIALOGUE_SCENARIOS[state.dialogueScenario%DIALOGUE_SCENARIOS.length];
  const step=scenario.steps[state.dialogueStep];
  const hist=(state.dialogueHistory||[]).slice(-4).reverse();
  if(!step){
    el.innerHTML=`<div class="feature-card wide"><div class="feature-title">${scenario.title} დასრულდა</div><div class="feature-sub">შესანიშნავი პრაქტიკა რეალურ სიტუაციაში.</div><button class="primary-btn" onclick="restartDialogue()">თავიდან</button></div>`;
    return;
  }
  el.innerHTML=`<div class="scenario-tabs">${DIALOGUE_SCENARIOS.map((s,i)=>`<button class="qts-btn ${i===state.dialogueScenario?"active":""}" onclick="selectDialogue(${i})">${s.title}</button>`).join("")}</div>
  <div class="feature-card wide">
    <div class="feature-head"><div><div class="feature-title">${scenario.title}</div><div class="feature-sub">ნაბიჯი ${state.dialogueStep+1}/${scenario.steps.length}</div></div>${levelBadge(scenario.level)}</div>
    <div class="dialogue-bubble bot">${step.bot}</div>
    <div class="quiz-options">${step.options.map((o,i)=>`<button class="quiz-opt" onclick="answerDialogue(${i})">${o.text}</button>`).join("")}</div>
    <div id="dialogue-feedback"></div>
  </div>
  <div class="feature-card wide"><div class="feature-title">ბოლო დიალოგები</div>${hist.length?hist.map(h=>`<div class="history-row"><span>${h.scenario}</span><strong>${h.ok?"OK":"Review"}</strong><small>${formatShortDate(h.date)}</small></div>`).join(""):`<div class="feature-sub">ისტორია ჯერ ცარიელია</div>`}</div>`;
}
function selectDialogue(i){ state.dialogueScenario=i; state.dialogueStep=0; saveState(); renderDialogues(); }
function restartDialogue(){ state.dialogueStep=0; saveState(); renderDialogues(); }
function answerDialogue(i){
  const scenario=DIALOGUE_SCENARIOS[state.dialogueScenario%DIALOGUE_SCENARIOS.length];
  const step=scenario.steps[state.dialogueStep];
  const opt=step.options[i];
  state.dialogueHistory.push({date:new Date().toISOString(),scenario:scenario.title,answer:opt.text,ok:opt.ok});
  state.dialogueHistory=state.dialogueHistory.slice(-50);
  if(opt.ok) addXP(6,false);
  const fb=document.getElementById("dialogue-feedback");
  if(fb) fb.innerHTML=`<div class="speech-result ${opt.ok?"ok":"bad"}"><strong>${opt.ok?"კარგია":"სჯობს სხვა ფორმა"}</strong><br>${opt.tip}</div>`;
  state.dialogueStep++;
  saveState();
  setTimeout(renderDialogues,700);
}

const READING_TEXTS=[
  {id:"arbeit-zukunft",level:"C1",title:"Die Zukunft der Arbeit",text:"Die Arbeitswelt verändert sich rasant: Automatisierung übernimmt Routineaufgaben, während kreative Problemlösung und interkulturelle Kommunikation an Bedeutung gewinnen. Entscheidend ist nicht nur technisches Wissen, sondern die Fähigkeit, Wissen flexibel auf neue Situationen zu übertragen.",vocab:["rasant","Routineaufgaben","an Bedeutung gewinnen","übertragen"],questions:[
    {q:"რა ხდება Routineaufgaben-თან?",options:["ისინი ქრება მთლიანად","Automatisierung იღებს მათ ნაწილს","ისინი მხოლოდ ხელით სრულდება"],correct:"Automatisierung იღებს მათ ნაწილს"},
    {q:"ტექსტის მიხედვით რა არის გადამწყვეტი?",options:["მხოლოდ ტექნიკური ცოდნა","ცოდნის მოქნილი გამოყენება","მხოლოდ სისწრაფე"],correct:"ცოდნის მოქნილი გამოყენება"}
  ]},
  {id:"stadt-klima",level:"C2",title:"Städte und Klimaresilienz",text:"Klimaresiliente Städte setzen nicht allein auf technische Infrastruktur. Ebenso relevant sind soziale Netzwerke, transparente Verwaltung und die Bereitschaft, kurzfristige Bequemlichkeit zugunsten langfristiger Stabilität zu hinterfragen.",vocab:["Klimaresilienz","zugunsten","hinterfragen","Verwaltung"],questions:[
    {q:"რა არ კმარა კლიმატგამძლე ქალაქისთვის?",options:["მხოლოდ ტექნიკური ინფრასტრუქტურა","სოციალური ქსელები","გამჭვირვალე მართვა"],correct:"მხოლოდ ტექნიკური ინფრასტრუქტურა"},
    {q:"zugunsten რას ნიშნავს აქ?",options:["საზიანოდ","სასარგებლოდ","შემთხვევით"],correct:"სასარგებლოდ"}
  ]}
];
function renderReadingTexts(){
  const el=document.getElementById("reading-area");
  if(!el) return;
  el.innerHTML=READING_TEXTS.map((text,ti)=>`<div class="feature-card wide reading-card">
    <div class="feature-head"><div><div class="feature-title">${text.title}</div><div class="feature-sub">${text.vocab.join(" · ")}</div></div>${levelBadge(text.level)}</div>
    <p>${text.text}</p>
    ${text.questions.map((q,qi)=>{
      const key=`${text.id}-${qi}`;
      const chosen=state.readingAnswers?.[key];
      return `<div class="reading-question"><strong>${q.q}</strong><div class="quiz-options compact">${q.options.map(o=>`<button class="quiz-opt ${chosen===o?(o===q.correct?"correct":"wrong"):""}" onclick="answerReading(${ti},${qi},'${o.replace(/'/g,"\\'")}')">${o}</button>`).join("")}</div>${chosen?`<div class="feature-sub">სწორი პასუხი: ${q.correct}</div>`:""}</div>`;
    }).join("")}
  </div>`).join("");
}
function answerReading(ti,qi,answer){
  const text=READING_TEXTS[ti], q=text.questions[qi], key=`${text.id}-${qi}`;
  const first=!state.readingAnswers[key];
  state.readingAnswers[key]=answer;
  if(first && answer===q.correct) addXP(8,false);
  saveState();
  renderReadingTexts();
}

function getNoteWordList(){
  return dedupeVocab([
    ...Object.keys(state.wordNotes||{}).map(findWord).filter(Boolean),
    ...state.favoriteWords.map(findWord).filter(Boolean),
    ...getLearnedVocab().slice(0,20),
    ...VOCABULARY.slice(0,20)
  ]);
}
function openWordNote(event,id){
  if(event) event.stopPropagation();
  state.selectedNoteWord=normalizeWordKey(id);
  saveState();
  navigate("notes");
}
function selectNoteWord(id){ state.selectedNoteWord=normalizeWordKey(id); saveState(); renderNotes(); }
function renderNotes(){
  const el=document.getElementById("notes-area");
  if(!el) return;
  const words=getNoteWordList();
  if(!state.selectedNoteWord && words[0]) state.selectedNoteWord=getWordId(words[0]);
  const selected=findWord(state.selectedNoteWord)||words[0];
  const note=selected ? (state.wordNotes?.[getWordId(selected)]||"") : "";
  const notesCount=Object.keys(state.wordNotes||{}).filter(id=>state.wordNotes[id]).length;
  el.innerHTML=`<div class="notes-layout">
    <div class="feature-card notes-list"><div class="feature-title">სიტყვები (${notesCount})</div>
      <input class="audio-input" id="notes-search" placeholder="ძებნა..." oninput="filterNoteWords()">
      <div id="notes-word-list">${words.map(w=>`<button class="note-word ${getWordId(w)===getWordId(selected)?"active":""}" data-note-word="${normalizeWordDisplay(w).toLowerCase()} ${w.ka.toLowerCase()}" onclick="selectNoteWord('${getWordId(w)}')"><span>${normalizeWordDisplay(w)}</span><small>${w.ka}</small></button>`).join("")}</div>
    </div>
    <div class="feature-card notes-editor">${selected?`
      <div class="feature-head"><div><div class="feature-title">${normalizeWordDisplay(selected)}</div><div class="feature-sub">${selected.phonetic} · ${selected.ka}</div></div>${levelBadge(selected.level)}</div>
      <textarea class="practice-textarea" id="word-note-input" placeholder="შენი შენიშვნა, ასოციაცია ან მაგალითი...">${escapeHtml(note)}</textarea>
      <div class="feature-actions"><button class="primary-btn" onclick="saveWordNote('${getWordId(selected)}')">შენახვა</button><button class="learn-nav-btn prev" onclick="deleteWordNote('${getWordId(selected)}')">წაშლა</button></div>`:`<div class="feature-sub">სიტყვები ვერ მოიძებნა.</div>`}
    </div>
  </div>`;
}
function filterNoteWords(){
  const q=(document.getElementById("notes-search")?.value||"").toLowerCase();
  document.querySelectorAll(".note-word").forEach(btn=>{ btn.style.display=btn.dataset.noteWord.includes(q)?"":"none"; });
}
function saveWordNote(id){
  const val=document.getElementById("word-note-input")?.value||"";
  state.wordNotes[id]=val.trim();
  if(!state.wordNotes[id]) delete state.wordNotes[id];
  saveState();
  renderNotes();
  renderVocab();
  showToast("შენიშვნა შენახულია");
}
function deleteWordNote(id){
  delete state.wordNotes[id];
  saveState();
  renderNotes();
  renderVocab();
}

// ────────────────────────────────────────────
// SETTINGS
// ────────────────────────────────────────────
const THEMES=[
  {id:"default",name:"ლურჯი",color:"#2563eb"},{id:"dark",name:"ბნელი",color:"#334155"},
  {id:"forest",name:"მწვანე",color:"#16a34a"},{id:"amber",name:"ქარვა",color:"#d97706"},
  {id:"rose",name:"ვარდ.",color:"#e11d48"},
];
function buildSettings(){
  const g=document.getElementById("theme-grid"); if(!g) return;
  g.innerHTML=THEMES.map(t=>`
    <div class="theme-opt ${t.id===state.theme?"active":""}" onclick="setTheme('${t.id}')" data-tid="${t.id}">
      <div class="swatch" style="background:${t.color};"></div>
      <div class="name">${t.name}</div>
    </div>`).join("");
}
function setTheme(t){ state.theme=t; saveState(); applyTheme(t); document.querySelectorAll("[data-tid]").forEach(e=>e.classList.toggle("active",e.dataset.tid===t)); showToast("თემა შეიცვალა!"); }
function applyTheme(t){ document.documentElement.setAttribute("data-theme",t); }
function saveName(){ const v=document.getElementById("name-setting").value.trim(); if(!v) return; state.name=v; saveState(); updateUI(); showToast("სახელი შენახულია! ✅"); }
function saveDailyGoal(){
  const v=parseInt(document.getElementById("daily-goal-setting")?.value||"10",10);
  state.dailyGoal=Math.max(1,Math.min(100,isNaN(v)?10:v));
  state.dailyGoalHistory=state.dailyGoalHistory||{};
  state.dailyGoalHistory[todayKey()]=state.dailyGoal;
  syncStrictStreak();
  saveState();
  updateUI();
  checkAchievements();
  showToast("დღიური მიზანი შენახულია! ✅");
}
function clearStorage(){ if(!confirm("ნამდვილად გსურთ ყველა მონაცემის წაშლა?")) return; localStorage.clear(); location.reload(); }
function exportData(){
  const d=JSON.stringify({...state,exportDate:new Date().toISOString()},null,2);
  const b=new Blob([d],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="deutschgeo-progress.json"; a.click();
  showToast("ექსპორტი დასრულდა! 📤");
}
function importData(){
  const inp=document.createElement("input"); inp.type="file"; inp.accept=".json";
  inp.onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{ try{ const d=JSON.parse(ev.target.result); if(!d.name){ showToast("❌ არასწორი ფაილი!"); return; } if(!confirm(`"${d.name}"-ის მონაცემები შემოიტანოთ?`)) return; state={...state,...d}; saveState(); location.reload(); }catch(e){ showToast("❌ შეცდომა!"); } };
    r.readAsText(f);
  };
  inp.click();
}

// ────────────────────────────────────────────
// MOBILE SIDEBARS & TOAST
// ────────────────────────────────────────────
function toggleLeft(){
  document.getElementById("left-sidebar").classList.toggle("open");
  document.getElementById("right-sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.toggle("show",document.getElementById("left-sidebar").classList.contains("open"));
}
function toggleRight(){
  document.getElementById("right-sidebar").classList.toggle("open");
  document.getElementById("left-sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.toggle("show",document.getElementById("right-sidebar").classList.contains("open"));
}
function closeAllSidebars(){
  ["left-sidebar","right-sidebar"].forEach(id=>document.getElementById(id).classList.remove("open"));
  document.getElementById("sidebar-overlay").classList.remove("show");
}
let _toastTimer;
function showToast(msg){
  const t=document.getElementById("toast");
  t.textContent=msg; t.classList.add("show");
  clearTimeout(_toastTimer); _toastTimer=setTimeout(()=>t.classList.remove("show"),2500);
}
