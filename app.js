import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD8qMbEMtrXAysMH29K_sizJupoQZzffms",
  authDomain: "seobong-afterschool-backend.firebaseapp.com",
  projectId: "seobong-afterschool-backend",
  storageBucket: "seobong-afterschool-backend.firebasestorage.app",
  messagingSenderId: "835537842823",
  appId: "1:835537842823:web:31e96cdcf3df1714653e22",
  databaseURL: "https://seobong-afterschool-backend-default-rtdb.firebaseio.com/"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);
const APP_DATA_REF = ref(db, "appData");

let dataReady = false;
let lastSavedJson = "";
let persistTimer = null;

// ======================================================
// DATA
// ======================================================
const ADMIN_CODE = 'SEOBONG2026';

const COURSES = {
  art:       { name:'창의미술',  day:'월', emoji:'🎨', tuition:{q1:55220}, materials:{q1:46000}, sessions:{q1:7}  },
  badminton: { name:'배드민턴',  day:'화', emoji:'🏸', tuition:{q1:63100}, materials:{q1:17000}, sessions:{q1:8}  },
  dance:     { name:'방송댄스',  day:'수', emoji:'💃', tuition:{q1:63100}, materials:{q1:0},     sessions:{q1:8}  },
  science:   { name:'과학탐구',  day:'목', emoji:'🔬', tuition:{q1:70980}, materials:{q1:45000}, sessions:{q1:9}  },
  baduk:     { name:'바둑',      day:'금', emoji:'⚫', tuition:{q1:63100}, materials:{q1:26000}, sessions:{q1:8}  },
  custom1:   { name:'1학년맞춤', day:'월~금', emoji:'📚', tuition:{q1:0}, materials:{q1:0}, sessions:{q1:0} },
  custom2:   { name:'2학년맞춤', day:'월~금', emoji:'📗', tuition:{q1:0}, materials:{q1:0}, sessions:{q1:0} },
};

const SUBSIDY_LIMITS = {
  free:   { name:'자유수강권', color:'chip-free',   emoji:'🎫' },
  grade3: { name:'초3이용권',  color:'chip-grade3', emoji:'🟢' },
  rural:  { name:'농산어촌',   color:'chip-rural',  emoji:'🌾' },
};

const QUARTER_LABELS = ['1분기','2분기','3분기','4분기'];

const CUSTOM1_TT = {
  '13:00~13:40': {mon:'정규수업', tue:'정규수업', wed:'미술여행', thu:'보드게임', fri:'정규수업'},
  '13:50~14:30': {mon:'창의독서', tue:'창의음악', wed:'미술여행', thu:'보드게임', fri:'전래놀이'},
  '14:40~15:20': {mon:'창의독서', tue:'창의음악', wed:'하교🏠',  thu:'하교🏠',  fri:'전래놀이'},
};
const CUSTOM2_TT = {
  '13:00~13:40': {mon:'정규수업', tue:'정규수업', wed:'창의음악', thu:'정규수업', fri:'정규수업'},
  '13:50~14:30': {mon:'전래놀이', tue:'보드게임', wed:'창의음악', thu:'창의독서', fri:'미술여행'},
  '14:40~15:20': {mon:'전래놀이', tue:'보드게임', wed:'하교🏠',  thu:'창의독서', fri:'미술여행'},
};

// Course day mapping (week day key)
const COURSE_DAY  = {art:'mon', badminton:'tue', dance:'wed', science:'thu', baduk:'fri'};
// After-school times A班(1-2학년) / B班(3-6학년)
const COURSE_TIME_A = {art:'13:50~14:50', badminton:'13:50~14:50', dance:'13:00~14:00', science:'13:50~14:50', baduk:'13:50~14:50'};
const COURSE_TIME_B = {art:'15:00~16:00', badminton:'15:00~16:00', dance:'14:10~15:10', science:'15:00~16:00', baduk:'15:00~16:00'};

let students = [
  {id:'S310010', grade:3, cls:1, num:10, name:'김빨강', subsidy:'grade3', enrollments:{1:['dance'],2:[],3:[],4:[]},     payments:{1:{paid:false},2:{paid:false},3:{paid:false},4:{paid:false}}},
  {id:'S120050', grade:1, cls:2, num:5,  name:'임주황', subsidy:'none',   enrollments:{1:['custom1','science'],2:[],3:[],4:[]}, payments:{1:{paid:false},2:{paid:false},3:{paid:false},4:{paid:false}}},
  {id:'S510200', grade:5, cls:1, num:20, name:'황노랑', subsidy:'free',   enrollments:{1:['baduk','science'],2:[],3:[],4:[]},  payments:{1:{paid:false},2:{paid:false},3:{paid:false},4:{paid:false}}},
  {id:'S610070', grade:6, cls:1, num:7,  name:'이초록', subsidy:'none',   enrollments:{1:[],2:[],3:[],4:[]},                   payments:{1:{paid:false},2:{paid:false},3:{paid:false},4:{paid:false}}},
  {id:'S420010', grade:4, cls:2, num:1,  name:'고파랑', subsidy:'none',   enrollments:{1:['dance','art'],2:[],3:[],4:[]},      payments:{1:{paid:false},2:{paid:false},3:{paid:false},4:{paid:false}}},
];

// 공지사항 데이터
let notices = [
  {id:1, title:'2026년 1분기 방과후 수강신청 안내', body:'4월 8일(수)~10일(금) 코디마스터를 통해 수강신청을 진행해 주시기 바랍니다.\n신청 기간 내에 신청하지 않으면 수강이 불가하오니 기간을 꼭 지켜주세요!', date:'2026-03-28', pinned:true},
  {id:2, title:'1분기 수강료 납부 안내', body:'수강료는 4월 20일(월)~24일(금) 스쿨뱅킹을 통해 자동 인출됩니다.\n계좌 잔액을 미리 확인해 주세요. 문의: 031-370-4907', date:'2026-04-10', pinned:false},
];
let nextNoticeId = 3;

let currentRole=null, currentUser=null, currentStudentId=null;
let currentTab='', currentQuarter=1;
let editingStudentId=null, enrollingStudentId=null, uploadData=[];

// ======================================================
// FIREBASE SYNC
// ======================================================
function getAppPayload(){
  return { students, notices, nextNoticeId };
}

function applyAppPayload(data){
  if(Array.isArray(data.students)) students = data.students;
  if(Array.isArray(data.notices)) notices = data.notices;
  if(typeof data.nextNoticeId === "number") nextNoticeId = data.nextNoticeId;
}

function setDataLoading(loading){
  const el = document.getElementById("dataLoading");
  const btn = document.querySelector(".btn-login");
  if(el) el.style.display = loading ? "block" : "none";
  if(btn) btn.disabled = loading;
}

function persistData(){
  if(!dataReady) return;
  const payload = getAppPayload();
  const json = JSON.stringify(payload);
  if(json === lastSavedJson) return;
  lastSavedJson = json;
  set(APP_DATA_REF, payload).catch(err=>{
    console.error("Firebase save failed:", err);
    alert("데이터 저장에 실패했습니다. 네트워크 연결을 확인해 주세요.");
  });
}

function schedulePersist(){
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistData, 300);
}

function initDataSync(){
  setDataLoading(true);
  onValue(APP_DATA_REF, snapshot=>{
    const data = snapshot.val();
    if(!data || !Array.isArray(data.students)){
      dataReady = true;
      setDataLoading(false);
      persistData();
      return;
    }
    const json = JSON.stringify(data);
    if(json !== lastSavedJson){
      applyAppPayload(data);
      lastSavedJson = JSON.stringify(getAppPayload());
      if(document.getElementById("mainApp")?.style.display !== "none" && currentTab){
        renderTab(currentTab);
      }else if(document.getElementById("mainApp")?.style.display !== "none"){
        buildNav();
      }
    }
    if(!dataReady){
      dataReady = true;
      setDataLoading(false);
    }
  }, err=>{
    console.error("Firebase load failed:", err);
    dataReady = true;
    setDataLoading(false);
    alert("데이터를 불러오지 못했습니다. 페이지를 새로고침해 주세요.");
  });
}

