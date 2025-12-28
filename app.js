// FitTrip Pro – Offline app (LocalStorage + IndexedDB for photos)
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const STORE = { settings:'fittrippro_settings_v1', logs:'fittrippro_workout_logs_v1', metrics:'fittrippro_metrics_v1', nutrition:'fittrippro_nutrition_v1' };

function todayISO(){ const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
function parseISO(s){ return new Date(s+'T00:00:00'); }
function formatDateHe(iso){ return parseISO(iso).toLocaleDateString('he-IL',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); }
function load(key,fallback){ try{return JSON.parse(localStorage.getItem(key)) ?? fallback;}catch{return fallback;} }
function save(key,val){ localStorage.setItem(key, JSON.stringify(val)); }

function applyTheme(pref){
  document.body.classList.remove('theme-auto','theme-light','theme-dark');
  if (!pref || pref==='auto') document.body.classList.add('theme-auto');
  else if (pref==='light') document.body.classList.add('theme-light');
  else document.body.classList.add('theme-dark');
}

function defaultSettings(){
  return { name:'אורח', height_m:1.80, weight_kg:80, sex:'male', activity:'medium', goal:'cut',
    start_date: todayISO(), training_days_mode:'Sun-Thu', theme:'auto', calories_override:'', protein_override:'' };
}

// ----- Plan + explanations
function item(name, sets, reps_or_time, rest_sec, notes){ return {name, sets, reps_or_time, rest_sec, notes}; }
const EXPLAIN = {
  StrengthA:{purpose:'בניית בסיס כוח לכל הגוף + תנועה בסיסית.',tips:['עצור 1–2 חזרות לפני כשל','טווח תנועה מלא','נשימה מסודרת'],mistakes:['מהירות גבוהה מדי','ברכיים קורסות בסקוואט','שכיבות עם אגן נופל']},
  StrengthB:{purpose:'דגש גב/כתפיים/רגל אחורית + יציבות.',tips:['במתח שלילי: ירידה איטית','בבולגרי: ברך יציבה','כתפיים למטה'],mistakes:['קשת גב בדדליפט רומני','קפיצה במתח בלי שליטה']},
  StrengthC:{purpose:'נפח קל + קונדישנינג קצר לשיפור כושר.',tips:['AMRAP איכותי','בפארמר: יציבה גבוהה','קונדישנינג קצר'],mistakes:['עומס קופצני מדי','בלי מנוחה בכלל']},
  RunEasy:{purpose:'לבנות סיבולת בסיסית בלי עומס.',tips:['קצב דיבור','צעדים קלים','רצף לפני מהירות'],mistakes:['לרוץ מהר מדי','בלי חימום/שחרור']},
  RunQuality:{purpose:'שיפור קצב וחסינות לעומס.',tips:['מהיר נשלט (RPE 7–8)','מנוחות מדויקות','לא לפתוח חזק מדי'],mistakes:['אול-אאוט','להפוך לאימון ארוך']}
};

function seedPlan(){
  const A=[item('סקוואט',3,'8–12',75,'RPE 6–7'),item('שכיבות סמיכה',3,'6–12',75,'שיפוע/ברכיים אם צריך'),item('חתירה',3,'8–12',75,'טווח מלא'),item('לאנג׳ קדימה',2,'8 לכל רגל',75,'שליטה'),item('פלאנק',3,'20–45 שנ׳',60,'')];
  const B=[item('דדליפט רומני',3,'10–12',75,''),item('מתח שלילי/עזרה',4,'3–6',90,'ירידה 3–5 שנ׳'),item('פייק פוש-אפ/כתפיים',3,'6–10',75,''),item('בולגרי',2,'8 לכל רגל',90,''),item('פלאנק צידי',2,'20–40 שנ׳ לכל צד',60,'')];
  const C=[item('סקוואט',2,'12–15',75,''),item('שכיבות AMRAP',3,'AMRAP',90,'איכות'),item('חתירה/מתח',3,'מקס׳ איכותי',90,''),item('גשר עכוז',3,'12–20',60,''),item('פארמר ווק',4,'30–60 שנ׳',60,''),item('קונדישנינג',1,'30/30 × 8–10',0,'בחר 2: ברכיים/סטפ-אפס/ג׳אמפינג ג׳קס')];
  const run=(w)=> w<=2?{easy:'2 דק׳ ריצה + 1 דק׳ הליכה × 7–8',quality:'1 דק׳ מהר + 2 דק׳ הליכה × 6–8'}:
               w<=4?{easy:'3 דק׳ ריצה + 1 דק׳ הליכה × 6–7',quality:'2 דק׳ מהר + 2 דק׳ קל × 6'}:
               w<=6?{easy:'30–35 דק׳ רציף ככל האפשר',quality:'טמפו: 10 קל + 12–15 בינוני + 5 קל'}:
               w<=8?{easy:'35–40 דק׳ קל (או 5K קל)',quality:'3 דק׳ מהר + 2 דק׳ קל × 5'}:
               w<=10?{easy:'45 דק׳ קל (או 6–7K)',quality:'6×400מ׳ מהר עם 2 דק׳ קל'}:
                     {easy:'40–50 דק׳ קל',quality:'שבוע כן/לא: בדיקת 5K / טמפו 20 דק׳'};
  const plan=[];
  for(let w=1;w<=12;w++){
    const rb=run(w);
    plan[w]={week:w,days:{
      1:{title:'כוח A',type:'StrengthA',items:A},
      2:{title:'ריצה קלה',type:'RunEasy',items:[item('ריצה קלה',1,rb.easy,0,'RPE 5–6')]},
      3:{title:'כוח B',type:'StrengthB',items:B},
      4:{title:'ריצה איכות',type:'RunQuality',items:[item('ריצה איכות',1,rb.quality,0,'RPE 7–8')]},
      5:{title:'כוח C',type:'StrengthC',items:C},
      6:{title:'מנוחה',type:'Rest',items:[item('מנוחה/הליכה',1,'30–60 דק׳ הליכה + מתיחות',0,'')]},
      7:{title:'מנוחה',type:'Rest',items:[item('מנוחה',1,'שחרור ושינה',0,'')]}
    }};
  }
  return plan;
}
const PLAN=seedPlan();

function getDayIndexForDate(iso,mode){
  const wd=parseISO(iso).getDay();
  if(mode==='Sun-Thu') return wd===0?1:wd===1?2:wd===2?3:wd===3?4:wd===4?5:wd===5?6:7;
  return wd===1?1:wd===2?2:wd===3?3:wd===4?4:wd===5?5:wd===6?6:7;
}
function getWeekNumberForDate(iso,start){
  const a=parseISO(start), b=parseISO(iso);
  const diff=Math.floor((b-a)/(1000*60*60*24));
  if(diff<0) return 1;
  return Math.min(12, Math.floor(diff/7)+1);
}
function workoutKey(week,dayIndex){ return `W${week}-D${dayIndex}`; }
function currentContext(settings){
  const iso=todayISO();
  const week=getWeekNumberForDate(iso, settings.start_date);
  const dayIndex=getDayIndexForDate(iso, settings.training_days_mode);
  return {iso,week,dayIndex,workout:PLAN[week].days[dayIndex]};
}

// ----- Nutrition targets
function bmi(h,w){ h=Number(h)||0; w=Number(w)||0; if(!h||!w) return null; return w/(h*h); }
function estimateCalories(settings){
  const w=Number(settings.weight_kg)||80;
  const base=30*w;
  const mult=settings.activity==='low'?0.95: settings.activity==='high'?1.1:1.0;
  const tdee=Math.round(base*mult);
  const target=settings.goal==='cut'?(tdee-400):settings.goal==='gain'?(tdee+250):tdee;
  return {tdee, target: Math.max(1400, target)};
}
function estimateProtein(settings){ const w=Number(settings.weight_kg)||80; return Math.round(w*2.0); }
function nutritionTargets(settings){
  const cal=estimateCalories(settings);
  const prot=estimateProtein(settings);
  const calories=settings.calories_override?Number(settings.calories_override):cal.target;
  const protein=settings.protein_override?Number(settings.protein_override):prot;
  const fat=65;
  const carbs=Math.max(0, Math.round((calories - protein*4 - fat*9)/4));
  return {tdee:cal.tdee, calories, protein, fat, carbs};
}

// ----- Charts
function drawLineChart(canvas, ys){
  const ctx=canvas.getContext('2d');
  const w=canvas.width=canvas.clientWidth*devicePixelRatio;
  const h=canvas.height=180*devicePixelRatio;
  ctx.clearRect(0,0,w,h);
  if(ys.length<2) return;
  const pad=16*devicePixelRatio;
  const minY=Math.min(...ys), maxY=Math.max(...ys), span=(maxY-minY)||1;
  const color=getComputedStyle(document.body).color;
  ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=2*devicePixelRatio;

  ctx.globalAlpha=0.25;
  for(let i=0;i<4;i++){
    const y=pad+(h-2*pad)*(i/3);
    ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(w-pad,y); ctx.stroke();
  }
  ctx.globalAlpha=0.9;

  ctx.beginPath();
  ys.forEach((v,i)=>{
    const x=pad+(w-2*pad)*(i/(ys.length-1));
    const y=h-pad-(h-2*pad)*((v-minY)/span);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();
  ys.forEach((v,i)=>{
    const x=pad+(w-2*pad)*(i/(ys.length-1));
    const y=h-pad-(h-2*pad)*((v-minY)/span);
    ctx.beginPath(); ctx.arc(x,y,3*devicePixelRatio,0,Math.PI*2); ctx.fill();
  });
}

// ----- IndexedDB photos
const DB_NAME='fittrippro_db_v1';
function idb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('photos')){
        const s=db.createObjectStore('photos',{keyPath:'id'});
        s.createIndex('date','date',{unique:false});
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function idbPut(store,val){
  const db=await idb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,'readwrite'); tx.objectStore(store).put(val);
    tx.oncomplete=()=>resolve(true); tx.onerror=()=>reject(tx.error);
  });
}
async function idbGetAll(store){
  const db=await idb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,'readonly');
    const req=tx.objectStore(store).getAll();
    req.onsuccess=()=>resolve(req.result||[]); req.onerror=()=>reject(req.error);
  });
}
async function idbDelete(store,key){
  const db=await idb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,'readwrite'); tx.objectStore(store).delete(key);
    tx.oncomplete=()=>resolve(true); tx.onerror=()=>reject(tx.error);
  });
}

