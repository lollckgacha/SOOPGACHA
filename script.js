/* script.js - 최종 완성본 (크루별 보기에서 멤버 이름 검색 지원) */

/* =========================================================================
   [1] 전역 변수 및 설정
   ========================================================================= */
let userCoins = 600; 
let userBP = 0; 
let ownedCards = {}; 
let myCrew = Array(6).fill(null); 
let myCrewLogo = 'default'; 
let myCrewName = ""; 
let myCrewColor = "#ffffff"; 
let myCrewSize = 6; 
let currentFormationKey = '1-4-3-3'; 

// 진형 설정
const FORMATIONS = {
    '1-4-4-2': [1, 4, 4, 2],
    '1-4-3-3': [1, 4, 3, 3],
    '1-3-4-3': [1, 3, 4, 3],
    '1-4-2-3-1': [1, 4, 2, 3, 1],
    '1-3-5-2': [1, 3, 5, 2]
};

// 초성 리스트
const CHOSUNG_LIST = ['전체', 'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ', 'A-Z'];

// 탭별 검색/필터 상태
let currentPokedexChosung = '전체';
let currentShopChosung = '전체';
let currentSelectChosung = '전체';
let currentCustomPickupChosung = '전체';

let currentSelectMode = 'all'; 
let currentSelectSort = 'name_asc'; 

let currentCustomPickupMode = 'all'; 
let currentCustomPickupSort = 'name_asc';

// 페이지네이션
const ITEMS_PER_PAGE = 30;
let currentPokedexPage = 1;
let currentShopPage = 1;
let currentSelectPage = 1;
let currentCustomPickupPage = 1;

// 기타 상태 변수
let customPickupList = [];
let evoTimeouts = []; 
let evoCallback = null;
let gachaResultsTemp = [];
let revealIndex = 0;
let clearedAchievements = [];
let userStats = { pulls: 0, spent: 0 };
let currentDetailId = null;
let currentTargetSlotIndex = null; 
let currentShopMode = 'all';
let revealTimer = null;
let isSkipping = false;
let isDarkMode = false;

/* =========================================================================
   [2] 초기화 및 데이터 로드
   ========================================================================= */

// 이미지 로딩 에러 방지 (기본 이미지로 대체)
window.addEventListener('error', function(e) {
    if (e.target.tagName === 'IMG') {
        if(e.target.id === 'gacha-banner-img') return;
        // 무한 루프 방지
        if (typeof DEFAULT_IMG_URL !== 'undefined' && e.target.src.includes(DEFAULT_IMG_URL)) { 
            e.target.style.display = 'none'; return; 
        }
        if(typeof DEFAULT_IMG_URL !== 'undefined') e.target.src = DEFAULT_IMG_URL;
    }
}, true);

window.onload = function() {
    loadData();
    checkDailyLogin();
    setupGachaUI();
    updateUI();
    
    // 뒤로가기 시 메인으로 복귀 처리
    if (!history.state) history.replaceState({ screen: 'main' }, null, '');
    if(isDarkMode) document.body.classList.add('dark-mode');
};

window.addEventListener('popstate', function(event) {
    // 열린 모달 닫기
    const openModals = document.querySelectorAll('.modal');
    let modalClosed = false;
    openModals.forEach(modal => {
        if (modal.style.display === 'flex' || modal.style.display === 'block') {
            modal.style.display = 'none';
            modalClosed = true;
        }
    });
    
    if (!modalClosed && event.state && event.state.screen) {
        goScreen(event.state.screen, false);
    } else if (!modalClosed) {
        goScreen('main', false);
    }
});

/* =========================================================================
   [3] 데이터 저장/로드 관리
   ========================================================================= */
function saveData() {
    const data = {
        coins: userCoins, bp: userBP, cards: ownedCards, crew: myCrew, 
        crewLogo: myCrewLogo, crewName: myCrewName, crewColor: myCrewColor, 
        crewSize: myCrewSize, formation: currentFormationKey,
        achievements: clearedAchievements, stats: userStats, dark: isDarkMode, bestScore: (typeof gameBestScore !== 'undefined' ? gameBestScore : 0),
        customPickup: customPickupList, lastLogin: localStorage.getItem('last_login')
    };
    localStorage.setItem('soop_save_final_v15', JSON.stringify(data));
    updateUI();
}

function loadData() {
    const code = localStorage.getItem('soop_save_final_v15');
    if (code) {
        try {
            let data = JSON.parse(code);
            // 구버전 데이터 마이그레이션
            if (data.bp === undefined) { 
                const oldCode = localStorage.getItem('soop_save_final_v14');
                if(oldCode) { try { const decompressed = LZString.decompressFromBase64(oldCode); if(decompressed) data = JSON.parse(decompressed); } catch(e) {} }
            }
            if (data) {
                if (data.c !== undefined && data.c !== null) userCoins = data.c;
                else if (data.coins !== undefined && data.coins !== null) userCoins = data.coins;
                else userCoins = 600; 

                userBP = data.bp || 0; 
                ownedCards = data.d ? {} : (data.cards || {});
                if(data.d) { for (const [id, stars] of Object.entries(data.d)) ownedCards[id] = { rank: 1, skin: 1, stars: stars }; }
                
                myCrewSize = data.crewSize || 6;
                myCrew = data.cr || data.crew || Array(6).fill(null);
                if (myCrew.length < myCrewSize) while(myCrew.length < myCrewSize) myCrew.push(null);
                else if (myCrew.length > myCrewSize) myCrew = myCrew.slice(0, myCrewSize);

                myCrewLogo = data.l || data.crewLogo || 'default';
                myCrewName = data.crewName || ""; myCrewColor = data.crewColor || "#ffffff";
                currentFormationKey = data.formation || '1-4-3-3'; 
                clearedAchievements = data.a || data.achievements || [];
                userStats = data.s || data.stats || { pulls: 0, spent: 0 };
                isDarkMode = data.dark || false;
                if(typeof gameBestScore !== 'undefined') gameBestScore = data.bestScore || 0;
                customPickupList = data.customPickup || [];
                localStorage.setItem('last_login', data.t || data.lastLogin);
            }
        } catch(e) { console.error("데이터 로드 실패:", e); userCoins = 600; } 
    } else { userCoins = 600; saveData(); } 
}

function checkDailyLogin() {
    const today = new Date().toDateString();
    if (localStorage.getItem('last_login') !== today) {
        userCoins += 6; localStorage.setItem('last_login', today);
        alert("📅 출석 보상! 6숲코인이 지급되었습니다."); saveData();
    }
}

function resetData() {
    if (confirm("모든 데이터를 초기화하시겠습니까? (복구 불가)")) {
        localStorage.removeItem('soop_save_final_v15');
        localStorage.removeItem('soop_save_final_v14');
        localStorage.removeItem('last_login');
        location.reload();
    }
}

function updateUI() {
    if(document.getElementById('user-coin')) document.getElementById('user-coin').innerText = userCoins;
    if(document.getElementById('user-bp')) document.getElementById('user-bp').innerText = userBP; 
    
    const totalCards = (typeof SOOP_DATA !== 'undefined' && SOOP_DATA.streamers) ? SOOP_DATA.streamers.length : 0;
    const myCards = Object.keys(ownedCards).length;
    const rate = totalCards > 0 ? Math.floor((myCards / totalCards) * 100) : 0;
    
    if(document.getElementById('stat-pulls')) document.getElementById('stat-pulls').innerText = userStats.pulls;
    if(document.getElementById('stat-coins')) document.getElementById('stat-coins').innerText = userStats.spent;
    if(document.getElementById('stat-rate')) document.getElementById('stat-rate').innerText = rate;
    
    const dmBtn = document.getElementById('btn-darkmode');
    if(dmBtn) dmBtn.innerText = isDarkMode ? "☀️ 라이트 모드 켜기" : "🌙 다크 모드 켜기";
    
    const pickupCountBtn = document.getElementById('custom-pickup-count');
    if(pickupCountBtn) pickupCountBtn.innerText = `(${customPickupList.length}/3)`;
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    if(isDarkMode) document.body.classList.add('dark-mode'); else document.body.classList.remove('dark-mode');
    saveData();
}