initDataSync();

// ======================================================
// HELPERS
// ======================================================
function calcFee(s,q){
  const cs=s.enrollments[q]||[];
  let t=0,m=0;
  cs.forEach(cid=>{const c=COURSES[cid];if(!c)return;t+=c.tuition[`q${q}`]||0;m+=c.materials[`q${q}`]||0;});
  return{tuition:t,materials:m,total:t+m};
}
function calcSubsidy(s,q){
  if(s.subsidy==='none')return 0;
  const fee=calcFee(s,q);
  if(s.subsidy==='free')  return Math.min(fee.tuition,150000);
  if(s.subsidy==='grade3')return Math.min(fee.tuition,125000);
  return 0;
}
function generateId(g,c,n){return `S${g}${c}${String(n).padStart(3,'0')}`;}
function getStudent(id){return students.find(s=>s.id===id);}
function gradeLabel(s){return `${s.grade}학년 ${s.cls}반 ${s.num}번`;}
function formatWon(n){return n.toLocaleString('ko-KR')+'원';}

function subsidyTag(type){
  if(type==='none')return '<span class="tag tag-gray">없음</span>';
  const s=SUBSIDY_LIMITS[type];
  return `<span class="subsidy-chip ${s.color}">${s.emoji} ${s.name}</span>`;
}

const TAG_COLORS=['tag-yellow','tag-sky','tag-mint','tag-lavender','tag-pink','tag-peach','tag-green'];
function courseTags(ids){
  if(!ids||ids.length===0)return '<span class="tag tag-gray">수강없음</span>';
  const keys=Object.keys(COURSES);
  return ids.map(id=>{const c=COURSES[id];if(!c)return '';const col=TAG_COLORS[keys.indexOf(id)%TAG_COLORS.length];return `<span class="tag ${col}">${c.emoji} ${c.name}</span>`;}).join('');
}

function ttClass(val){
  if(!val||val==='-')return 'tt-regular';
  if(val.includes('하교'))return 'tt-home';
  if(val==='정규수업')return 'tt-regular';
  if(val.includes('미술여행')||val.includes('창의미술')||val.includes('🎨'))return 'tt-art';
  if(val.includes('방송댄스')||val.includes('💃'))return 'tt-dance';
  if(val.includes('과학탐구')||val.includes('🔬'))return 'tt-science';
  if(val.includes('바둑')||val.includes('⚫'))return 'tt-baduk';
  if(val.includes('배드민턴')||val.includes('🏸'))return 'tt-badminton';
  return 'tt-after';
}

// ======================================================
// LOGIN
// ======================================================
function switchLoginTab(t){
  document.querySelectorAll('.login-tab').forEach((el,i)=>el.classList.toggle('active',(i===0&&t==='admin')||(i===1&&t==='student')));
  document.getElementById('adminLoginForm').style.display=t==='admin'?'':'none';
  document.getElementById('studentLoginForm').style.display=t==='student'?'':'none';
  document.getElementById('loginError').style.display='none';
}

function doLogin(){
  if(!dataReady){alert('데이터를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');return;}
  const isAdmin=document.getElementById('adminLoginForm').style.display!=='none';
  if(isAdmin){
    const code=document.getElementById('adminCode').value.trim().toUpperCase();
    if(code===ADMIN_CODE){currentRole='admin';currentUser='늘봄전담실';showApp();}else showLoginError();
  }else{
    const code=document.getElementById('studentCode').value.trim().toUpperCase();
    const s=students.find(st=>st.id===code);
    if(s){currentRole='student';currentStudentId=s.id;currentUser=s.name;showApp();}else showLoginError();
  }
}

function showLoginError(){
  const el=document.getElementById('loginError');el.style.display='block';
  setTimeout(()=>el.style.display='none',3000);
}

function doLogout(){
  currentRole=null;currentUser=null;currentStudentId=null;
  document.getElementById('mainApp').style.display='none';
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('adminCode').value='';
  document.getElementById('studentCode').value='';
}

function showApp(){
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('mainApp').style.display='flex';
  document.getElementById('headerUser').textContent=currentUser;
  document.getElementById('roleBadge').textContent=currentRole==='admin'?'👑 관리자':'🎒 학생·학부모';
  document.getElementById('roleBadge').className='header-badge '+(currentRole==='admin'?'badge-admin':'badge-student');
  buildNav();
  renderTab(currentRole==='admin'?'dashboard':'myInfo');
}

// ======================================================
// NAV
// ======================================================
function buildNav(){
  const tabs=currentRole==='admin'
    ?[{id:'dashboard',l:'📊 대시보드'},{id:'students',l:'👥 학생 관리'},{id:'enroll',l:'📚 수강 관리'},{id:'payment',l:'💳 수강료'},{id:'subsidy',l:'🎫 지원금'},{id:'courses',l:'📋 과목 안내'},{id:'notice',l:'📢 공지사항'}]
    :[{id:'myInfo',l:'📋 내 수강정보'},{id:'myPayment',l:'💳 납부현황'},{id:'courses',l:'📖 과목 안내'},{id:'notice',l:'📢 공지사항'}];
  document.getElementById('navTabs').innerHTML=tabs.map(t=>`<button class="nav-tab${t.id===currentTab?' active':''}" onclick="renderTab('${t.id}')">${t.l}</button>`).join('');
  // 학생에게 공지 벨 버튼 표시
  const bell=document.getElementById('noticeBell');
  const dot=document.getElementById('noticeDot');
  if(currentRole==='student'){
    bell.style.display='';
    dot.style.display=notices.length>0?'':'none';
  }else{
    bell.style.display='none';
  }
}

function renderTab(id){
  currentTab=id;buildNav();
  const c=document.getElementById('appContent');
  const map={dashboard:renderDashboard,students:renderStudents,enroll:renderEnroll,payment:renderPayment,subsidy:renderSubsidy,courses:renderCourses,myInfo:renderMyInfo,myPayment:renderMyPayment,notice:renderNotice};
  c.innerHTML=(map[id]||(() => ''))();
  // attach events
  if(id==='students'){
    document.getElementById('searchStudents')?.addEventListener('input',filterStudentTable);
    document.getElementById('filterGrade')?.addEventListener('change',filterStudentTable);
    document.getElementById('filterSubsidy')?.addEventListener('change',filterStudentTable);
  }
  if(id==='enroll'||id==='payment'){
    document.querySelectorAll('.quarter-tab').forEach(btn=>{
      btn.addEventListener('click',()=>{currentQuarter=parseInt(btn.dataset.q);renderTab(id);});
    });
  }
}