// ----- Render
function setSubtitle(t){ $('#subtitle').textContent=t; }

function render(){
  const settings=load(STORE.settings, defaultSettings());
  save(STORE.settings, settings);
  applyTheme(settings.theme);

  const ctx=currentContext(settings);
  setSubtitle(`${formatDateHe(ctx.iso)} • שבוע ${ctx.week} • יום ${ctx.dayIndex}`);

  renderToday(settings, ctx);
  renderWorkouts(settings);
  renderNutrition(settings);
  renderTrack(settings, ctx);
  renderPhotos(settings, ctx);
  renderSettings(settings);

  weeklyPhotoNudge().catch(()=>{});
}

function renderToday(settings, ctx){
  const el=$('#screen-today'); el.innerHTML='';
  const logs=load(STORE.logs, []);
  const key=workoutKey(ctx.week, ctx.dayIndex);
  const done=logs.find(l=>l.date===ctx.iso && l.workout_key===key);
  const w=ctx.workout;

  const head=document.createElement('div');
  head.className='card';
  head.innerHTML=`<div class="row">
    <div><div class="h1">האימון של היום: ${w.title}</div>
      <div class="small">${EXPLAIN[w.type]?.purpose || ''}</div></div>
    <div class="badge ${done?.completed?'ok':'warn'}">${done?.completed?'בוצע ✅':'לא בוצע עדיין'}</div>
  </div>`;
  el.appendChild(head);

  const checks=(done?.checks)||Array(w.items.length).fill(false);
  const list=document.createElement('div');
  list.className='card';
  list.innerHTML=`<div class="h2">מה עושים היום</div><ul class="list">
    ${w.items.map((it,i)=>`<li class="item">
      <div><div style="font-weight:900">${escapeHtml(it.name)}</div>
        <div class="small">${it.sets} סטים • ${escapeHtml(it.reps_or_time)} ${it.rest_sec?` • מנוחה ${it.rest_sec}שנ׳`:''}</div>
        ${it.notes?`<div class="small">${escapeHtml(it.notes)}</div>`:''}
      </div>
      <div class="checkbox"><input type="checkbox" data-i="${i}" ${checks[i]?'checked':''}/></div>
    </li>`).join('')}
  </ul>`;
  el.appendChild(list);

  const exp=document.createElement('div');
  exp.className='card';
  exp.innerHTML=`<div class="row">
    <div><div class="h2">הסבר מהיר</div><div class="small">טיפים וטעויות לאימון הזה</div></div>
    <button class="btn" id="openExplain">פתח הסבר</button>
  </div>`;
  el.appendChild(exp);

  const foot=document.createElement('div');
  foot.className='card';
  foot.innerHTML=`<div class="h2">טיימר מנוחה</div>
    <div class="row"><div class="timer" id="restTimer">00:00</div>
      <div class="row">
        <button class="btn" id="r60">60</button><button class="btn" id="r75">75</button><button class="btn" id="r90">90</button><button class="btn ghost" id="rStop">עצור</button>
      </div>
    </div>
    <hr/>
    <div class="h2">סיום</div>
    <div class="field"><label>RPE (1–10)</label><input id="rpe" inputmode="numeric" value="${escapeHtml(done?.rpe||'')}"/></div>
    <div class="field"><label>הערות</label><textarea id="notes">${escapeHtml(done?.notes||'')}</textarea></div>
    <div class="row"><button class="btn primary" id="saveDone">${done?'עדכן אימון':'סיימתי אימון'}</button></div>`;
  el.appendChild(foot);

  $$('#screen-today input[type="checkbox"][data-i]').forEach(ch=>{
    ch.addEventListener('change',(ev)=>{ const i=Number(ev.target.getAttribute('data-i')); checks[i]=ev.target.checked; });
  });

  let restInt=null;
  function start(sec){
    clearInterval(restInt);
    let remain=sec;
    const t=$('#restTimer',foot);
    t.textContent=fmtTime(remain);
    restInt=setInterval(()=>{remain--; t.textContent=fmtTime(Math.max(0,remain)); if(remain<=0){clearInterval(restInt); beep();}},1000);
  }
  $('#r60',foot).onclick=()=>start(60);
  $('#r75',foot).onclick=()=>start(75);
  $('#r90',foot).onclick=()=>start(90);
  $('#rStop',foot).onclick=()=>{clearInterval(restInt); $('#restTimer',foot).textContent='00:00';};

  $('#openExplain',exp).onclick=()=>showExplainModal(w.type);

  $('#saveDone',foot).onclick=()=>{
    const arr=load(STORE.logs, []);
    const obj={date:ctx.iso, workout_key:key, week:ctx.week, dayIndex:ctx.dayIndex, title:w.title,
      completed:(w.type==='Rest')?true:checks.every(Boolean), checks,
      rpe:($('#rpe',foot).value||'').trim(), notes:($('#notes',foot).value||'').trim(), updated_at:new Date().toISOString()};
    const idx=arr.findIndex(l=>l.date===obj.date && l.workout_key===obj.workout_key);
    if(idx>=0) arr[idx]=obj; else arr.push(obj);
    save(STORE.logs, arr);
    alert('נשמר ✅'); render();
  };
}