function goHome() { goScreen('main'); }

function goScreen(id, pushHistory = true) {
    if (id !== 'minigame') { if(typeof exitMiniGame === 'function') exitMiniGame(); }
    if (pushHistory) history.pushState({ screen: id }, null, '');
    
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    if (id === 'pokedex') renderPokedex('all');
    if (id === 'mycrew') renderMyCrew();
    if (id === 'shop') renderShop();
    if (id === 'achievements') renderAchievements();
    if (id === 'minigame') initMiniGameUI();
    
    const target = document.getElementById('screen-' + id);
    if(target) target.classList.add('active');
}

function toggleTab(btn) {
    btn.parentNode.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

/* =========================================================================
   [4] 헬퍼 함수
   ========================================================================= */
function getInitialSound(text) {
    if(!text) return 'A-Z';
    const rCho = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
    const choVal = text.charCodeAt(0) - 44032;
    if (choVal >= 0 && choVal <= 11171) { return rCho[Math.floor(choVal / 588)]; } 
    return 'A-Z';
}

function renderChosungButtons(containerId, activeChar, renderFunc) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    CHOSUNG_LIST.forEach(char => {
        const btn = document.createElement('button');
        btn.className = `chosung-btn ${activeChar === char ? 'active' : ''}`;
        btn.innerText = char;
        btn.onclick = () => {
            if (containerId === 'pokedex-chosung-nav') currentPokedexChosung = char;
            if (containerId === 'shop-chosung-nav') currentShopChosung = char;
            if (containerId === 'select-chosung-nav') currentSelectChosung = char;
            if (containerId === 'custom-pickup-chosung-nav') currentCustomPickupChosung = char;
            renderFunc(1);
        };
        container.appendChild(btn);
    });
}

function renderPaginationControls(containerId, totalCount, currentPage, renderFunctionName) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    if (totalPages <= 1) { container.innerHTML = ""; return; }
    
    let html = `<div class="pagination-area">`;
    const prevDisabled = (currentPage === 1) ? 'disabled' : '';
    html += `<button class="page-btn" onclick="${renderFunctionName}(${Math.max(1, currentPage - 1)})" ${prevDisabled}>&lt;</button>`;
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
    
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = (i === currentPage) ? 'current' : '';
        html += `<button class="page-btn ${activeClass}" onclick="${renderFunctionName}(${i})">${i}</button>`;
    }
    const nextDisabled = (currentPage === totalPages) ? 'disabled' : '';
    html += `<button class="page-btn" onclick="${renderFunctionName}(${Math.min(totalPages, currentPage + 1)})" ${nextDisabled}>&gt;</button>`;
    html += `</div>`;
    container.innerHTML = html;
}

/* =========================================================================
   [5] 가챠 시스템
   ========================================================================= */
function setupGachaUI() {
    if (typeof GAME_SETTINGS === 'undefined') return;
    document.getElementById('gacha-event-title').innerHTML = GAME_SETTINGS.event_text;
    const bannerImg = document.getElementById('gacha-banner-img');
    const fallbackLogo = document.getElementById('gacha-fallback-logo');
    
    if (GAME_SETTINGS.pickup_banner && GAME_SETTINGS.pickup_banner !== "") {
        bannerImg.src = GAME_SETTINGS.pickup_banner;
        bannerImg.style.display = 'block';
        if(fallbackLogo) fallbackLogo.style.display = 'none';
        bannerImg.onerror = function() {
            this.style.display = 'none';
            if(fallbackLogo) fallbackLogo.style.display = 'block';
        };
    } else {
        bannerImg.style.display = 'none';
        if(fallbackLogo) fallbackLogo.style.display = 'block';
    }
}

function pullGacha() {
    if (typeof SOOP_DATA === 'undefined' || !SOOP_DATA.streamers || SOOP_DATA.streamers.length === 0) {
        alert("데이터 파일(data.js)에 문제가 있어 가챠를 실행할 수 없습니다.\n새로고침 후 다시 시도해주세요.");
        return;
    }

    if (userCoins < 6) { alert("숲코인이 부족합니다!"); return; }
    
    try {
        const achievements = SOOP_DATA.achievements || [];
        const eventTargetList = achievements.filter(a => a && a.title && a.title.includes(GAME_SETTINGS.pickup_target))
                                            .flatMap(a => a.targetList || []); 
        
        let totalWeight = 0;
        const pool = SOOP_DATA.streamers.filter(s => s && s.name).map(s => {
            const isEventTarget = eventTargetList.includes(s.name);
            const isCustomTarget = customPickupList.includes(s.id);
            const weight = (isEventTarget || isCustomTarget) ? GAME_SETTINGS.pickup_rate : 1;
            totalWeight += weight; return { ...s, weight: weight };
        });

        if(pool.length === 0) { alert("가챠 가능한 카드가 없습니다."); return; }

        userCoins -= 6; userStats.pulls += 1; userStats.spent += 6; userBP += 1;
        
        gachaResultsTemp = [];
        let refundCount = 0;

        for (let i = 0; i < 6; i++) {
            let rand = Math.random() * totalWeight; 
            let selected = null;
            for (const s of pool) { rand -= s.weight; if (rand < 0) { selected = s; break; } }
            if (!selected) selected = pool[0]; 
            
            let isEvo = false; 
            if (ownedCards[selected.id]) {
                let cardInfo = ownedCards[selected.id];
                if (selected.id === 's226') {
                    if (cardInfo.stars === 1) cardInfo.stars = 2; else if (cardInfo.stars === 2) { cardInfo.stars = 22; isEvo = true; } 
                    else if (cardInfo.stars === 22) { userCoins += 1; refundCount++; }
                } else {
                    if (cardInfo.stars >= 5) { userCoins += 1; refundCount++; } 
                    else { cardInfo.stars++; if (cardInfo.stars === 5) isEvo = true; }
                }
                gachaResultsTemp.push({ ...selected, isNew: false, isEvo: isEvo });
            } else {
                ownedCards[selected.id] = { rank: 1, skin: 1, stars: 1 };
                gachaResultsTemp.push({ ...selected, isNew: true, isEvo: false });
            }
        }
        
        saveData();
        updateUI();

        if(refundCount > 0) document.getElementById('gacha-refund-notice').innerText = `5성(졸업) 중복 ${refundCount}장 1숲코인 환급!`;
        else document.getElementById('gacha-refund-notice').innerText = "";
        
        const grid = document.getElementById('gacha-result-grid'); grid.innerHTML = "";
        for(let i=0; i<6; i++) {
            const wrapper = document.createElement('div'); wrapper.className = "card-wrapper"; wrapper.id = `gacha-slot-${i}`;
            wrapper.innerHTML = `<div class="card-item locked"><div class="card-inner"><div class="card-back-design">?</div></div></div>`;
            grid.appendChild(wrapper);
        }
        
        const modal = document.getElementById('modal-gacha-result');
        modal.style.display = 'flex';
        
        document.getElementById('btn-gacha-skip').style.display = "inline-block";
        document.getElementById('btn-gacha-close').style.display = "none";
        
        isSkipping = false;
        revealIndex = 0; 
        revealTimer = setTimeout(revealNextCard, 500); 

    } catch(err) {
        console.error("Gacha Error:", err);
        alert("가챠 진행 중 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.");
    }
}