// ======================================================
// DASHBOARD
// ======================================================
function renderDashboard(){
  const total=students.length;
  const enrolled=students.filter(s=>(s.enrollments[1]||[]).length>0).length;
  const subN=students.filter(s=>s.subsidy!=='none').length;
  const totalFee=students.reduce((sum,s)=>sum+calcFee(s,1).total-calcSubsidy(s,1),0);
  let cc={};Object.keys(COURSES).forEach(k=>cc[k]=0);
  students.forEach(s=>(s.enrollments[1]||[]).forEach(cid=>{if(cc[cid]!==undefined)cc[cid]++;}));
  const pop=Object.entries(cc).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  const barFills=['fill-yellow','fill-mint','fill-sky','fill-sky','fill-mint','fill-yellow','fill-yellow'];

  return `
    <div class="section-title">📊 대시보드</div>
    <div class="section-sub">2026학년도 방과후 프로그램 현황 (1분기 기준) 🌸</div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon si-yellow">👧</div><div><div class="stat-value">${total}명</div><div class="stat-label">전체 학생</div></div></div>
      <div class="stat-card"><div class="stat-icon si-mint">📚</div><div><div class="stat-value">${enrolled}명</div><div class="stat-label">1분기 수강생</div></div></div>
      <div class="stat-card"><div class="stat-icon si-sky">🎫</div><div><div class="stat-value">${subN}명</div><div class="stat-label">지원금 대상</div></div></div>
      <div class="stat-card"><div class="stat-icon si-lav">💰</div><div><div class="stat-value" style="font-size:16px;">${formatWon(totalFee)}</div><div class="stat-label">1분기 총 납부예정</div></div></div>
    </div>

    <div class="grid-2" style="margin-bottom:16px;">
      <div class="card">
        <div class="card-header"><div class="card-title">🏆 과목별 수강 현황</div></div>
        ${pop.length===0?'<div class="empty-state"><div class="icon">📭</div><p>데이터 없음</p></div>':pop.map(([cid,cnt],i)=>{
          const c=COURSES[cid];const pct=Math.round(cnt/Math.max(total,1)*100);
          return `<div style="margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;">
              <span style="font-weight:700;">${c.emoji} ${c.name}</span>
              <span style="color:var(--text-mid);">${cnt}명 (${pct}%)</span>
            </div>
            <div class="progress-bar"><div class="progress-fill ${barFills[i%barFills.length]}" style="width:${pct}%"></div></div>
          </div>`;
        }).join('')}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">📅 1분기 주요 일정</div></div>
        <div style="font-size:13px;line-height:2.2;">
          <div style="display:flex;gap:8px;align-items:center;"><span class="tag tag-yellow">교육기간</span><span>4/13(월) ~ 6/12(금) · 9주</span></div>
          <div style="display:flex;gap:8px;align-items:center;"><span class="tag tag-mint">맞춤형</span><span>4/13(월) ~ 7/24(금) · 15주</span></div>
          <div style="display:flex;gap:8px;align-items:center;"><span class="tag tag-peach">수강료납부</span><span>4/20~24 스쿨뱅킹</span></div>
          <div style="display:flex;gap:8px;align-items:center;"><span class="tag tag-sky">수강신청</span><span>4/8(수)~10(금) 코디마스터</span></div>
          <hr style="border:none;border-top:1.5px dashed var(--border);margin:10px 0;">
          <div style="font-weight:700;color:var(--text-mid);margin-bottom:4px;">🚫 휴강일</div>
          <div style="color:var(--text-light);font-size:12px;">5/1 근로자의날 · 5/4 재량휴업 · 5/5 어린이날<br>5/25 대체휴일 · 6/3 지방선거</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">🧑‍🤝‍🧑 학생별 1분기 요약</div></div>
      <div class="table-container">
        <table>
          <thead><tr><th>이름</th><th>학년/반</th><th>수강과목</th><th>지원금</th><th>합계</th><th>지원금액</th><th>납부액</th></tr></thead>
          <tbody>
            ${students.map(s=>{const fee=calcFee(s,1);const sub=calcSubsidy(s,1);return`<tr>
              <td><strong>${s.name}</strong></td>
              <td style="font-size:12px;color:var(--text-mid);">${gradeLabel(s)}</td>
              <td>${courseTags(s.enrollments[1])}</td>
              <td>${subsidyTag(s.subsidy)}</td>
              <td>${formatWon(fee.total)}</td>
              <td style="color:var(--mint-dark);font-weight:700;">${sub>0?'- '+formatWon(sub):'-'}</td>
              <td><strong style="color:var(--sun-deep);">${formatWon(fee.total-sub)}</strong></td>
            </tr>`;}).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ======================================================
// STUDENTS
// ======================================================
function renderStudents(){
  return `
    <div class="section-title">👥 학생 관리</div>
    <div class="section-sub">학생 등록, 수정, 지원금·수강 과목 설정</div>
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <button class="btn btn-primary" onclick="openStudentModal()">＋ 학생 등록</button>
        <button class="btn btn-secondary" onclick="openUploadModal()">📊 엑셀 업로드</button>
        <div style="flex:1"></div>
        <input class="search-input" id="searchStudents" placeholder="🔍 이름 검색...">
        <select class="filter-select" id="filterGrade"><option value="">전체 학년</option>${[1,2,3,4,5,6].map(g=>`<option value="${g}">${g}학년</option>`).join('')}</select>
        <select class="filter-select" id="filterSubsidy"><option value="">전체 지원금</option><option value="none">지원없음</option><option value="free">자유수강권</option><option value="grade3">초3이용권</option></select>
      </div>
    </div>
    <div class="card">
      <div class="table-container">
        <table>
          <thead><tr><th>학생코드</th><th>학년/반/번호</th><th>이름</th><th>지원금</th><th>1분기 수강과목</th><th>관리</th></tr></thead>
          <tbody id="studentTableBody">${renderStudentRows(students)}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderStudentRows(list){
  return list.map(s=>`
    <tr data-grade="${s.grade}" data-subsidy="${s.subsidy}" data-name="${s.name}">
      <td><code style="font-size:11px;background:var(--sun-pale);padding:2px 7px;border-radius:6px;border:1px solid var(--border);">${s.id}</code></td>
      <td style="font-size:12px;">${gradeLabel(s)}</td>
      <td><strong>${s.name}</strong></td>
      <td>${subsidyTag(s.subsidy)}</td>
      <td>${courseTags(s.enrollments[1])}</td>
      <td><div style="display:flex;gap:5px;">
        <button class="btn btn-sm btn-secondary" onclick="openStudentModal('${s.id}')">✏️</button>
        <button class="btn btn-sm btn-success" onclick="openEnrollModal('${s.id}')">📚</button>
        <button class="btn btn-sm btn-danger" onclick="deleteStudent('${s.id}')">🗑️</button>
      </div></td>
    </tr>
  `).join('');
}

function filterStudentTable(){
  const search=document.getElementById('searchStudents').value.trim().toLowerCase();
  const grade=document.getElementById('filterGrade').value;
  const subsidy=document.getElementById('filterSubsidy').value;
  const filtered=students.filter(s=>{
    if(search&&!s.name.includes(search))return false;
    if(grade&&String(s.grade)!==grade)return false;
    if(subsidy&&s.subsidy!==subsidy)return false;
    return true;
  });
  document.getElementById('studentTableBody').innerHTML=renderStudentRows(filtered);
}

function openStudentModal(id=null){
  editingStudentId=id;
  document.getElementById('studentModalTitle').textContent=id?'✏️ 학생 정보 수정':'🧒 학생 등록';
  const s=id?getStudent(id):null;
  document.getElementById('f_grade').value=s?s.grade:'1';
  document.getElementById('f_class').value=s?s.cls:'1';
  document.getElementById('f_number').value=s?s.num:'';
  document.getElementById('f_name').value=s?s.name:'';
  document.getElementById('f_subsidy').value=s?s.subsidy:'none';
  const enrolled=s?(s.enrollments[1]||[]):[];
  document.getElementById('courseCheckGrid').innerHTML=Object.entries(COURSES).map(([cid,c])=>`
    <label class="check-item ${enrolled.includes(cid)?'checked':''}">
      <input type="checkbox" name="course" value="${cid}" ${enrolled.includes(cid)?'checked':''}
        onchange="this.parentElement.classList.toggle('checked',this.checked)">
      ${c.emoji} ${c.name}
    </label>
  `).join('');
  openModal('studentModal');
}

function saveStudent(){
  const grade=parseInt(document.getElementById('f_grade').value);
  const cls=parseInt(document.getElementById('f_class').value);
  const num=parseInt(document.getElementById('f_number').value);
  const name=document.getElementById('f_name').value.trim();
  const subsidy=document.getElementById('f_subsidy').value;
  const courses=[...document.querySelectorAll('#courseCheckGrid input:checked')].map(el=>el.value);
  if(!name||!num)return alert('이름과 번호를 입력해주세요.');
  if(editingStudentId){
    const s=getStudent(editingStudentId);
    Object.assign(s,{grade,cls,num,name,subsidy});s.enrollments[1]=courses;s.id=generateId(grade,cls,num);
  }else{
    const id=generateId(grade,cls,num);
    if(students.find(s=>s.id===id))return alert('이미 등록된 학생입니다.');
    students.push({id,grade,cls,num,name,subsidy,enrollments:{1:courses,2:[],3:[],4:[]},payments:{1:{paid:false},2:{paid:false},3:{paid:false},4:{paid:false}}});
  }
  closeModal('studentModal');renderTab('students');
  schedulePersist();
}

function deleteStudent(id){
  if(!confirm('정말 삭제하시겠습니까?'))return;
  students=students.filter(s=>s.id!==id);renderTab('students');
  schedulePersist();
}

// ======================================================
// ENROLL
// ======================================================
function renderEnroll(){
  const q=currentQuarter;
  return `
    <div class="section-title">📚 수강 관리</div>
    <div class="section-sub">분기별 수강 과목 설정 및 현황</div>
    <div class="quarter-tabs">${QUARTER_LABELS.map((l,i)=>`<button class="quarter-tab${q===i+1?' active':''}" data-q="${i+1}">${l}</button>`).join('')}</div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">🌸 ${QUARTER_LABELS[q-1]} 수강 현황</div>
        <button class="btn btn-secondary btn-sm" onclick="exportCSV()">📥 CSV</button>
      </div>
      <div class="table-container"><table>
        <thead><tr><th>이름</th><th>학년/반</th><th>수강과목</th><th>수강료+교구</th><th>지원금</th><th>납부액</th><th>수강설정</th></tr></thead>
        <tbody>${students.map(s=>{const fee=calcFee(s,q);const sub=calcSubsidy(s,q);return`<tr>
          <td><strong>${s.name}</strong></td>
          <td style="font-size:12px;color:var(--text-mid);">${gradeLabel(s)}</td>
          <td>${courseTags(s.enrollments[q])}</td>
          <td>${formatWon(fee.total)}</td>
          <td style="color:var(--mint-dark);">${sub>0?'- '+formatWon(sub):'-'}</td>
          <td><strong>${formatWon(fee.total-sub)}</strong></td>
          <td><button class="btn btn-sm btn-success" onclick="openEnrollModal('${s.id}',${q})">변경</button></td>
        </tr>`;}).join('')}</tbody>
      </table></div>
    </div>
  `;
}

function openEnrollModal(sid,q=currentQuarter){
  enrollingStudentId=sid;
  const s=getStudent(sid);const enrolled=s.enrollments[q]||[];
  document.getElementById('enrollModalTitle').textContent=`📚 ${s.name} - ${QUARTER_LABELS[q-1]} 수강설정`;
  document.getElementById('enrollModalContent').innerHTML=`
    <input type="hidden" id="enrollQuarter" value="${q}">
    <div class="info-box">${s.name} (${gradeLabel(s)})</div>
    <div class="form-group"><label>수강 과목 선택</label>
      <div class="check-grid">${Object.entries(COURSES).map(([cid,c])=>`
        <label class="check-item ${enrolled.includes(cid)?'checked':''}">
          <input type="checkbox" name="enroll_course" value="${cid}" ${enrolled.includes(cid)?'checked':''}
            onchange="this.parentElement.classList.toggle('checked',this.checked)">
          ${c.emoji} ${c.name}
        </label>`).join('')}</div>
    </div>`;
  openModal('enrollModal');
}

function saveEnroll(){
  const q=parseInt(document.getElementById('enrollQuarter').value);
  const courses=[...document.querySelectorAll('#enrollModalContent input[name="enroll_course"]:checked')].map(el=>el.value);
  getStudent(enrollingStudentId).enrollments[q]=courses;
  closeModal('enrollModal');
  if(currentTab==='enroll')renderTab('enroll');
  else if(currentTab==='students')renderTab('students');
  schedulePersist();
}

// ======================================================
// PAYMENT
// ======================================================
function renderPayment(){
  const q=currentQuarter;
  const total=students.reduce((sum,s)=>sum+calcFee(s,q).total-calcSubsidy(s,q),0);
  const paidC=students.filter(s=>s.payments[q]?.paid).length;
  return `
    <div class="section-title">💳 수강료 현황</div>
    <div class="section-sub">분기별 수강료 납부 현황 관리</div>
    <div class="quarter-tabs">${QUARTER_LABELS.map((l,i)=>`<button class="quarter-tab${q===i+1?' active':''}" data-q="${i+1}">${l}</button>`).join('')}</div>
    <div class="stats-grid" style="margin-bottom:16px;">
      <div class="stat-card"><div class="stat-icon si-yellow">💰</div><div><div class="stat-value" style="font-size:16px;">${formatWon(total)}</div><div class="stat-label">${QUARTER_LABELS[q-1]} 총 납부예정</div></div></div>
      <div class="stat-card"><div class="stat-icon si-mint">✅</div><div><div class="stat-value">${paidC}/${students.length}명</div><div class="stat-label">납부 완료</div></div></div>
      <div class="stat-card"><div class="stat-icon si-peach">⏳</div><div><div class="stat-value">${students.length-paidC}명</div><div class="stat-label">미납</div></div></div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">💳 상세 납부 현황</div>
        <button class="btn btn-secondary btn-sm" onclick="markAllPaid(${q})">전체 납부처리</button></div>
      <div class="table-container"><table>
        <thead><tr><th>이름</th><th>학년/반</th><th>수강료</th><th>교구재비</th><th>지원금</th><th>납부액</th><th>납부상태</th></tr></thead>
        <tbody>${students.map(s=>{const fee=calcFee(s,q);const sub=calcSubsidy(s,q);const net=fee.total-sub;const p=s.payments[q]?.paid;return`<tr>
          <td><strong>${s.name}</strong></td>
          <td style="font-size:12px;color:var(--text-mid);">${gradeLabel(s)}</td>
          <td>${formatWon(fee.tuition)}</td>
          <td>${formatWon(fee.materials)}</td>
          <td style="color:var(--mint-dark);">${sub>0?'- '+formatWon(sub):'-'}</td>
          <td><strong>${formatWon(net)}</strong></td>
          <td><label class="toggle-wrap"><label class="toggle">
            <input type="checkbox" ${p?'checked':''} onchange="togglePaid('${s.id}',${q},this.checked)">
            <span class="toggle-slider"></span></label>
            <span style="font-size:12px;font-weight:700;color:${p?'var(--mint-dark)':'var(--text-light)'};">${p?'✅ 완료':'⏳ 미납'}</span>
          </label></td>
        </tr>`;}).join('')}</tbody>
      </table></div>
    </div>
    <div class="card" style="margin-top:16px;">
      <div class="card-title" style="margin-bottom:12px;">📋 환불 규정 요약</div>
      <div style="font-size:13px;color:var(--text-mid);line-height:2.2;">
        <div>🔹 수강 개시 이전: <strong>납부 전액 환불</strong></div>
        <div>🔹 총 수강시간 50% 이내: <strong>납부금액 1/2 환불</strong> (교구재비 제외)</div>
        <div>🔹 총 수강시간 50% 초과: <strong style="color:var(--red);">환불 불가</strong></div>
        <div>🔹 납부기간: 4월 20일(월) ~ 24일(금) 스쿨뱅킹 자동인출</div>
      </div>
    </div>
  `;
}

function togglePaid(sid,q,val){getStudent(sid).payments[q]={paid:val};schedulePersist();}
function markAllPaid(q){if(!confirm(`${QUARTER_LABELS[q-1]} 전체 납부완료 처리하시겠습니까?`))return;students.forEach(s=>s.payments[q]={paid:true});renderTab('payment');schedulePersist();}

// ======================================================
// SUBSIDY
// ======================================================
function renderSubsidy(){
  const fS=students.filter(s=>s.subsidy==='free');
  const g3=students.filter(s=>s.subsidy==='grade3');
  return `
    <div class="section-title">🎫 지원금 관리</div>
    <div class="section-sub">학생별 지원금 유형 및 사용 현황 관리</div>
    <div class="stats-grid" style="margin-bottom:16px;">
      <div class="stat-card"><div class="stat-icon si-yellow">🎫</div><div><div class="stat-value">${fS.length}명</div><div class="stat-label">자유수강권</div></div></div>
      <div class="stat-card"><div class="stat-icon si-mint">🟢</div><div><div class="stat-value">${g3.length}명</div><div class="stat-label">초3이용권</div></div></div>
      <div class="stat-card"><div class="stat-icon si-sky">🌾</div><div><div class="stat-value">-</div><div class="stat-label">농산어촌 (2분기~)</div></div></div>
    </div>
    <div class="grid-2" style="margin-bottom:16px;">
      <div class="card">
        <div class="card-title" style="margin-bottom:14px;">🎫 자유수강권 (연간 60만원)</div>
        ${fS.length===0?'<div class="empty-state"><div class="icon">🎫</div><p>해당 학생 없음</p></div>':`
          <table><thead><tr><th>이름</th><th>학년/반</th><th>연간 사용액 합계</th><th>연간 잔여액</th></tr></thead>
          <tbody>${fS.map(s=>{
            const totalUsed=[1,2,3,4].reduce((sum,q)=>sum+calcSubsidy(s,q),0);
            const remain=Math.max(0,600000-totalUsed);
            return`<tr>
            <td><strong>${s.name}</strong></td><td style="font-size:12px;">${gradeLabel(s)}</td>
            <td style="color:var(--mint-dark);font-weight:700;">${formatWon(totalUsed)}</td>
            <td style="color:${remain===0?'var(--red)':'var(--text-dark)'};font-weight:700;">${formatWon(remain)}</td>
          </tr>`;}).join('')}</tbody></table>`}
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:14px;">🟢 초3이용권 (연간 50만원)</div>
        ${g3.length===0?'<div class="empty-state"><div class="icon">🟢</div><p>해당 학생 없음</p></div>':`
          <table><thead><tr><th>이름</th><th>학년/반</th><th>1분기 사용</th><th>상반기잔여</th></tr></thead>
          <tbody>${g3.map(s=>{const used=calcSubsidy(s,1);return`<tr>
            <td><strong>${s.name}</strong></td><td style="font-size:12px;">${gradeLabel(s)}</td>
            <td style="color:var(--mint-dark);font-weight:700;">${formatWon(used)}</td>
            <td>${formatWon(Math.max(0,250000-used))}</td>
          </tr>`;}).join('')}</tbody></table>`}
      </div>
    </div>
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title" style="margin-bottom:12px;">🌾 농산어촌 지원금 (2분기부터)</div>
      <div class="info-box">📌 농산어촌 지원금은 2분기(여름방학)부터 지원될 예정입니다.</div>
      <div class="empty-state" style="padding:20px;"><div class="icon">🌾</div><p>2분기 개시 후 활성화됩니다</p></div>
    </div>
    <div class="card">
      <div class="card-title" style="margin-bottom:14px;">⚙️ 학생별 지원금 설정</div>
      <div class="table-container"><table>
        <thead><tr><th>이름</th><th>학년/반</th><th>현재 지원금</th><th>변경</th></tr></thead>
        <tbody>${students.map(s=>`<tr>
          <td><strong>${s.name}</strong></td>
          <td style="font-size:12px;">${gradeLabel(s)}</td>
          <td>${subsidyTag(s.subsidy)}</td>
          <td><select class="filter-select" style="font-size:12px;padding:5px 10px;" onchange="changeSubsidy('${s.id}',this.value)">
            <option value="none" ${s.subsidy==='none'?'selected':''}>해당없음</option>
            <option value="free" ${s.subsidy==='free'?'selected':''}>🎫 자유수강권</option>
            <option value="grade3" ${s.subsidy==='grade3'?'selected':''}>🟢 초3이용권</option>
          </select></td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>
  `;
}

function changeSubsidy(sid,val){getStudent(sid).subsidy=val;schedulePersist();}

// ======================================================
// COURSES
// ======================================================
function renderCourses(){
  const details=[
    {id:'art',      teacher:'정○영', phone:'010-9280-1673', loc:'2층 방과후3반', desc:'사물 관찰과 기초 드로잉, 색종이·클레이·종이접기·조형 활동을 통한 창의적 미술 표현'},
    {id:'badminton',teacher:'장○훈', phone:'010-2585-5505', loc:'체육관',       desc:'기본 그립·서비스부터 하이클리어·드롭샷·스매시까지 단계별 학습, 신체 민첩성 강화', note:'라켓 개별 준비'},
    {id:'dance',    teacher:'윤○나', phone:'010-4201-3302', loc:'2층 방과후3반', desc:'최신 K-POP 안무 완곡 목표, 기초 리듬·아이솔레이션부터 맘보·재즈스퀘어 등 기본 스텝'},
    {id:'science',  teacher:'김○현', phone:'010-6365-7983', loc:'2층 방과후3반', desc:'실블록 시소·뽑기 기계·미니 공기청정기 제작 등 실습 위주 과학 탐구 활동'},
    {id:'baduk',    teacher:'임○순', phone:'010-5274-9236', loc:'2층 방과후3반', desc:'바둑 기본 예절·활로부터 단수·호구·축·장문 등 기초·응용 기술, 기보 및 실전 대국'},
  ];
  const bgC={art:'var(--peach)',badminton:'var(--mint)',dance:'var(--pink)',science:'var(--sky)',baduk:'var(--lavender)'};

  return `
    <div class="section-title">📋 과목 안내</div>
    <div class="section-sub">2026학년도 1분기 방과후 프로그램 과목 상세</div>
    <div style="display:grid;gap:14px;margin-bottom:16px;">
      ${details.map(cd=>{const c=COURSES[cd.id];return`
        <div class="card" style="border-left:4px solid var(--sun-dark);">
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
            <div style="width:54px;height:54px;background:${bgC[cd.id]};border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;">${c.emoji}</div>
            <div style="flex:1;min-width:160px;">
              <div style="font-family:'Jua',sans-serif;font-size:17px;color:var(--text-dark);">${c.name}</div>
              <div style="font-size:12px;color:var(--text-mid);margin-top:2px;">📅 매주 ${c.day}요일 · 📍 ${cd.loc}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div class="tag tag-yellow">수강료 ${formatWon(c.tuition.q1)}</div>
              <div class="tag ${c.materials.q1>0?'tag-peach':'tag-mint'}" style="margin-top:4px;">${c.materials.q1>0?'교구재 '+formatWon(c.materials.q1):'교구재비 없음'}</div>
            </div>
          </div>
          <div style="margin-top:12px;font-size:13px;color:var(--text-mid);line-height:1.8;padding:10px 14px;background:var(--sun-pale);border-radius:var(--radius-sm);border:1px solid var(--border);">${cd.desc}</div>
          <div style="display:flex;gap:12px;margin-top:10px;font-size:12px;color:var(--text-light);flex-wrap:wrap;">
            <span>👩‍🏫 ${cd.teacher} (${cd.phone})</span>
            ${cd.note?`<span>📌 ${cd.note}</span>`:''}
          </div>
          <div style="margin-top:10px;">
            <span class="tag tag-sky">A반(1~2학년) ${cd.id==='dance'?'13:00~14:00':'13:50~14:50'}</span>
            <span class="tag tag-lavender" style="margin-left:4px;">B반(3~6학년) ${cd.id==='dance'?'14:10~15:10':'15:00~16:00'}</span>
            <span class="tag tag-yellow" style="margin-left:4px;">${c.sessions.q1}회차</span>
          </div>
        </div>
      `;}).join('')}
    </div>
    <div class="card">
      <div class="card-title" style="margin-bottom:14px;">📚 1~2학년 맞춤형 프로그램 (수강료 없음)</div>
      <div class="info-box">맞춤형은 주5일 하루 2회차 모두 수강 가능해야 신청 가능합니다.</div>
      <div class="grid-2">
        ${[{label:'📗 1학년 맞춤 (방과후1반)',tt:CUSTOM1_TT},{label:'📘 2학년 맞춤 (방과후2반)',tt:CUSTOM2_TT}].map(({label,tt})=>`
          <div>
            <div style="font-family:'Jua',sans-serif;font-size:14px;margin-bottom:8px;">${label}</div>
            <div class="timetable-wrap">
              <table class="timetable">
                <thead><tr><th>시간</th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th></tr></thead>
                <tbody>${Object.entries(tt).map(([time,days])=>`
                  <tr><td class="time-col">${time}</td>
                    ${['mon','tue','wed','thu','fri'].map(d=>`<td><span class="tt-cell ${ttClass(days[d])}">${days[d]}</span></td>`).join('')}
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ======================================================
// MY INFO - TIMETABLE VIEW
// ======================================================
function renderMyInfo(){
  const s=getStudent(currentStudentId);
  if(!s)return '<div class="empty-state"><div class="icon">❌</div><p>학생 정보를 찾을 수 없습니다.</p></div>';

  const cs1=s.enrollments[1]||[];
  const DAYS=['mon','tue','wed','thu','fri'];
  const DAYNAMES=['월','화','수','목','금'];

  const hasC1=cs1.includes('custom1');
  const hasC2=cs1.includes('custom2');
  const isLow=s.grade<=2;
  const courseTimeRef=isLow?COURSE_TIME_A:COURSE_TIME_B;

  // Which after-school course is on which day
  const dayToAfter={};
  cs1.forEach(cid=>{const d=COURSE_DAY[cid];if(d)dayToAfter[d]=cid;});

  // Build home times per day
  const homeTime={mon:'',tue:'',wed:'',thu:'',fri:''};

  if(hasC1){
    homeTime.mon='15:20'; homeTime.tue='15:20'; homeTime.wed='약 13:30'; homeTime.thu='약 13:30'; homeTime.fri='15:20';
  }else if(hasC2){
    homeTime.mon='15:20'; homeTime.tue='15:20'; homeTime.wed='약 13:30'; homeTime.thu='15:20'; homeTime.fri='15:20';
  }else{
    DAYS.forEach(d=>{homeTime[d]='정규수업 후';});
  }

  // Override home time with after-school end time on that day
  Object.entries(dayToAfter).forEach(([day,cid])=>{
    const t=courseTimeRef[cid]||COURSE_TIME_A[cid];
    if(t){const end=t.split('~')[1]; homeTime[day]=end;}
  });

  // Build timetable rows
  let rows=[];

  if(hasC1||hasC2){
    const tt=hasC1?CUSTOM1_TT:CUSTOM2_TT;
    Object.entries(tt).forEach(([time,days])=>{
      const row={time};
      DAYS.forEach(d=>{
        if(dayToAfter[d]){
          const cid=dayToAfter[d];const c=COURSES[cid];
          const t=COURSE_TIME_A[cid];
          // Overlay after-school label on relevant time slots
          if(t){
            const [ts,te]=t.split('~');
            // Rough overlap check
            if((time==='13:50~14:30'&&ts==='13:50')||(time==='14:40~15:20'&&ts==='13:50')){
              row[d]=`${c.emoji}${c.name}`;return;
            }
          }
        }
        row[d]=days[d];
      });
      rows.push(row);
    });
  } else if(cs1.length>0){
    const usedTimes=new Set();
    cs1.forEach(cid=>{const t=courseTimeRef[cid];if(t)usedTimes.add(t);});
    [...usedTimes].sort().forEach(time=>{
      const row={time};
      DAYS.forEach(d=>{
        const cid=dayToAfter[d];
        if(cid&&(courseTimeRef[cid]===time||COURSE_TIME_A[cid]===time)){
          row[d]=`${COURSES[cid].emoji} ${COURSES[cid].name}`;
        }else{row[d]='-';}
      });
      rows.push(row);
    });
  } else {
    rows=[{time:'수강없음',mon:'-',tue:'-',wed:'-',thu:'-',fri:'-'}];
  }

  // Home time highlights
  const highlights=[];
  DAYS.forEach((d,i)=>{
    const ht=homeTime[d];
    if(ht&&ht!=='정규수업 후'&&ht!==''){
      highlights.push(`<strong>${DAYNAMES[i]}요일</strong>: ${ht} 하교`);
    }
  });

  // 최신 공지사항 배너 (있으면 표시)
  const latestNotice = notices.length > 0 ? notices[notices.length-1] : null;
  const noticeBanner = latestNotice ? `
    <div class="student-notice-latest" onclick="renderTab('notice')">
      <span style="font-size:18px;flex-shrink:0;">📢</span>
      <div>
        <div style="font-weight:700;font-size:12px;opacity:0.7;margin-bottom:2px;">최신 공지사항</div>
        <div style="font-weight:700;">${latestNotice.title}</div>
        <div style="font-size:12px;opacity:0.75;margin-top:2px;">${latestNotice.date} &nbsp;·&nbsp; 탭하여 전체 공지 보기 →</div>
      </div>
    </div>
  ` : '';

  return `
    ${noticeBanner}
    <div class="student-profile">
      <div class="student-avatar">🎒</div>
      <div>
        <div class="student-name">${s.name}</div>
        <div class="student-info">${gradeLabel(s)}</div>
        <div style="margin-top:8px;">${subsidyTag(s.subsidy)}</div>
      </div>
    </div>

    ${s.subsidy!=='none'?(()=>{
      const SUBSIDY_INFO={
        free:  {label:'🎫 자유수강권', annual:600000, desc:'연간 60만원 (분기당 최대 15만원)'},
        grade3:{label:'🟢 초3 방과후 이용권', annual:500000, desc:'연간 50만원 (상반기 최대 25만원)'},
      };
      const info=SUBSIDY_INFO[s.subsidy];
      if(!info)return '';
      const totalUsed=[1,2,3,4].reduce((sum,q)=>sum+calcSubsidy(s,q),0);
      const remain=Math.max(0,info.annual-totalUsed);
      const usedPct=Math.min(100,Math.round(totalUsed/info.annual*100));
      const quarterRows=[1,2,3,4].map(q=>{
        const used=calcSubsidy(s,q);
        const courses=s.enrollments[q]||[];
        if(courses.length===0&&used===0)return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px dashed var(--border);font-size:12px;"><span style="color:var(--text-light);">${QUARTER_LABELS[q-1]}</span><span style="color:var(--text-light);">수강없음</span></div>`;
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px dashed var(--border);font-size:12px;">
          <span style="color:var(--text-mid);">${QUARTER_LABELS[q-1]}</span>
          <span style="font-weight:700;color:${used>0?'var(--mint-dark)':'var(--text-light)'};">${used>0?'- '+formatWon(used):'0원'}</span>
        </div>`;
      }).join('');
      return `
        <div class="card" style="margin-bottom:18px;border:2px solid var(--mint);background:var(--mint-light);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <div style="font-family:'Jua',sans-serif;font-size:16px;color:var(--text-dark);">${info.label} 사용 현황</div>
            <span class="tag tag-mint" style="font-size:12px;">${info.desc}</span>
          </div>
          <div style="display:flex;gap:14px;margin-bottom:14px;flex-wrap:wrap;">
            <div style="flex:1;min-width:120px;background:white;border-radius:var(--radius-sm);padding:12px 14px;border:1px solid var(--mint);">
              <div style="font-size:11px;color:var(--text-mid);margin-bottom:4px;">총 지원 한도</div>
              <div style="font-family:'Jua',sans-serif;font-size:18px;color:var(--text-dark);">${formatWon(info.annual)}</div>
            </div>
            <div style="flex:1;min-width:120px;background:white;border-radius:var(--radius-sm);padding:12px 14px;border:1px solid var(--mint);">
              <div style="font-size:11px;color:var(--text-mid);margin-bottom:4px;">누적 사용액</div>
              <div style="font-family:'Jua',sans-serif;font-size:18px;color:var(--mint-dark);">${formatWon(totalUsed)}</div>
            </div>
            <div style="flex:1;min-width:120px;background:white;border-radius:var(--radius-sm);padding:12px 14px;border:1px solid ${remain===0?'var(--red)':'var(--mint)'};">
              <div style="font-size:11px;color:var(--text-mid);margin-bottom:4px;">잔여액</div>
              <div style="font-family:'Jua',sans-serif;font-size:18px;color:${remain===0?'var(--red)':'var(--sun-deep)'};">${formatWon(remain)}</div>
            </div>
          </div>
          <div style="margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-mid);margin-bottom:4px;"><span>사용률</span><span>${usedPct}%</span></div>
            <div class="progress-bar"><div class="progress-fill ${usedPct>=90?'':'fill-mint'}" style="width:${usedPct}%;${usedPct>=90?'background:linear-gradient(90deg,var(--peach-dark),var(--red));':''}"></div></div>
          </div>
          <div style="background:white;border-radius:var(--radius-sm);padding:10px 14px;border:1px solid var(--mint);">
            <div style="font-size:12px;font-weight:700;color:var(--text-mid);margin-bottom:6px;">📋 분기별 지원금 사용 내역</div>
            ${quarterRows}
          </div>
        </div>
      `;
    })():''}

    <div class="section-title" style="margin-bottom:4px;">🗓️ 주간 시간표 (1분기)</div>
    <div class="section-sub">수강 중인 방과후·맞춤형 프로그램 일정</div>

    ${highlights.length>0?`
      <div class="home-time-banner">
        🏠 하교 시간 안내<br>
        ${highlights.join('<br>')}
      </div>
    `:''}

    <div class="card" style="margin-bottom:16px;">
      <div class="card-title" style="margin-bottom:12px;">📅 요일별 시간표</div>
      <div class="timetable-wrap">
        <table class="timetable">
          <thead>
            <tr>
              <th>시간</th>
              ${DAYNAMES.map((dn,i)=>{
                const cid=dayToAfter[DAYS[i]];
                const sub=cid?`<br><span style="font-size:10px;opacity:0.8;">${COURSES[cid].emoji}${COURSES[cid].name}</span>`
                  :(hasC1||hasC2)&&DAYS[i]!=='wed'?'<br><span style="font-size:10px;opacity:0.7;">맞춤형</span>':'';
                return `<th>${dn}요일${sub}</th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row=>`<tr>
              <td class="time-col">${row.time}</td>
              ${DAYS.map(d=>{const val=row[d]||'-';return`<td><span class="tt-cell ${ttClass(val)}">${val}</span></td>`;}).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="tt-legend">
        <span><span class="tt-cell tt-after">맞춤형</span> 맞춤형 활동</span>
        <span><span class="tt-cell tt-home">하교🏠</span> 하교 시간</span>
        <span><span class="tt-cell tt-regular">정규수업</span> 정규수업</span>
        <span><span class="tt-cell tt-science">🔬과학탐구</span> 방과후 과목</span>
        <span><span class="tt-cell tt-art">🎨창의미술</span></span>
        <span><span class="tt-cell tt-dance">💃방송댄스</span></span>
      </div>
    </div>

    <div class="section-title" style="margin-bottom:4px;">📦 분기별 수강·납부 현황</div>
    <div class="section-sub">수강료 및 지원금 확인</div>
    <div style="display:grid;gap:12px;">
      ${QUARTER_LABELS.map((label,i)=>{
        const q=i+1;const courses=s.enrollments[q]||[];
        const fee=calcFee(s,q);const sub=calcSubsidy(s,q);const net=fee.total-sub;
        const paid=s.payments[q]?.paid;const isActive=q===1;
        return`<div class="card" style="${isActive?'border:2px solid var(--sun-dark);':''}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <div style="font-family:'Jua',sans-serif;font-size:15px;">${isActive?'🌟':''} ${label}</div>
            <div style="display:flex;gap:6px;">
              ${isActive?'<span class="tag tag-yellow">진행중</span>':'<span class="tag tag-gray">예정</span>'}
              <span class="tag ${paid?'tag-green':'tag-gray'}">${paid?'✅ 납부완료':'⏳ 미납'}</span>
            </div>
          </div>
          ${courses.length===0?'<div style="font-size:13px;color:var(--text-light);">수강 과목 없음</div>':`
            <div style="margin-bottom:10px;">${courseTags(courses)}</div>
            <div class="receipt">
              <div class="receipt-row"><span class="receipt-label">수강료 합계</span><span class="receipt-value">${formatWon(fee.tuition)}</span></div>
              <div class="receipt-row"><span class="receipt-label">교구재비</span><span class="receipt-value">${formatWon(fee.materials)}</span></div>
              ${sub>0?`<div class="receipt-row"><span class="receipt-label" style="color:var(--mint-dark);">🎫 지원금 할인</span><span class="receipt-value" style="color:var(--mint-dark);">- ${formatWon(sub)}</span></div>`:''}
              <div class="receipt-total"><span>최종 납부액</span><span>${formatWon(net)}</span></div>
            </div>`}
        </div>`;
      }).join('')}
    </div>
  `;
}

// ======================================================
// MY PAYMENT
// ======================================================
function renderMyPayment(){
  const s=getStudent(currentStudentId);
  return `
    <div class="section-title">💳 납부 현황</div>
    <div class="section-sub">${s.name}님의 수강료 납부 상태</div>
    <div class="info-box">📌 수강료 납부: 4월 20일(월) ~ 24일(금) 스쿨뱅킹 자동인출<br>문의: 늘봄전담실 ☎ 031-370-4907 / 031-370-4993</div>
    ${QUARTER_LABELS.map((label,i)=>{
      const q=i+1;const fee=calcFee(s,q);const sub=calcSubsidy(s,q);const net=fee.total-sub;
      const paid=s.payments[q]?.paid;const courses=s.enrollments[q]||[];
      return`<div class="card" style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="font-family:'Jua',sans-serif;font-size:15px;">${label}</div>
          <span class="tag ${paid?'tag-green':'tag-gray'}">${paid?'✅ 납부완료':'⏳ 미납'}</span>
        </div>
        ${courses.length===0?'<div style="font-size:13px;color:var(--text-light);">수강 과목 없음 (납부없음)</div>':`
          <div class="receipt">
            <div class="receipt-row"><span class="receipt-label">수강료</span><span class="receipt-value">${formatWon(fee.tuition)}</span></div>
            <div class="receipt-row"><span class="receipt-label">교구재비</span><span class="receipt-value">${formatWon(fee.materials)}</span></div>
            ${sub>0?`<div class="receipt-row"><span class="receipt-label" style="color:var(--mint-dark);">지원금</span><span class="receipt-value" style="color:var(--mint-dark);">- ${formatWon(sub)}</span></div>`:''}
            <div class="receipt-total"><span>납부액</span><span>${formatWon(net)}</span></div>
          </div>`}
      </div>`;
    }).join('')}
    <div class="card">
      <div class="card-title" style="margin-bottom:12px;">📋 환불 안내</div>
      <div style="font-size:13px;color:var(--text-mid);line-height:2.2;">
        <div>🔹 수강 개시 전: <strong>전액 환불</strong></div>
        <div>🔹 수강 50% 이내: <strong>납부금 1/2 환불</strong> (교구재비 제외)</div>
        <div>🔹 수강 50% 초과: <strong style="color:var(--red);">환불 불가</strong></div>
        <div style="color:var(--red);margin-top:6px;font-size:12px;">⚠️ 학교장허가 교외체험학습, 질병 결석 등은 환불 대상 아님</div>
      </div>
    </div>
  `;
}

// ======================================================
// UPLOAD / CSV
// ======================================================
// ======================================================
// NOTICE (공지사항)
// ======================================================
function renderNotice(){
  if(currentRole==='admin') return renderNoticeAdmin();
  return renderNoticeStudent();
}

function formatDate(d){
  return d.replace(/-/g,'.'); 
}

function renderNoticeAdmin(){
  const sorted=[...notices].sort((a,b)=>b.id-a.id); // 최신순
  return `
    <div class="section-title">📢 공지사항 관리</div>
    <div class="section-sub">학생·학부모에게 전달할 공지사항을 작성하고 관리합니다.</div>

    <div class="notice-write-area">
      <div style="font-family:'Jua',sans-serif;font-size:15px;color:var(--text-dark);margin-bottom:12px;">✏️ 새 공지사항 작성</div>
      <input class="notice-title-input" id="noticeTitle" placeholder="공지 제목을 입력하세요">
      <textarea class="notice-input" id="noticeBody" placeholder="공지 내용을 입력하세요..."></textarea>
      <div style="display:flex;gap:10px;margin-top:10px;align-items:center;">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-mid);cursor:pointer;">
          <input type="checkbox" id="noticePinned"> 📌 상단 고정
        </label>
        <div style="flex:1;"></div>
        <button class="btn btn-primary" onclick="postNotice()">📤 공지 등록</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">📋 공지사항 목록 <span style="font-size:12px;color:var(--text-light);font-family:'Noto Sans KR',sans-serif;font-weight:400;">총 ${notices.length}건</span></div>
      </div>
      ${sorted.length===0?'<div class="empty-state"><div class="icon">📭</div><p>등록된 공지사항이 없습니다.</p></div>':
        sorted.map(n=>`
          <div class="notice-item" style="${n.pinned?'border-color:var(--sun-dark);background:var(--sun-pale);':''}">
            <div class="notice-item-header">
              <div class="notice-item-title">
                ${n.pinned?'📌 ':''}${n.title}
              </div>
              <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                <span class="notice-item-date">${formatDate(n.date)}</span>
                <button class="btn btn-sm ${n.pinned?'btn-primary':'btn-secondary'}" style="padding:3px 9px;font-size:11px;" onclick="togglePin(${n.id})">${n.pinned?'고정중':'고정'}</button>
                <button class="btn btn-sm btn-danger" style="padding:3px 9px;font-size:11px;" onclick="deleteNotice(${n.id})">삭제</button>
              </div>
            </div>
            <div class="notice-item-body">${n.body}</div>
          </div>
        `).join('')
      }
    </div>
  `;
}

function renderNoticeStudent(){
  const pinned=notices.filter(n=>n.pinned).sort((a,b)=>b.id-a.id);
  const regular=notices.filter(n=>!n.pinned).sort((a,b)=>b.id-a.id);
  const sorted=[...pinned,...regular];
  const today=new Date().toISOString().slice(0,10);
  const isNew=(d)=>{ const nd=new Date(d); const td=new Date(today); return (td-nd)/(1000*60*60*24)<=7; };
  return `
    <div class="section-title">📢 공지사항</div>
    <div class="section-sub">늘봄전담실에서 전달하는 방과후·돌봄 관련 공지입니다.</div>
    ${sorted.length===0
      ?'<div class="card"><div class="empty-state"><div class="icon">📭</div><p>등록된 공지사항이 없습니다.</p></div></div>'
      :`<div class="card">
        ${sorted.map(n=>`
          <div class="notice-item" style="${n.pinned?'border-color:var(--sun-dark);background:var(--sun-pale);':''}">
            <div class="notice-item-header">
              <div class="notice-item-title">
                ${n.pinned?'📌 ':''}
                ${isNew(n.date)?'<span class="notice-new-badge">NEW</span>':''}
                ${n.title}
              </div>
              <span class="notice-item-date">${formatDate(n.date)}</span>
            </div>
            <div class="notice-item-body">${n.body}</div>
          </div>
        `).join('')}
      </div>`
    }
    <div style="margin-top:14px;font-size:12px;color:var(--text-light);text-align:center;">
      문의: 서봉초등학교 늘봄전담실 ☎ 031-370-4907
    </div>
  `;
}

function postNotice(){
  const title=document.getElementById('noticeTitle').value.trim();
  const body=document.getElementById('noticeBody').value.trim();
  const pinned=document.getElementById('noticePinned').checked;
  if(!title)return alert('제목을 입력해주세요.');
  if(!body)return alert('내용을 입력해주세요.');
  const today=new Date();
  const dateStr=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  notices.push({id:nextNoticeId++, title, body, date:dateStr, pinned});
  renderTab('notice');
  schedulePersist();
}

function deleteNotice(id){
  if(!confirm('공지사항을 삭제하시겠습니까?'))return;
  notices=notices.filter(n=>n.id!==id);
  renderTab('notice');
  schedulePersist();
}

function togglePin(id){
  const n=notices.find(n=>n.id===id);
  if(n)n.pinned=!n.pinned;
  renderTab('notice');
  schedulePersist();
}

function downloadSampleCSV(){
  const rows=[
    ['학년','반','번호','이름'],
    ['1','1','1','홍길동'],
    ['2','2','5','김영희'],
    ['3','1','10','이철수'],
    ['4','2','3','박민준'],
    ['5','1','7','최수아'],
    ['6','2','15','정다은'],
  ];
  const csv=rows.map(r=>r.join(',')).join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='학생명단_업로드_샘플.csv';a.click();
}
function openUploadModal(){openModal('uploadModal');}
function handleFileUpload(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const text=e.target.result;const lines=text.split('\n').filter(l=>l.trim());
    uploadData=[];const preview=[];
    lines.forEach((line,idx)=>{
      if(idx===0&&isNaN(line.split(',')[0]))return;
      const cols=line.split(',').map(c=>c.trim().replace(/"/g,''));
      if(cols.length>=4){
        const grade=parseInt(cols[0]),cls=parseInt(cols[1]),num=parseInt(cols[2]),name=cols[3];
        if(!isNaN(grade)&&!isNaN(cls)&&!isNaN(num)&&name){uploadData.push({grade,cls,num,name});preview.push(`${grade}학년 ${cls}반 ${num}번 ${name}`);}
      }
    });
    document.getElementById('uploadPreview').innerHTML=uploadData.length>0
      ?`<div class="info-box">총 ${uploadData.length}명 인식됨<br>${preview.slice(0,5).join('<br>')}${preview.length>5?'<br>...':''}</div>`
      :'<div class="warning-box">인식된 학생 없음. 파일 형식을 확인해주세요.</div>';
  };
  reader.readAsText(file,'UTF-8');
}
function confirmUpload(){
  if(uploadData.length===0)return alert('업로드할 학생 데이터가 없습니다.');
  let added=0;
  uploadData.forEach(d=>{const id=generateId(d.grade,d.cls,d.num);if(!students.find(s=>s.id===id)){students.push({id,grade:d.grade,cls:d.cls,num:d.num,name:d.name,subsidy:'none',enrollments:{1:[],2:[],3:[],4:[]},payments:{1:{paid:false},2:{paid:false},3:{paid:false},4:{paid:false}}});added++;}});
  closeModal('uploadModal');alert(`${added}명 추가 완료 (중복 ${uploadData.length-added}명 제외)`);renderTab('students');
  schedulePersist();
}
function exportCSV(){
  const q=currentQuarter;
  const rows=[['이름','학년','반','번호','수강과목','수강료','교구재비','지원금','납부액','납부상태']];
  students.forEach(s=>{const fee=calcFee(s,q);const sub=calcSubsidy(s,q);rows.push([s.name,s.grade,s.cls,s.num,(s.enrollments[q]||[]).map(c=>COURSES[c]?.name||c).join('/'),fee.tuition,fee.materials,sub,fee.total-sub,s.payments[q]?.paid?'납부완료':'미납']);});
  const csv=rows.map(r=>r.join(',')).join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`방과후_${QUARTER_LABELS[q-1]}_수강현황.csv`;a.click();
}

// ======================================================
// MODAL HELPERS
// ======================================================
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-overlay').forEach(o=>{o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');});});

Object.assign(window,{
  switchLoginTab,doLogin,doLogout,renderTab,
  openStudentModal,saveStudent,deleteStudent,
  openEnrollModal,saveEnroll,
  togglePaid,markAllPaid,changeSubsidy,
  openUploadModal,handleFileUpload,confirmUpload,downloadSampleCSV,exportCSV,
  postNotice,deleteNotice,togglePin,
  openModal,closeModal,
});