function showExplainModal(type){
  const e=EXPLAIN[type]||{purpose:'',tips:[],mistakes:[]};
  const modal=document.createElement('div');
  modal.style.position='fixed'; modal.style.inset='0'; modal.style.background='rgba(0,0,0,.55)';
  modal.style.display='flex'; modal.style.alignItems='flex-end'; modal.style.justifyContent='center';
  modal.style.padding='16px'; modal.style.zIndex='50';
  modal.innerHTML=`<div class="card" style="width:min(860px,100%); max-height:85vh; overflow:auto;">
    <div class="row"><div><div class="h1">הסבר</div><div class="small">${escapeHtml(e.purpose)}</div></div><button class="btn" id="close">סגור</button></div>
    <hr/>
    <div class="grid2">
      <div class="card"><div class="h2">טיפים</div><ul class="small">${e.tips.map(t=>`<li>${escapeHtml(t)}</li>`).join('')}</ul></div>
      <div class="card"><div class="h2">טעויות</div><ul class="small">${e.mistakes.map(t=>`<li>${escapeHtml(t)}</li>`).join('')}</ul></div>
    </div>
  </div>`;
  document.body.appendChild(modal);
  $('#close',modal).onclick=()=>modal.remove();
  modal.addEventListener('click',(ev)=>{if(ev.target===modal) modal.remove();});
}