function skipGachaAnimation() { isSkipping = true; clearTimeout(revealTimer); processSkipQueue(); }
function processSkipQueue() {
    if (revealIndex >= 6) { document.getElementById('btn-gacha-skip').style.display = "none"; document.getElementById('btn-gacha-close').style.display = "inline-block"; return; }
    const item = gachaResultsTemp[revealIndex];
    if (item.isEvo) { triggerEvolutionAnimation(item, () => { renderGachaCard(revealIndex, item); revealIndex++; processSkipQueue(); }); } 
    else { renderGachaCard(revealIndex, item); revealIndex++; processSkipQueue(); }
}
function revealNextCard() {
    if (revealIndex >= 6) { document.getElementById('btn-gacha-skip').style.display = "none"; document.getElementById('btn-gacha-close').style.display = "inline-block"; return; }
    const item = gachaResultsTemp[revealIndex];
    if (item.isEvo) {
        triggerEvolutionAnimation(item, () => {
            renderGachaCard(revealIndex, item); revealIndex++;
            if(!isSkipping) revealTimer = setTimeout(revealNextCard, 600); else processSkipQueue();
        });
    } else {
        renderGachaCard(revealIndex, item); revealIndex++;
        if(!isSkipping) revealTimer = setTimeout(revealNextCard, 600);
    }
}
function renderGachaCard(idx, item) {
    const wrapper = document.getElementById(`gacha-slot-${idx}`);
    const info = ownedCards[item.id] || { stars: 1 };
    let starClass = `star-${info.stars}`; let starText = `${info.stars}★`;
    let displayImg = (item.imgs && item.imgs.length > 0) ? item.imgs[0] : DEFAULT_IMG_URL;
    if (item.specialImg && info.skin === 2) displayImg = item.specialImg;
    wrapper.innerHTML = `<div class="card-item ${starClass} flip-in"><div class="card-inner"><img src="${displayImg}" class="card-img" onerror="this.src=DEFAULT_IMG_URL"></div><div class="card-txt card-star">${starText}</div><div class="card-txt card-name">${item.name}</div></div>${item.isNew ? '<div class="new-badge">NEW</div>' : ''}`;
}

/* [6] 진화 및 상세 */
function triggerEvolutionAnimation(item, callback) {
    const modal = document.getElementById('modal-evolution'); const container = document.getElementById('evo-card-container'); const textElem = document.getElementById('evo-text');
    evoCallback = callback; evoTimeouts.forEach(t => clearTimeout(t)); evoTimeouts = [];
    let flashDiv = document.querySelector('.evo-flash-screen'); if (!flashDiv) { flashDiv = document.createElement('div'); flashDiv.className = 'evo-flash-screen'; document.querySelector('.evolution-content').appendChild(flashDiv); }
    const info = ownedCards[item.id]; let prevStars = (info.stars === 22) ? 2 : (info.stars - 1); 
    const prevImg = (item.imgs && item.imgs.length > 0) ? item.imgs[0] : DEFAULT_IMG_URL; 
    const prevStarClass = `star-${prevStars}`;
    
    container.innerHTML = `<div class="card-item large ${prevStarClass} evo-buildup"><div class="card-inner"><img src="${prevImg}" class="card-img" onerror="this.src=DEFAULT_IMG_URL"></div><div class="card-txt card-star" style="font-size:24px; top:15px; left:35px;">${prevStars}★</div><div class="card-txt card-name" style="font-size:24px; bottom:40px;">${item.name}</div></div>`;
    textElem.classList.remove('show'); textElem.innerText = ""; flashDiv.classList.remove('flash-active'); modal.style.display = 'flex';
    
    evoTimeouts.push(setTimeout(() => { if(flashDiv) flashDiv.classList.add('flash-active'); }, 1500));
    evoTimeouts.push(setTimeout(() => {
        let currentStarClass = `star-${info.stars}`; 
        let currentImg = (item.imgs && item.imgs.length > 0) ? item.imgs[0] : DEFAULT_IMG_URL;
        if (item.specialImg && info.stars >= 5) currentImg = item.specialImg;
        container.innerHTML = `<div class="card-item large ${currentStarClass} evo-finish"><div class="card-inner"><img src="${currentImg}" class="card-img" onerror="this.src=DEFAULT_IMG_URL"></div><div class="card-txt card-star" style="font-size:24px; top:15px; left:35px;">${info.stars}★</div><div class="card-txt card-name" style="font-size:24px; bottom:40px;">${item.name}</div></div>`;
        textElem.innerText = (info.stars === 22) ? "LEGENDARY!!" : "RANK UP!"; textElem.classList.add('show');
    }, 2000)); 
    evoTimeouts.push(setTimeout(() => { skipEvolution(); }, 5000));
}
function skipEvolution() {
    evoTimeouts.forEach(t => clearTimeout(t)); evoTimeouts = [];
    const modal = document.getElementById('modal-evolution'); if(modal) modal.style.display = 'none';
    if (evoCallback) { const cb = evoCallback; evoCallback = null; cb(); }
}

/* [7] 카드 생성 */
function createCard(s, onClickFunc) {
    const wrapper = document.createElement('div'); wrapper.className = "card-wrapper";
    if (ownedCards[s.id]) {
        const info = ownedCards[s.id]; const starClass = `star-${info.stars}`;
        let img = (s.imgs && s.imgs.length > 0) ? s.imgs[0] : DEFAULT_IMG_URL;
        if(s.specialImg && info.skin === 2) img = s.specialImg; 
        wrapper.innerHTML = `<div class="card-item ${starClass}"><div class="card-inner"><img src="${img}" class="card-img" loading="lazy" decoding="async" onerror="this.src=DEFAULT_IMG_URL"></div><div class="card-txt card-star">${info.stars}★</div><div class="card-txt card-name">${s.name}</div></div>`;
        wrapper.onclick = onClickFunc ? onClickFunc : () => openCardDetail(s.id);
    } else {
        wrapper.innerHTML = `<div class="card-item locked"><div class="card-inner" style="background:#111; display:flex; justify-content:center; align-items:center;"><div style="color:#444; font-size:30px;">?</div></div><div class="card-txt card-name">?</div></div>`;
    }
    return wrapper;
}
function openCardDetail(id) {
    currentDetailId = id; const s = SOOP_DATA.streamers.find(x => x.id === id); const info = ownedCards[id];
    const starClass = `star-${info.stars}`;
    let displayImg = (s.imgs && s.imgs.length > 0) ? s.imgs[0] : DEFAULT_IMG_URL;
    if (s.specialImg && info.skin === 2) displayImg = s.specialImg;
    
    const visual = document.getElementById('detail-card-visual');
    visual.className = `card-item large ${starClass}`;
    visual.innerHTML = `<div class="card-inner"><img id="detail-card-img" src="${displayImg}" class="card-img" onclick="openFullImage()" onerror="this.src=DEFAULT_IMG_URL"></div><div class="card-txt card-star" style="font-size:24px; top:15px; left:35px;">${info.stars}★</div><div class="card-txt card-name" style="font-size:24px; bottom:40px;">${s.name}</div>`;
    const btnSwap = document.getElementById('btn-swap-img'); 
    if (s.specialImg && info.stars >= 5) { btnSwap.style.display = 'inline-block'; btnSwap.innerText = (info.skin === 2) ? "기본 일러스트로" : "5성 일러스트로"; } 
    else { btnSwap.style.display = 'none'; }
    document.getElementById('modal-card-detail').style.display = 'flex';
}
function toggleCardImage() { const info = ownedCards[currentDetailId]; if (!info) return; info.skin = (info.skin === 2) ? 1 : 2; saveData(); openCardDetail(currentDetailId); if(document.getElementById('screen-pokedex').classList.contains('active')) renderPokedex('all'); }