function renderWorkouts(settings){
  const el=$('#screen-workouts'); el.innerHTML='';
  const top=document.createElement('div'); top.className='card';
  top.innerHTML=`<div class="h1">אימונים</div><div class="small">בחר יום כדי לראות פירוט + הסבר</div>`;
  el.appendChild(top);

  for(let w=1;w<=12;w++){
    const card=document.createElement('div'); card.className='card';
    card.innerHTML=`<div class="row"><div><div style="font-weight:1000">שבוע ${w}</div><div class="small">כוח/ריצה/מנוחה</div></div></div><hr/><div class="grid2" id="wg-${w}"></div>`;
    el.appendChild(card);
    const g=$('#wg-'+w,card);
    for(let d=1;d<=7;d++){
      const day=PLAN[w].days[d];
      const b=document.createElement('button'); b.className='btn ghost'; b.style.textAlign='right';
      b.innerHTML=`<div style="font-weight:900">יום ${d}: ${escapeHtml(day.title)}</div><div class="small">${escapeHtml(day.items[0].reps_or_time||'')}</div>`;
      b.onclick=()=>showWorkoutModal(w,d);
      g.appendChild(b);
    }
  }
}

function showWorkoutModal(week,dayIndex){
  const w=PLAN[week].days[dayIndex];
  const modal=document.createElement('div');
  modal.style.position='fixed'; modal.style.inset='0'; modal.style.background='rgba(0,0,0,.55)';
  modal.style.display='flex'; modal.style.alignItems='flex-end'; modal.style.justifyContent='center';
  modal.style.padding='16px'; modal.style.zIndex='50';
  const e=EXPLAIN[w.type]||{purpose:'',tips:[],mistakes:[]};
  modal.innerHTML=`<div class="card" style="width:min(860px,100%); max-height:85vh; overflow:auto;">
    <div class="row"><div><div class="h1">שבוע ${week} • יום ${dayIndex}: ${escapeHtml(w.title)}</div><div class="small">${escapeHtml(e.purpose)}</div></div><button class="btn" id="close">סגור</button></div>
    <hr/>
    <div class="grid2">
      <div class="card"><div class="h2">תרגילים</div><ul class="list">${w.items.map(it=>`<li class="item"><div><div style="font-weight:900">${escapeHtml(it.name)}</div><div class="small">${it.sets} סטים • ${escapeHtml(it.reps_or_time)} ${it.rest_sec?` • ${it.rest_sec}שנ׳`:''}</div></div></li>`).join('')}</ul></div>
      <div class="card"><div class="h2">טיפים</div><ul class="small">${e.tips.map(t=>`<li>${escapeHtml(t)}</li>`).join('')}</ul><hr/><div class="h2">טעויות</div><ul class="small">${e.mistakes.map(t=>`<li>${escapeHtml(t)}</li>`).join('')}</ul></div>
    </div>
  </div>`;
  document.body.appendChild(modal);
  $('#close',modal).onclick=()=>modal.remove();
  modal.addEventListener('click',(ev)=>{if(ev.target===modal) modal.remove();});
}

function renderNutrition(settings){
  const el=$('#screen-nutrition'); el.innerHTML='';
  const iso=todayISO();
  const store=load(STORE.nutrition, {});
  const day=store[iso] || {calories:0, protein:0, water_ml:0, meals:[]};
  const b=bmi(settings.height_m, settings.weight_kg);
  const t=nutritionTargets(settings);
  const remP=Math.max(0, t.protein-day.protein);
  const remC=Math.max(0, t.calories-day.calories);

  const head=document.createElement('div'); head.className='card';
  head.innerHTML=`<div class="h1">תזונה</div>
    <div class="small">BMI: <b>${b?b.toFixed(1):'—'}</b> • יעד: <b>${t.calories}</b> קק"ל • חלבון: <b>${t.protein}</b>g</div>
    <div class="small">מאקרו משוער: שומן ${t.fat}g • פחמימות ${t.carbs}g • TDEE ~ ${t.tdee} קק"ל</div>
    <hr/>
    <div class="row">
      <div><div class="small">קלוריות היום</div><div class="kpi">${day.calories}</div></div>
      <div><div class="small">חלבון היום</div><div class="kpi">${day.protein}g</div></div>
      <div><div class="small">מים</div><div class="kpi">${Math.round(day.water_ml/100)/10}L</div></div>
    </div>
    <div class="row" style="margin-top:10px"><button class="btn" id="w250">+250ml מים</button><button class="btn danger" id="reset">איפוס היום</button></div>`;
  el.appendChild(head);

  const sug=document.createElement('div'); sug.className='card';
  sug.innerHTML=`<div class="h2">מה כדאי לאכול עכשיו</div>
    <div class="small">נשאר היום: חלבון ~ <b>${remP}g</b> • קלוריות ~ <b>${remC}</b> קק"ל</div>
    <div class="grid2" style="margin-top:10px">${suggestCards(remP,remC).join('')}</div>`;
  el.appendChild(sug);

  const add=document.createElement('div'); add.className='card';
  add.innerHTML=`<div class="h2">הוסף ארוחה (מעקב מלא)</div>
    <div class="field"><label>שם</label><input id="m_name" placeholder="למשל עוף+אורז"/></div>
    <div class="grid2">
      <div class="field"><label>קלוריות</label><input id="m_cal" inputmode="numeric" placeholder="600"/></div>
      <div class="field"><label>חלבון (גרם)</label><input id="m_prot" inputmode="numeric" placeholder="45"/></div>
    </div>
    <div class="row"><button class="btn primary" id="m_add">הוסף</button><button class="btn" id="q1">טונה+לחם</button><button class="btn" id="q2">יוגורט+פרי</button></div>`;
  el.appendChild(add);

  const list=document.createElement('div'); list.className='card';
  list.innerHTML=`<div class="h2">ארוחות היום</div>
    ${day.meals.length?`<table class="table"><thead><tr><th>שם</th><th>קק"ל</th><th>חלבון</th><th></th></tr></thead><tbody>
      ${day.meals.map((m,i)=>`<tr><td>${escapeHtml(m.name)}</td><td>${m.cal}</td><td>${m.prot}g</td><td><button class="btn danger" data-del="${i}">מחק</button></td></tr>`).join('')}
    </tbody></table>`:`<div class="small">אין ארוחות רשומות היום.</div>`}`;
  el.appendChild(list);

  function commit(nextDay){ store[iso]=nextDay; save(STORE.nutrition, store); render(); }
  $('#w250',head).onclick=()=>commit({...day, water_ml:(day.water_ml||0)+250});
  $('#reset',head).onclick=()=>commit({calories:0, protein:0, water_ml:0, meals:[]});

  function addMeal(name,cal,prot){
    if(!name||!cal||!prot){alert('צריך שם + קלוריות + חלבון'); return;}
    const meals=[...day.meals,{name,cal:Number(cal),prot:Number(prot)}];
    commit({...day, meals, calories:Number(day.calories)+Number(cal), protein:Number(day.protein)+Number(prot)});
  }
  $('#m_add',add).onclick=()=>addMeal($('#m_name',add).value.trim(), $('#m_cal',add).value, $('#m_prot',add).value);
  $('#q1',add).onclick=()=>addMeal('טונה+לחם',380,30);
  $('#q2',add).onclick=()=>addMeal('יוגורט+פרי',320,20);

  $$('button[data-del]',list).forEach(btn=>{
    btn.onclick=()=>{
      const idx=Number(btn.getAttribute('data-del'));
      const m=day.meals[idx];
      const meals=day.meals.filter((_,i)=>i!==idx);
      commit({...day, meals, calories:Math.max(0,day.calories-m.cal), protein:Math.max(0,day.protein-m.prot)});
    };
  });
}

function suggestCards(remP, remC){
  const options=[{name:'חזה עוף 200g',cal:330,prot:60},{name:'טונה במים',cal:160,prot:30},{name:'קוטג׳ 250g',cal:250,prot:35},{name:'יוגורט חלבון',cal:220,prot:25},{name:'ביצים 3',cal:240,prot:18},{name:'שייק חלבון',cal:150,prot:25}];
  const pick=options.filter(o=>o.prot<=Math.max(25,remP+10)&&o.cal<=Math.max(250,remC+150)).slice(0,4);
  const show=pick.length?pick:options.slice(0,4);
  return show.map(o=>`<div class="card"><div style="font-weight:1000">${escapeHtml(o.name)}</div><div class="small">${o.cal} קק"ל • ${o.prot}g חלבון</div><div class="badge ok">הצעה</div></div>`);
}