/* [8] 도감 */
function renderPokedex(mode) {
    const list = document.getElementById('pokedex-list'); list.innerHTML = "";
    if (mode === 'all') {
        currentPokedexPage = 1; currentPokedexChosung = '전체'; 
        document.getElementById('pokedex-controls-box').style.display = 'flex'; document.getElementById('pokedex-crew-controls').style.display = 'none'; document.getElementById('pokedex-chosung-nav').style.display = 'flex';
        renderChosungButtons('pokedex-chosung-nav', currentPokedexChosung, renderAllPokedexList); renderAllPokedexList(1); 
    } else {
        document.getElementById('pokedex-controls-box').style.display = 'none'; document.getElementById('pokedex-crew-controls').style.display = 'block'; document.getElementById('pokedex-chosung-nav').style.display = 'none';
        renderCrewPokedexList();
    }
}
function renderAllPokedexList(page = 1) {
    currentPokedexPage = page; const list = document.getElementById('pokedex-list'); list.innerHTML = "";
    const search = document.getElementById('pokedex-search').value.toLowerCase();
    const sort = document.getElementById('pokedex-sort').value; const filter = document.getElementById('pokedex-filter').value;
    let targets = SOOP_DATA.streamers.filter(s => s.name.toLowerCase().includes(search));
    if (filter !== 'all') { targets = targets.filter(s => { const info = ownedCards[s.id]; return info && info.stars == filter; }); }
    if (currentPokedexChosung !== '전체') { targets = targets.filter(s => getInitialSound(s.name) === currentPokedexChosung); }
    targets.sort((a, b) => { const infoA = ownedCards[a.id] || { stars: 0 }; const infoB = ownedCards[b.id] || { stars: 0 }; if (sort === 'grade_desc') return infoB.stars - infoA.stars; return a.name.localeCompare(b.name); });
    const startIndex = (page - 1) * ITEMS_PER_PAGE; const endIndex = startIndex + ITEMS_PER_PAGE; const pageItems = targets.slice(startIndex, endIndex);
    const fragment = document.createDocumentFragment(); pageItems.forEach(s => fragment.appendChild(createCard(s))); list.appendChild(fragment);
    renderPaginationControls('pokedex-pagination', targets.length, page, 'renderAllPokedexList');
    renderChosungButtons('pokedex-chosung-nav', currentPokedexChosung, (p) => { currentPokedexPage = p || 1; renderAllPokedexList(currentPokedexPage); });
}
function renderCrewPokedexList() {
    const list = document.getElementById('pokedex-list'); list.innerHTML = "";
    const search = document.getElementById('crew-search').value.toLowerCase();
    const sortVal = document.getElementById('pokedex-crew-sort').value;
    let crews = SOOP_DATA.achievements.filter(a => a.type === 'CREW').map(c => ({...c}));
    
    // [수정] 크루 이름 또는 멤버 이름으로 검색
    if(search) {
        crews = crews.filter(crew =>
            crew.title.toLowerCase().includes(search) ||
            (crew.targetList && crew.targetList.some(m => m.toLowerCase().includes(search)))
        );
    }

    crews.sort((a, b) => {
        if (sortVal === 'name_asc') return a.title.localeCompare(b.title);
        const getRatio = (crew) => { 
            if(!crew.targetList) return 0;
            const members = SOOP_DATA.streamers.filter(s => crew.targetList.includes(s.name)); 
            const collected = members.filter(s => ownedCards[s.id]).length; return members.length > 0 ? (collected / members.length) : 0; 
        };
        const ratioA = getRatio(a); const ratioB = getRatio(b);
        if (sortVal === 'achievement_desc') return ratioB - ratioA;
        if (sortVal === 'achievement_asc') return ratioA - ratioB;
        return 0;
    });
    const fragment = document.createDocumentFragment();
    crews.forEach(crew => {
        if(!crew.targetList) return;
        const members = SOOP_DATA.streamers.filter(s => crew.targetList.includes(s.name));
        const collected = members.filter(s => ownedCards[s.id]).length;
        const isDone = (collected === members.length && members.length > 0);
        const wrapper = document.createElement('div'); wrapper.style.width = "100%";
        wrapper.innerHTML = `<div class="crew-book-header ${isDone ? 'completed' : ''}" onclick="this.nextElementSibling.classList.toggle('active')"><img src="${crew.logoUrl}" class="crew-book-logo" onerror="this.src=DEFAULT_IMG_URL"><div class="crew-book-title">${crew.title} ${isDone ? '<span style="color:#00adef; margin-left:5px;">✨</span>' : ''} <span class="crew-count">(${collected}/${members.length})</span></div><span>▼</span></div>`;
        const body = document.createElement('div'); body.className = `crew-book-body ${search.length > 0 ? 'active' : ''}`;
        members.forEach(s => body.appendChild(createCard(s))); wrapper.appendChild(body); fragment.appendChild(wrapper);
    });
    list.appendChild(fragment);
}