function renderTrack(settings, ctx){
  const el=$('#screen-track'); el.innerHTML='';
  const metrics=load(STORE.metrics, []);
  const logs=load(STORE.logs, []);
  const done=countDoneThisWeek(settings, ctx, logs);

  const head=document.createElement('div'); head.className='card';
  head.innerHTML=`<div class="h1">מעקב</div><div class="row">
    <div><div class="small">אימונים השבוע</div><div class="kpi">${done.count}/${done.total}</div></div>
    <div class="badge ${done.count>=4?'ok':'warn'}">${done.count>=4?'מעולה':'לשמור רצף'}</div></div>`;
  el.appendChild(head);

  const form=document.createElement('div'); form.className='card';
  form.innerHTML=`<div class="h2">הוסף מדדים</div><div class="grid2">
    <div class="field"><label>תאריך</label><input id="d" type="date" value="${todayISO()}"/></div>
    <div class="field"><label>משקל</label><input id="w" inputmode="decimal" placeholder="80"/></div>
    <div class="field"><label>מותניים</label><input id="wa" inputmode="decimal" placeholder=""/></div>
    <div class="field"><label>2K (שניות)</label><input id="r2" inputmode="numeric" placeholder="720"/></div>
    <div class="field"><label>מקס׳ שכיבות</label><input id="pu" inputmode="numeric" placeholder=""/></div>
    <div class="field"><label>מקס׳ מתח</label><input id="pl" inputmode="numeric" placeholder=""/></div>
  </div><div class="row"><button class="btn primary" id="save">שמור</button><button class="btn" id="export">ייצוא CSV</button></div>`;
  el.appendChild(form);

  $('#save',form).onclick=()=>{
    const arr=load(STORE.metrics, []);
    const obj={date:$('#d',form).value, weight_kg:num($('#w',form).value), waist_cm:num($('#wa',form).value), run2k_sec:num($('#r2',form).value), pushups_max:num($('#pu',form).value), pullups_max:num($('#pl',form).value)};
    const idx=arr.findIndex(m=>m.date===obj.date);
    if(idx>=0) arr[idx]=obj; else arr.push(obj);
    arr.sort((a,b)=>a.date.localeCompare(b.date));
    save(STORE.metrics, arr);
    alert('נשמר ✅'); render();
  };

  $('#export',form).onclick=()=>{
    const csv=exportAllCSV(load(STORE.metrics,[]), load(STORE.logs,[]), load(STORE.nutrition,{}));
    downloadText('fittrippro_export.csv', csv);
  };

  const last=metrics.slice(-10);
  const charts=document.createElement('div'); charts.className='card';
  charts.innerHTML=`<div class="h2">גרפים</div><div class="grid2">
    <div><div class="small">משקל</div><canvas class="chart" id="cw"></canvas></div>
    <div><div class="small">מותניים</div><canvas class="chart" id="cwa"></canvas></div>
    <div><div class="small">שכיבות</div><canvas class="chart" id="cpu"></canvas></div>
    <div><div class="small">2K</div><canvas class="chart" id="c2k"></canvas></div>
  </div>`;
  el.appendChild(charts);

  drawLineChart($('#cw',charts), last.filter(x=>x.weight_kg!=null).map(x=>Number(x.weight_kg)));
  drawLineChart($('#cwa',charts), last.filter(x=>x.waist_cm!=null).map(x=>Number(x.waist_cm)));
  drawLineChart($('#cpu',charts), last.filter(x=>x.pushups_max!=null).map(x=>Number(x.pushups_max)));
  drawLineChart($('#c2k',charts), last.filter(x=>x.run2k_sec!=null).map(x=>Number(x.run2k_sec)));

  const table=document.createElement('div'); table.className='card';
  table.innerHTML=`<div class="h2">מדדים אחרונים</div>${metrics.length?`<table class="table"><thead><tr><th>תאריך</th><th>משקל</th><th>מותניים</th><th>2K</th><th>שכיבות</th><th>מתח</th></tr></thead><tbody>
    ${metrics.slice().reverse().slice(0,10).map(m=>`<tr><td>${escapeHtml(m.date)}</td><td>${m.weight_kg??''}</td><td>${m.waist_cm??''}</td><td>${m.run2k_sec??''}</td><td>${m.pushups_max??''}</td><td>${m.pullups_max??''}</td></tr>`).join('')}
  </tbody></table>`:`<div class="small">אין נתונים עדיין.</div>`}`;
  el.appendChild(table);
}

function countDoneThisWeek(settings, ctx, logs){
  const start=parseISO(settings.start_date);
  const ws=new Date(start.getTime()+(ctx.week-1)*7*24*3600*1000);
  const we=new Date(ws.getTime()+7*24*3600*1000);
  const count=logs.filter(l=>{const d=parseISO(l.date); return d>=ws && d<we && l.completed && l.title && l.title!=='מנוחה';}).length;
  return {count,total:5};
}