/* [9] 상점 */
function renderShop(mode) {
    if (mode) currentShopMode = mode; const list = document.getElementById('shop-list'); list.innerHTML = "";
    if (currentShopMode === 'all') {
        currentShopPage = 1; currentShopChosung = '전체';
        document.getElementById('shop-controls-box').style.display = 'block'; document.getElementById('shop-crew-controls').style.display = 'none'; document.getElementById('shop-chosung-nav').style.display = 'flex';
        renderChosungButtons('shop-chosung-nav', currentShopChosung, renderShopAll); renderShopAll(1); 
    } else {
        document.getElementById('shop-controls-box').style.display = 'none'; document.getElementById('shop-crew-controls').style.display = 'block'; document.getElementById('shop-chosung-nav').style.display = 'none'; renderShopCrew();
    }
}
function renderShopAll(page = 1) {
    currentShopPage = page; const list = document.getElementById('shop-list'); list.innerHTML = "";
    const search = document.getElementById('shop-search').value.toLowerCase();
    const filter = document.getElementById('shop-filter').value;
    let targets = SOOP_DATA.streamers.filter(s => s.name.toLowerCase().includes(search));
    if (filter === 'unowned') { targets = targets.filter(s => !ownedCards[s.id]); }
    if (currentShopChosung !== '전체') { targets = targets.filter(s => getInitialSound(s.name) === currentShopChosung); }
    targets.sort((a, b) => a.name.localeCompare(b.name));
    const startIndex = (page - 1) * ITEMS_PER_PAGE; const endIndex = startIndex + ITEMS_PER_PAGE; const pageItems = targets.slice(startIndex, endIndex);
    const fragment = document.createDocumentFragment(); pageItems.forEach(s => fragment.appendChild(createShopItem(s))); list.appendChild(fragment);
    renderPaginationControls('shop-pagination', targets.length, page, 'renderShopAll');
    renderChosungButtons('shop-chosung-nav', currentShopChosung, (p) => { currentShopPage = p || 1; renderShopAll(currentShopPage); });
}
function renderShopCrew() {
    const list = document.getElementById('shop-list'); list.innerHTML = "";
    const search = document.getElementById('shop-crew-search').value.toLowerCase(); const sortVal = document.getElementById('shop-crew-sort').value;
    let crews = SOOP_DATA.achievements.filter(a => a.type === 'CREW');
    
    // [수정] 상점에서도 멤버 이름으로 검색 가능하게 변경
    if(search) {
        crews = crews.filter(crew =>
            crew.title.toLowerCase().includes(search) ||
            (crew.targetList && crew.targetList.some(m => m.toLowerCase().includes(search)))
        );
    }

    crews.sort((a, b) => {
        if (sortVal === 'name_asc') return a.title.localeCompare(b.title);
        const getRatio = (crew) => { 
            if(!crew.targetList) return 0;
            const members = SOOP_DATA.streamers.filter(s => crew.targetList.includes(s.name)); 
            const collected = members.filter(s => ownedCards[s.id]).length; return members.length > 0 ? (collected / members.length) : 0; 
        };
        const ratioA = getRatio(a); const ratioB = getRatio(b);
        if (sortVal === 'achievement_desc') return ratioB - ratioA;
        if (sortVal === 'achievement_asc') return ratioA - ratioB;
        return 0;
    });
    const fragment = document.createDocumentFragment();
    crews.forEach(crew => {
        if(!crew.targetList) return;
        const members = SOOP_DATA.streamers.filter(s => crew.targetList.includes(s.name));
        const wrapper = document.createElement('div'); wrapper.style.width = "100%";
        wrapper.innerHTML = `<div class="crew-book-header" onclick="this.nextElementSibling.classList.toggle('active')"><img src="${crew.logoUrl}" class="crew-book-logo" onerror="this.src=DEFAULT_IMG_URL" style="margin-right:10px;"><div class="crew-book-title">${crew.title}</div><span>▼</span></div>`;
        const body = document.createElement('div'); body.className = `crew-book-body ${search.length > 0 ? 'active' : ''}`;
        members.forEach(s => body.appendChild(createShopItem(s))); wrapper.appendChild(body); fragment.appendChild(wrapper);
    });
    list.appendChild(fragment);
}
function createShopItem(s) {
    const myCard = ownedCards[s.id];
    const wrapper = document.createElement('div'); wrapper.className = "card-wrapper";
    const buyButtons = `<div class="shop-btn-group"><button class="shop-buy-btn coin" onclick="buyCard('${s.id}', 'coin')">💎 100</button><button class="shop-buy-btn ticket" onclick="buyCard('${s.id}', 'ticket')">🎫 30</button></div>`;
    let img = (s.imgs && s.imgs.length > 0) ? s.imgs[0] : DEFAULT_IMG_URL;

    // 보유 여부에 따른 클래스 및 별 처리
    if (myCard) {
        if (s.specialImg && myCard.skin === 2) img = s.specialImg;
        const isMax = (s.id === 's226') ? (myCard.stars === 22) : (myCard.stars >= 5);
        const finalButtons = isMax ? `<button class="shop-buy-btn" disabled>MAX</button>` : buyButtons;
        wrapper.innerHTML = `<div class="card-item star-${myCard.stars}" onclick="openCardDetail('${s.id}')"><div class="card-inner"><img src="${img}" class="card-img" loading="lazy" decoding="async" onerror="this.src=DEFAULT_IMG_URL"></div><div class="card-txt card-star">${myCard.stars}★</div><div class="card-txt card-name">${s.name}</div></div>${finalButtons}`;
    } else {
        wrapper.innerHTML = `<div class="card-item star-1 shop-unowned" onclick="openCardDetail('${s.id}')"><div class="card-inner"><img src="${img}" class="card-img" style="filter: brightness(0.3);" loading="lazy" decoding="async" onerror="this.src=DEFAULT_IMG_URL"><div class="locked-symbol" style="position:absolute; color:white; font-size:30px;">?</div></div><div class="card-txt card-name">${s.name}</div></div>${buyButtons}`;
    }
    return wrapper;
}
function buyCard(id, type) {
    const s = SOOP_DATA.streamers.find(x => x.id === id); if (!s) return;

    // [NEW] 구매 확인 팝업
    let cost = 0;
    let currencyName = "";
    if (type === 'coin') { cost = 100; currencyName = "숲코인"; }
    else { cost = 30; currencyName = "특별티켓"; }

    if (!confirm(`[${s.name}] 카드를 구매하시겠습니까?\n비용: ${cost} ${currencyName}`)) return;

    if (type === 'coin') {
        if (userCoins < 100) { alert("숲코인이 부족합니다!"); return; }
        userCoins -= 100; userStats.spent += 100;
    } else {
        if (userBP < 30) { alert("특별티켓이 부족합니다!"); return; }
        userBP -= 30;
    }
    
    if (ownedCards[id]) { 
        if (id === 's226') { 
            if (ownedCards[id].stars === 1) ownedCards[id].stars = 2; 
            else if (ownedCards[id].stars === 2) ownedCards[id].stars = 22; 
        } else { 
            if (ownedCards[id].stars < 5) ownedCards[id].stars++; 
        } 
    } else { 
        ownedCards[id] = { rank: 1, skin: 1, stars: 1 }; 
    }
    saveData(); updateUI(); 
    if (currentShopMode === 'all') renderShopAll(currentShopPage); else renderShopCrew();
}

/* [10] 도전과제 */
function renderAchievements() {
    const list = document.getElementById('achieve-list'); const claimAllBtn = document.getElementById('btn-claim-all'); list.innerHTML = ""; let claimableCount = 0;
    const achievements = SOOP_DATA.achievements || [];
    const processedList = achievements.map(ach => {
        let isClaimed = clearedAchievements.includes(ach.id), isDone = false, ratio = 0, currentTarget = 0, currentCount = 0;
        let displayTitle = ach.title, progressText = "";
        let dynamicId = ach.id;

        if (ach.type === 'CREW') {
            if(!ach.targetList) return null;
            currentCount = ach.targetList.filter(name => { const s = SOOP_DATA.streamers.find(x => x.name === name); return s && ownedCards[s.id]; }).length;
            currentTarget = ach.targetList.length; ratio = currentCount / currentTarget; isDone = (currentCount >= currentTarget); progressText = `(${currentCount}/${currentTarget})`;
        } else if (ach.type === 'COUNT') {
            currentCount = Object.keys(ownedCards).length; 
            if (ach.isInfinite) {
                let mult = 1; while (clearedAchievements.includes(`${ach.id}_${ach.targetCount * mult}`)) mult++;
                currentTarget = ach.targetCount * mult; dynamicId = `${ach.id}_${currentTarget}`; displayTitle = `${currentTarget}장 수집하기`; isClaimed = false; 
            } else { currentTarget = ach.targetCount; }
            ratio = Math.min(currentCount / currentTarget, 1); isDone = (currentCount >= currentTarget); progressText = `(${currentCount}/${currentTarget})`;
        }
        let priority = (isDone && !isClaimed) ? 3 : (isClaimed ? 1 : 2); if (priority === 3) claimableCount++;
        return { ...ach, id: dynamicId, displayTitle, progressText, ratio, isDone, isClaimed, priority };
    }).filter(a => a !== null); // null 제거

    if (claimableCount > 0) { claimAllBtn.style.display = 'block'; claimAllBtn.innerText = `🎁 모두 받기 (${claimableCount})`; } else { claimAllBtn.style.display = 'none'; }
    processedList.sort((a, b) => (b.priority !== a.priority) ? (b.priority - a.priority) : (b.ratio - a.ratio));
    processedList.forEach(ach => {
        const div = document.createElement('div'); div.className = `achievement-item ${ach.isClaimed ? 'claimed' : ''}`;
        div.style.background = (ach.priority === 3) ? "#fff9c4" : ((ach.priority === 1) ? "#f9f9f9" : "white");
        const btnId = ach.dynamicId || ach.id;
        let btnHtml = (ach.priority === 1) ? '<span style="color:#999; font-size:14px;">수령 완료</span>' : (ach.priority === 3 ? `<button class="btn-green" style="width:auto; padding:8px 16px; margin:0;" onclick="claimReward('${btnId}', ${ach.reward})">보상 받기</button>` : `<div style="text-align:right; width:80px;"><div style="font-size:12px; color:#888;">${Math.floor(ach.ratio * 100)}%</div><div style="width:100%; height:4px; background:#eee; border-radius:2px; overflow:hidden;"><div style="width:${Math.floor(ach.ratio * 100)}%; height:100%; background:var(--soop-blue);"></div></div></div>`);
        div.innerHTML = `<div style="display:flex; align-items:center;"><img src="${ach.logoUrl || 'images/soop_logo.svg'}" style="width:45px; height:45px; border-radius:10px; border:1px solid #ddd; margin-right:15px; object-fit:contain; background:#fff;" onerror="this.src='images/soop_logo.svg'"><div><div style="font-size:16px; font-weight:bold; color:#333;">${ach.displayTitle}</div><div style="font-size:13px; color:#888; margin-top:4px;">${ach.progressText} · 💰 ${ach.reward}숲코인</div></div></div><div>${btnHtml}</div>`;
        list.appendChild(div);
    });
}
function claimReward(id, r) { userCoins += r; clearedAchievements.push(id); saveData(); alert(`${r}숲코인 획득!`); renderAchievements(); updateUI(); }
function claimAllRewards() {
    let totalReward = 0; let count = 0; const currentCardCount = Object.keys(ownedCards).length; const achievements = SOOP_DATA.achievements || [];
    achievements.forEach(ach => {
        if (ach.type === 'CREW') {
            if (!clearedAchievements.includes(ach.id) && ach.targetList) {
                const currentCount = ach.targetList.filter(name => { const s = SOOP_DATA.streamers.find(x => x.name === name); return s && ownedCards[s.id]; }).length;
                if (currentCount >= ach.targetList.length) { totalReward += ach.reward; clearedAchievements.push(ach.id); count++; }
            }
        } else if (ach.type === 'COUNT') {
            if (ach.isInfinite) {
                let mult = 1; while (true) {
                    const target = ach.targetCount * mult; const dynamicId = `${ach.id}_${target}`;
                    if (currentCardCount < target) break;
                    if (!clearedAchievements.includes(dynamicId)) { totalReward += ach.reward; clearedAchievements.push(dynamicId); count++; }
                    mult++;
                }
            } else if (!clearedAchievements.includes(ach.id) && currentCardCount >= ach.targetCount) { totalReward += ach.reward; clearedAchievements.push(ach.id); count++; }
        }
    });
    if (count > 0) { userCoins += totalReward; saveData(); renderAchievements(); alert(`총 ${count}개의 업적을 달성하여\n💰 ${totalReward}숲코인을 받았습니다!`); } 
    else { alert("받을 보상이 없습니다."); }
}

/* [11] 나만의 크루 */
function renderMyCrew() {
    const grid = document.getElementById('my-crew-grid'); grid.innerHTML = ""; 
    const logoImg = document.getElementById('my-crew-logo-img'); const logoText = document.getElementById('my-crew-logo-text');
    if (myCrewLogo && myCrewLogo !== 'default' && myCrewLogo !== 'images/soop_logo.svg') { logoImg.src = myCrewLogo; logoImg.style.display = 'block'; logoText.style.display = 'none'; } 
    else { logoImg.style.display = 'none'; logoText.style.display = 'block'; }
    document.getElementById('my-crew-name').value = myCrewName || ""; document.getElementById('crew-bg-color').value = myCrewColor || "#ffffff"; document.getElementById('my-crew-container').style.backgroundColor = myCrewColor || "#ffffff"; document.getElementById('crew-size-select').value = myCrewSize;
    if (myCrewSize === 11) { document.getElementById('formation-select-area').style.display = 'flex'; } else { document.getElementById('formation-select-area').style.display = 'none'; }
    if (myCrewSize === 11 && FORMATIONS[currentFormationKey]) {
        const rowConfigs = FORMATIONS[currentFormationKey]; let slotIndex = 0;
        rowConfigs.forEach(count => { const row = document.createElement('div'); row.className = 'crew-row'; for(let i = 0; i < count; i++) { if (slotIndex >= 11) break; const div = createSlotElement(slotIndex); row.appendChild(div); slotIndex++; } grid.appendChild(row); });
    } else { for(let i = 0; i < myCrewSize; i++) { const div = createSlotElement(i); grid.appendChild(div); } }
}
function createSlotElement(index) {
    const div = document.createElement('div'); const id = myCrew[index];
    if (id && ownedCards[id]) {
        div.className = "slot"; const s = SOOP_DATA.streamers.find(x => x.id === id); const info = ownedCards[id];
        let img = (s.imgs && s.imgs.length > 0) ? s.imgs[0] : DEFAULT_IMG_URL;
        div.innerHTML = `<div class="card-wrapper" style="width:100%; height:100%;"><div class="card-item star-${info.stars}"><div class="card-inner"><img src="${img}" class="card-img" onerror="this.src=DEFAULT_IMG_URL"></div></div></div><div class="slot-overlay"><button class="overlay-btn" onclick="event.stopPropagation(); openCardSelectForCrew(${index})">🔄 교체</button><button class="overlay-btn red" onclick="event.stopPropagation(); clearCrewSlot(${index})">🗑 비우기</button></div>`;
        div.onclick = () => openCardSelectForCrew(index);
    } else { div.className = "slot empty"; div.innerText = "+"; div.onclick = () => openCardSelectForCrew(index); }
    return div;
}
function changeFormation(key) { currentFormationKey = key; saveData(); renderMyCrew(); }
function saveCrewName() { const input = document.getElementById('my-crew-name'); myCrewName = input.value; saveData(); }
function changeCrewBgColor() { const input = document.getElementById('crew-bg-color'); setCrewPresetColor(input.value); }
function setCrewPresetColor(color) { myCrewColor = color; document.getElementById('crew-bg-color').value = color; document.getElementById('my-crew-container').style.backgroundColor = color; saveData(); }
function changeCrewSize(size) { myCrewSize = parseInt(size); if (myCrew.length < myCrewSize) { while (myCrew.length < myCrewSize) myCrew.push(null); } else if (myCrew.length > myCrewSize) { if(confirm("인원수를 줄이면 뒤쪽 슬롯의 멤버가 삭제됩니다. 계속하시겠습니까?")) { myCrew = myCrew.slice(0, myCrewSize); } else { document.getElementById('crew-size-select').value = myCrew.length; return; } } saveData(); renderMyCrew(); }
function clearCrewSlot(idx) { if(confirm("이 슬롯을 비우시겠습니까?")) { myCrew[idx] = null; saveData(); renderMyCrew(); } }