// ----- Photos
async function renderPhotos(settings, ctx){
  const el=$('#screen-photos'); el.innerHTML='';
  const all=(await idbGetAll('photos')).sort((a,b)=>b.date.localeCompare(a.date));

  const head=document.createElement('div'); head.className='card';
  head.innerHTML=`<div class="h1">תמונות</div><div class="small">צילום פעם בשבוע באותה תאורה/מיקום.</div>
    <div class="row" style="margin-top:10px">
      <input id="photoInput" type="file" accept="image/*" capture="environment" style="display:none"/>
      <button class="btn primary" id="take">צלם תמונה חדשה</button>
      <button class="btn" id="compare">השווה אחרונות</button>
    </div>`;
  el.appendChild(head);

  const info=await weeklyPhotoNudge(true);
  if(info){
    const note=document.createElement('div'); note.className='notice';
    note.innerHTML=`<div style="font-weight:1000">עברו ${info.days} ימים מאז התמונה האחרונה</div><div class="small">זה זמן לתמונה שבועית.</div>`;
    el.appendChild(note);
  }

  const grid=document.createElement('div'); grid.className='card';
  grid.innerHTML=`<div class="h2">גלריה</div>${all.length?`<div class="photo-grid" id="pg"></div>`:`<div class="small">אין תמונות עדיין.</div>`}`;
  el.appendChild(grid);

  if(all.length){
    const pg=$('#pg',grid);
    all.forEach(p=>{
      const c=document.createElement('div'); c.className='photo-card';
      c.innerHTML=`<img src="${p.dataUrl}"/><div class="meta">${escapeHtml(p.date)} • שבוע ${p.week}</div><div class="meta"><button class="btn danger" data-del="${p.id}">מחק</button></div>`;
      pg.appendChild(c);
    });
    $$('button[data-del]',grid).forEach(btn=>{
      btn.onclick=async ()=>{ await idbDelete('photos', btn.getAttribute('data-del')); render(); };
    });
  }

  const input=$('#photoInput',head);
  $('#take',head).onclick=()=>input.click();
  input.onchange=async ()=>{
    const file=input.files?.[0]; if(!file) return;
    const dataUrl=await fileToDataUrl(file, 1200);
    const iso=todayISO(); const week=getWeekNumberForDate(iso, settings.start_date);
    await idbPut('photos', {id:crypto.randomUUID(), date:iso, week, dataUrl});
    input.value='';
    alert('נשמר ✅'); render();
  };

  $('#compare',head).onclick=()=>showCompareModal(all.slice(0,2));
}

function showCompareModal(two){
  if(two.length<2){ alert('צריך לפחות שתי תמונות'); return; }
  const modal=document.createElement('div');
  modal.style.position='fixed'; modal.style.inset='0'; modal.style.background='rgba(0,0,0,.55)';
  modal.style.display='flex'; modal.style.alignItems='flex-end'; modal.style.justifyContent='center';
  modal.style.padding='16px'; modal.style.zIndex='50';
  modal.innerHTML=`<div class="card" style="width:min(860px,100%); max-height:85vh; overflow:auto;">
    <div class="row"><div><div class="h1">השוואה</div><div class="small">${escapeHtml(two[1].date)} → ${escapeHtml(two[0].date)}</div></div><button class="btn" id="close">סגור</button></div>
    <hr/>
    <div class="grid2">
      <div class="card"><div class="small">קודם</div><img src="${two[1].dataUrl}" style="width:100%;border-radius:12px"/></div>
      <div class="card"><div class="small">עכשיו</div><img src="${two[0].dataUrl}" style="width:100%;border-radius:12px"/></div>
    </div>
  </div>`;
  document.body.appendChild(modal);
  $('#close',modal).onclick=()=>modal.remove();
  modal.addEventListener('click',(ev)=>{if(ev.target===modal) modal.remove();});
}

async function weeklyPhotoNudge(returnInfo=false){
  const all=(await idbGetAll('photos')).sort((a,b)=>b.date.localeCompare(a.date));
  if(!all.length) return returnInfo?{days:999}:true;
  const last=parseISO(all[0].date), now=parseISO(todayISO());
  const days=Math.floor((now-last)/(1000*60*60*24));
  if(returnInfo) return days>=7?{days}:null;
  if(days>=7){
    const s=$('#subtitle');
    if(s && !s.textContent.includes('תמונה שבועית')) s.textContent += ' • הגיע הזמן לתמונה שבועית';
  }
}

// ----- Settings
function renderSettings(settings){
  const el=$('#screen-settings'); el.innerHTML='';
  const t=nutritionTargets(settings);
  const b=bmi(settings.height_m, settings.weight_kg);

  const card=document.createElement('div'); card.className='card';
  card.innerHTML=`<div class="h1">הגדרות</div>
    <div class="grid2">
      <div class="field"><label>שם</label><input id="s_name" value="${escapeHtml(settings.name)}"/></div>
      <div class="field"><label>מין</label><select id="s_sex"><option value="male">גבר</option><option value="female">אישה</option></select></div>
      <div class="field"><label>גובה (מ׳)</label><input id="s_h" inputmode="decimal" value="${settings.height_m}"/></div>
      <div class="field"><label>משקל (ק״ג)</label><input id="s_w" inputmode="decimal" value="${settings.weight_kg}"/></div>
      <div class="field"><label>רמת פעילות</label><select id="s_act"><option value="low">נמוכה</option><option value="medium">בינונית</option><option value="high">גבוהה</option></select></div>
      <div class="field"><label>מטרה</label><select id="s_goal"><option value="cut">חיטוב</option><option value="maintain">תחזוקה</option><option value="gain">עלייה במסת שריר</option></select></div>
      <div class="field"><label>תאריך התחלה לתוכנית</label><input id="s_start" type="date" value="${settings.start_date}"/></div>
      <div class="field"><label>ימי אימון</label><select id="s_mode"><option value="Sun-Thu">ראשון–חמישי</option><option value="Mon-Fri">שני–שישי</option></select></div>
      <div class="field"><label>ערכת נושא</label><select id="s_theme"><option value="auto">אוטומטי</option><option value="light">בהיר</option><option value="dark">כהה</option></select></div>
    </div>
    <hr/>
    <div class="h2">יעדי תזונה</div>
    <div class="small">BMI: <b>${b?b.toFixed(1):'—'}</b> • יעד קלוריות: <b>${t.calories}</b> • חלבון: <b>${t.protein}</b>g</div>
    <div class="grid2">
      <div class="field"><label>Override קלוריות (ריק=אוטומטי)</label><input id="s_cal" inputmode="numeric" value="${escapeHtml(settings.calories_override||'')}"/></div>
      <div class="field"><label>Override חלבון (גרם)</label><input id="s_pro" inputmode="numeric" value="${escapeHtml(settings.protein_override||'')}"/></div>
    </div>
    <div class="row"><button class="btn primary" id="save">שמור</button><button class="btn danger" id="reset">איפוס נתונים</button></div>
    <div class="small">Offline + תמונות נשמרות במכשיר (IndexedDB).</div>`;
  el.appendChild(card);

  $('#s_sex',card).value=settings.sex||'male';
  $('#s_act',card).value=settings.activity||'medium';
  $('#s_goal',card).value=settings.goal||'cut';
  $('#s_mode',card).value=settings.training_days_mode||'Sun-Thu';
  $('#s_theme',card).value=settings.theme||'auto';

  $('#save',card).onclick=()=>{
    const next={...settings,
      name:($('#s_name',card).value||'אורח').trim(),
      sex:$('#s_sex',card).value,
      height_m:num($('#s_h',card).value) ?? settings.height_m,
      weight_kg:num($('#s_w',card).value) ?? settings.weight_kg,
      activity:$('#s_act',card).value,
      goal:$('#s_goal',card).value,
      start_date:$('#s_start',card).value || settings.start_date,
      training_days_mode:$('#s_mode',card).value,
      theme:$('#s_theme',card).value,
      calories_override:($('#s_cal',card).value||'').trim(),
      protein_override:($('#s_pro',card).value||'').trim()
    };
    save(STORE.settings, next);
    alert('נשמר ✅'); render();
  };

  $('#reset',card).onclick=async ()=>{
    if(!confirm('למחוק את כל הנתונים?')) return;
    Object.values(STORE).forEach(k=>localStorage.removeItem(k));
    const all=await idbGetAll('photos');
    for(const p of all) await idbDelete('photos', p.id);
    render();
  };
}

// ----- CSV
function exportAllCSV(metrics, logs, nutritionStore){
  const lines=['type,date,field1,field2,field3,field4,field5'];
  metrics.forEach(m=>lines.push(['metrics',m.date,m.weight_kg??'',m.waist_cm??'',m.run2k_sec??'',m.pushups_max??'',m.pullups_max??''].join(',')));
  logs.forEach(l=>lines.push(['workout',l.date,escapeCSV(l.title),l.week,l.dayIndex,l.completed?1:0,escapeCSV((l.rpe||'')+' '+(l.notes||''))].join(',')));
  Object.keys(nutritionStore).sort().forEach(date=>{
    const d=nutritionStore[date];
    lines.push(['nutrition',date,d.calories??'',d.protein??'',d.water_ml??'',escapeCSV(JSON.stringify(d.meals||[])),''].join(','));
  });
  return lines.join('\n');
}
function escapeCSV(s){
  const t=String(s??'');
  if(t.includes(',')||t.includes('"')||t.includes('\n')) return '"' + t.replaceAll('"','""') + '"';
  return t;
}

// ----- Utils
function fmtTime(sec){ const m=Math.floor(sec/60), s=sec%60; return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); }
function beep(){ try{ const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value=880; g.gain.value=0.05; o.start(); setTimeout(()=>{o.stop(); ctx.close();},160);}catch{} }
function num(v){ const t=String(v||'').trim(); if(!t) return null; const n=Number(t.replace(',','.')); return Number.isFinite(n)?n:null; }
function escapeHtml(s){ return String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;"); }
async function fileToDataUrl(file, maxW=1200){
  const img=await createImageBitmap(file);
  const scale=Math.min(1, maxW/img.width);
  const w=Math.round(img.width*scale), h=Math.round(img.height*scale);
  const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h;
  canvas.getContext('2d').drawImage(img,0,0,w,h);
  return canvas.toDataURL('image/jpeg',0.85);
}
function downloadText(filename, text){
  const blob=new Blob([text],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 500);
}

// Navigation
$$('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    $$('.tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const target=btn.getAttribute('data-screen');
    $$('.screen').forEach(s=>s.classList.remove('active'));
    $('#screen-'+target).classList.add('active');
  });
});

// Init
render();