/* [14] 멤버 선택 모달 */
function openCardSelectForCrew(idx) { 
    currentTargetSlotIndex = idx; const modal = document.getElementById('modal-card-select'); modal.style.display = 'flex'; 
    currentSelectMode = 'all'; currentSelectSort = 'name_asc'; currentSelectChosung = '전체'; currentSelectPage = 1;
    document.getElementById('select-search').value = '';
    renderChosungButtons('select-chosung-nav', currentSelectChosung, () => renderSelectGrid(1));
    document.getElementById('select-chosung-nav').style.display = 'flex';
    renderSelectGrid(1); 
}
function setSelectMode(mode, btn) { currentSelectMode = mode; btn.parentNode.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); const chosungNav = document.getElementById('select-chosung-nav'); if(mode === 'crew') { if(chosungNav) chosungNav.style.display = 'none'; } else { if(chosungNav) chosungNav.style.display = 'flex'; } renderSelectGrid(1); }
function renderSelectGrid(page = 1) {
    currentSelectPage = page; const grid = document.getElementById('select-card-grid'); grid.innerHTML = "";
    const search = document.getElementById('select-search').value.toLowerCase(); const sortVal = document.getElementById('select-sort').value; currentSelectSort = sortVal;
    if (currentSelectMode === 'crew') { renderSelectCrew(search); return; }
    renderChosungButtons('select-chosung-nav', currentSelectChosung, () => { currentSelectPage = 1; renderSelectGrid(1); });
    let list = Object.keys(ownedCards).map(id => ({ ...SOOP_DATA.streamers.find(x => x.id === id), ...ownedCards[id] }));
    if(search) list = list.filter(c => c.name.toLowerCase().includes(search));
    if (currentSelectChosung !== '전체') { list = list.filter(c => getInitialSound(c.name) === currentSelectChosung); }
    list.sort((a, b) => { if (currentSelectSort === 'grade_desc') return b.stars - a.stars; if (currentSelectSort === 'grade_asc') return a.stars - b.stars; return a.name.localeCompare(b.name); });
    const startIndex = (page - 1) * ITEMS_PER_PAGE; const endIndex = startIndex + ITEMS_PER_PAGE; const pageItems = list.slice(startIndex, endIndex);
    const fragment = document.createDocumentFragment();
    pageItems.forEach(c => {
        const wrapper = document.createElement('div'); wrapper.className = "card-wrapper";
        let img = (c.imgs && c.imgs.length > 0) ? c.imgs[0] : DEFAULT_IMG_URL;
        wrapper.innerHTML = `<div class="card-item star-${c.stars}"><div class="card-inner"><img src="${img}" class="card-img"></div><div class="card-txt card-name">${c.name}</div></div>`;
        wrapper.onclick = () => { myCrew[currentTargetSlotIndex] = c.id; saveData(); closeModal('modal-card-select'); renderMyCrew(); };
        fragment.appendChild(wrapper);
    });
    grid.appendChild(fragment); renderPaginationControls('select-card-pagination', list.length, page, 'renderSelectGrid');
}
function renderSelectCrew(search) {
    const grid = document.getElementById('select-card-grid'); grid.innerHTML = "";
    let crews = SOOP_DATA.achievements.filter(a => a.type === 'CREW');
    
    // [수정] 멤버 선택에서도 멤버 이름 검색 가능
    if(search) {
        crews = crews.filter(crew =>
            crew.title.toLowerCase().includes(search) ||
            (crew.targetList && crew.targetList.some(m => m.toLowerCase().includes(search)))
        );
    }

    if (currentSelectSort === 'name_asc') crews.sort((a, b) => a.title.localeCompare(b.title));

    crews.forEach(crew => {
        if(!crew.targetList) return;
        const members = SOOP_DATA.streamers.filter(s => crew.targetList.includes(s.name) && ownedCards[s.id]);
        if (members.length === 0) return;
        const wrapper = document.createElement('div'); wrapper.style.width = "100%";
        wrapper.innerHTML = `<div class="crew-book-header" onclick="this.nextElementSibling.classList.toggle('active')"><img src="${crew.logoUrl}" class="crew-book-logo" onerror="this.src=DEFAULT_IMG_URL" style="margin-right:10px;"><div class="crew-book-title">${crew.title}</div><span>▼</span></div>`;
        const body = document.createElement('div'); body.className = `crew-book-body active`;
        members.forEach(s => {
            const info = ownedCards[s.id]; const card = document.createElement('div'); card.className = "card-wrapper";
            let img = (s.imgs && s.imgs.length > 0) ? s.imgs[0] : DEFAULT_IMG_URL;
            card.innerHTML = `<div class="card-item star-${info.stars}"><div class="card-inner"><img src="${img}" class="card-img"></div><div class="card-txt card-name">${s.name}</div></div>`;
            card.onclick = () => { myCrew[currentTargetSlotIndex] = s.id; saveData(); closeModal('modal-card-select'); renderMyCrew(); };
            body.appendChild(card);
        });
        wrapper.appendChild(body); grid.appendChild(wrapper);
    });
}
function resetMyCrew() { if(confirm("배치된 모든 멤버를 해제하시겠습니까?")) { myCrew = Array(myCrewSize).fill(null); myCrewName = ""; myCrewColor = "#ffffff"; saveData(); renderMyCrew(); } }

/* [15] 나만의 픽업 */
function openCustomPickupModal() {
    const modal = document.getElementById('modal-custom-pickup'); modal.style.display = 'flex';
    currentCustomPickupMode = 'all'; currentCustomPickupSort = 'name_asc'; currentCustomPickupChosung = '전체'; currentCustomPickupPage = 1;
    document.getElementById('custom-pickup-search').value = '';
    renderCustomPickupSlots(); renderChosungButtons('custom-pickup-chosung-nav', currentCustomPickupChosung, () => renderCustomPickupGrid(1)); renderCustomPickupGrid(1);
}
function setCustomPickupMode(mode, btn) {
    currentCustomPickupMode = mode; btn.parentNode.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
    const chosungNav = document.getElementById('custom-pickup-chosung-nav'); if(mode === 'crew') { if(chosungNav) chosungNav.style.display = 'none'; } else { if(chosungNav) chosungNav.style.display = 'flex'; } renderCustomPickupGrid(1);
}
function renderCustomPickupSlots() {
    const area = document.getElementById('custom-pickup-selected-area'); area.innerHTML = "";
    for(let i=0; i<3; i++) {
        const id = customPickupList[i]; const slot = document.createElement('div');
        if(id) { const s = SOOP_DATA.streamers.find(x => x.id === id); if(s) { let img = (s.imgs && s.imgs.length > 0) ? s.imgs[0] : DEFAULT_IMG_URL; slot.className = "slot-small filled"; slot.innerHTML = `<img src="${img}" onerror="this.src=DEFAULT_IMG_URL">`; slot.onclick = () => removeCustomPickup(id); } else { customPickupList.splice(i, 1); saveData(); renderCustomPickupSlots(); return; } } 
        else { slot.className = "slot-small"; slot.innerHTML = `<span>+</span>`; } area.appendChild(slot);
    } updateUI(); 
}
function renderCustomPickupGrid(page = 1) {
    currentCustomPickupPage = page; const grid = document.getElementById('custom-pickup-grid'); const search = document.getElementById('custom-pickup-search').value.toLowerCase();
    const sortVal = document.getElementById('custom-pickup-sort').value; currentCustomPickupSort = sortVal; grid.innerHTML = "";
    if (currentCustomPickupMode === 'crew') { renderCustomPickupCrew(search); return; }
    renderChosungButtons('custom-pickup-chosung-nav', currentCustomPickupChosung, (p) => { currentCustomPickupPage = 1; renderCustomPickupGrid(1); });
    let targets = SOOP_DATA.streamers.filter(s => s.name.toLowerCase().includes(search));
    if (currentCustomPickupChosung !== '전체') { targets = targets.filter(s => getInitialSound(s.name) === currentCustomPickupChosung); }
    targets.sort((a, b) => { if (sortVal === 'grade_desc') { const starA = ownedCards[a.id]?.stars || 0; const starB = ownedCards[b.id]?.stars || 0; return starB - starA; } if (sortVal === 'grade_asc') { const starA = ownedCards[a.id]?.stars || 0; const starB = ownedCards[b.id]?.stars || 0; return starA - starB; } return a.name.localeCompare(b.name); });
    const startIndex = (page - 1) * ITEMS_PER_PAGE; const endIndex = startIndex + ITEMS_PER_PAGE; const pageItems = targets.slice(startIndex, endIndex);
    const fragment = document.createDocumentFragment();
    pageItems.forEach(s => {
        const isSelected = customPickupList.includes(s.id); const wrapper = document.createElement('div'); wrapper.className = "card-wrapper";
        const opacityStyle = isSelected ? "opacity: 0.4;" : ""; const myInfo = ownedCards[s.id]; const starClass = myInfo ? `star-${myInfo.stars}` : 'star-1';
        let img = (s.imgs && s.imgs.length > 0) ? s.imgs[0] : DEFAULT_IMG_URL;
        wrapper.innerHTML = `<div class="card-item ${starClass}" style="${opacityStyle}"><div class="card-inner"><img src="${img}" class="card-img" onerror="this.src=DEFAULT_IMG_URL"></div><div class="card-txt card-name">${s.name}</div></div>`;
        wrapper.onclick = () => { if(isSelected) { removeCustomPickup(s.id); } else { addCustomPickup(s.id); } }; fragment.appendChild(wrapper);
    });
    grid.appendChild(fragment); renderPaginationControls('custom-pickup-pagination', targets.length, page, 'renderCustomPickupGrid');
}
function renderCustomPickupCrew(search) {
    const grid = document.getElementById('custom-pickup-grid'); grid.innerHTML = "";
    let crews = SOOP_DATA.achievements.filter(a => a.type === 'CREW');
    
    // [수정] 나만의 픽업에서도 멤버 이름 검색 가능
    if(search) {
        crews = crews.filter(crew =>
            crew.title.toLowerCase().includes(search) ||
            (crew.targetList && crew.targetList.some(m => m.toLowerCase().includes(search)))
        );
    }

    if (currentCustomPickupSort === 'name_asc') crews.sort((a, b) => a.title.localeCompare(b.title));

    crews.forEach(crew => {
        if(!crew.targetList) return;
        const members = SOOP_DATA.streamers.filter(s => crew.targetList.includes(s.name)); if(members.length === 0) return;
        if (currentCustomPickupSort === 'grade_desc') members.sort((a,b) => (ownedCards[b.id]?.stars || 0) - (ownedCards[a.id]?.stars || 0));
        else if (currentCustomPickupSort === 'grade_asc') members.sort((a,b) => (ownedCards[a.id]?.stars || 0) - (ownedCards[b.id]?.stars || 0));
        else members.sort((a,b) => a.name.localeCompare(b.name));
        const wrapper = document.createElement('div'); wrapper.style.width = "100%";
        wrapper.innerHTML = `<div class="crew-book-header" onclick="this.nextElementSibling.classList.toggle('active')"><img src="${crew.logoUrl}" class="crew-book-logo" onerror="this.src=DEFAULT_IMG_URL" style="margin-right:10px;"><div class="crew-book-title">${crew.title}</div><span>▼</span></div>`;
        const body = document.createElement('div'); body.className = `crew-book-body active`;
        members.forEach(s => {
            const isSelected = customPickupList.includes(s.id); const opacityStyle = isSelected ? "opacity: 0.4;" : ""; const myInfo = ownedCards[s.id]; const starClass = myInfo ? `star-${myInfo.stars}` : 'star-1';
            let img = (s.imgs && s.imgs.length > 0) ? s.imgs[0] : DEFAULT_IMG_URL;
            const card = document.createElement('div'); card.className = "card-wrapper";
            card.innerHTML = `<div class="card-item ${starClass}" style="${opacityStyle}"><div class="card-inner"><img src="${img}" class="card-img" onerror="this.src=DEFAULT_IMG_URL"></div><div class="card-txt card-name">${s.name}</div></div>`;
            card.onclick = () => { if(isSelected) { removeCustomPickup(s.id); } else { addCustomPickup(s.id); } }; body.appendChild(card);
        });
        wrapper.appendChild(body); grid.appendChild(wrapper);
    });
}
function addCustomPickup(id) { if(customPickupList.length >= 3) { alert("최대 3명까지만 선택할 수 있습니다."); return; } if(!customPickupList.includes(id)) { customPickupList.push(id); saveData(); renderCustomPickupSlots(); renderCustomPickupGrid(currentCustomPickupPage); } }
function removeCustomPickup(id) { customPickupList = customPickupList.filter(x => x !== id); saveData(); renderCustomPickupSlots(); renderCustomPickupGrid(currentCustomPickupPage); }
function openLogoSelect() { const modal = document.getElementById('modal-logo-select'); const grid = document.getElementById('select-logo-grid'); grid.innerHTML = ""; const achievements = SOOP_DATA.achievements || []; const unlocked = achievements.filter(a => a.type === 'CREW' && clearedAchievements.includes(a.id)); if(unlocked.length === 0) grid.innerHTML = "<p style='padding:20px; color:#888;'>해금된 크루 로고가 없습니다.<br>크루 도감을 완성해보세요!</p>"; unlocked.forEach(c => { const img = document.createElement('img'); img.src = c.logoUrl; img.className = "logo-select-item"; img.style = "width:80px; height:80px; border-radius:50%; border:2px solid #ddd; margin:10px; cursor:pointer;"; img.onclick = () => { myCrewLogo = c.logoUrl; saveData(); closeModal('modal-logo-select'); renderMyCrew(); }; grid.appendChild(img); }); modal.style.display = 'flex'; }
function openFullImage() { document.getElementById('full-image-src').src = document.getElementById('detail-card-img').src; document.getElementById('modal-full-image').style.display = 'flex'; }
function openSoopChannel() { const s = SOOP_DATA.streamers.find(x => x.id === currentDetailId); if(s && s.channelUrl) window.open(s.channelUrl, '_blank'); }
function exportSaveData() { const saveObj = { c: userCoins, bp: userBP, d: {}, cr: myCrew, l: myCrewLogo, a: clearedAchievements, s: userStats, t: localStorage.getItem('last_login') }; for (const [id, info] of Object.entries(ownedCards)) saveObj.d[id] = info.stars; const compressed = LZString.compressToBase64(JSON.stringify(saveObj)); navigator.clipboard.writeText(compressed).then(() => alert("세이브 코드가 복사되었습니다.")).catch(()=>alert("복사 실패")); }
function importSaveData() { const code = prompt("세이브 코드를 붙여넣으세요:"); if(!code) return; if (code === "wakgood0724") { if (!confirm("관리자 모드: 모든 카드를 획득하고 숲코인을 무한으로 설정하시겠습니까?")) return; const allCards = {}; SOOP_DATA.streamers.forEach(s => { allCards[s.id] = { stars: 5, rank: 1, skin: 1 }; }); const allAchievements = (SOOP_DATA.achievements || []).map(a => a.id); userCoins = 999999; ownedCards = allCards; clearedAchievements = allAchievements; saveData(); alert("관리자 권한 승인 완료!"); location.reload(); return; } try { let decompressed = LZString.decompressFromBase64(code); let data = decompressed ? JSON.parse(decompressed) : JSON.parse(decodeURIComponent(escape(atob(code)))); if(data) { userCoins = data.c || data.coins; ownedCards = {}; if(data.d) for (const [id, stars] of Object.entries(data.d)) ownedCards[id] = { rank: 1, skin: 1, stars: stars }; else ownedCards = data.cards; myCrew = data.cr || data.crew; myCrewLogo = data.l || data.crewLogo; clearedAchievements = data.a || data.achievements; userStats = data.s || data.stats; saveData(); alert("성공적으로 불러왔습니다!"); location.reload(); } } catch(e) { alert("잘못된 세이브 코드입니다."); } }
function openSettings() { updateUI(); document.getElementById('modal-settings').style.display = 'flex'; }
function closeSettings() { document.getElementById('modal-settings').style.display = 'none'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
/* [기존 코드들...] */

/* [추가] 패치노트 열기 함수 */
function openPatchNotes() {
    const modal = document.getElementById('modal-patch-notes');
    if (modal) {
        modal.style.display = 'flex';
    }
}
