/* script.js - 나만의 확률업 기능 및 상점 정렬 적용 */

/* 전역 변수 */
let userCoins = 300; 
let userBP = 0; 
let ownedCards = {}; 
let myCrew = Array(6).fill(null); 
let myCrewLogo = 'default'; 
let myCrewName = ""; 
let myCrewColor = "#ffffff"; 
let myCrewSize = 6; 
let currentFormationKey = '1-4-3-3'; 
const FORMATIONS = {
    '1-4-4-2': [1, 4, 4, 2],
    '1-4-3-3': [1, 4, 3, 3],
    '1-3-4-3': [1, 3, 4, 3],
    '1-4-2-3-1': [1, 4, 2, 3, 1],
    '1-3-5-2': [1, 3, 5, 2]
};

// [NEW] 나만의 확률업 리스트 (최대 3명 ID 저장)
let customPickupList = [];

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

/* 이미지 에러 핸들링 */
window.addEventListener('error', function(e) {
    if (e.target.tagName === 'IMG') {
        if(e.target.id === 'gacha-banner-img') return;
        if (e.target.src.includes(DEFAULT_IMG_URL)) {
            e.target.style.display = 'none'; 
            return;
        }
        e.target.src = DEFAULT_IMG_URL;
    }
}, true);

window.onload = function() {
    loadData();
    checkDailyLogin();
    setupGachaUI();
    updateUI();
    if(isDarkMode) document.body.classList.add('dark-mode');
};

/* 데이터 관리 */
function saveData() {
    const data = {
        coins: userCoins, bp: userBP, cards: ownedCards, crew: myCrew, 
        crewLogo: myCrewLogo, crewName: myCrewName, crewColor: myCrewColor, 
        crewSize: myCrewSize, formation: currentFormationKey,
        achievements: clearedAchievements, 
        stats: userStats, dark: isDarkMode, bestScore: gameBestScore,
        customPickup: customPickupList, // [NEW] 저장
        lastLogin: localStorage.getItem('last_login')
    };
    localStorage.setItem('soop_save_final_v15', JSON.stringify(data));
    updateUI();
}

function loadData() {
    const code = localStorage.getItem('soop_save_final_v15');
    if (code) {
        try {
            let data = JSON.parse(code);
            if (data.bp === undefined) { 
                const oldCode = localStorage.getItem('soop_save_final_v14');
                if(oldCode) { try { const decompressed = LZString.decompressFromBase64(oldCode); if(decompressed) data = JSON.parse(decompressed); } catch(e) {} }
            }
            if (data) {
                userCoins = data.c || data.coins || 300;
                userBP = data.bp || 0; 
                ownedCards = data.d ? {} : (data.cards || {});
                if(data.d) { for (const [id, stars] of Object.entries(data.d)) ownedCards[id] = { rank: 1, skin: 1, stars: stars }; }
                
                myCrewSize = data.crewSize || 6;
                myCrew = data.cr || data.crew || Array(6).fill(null);
                
                if (myCrew.length < myCrewSize) while(myCrew.length < myCrewSize) myCrew.push(null);
                else if (myCrew.length > myCrewSize) myCrew = myCrew.slice(0, myCrewSize);

                myCrewLogo = data.l || data.crewLogo || 'default';
                myCrewName = data.crewName || ""; 
                myCrewColor = data.crewColor || "#ffffff";
                currentFormationKey = data.formation || '1-4-3-3'; 

                clearedAchievements = data.a || data.achievements || [];
                userStats = data.s || data.stats || { pulls: 0, spent: 0 };
                isDarkMode = data.dark || false;
                if(typeof gameBestScore !== 'undefined') gameBestScore = data.bestScore || 0;
                
                // [NEW] 나만의 픽업 데이터 로드
                customPickupList = data.customPickup || [];

                localStorage.setItem('last_login', data.t || data.lastLogin);
            }
        } catch(e) { console.error("로드 실패", e); userCoins = 300; }
    } else { userCoins = 300; saveData(); }
}

function checkDailyLogin() {
    const today = new Date().toDateString();
    if (localStorage.getItem('last_login') !== today) {
        userCoins += 6;
        localStorage.setItem('last_login', today);
        alert("📅 출석 보상! 6숲코인이 지급되었습니다.");
        saveData();
    }
}

function resetData() {
    if (confirm("모든 데이터를 초기화하시겠습니까?")) {
        localStorage.removeItem('soop_save_final_v15');
        localStorage.removeItem('soop_save_final_v14');
        localStorage.removeItem('last_login');
        location.reload();
    }
}

function updateUI() {
    document.getElementById('user-coin').innerText = userCoins;
    document.getElementById('user-bp').innerText = userBP; 
    const totalCards = (SOOP_DATA.streamers || []).length;
    const myCards = Object.keys(ownedCards).length;
    const rate = totalCards > 0 ? Math.floor((myCards / totalCards) * 100) : 0;
    document.getElementById('stat-pulls').innerText = userStats.pulls;
    document.getElementById('stat-coins').innerText = userStats.spent;
    document.getElementById('stat-rate').innerText = rate;
    const dmBtn = document.getElementById('btn-darkmode');
    if(dmBtn) dmBtn.innerText = isDarkMode ? "☀️ 라이트 모드 켜기" : "🌙 다크 모드 켜기";
    
    // [NEW] 나만의 픽업 버튼 텍스트 업데이트
    const pickupCountBtn = document.getElementById('custom-pickup-count');
    if(pickupCountBtn) pickupCountBtn.innerText = `(${customPickupList.length}/3)`;
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    if(isDarkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    saveData();
}

function goHome() { goScreen('main'); }

function goScreen(id) {
    if (id !== 'minigame') {
        if(typeof exitMiniGame === 'function') {
            exitMiniGame();
        }
    }

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

/* 가챠 로직 */
function setupGachaUI() {
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
    if (userCoins < 6) { alert("숲코인이 부족합니다!"); return; }
    userCoins -= 6; userStats.pulls += 1; userStats.spent += 6; userBP += 1; 
    updateUI();
    document.getElementById('gacha-refund-notice').innerText = "";
    document.getElementById('btn-gacha-skip').style.display = "inline-block";
    document.getElementById('btn-gacha-close').style.display = "none";
    isSkipping = false; gachaResultsTemp = []; let refundCount = 0;

    const achievements = SOOP_DATA.achievements || [];
    // 기존 이벤트 타겟
    const eventTargetList = achievements.filter(a => a.title.includes(GAME_SETTINGS.pickup_target)).flatMap(a => a.targetList); 
    
    let totalWeight = 0;
    const pool = SOOP_DATA.streamers.map(s => {
        // [수정] 이벤트 대상이거나 나만의 픽업 대상이면 확률 증가
        const isEventTarget = eventTargetList.includes(s.name);
        const isCustomTarget = customPickupList.includes(s.id);
        
        // 두 조건 중 하나라도 만족하면 픽업 확률 적용 (중복 적용은 안됨)
        const weight = (isEventTarget || isCustomTarget) ? GAME_SETTINGS.pickup_rate : 1;
        
        totalWeight += weight; 
        return { ...s, weight: weight };
    });

    for (let i = 0; i < 6; i++) {
        let rand = Math.random() * totalWeight;
        let selected = null;
        for (const s of pool) { rand -= s.weight; if (rand < 0) { selected = s; break; } }
        if (!selected) selected = pool[0]; 
        let isEvo = false; 
        if (ownedCards[selected.id]) {
            let cardInfo = ownedCards[selected.id];
            if (selected.id === 's226') {
                if (cardInfo.stars === 1) cardInfo.stars = 2; 
                else if (cardInfo.stars === 2) { cardInfo.stars = 22; isEvo = true; } 
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
    if(refundCount > 0) document.getElementById('gacha-refund-notice').innerText = `5성(졸업) 중복 ${refundCount}장 1숲코인 환급!`;
    const grid = document.getElementById('gacha-result-grid'); grid.innerHTML = "";
    for(let i=0; i<6; i++) {
        const wrapper = document.createElement('div'); wrapper.className = "card-wrapper"; wrapper.id = `gacha-slot-${i}`;
        wrapper.innerHTML = `<div class="card-item locked"><div class="card-inner"><div class="card-back-design">?</div></div></div>`;
        grid.appendChild(wrapper);
    }
    document.getElementById('modal-gacha-result').style.display = 'flex';
    revealIndex = 0; revealTimer = setTimeout(revealNextCard, 500); 
}

function skipGachaAnimation() {
    isSkipping = true; 
    clearTimeout(revealTimer); 
    processSkipQueue();
}

function processSkipQueue() {
    if (revealIndex >= 6) {
        document.getElementById('btn-gacha-skip').style.display = "none";
        document.getElementById('btn-gacha-close').style.display = "inline-block";
        return;
    }
    const item = gachaResultsTemp[revealIndex];
    if (item.isEvo) {
        triggerEvolutionAnimation(item, () => {
            renderGachaCard(revealIndex, item);
            revealIndex++;
            processSkipQueue();
        });
    } else {
        renderGachaCard(revealIndex, item);
        revealIndex++;
        processSkipQueue();
    }
}

function revealNextCard() {
    if (revealIndex >= 6) {
        document.getElementById('btn-gacha-skip').style.display = "none";
        document.getElementById('btn-gacha-close').style.display = "inline-block";
        return; 
    }
    const item = gachaResultsTemp[revealIndex];
    if (item.isEvo) {
        triggerEvolutionAnimation(item, () => {
            renderGachaCard(revealIndex, item);
            revealIndex++;
            if(!isSkipping) revealTimer = setTimeout(revealNextCard, 600); 
            else processSkipQueue();
        });
    } else {
        renderGachaCard(revealIndex, item);
        revealIndex++;
        if(!isSkipping) revealTimer = setTimeout(revealNextCard, 600);
    }
}

function renderGachaCard(idx, item) {
    const wrapper = document.getElementById(`gacha-slot-${idx}`);
    const info = ownedCards[item.id] || { stars: 1 };
    let starClass = `star-${info.stars}`; let starText = `${info.stars}★`;
    let displayImg = item.imgs[0];
    if (item.specialImg && info.skin === 2) displayImg = item.specialImg;
    wrapper.innerHTML = `<div class="card-item ${starClass} flip-in"><div class="card-inner"><img src="${displayImg}" class="card-img" onerror="this.src=DEFAULT_IMG_URL"></div><div class="card-txt card-star">${starText}</div><div class="card-txt card-name">${item.name}</div></div>${item.isNew ? '<div class="new-badge">NEW</div>' : ''}`;
}

function triggerEvolutionAnimation(item, callback) {
    const modal = document.getElementById('modal-evolution');
    const container = document.getElementById('evo-card-container');
    const textElem = document.getElementById('evo-text');
    
    let flashDiv = document.querySelector('.evo-flash-screen');
    if (!flashDiv) {
        flashDiv = document.createElement('div');
        flashDiv.className = 'evo-flash-screen';
        document.querySelector('.evolution-content').appendChild(flashDiv);
    }

    const info = ownedCards[item.id];
    let prevStars = (info.stars === 22) ? 2 : (info.stars - 1);
    const prevImg = item.imgs[0]; 
    const prevStarClass = `star-${prevStars}`;

    container.innerHTML = `
        <div class="card-item large ${prevStarClass} evo-buildup">
            <div class="card-inner"><img src="${prevImg}" class="card-img"></div>
            <div class="card-txt card-star" style="font-size:24px; top:15px; left:35px;">${prevStars}★</div>
            <div class="card-txt card-name" style="font-size:24px; bottom:40px;">${item.name}</div>
        </div>
    `;
    
    textElem.classList.remove('show');
    textElem.innerText = "";
    flashDiv.className = 'evo-flash-screen'; 
    modal.style.display = 'flex';

    setTimeout(() => { flashDiv.classList.add('flash-active'); }, 1500);

    setTimeout(() => {
        let currentStarClass = `star-${info.stars}`;
        let currentImg = item.imgs[0];
        if (item.specialImg && info.stars >= 5) currentImg = item.specialImg;

        container.innerHTML = `
            <div class="card-item large ${currentStarClass} evo-finish">
                <div class="card-inner"><img src="${currentImg}" class="card-img"></div>
                <div class="card-txt card-star" style="font-size:24px; top:15px; left:35px;">${info.stars}★</div>
                <div class="card-txt card-name" style="font-size:24px; bottom:40px;">${item.name}</div>
            </div>
        `;
        const rankText = (info.stars === 22) ? "LEGENDARY!!" : "RANK UP!";
        textElem.innerText = rankText;
        textElem.classList.add('show');
    }, 2000); 

    setTimeout(() => {
        modal.style.display = 'none';
        flashDiv.classList.remove('flash-active');
        textElem.classList.remove('show');
        if (callback) callback(); 
    }, 5000);
}

function createCard(s, onClickFunc) {
    const wrapper = document.createElement('div'); wrapper.className = "card-wrapper";
    if (ownedCards[s.id]) {
        const info = ownedCards[s.id]; const starClass = `star-${info.stars}`;
        let img = s.imgs[0]; if(s.specialImg && info.skin === 2) img = s.specialImg; 
        wrapper.innerHTML = `<div class="card-item ${starClass}"><div class="card-inner"><img src="${img}" class="card-img" onerror="this.src=DEFAULT_IMG_URL"></div><div class="card-txt card-star">${info.stars}★</div><div class="card-txt card-name">${s.name}</div></div>`;
        wrapper.onclick = onClickFunc ? onClickFunc : () => openCardDetail(s.id);
    } else {
        wrapper.innerHTML = `<div class="card-item locked"><div class="card-inner" style="background:#111; display:flex; justify-content:center; align-items:center;"><div style="color:#444; font-size:30px;">?</div></div><div class="card-txt card-name">?</div></div>`;
    }
    return wrapper;
}
function openCardDetail(id) {
    currentDetailId = id;
    const s = SOOP_DATA.streamers.find(x => x.id === id);
    const info = ownedCards[id];
    const starClass = `star-${info.stars}`;
    let displayImg = s.imgs[0];
    if (s.specialImg && info.skin === 2) displayImg = s.specialImg;
    const visual = document.getElementById('detail-card-visual');
    visual.className = `card-item large ${starClass}`;
    visual.innerHTML = `<div class="card-inner"><img id="detail-card-img" src="${displayImg}" class="card-img" onclick="openFullImage()" onerror="this.src=DEFAULT_IMG_URL"></div><div class="card-txt card-star" style="font-size:24px; top:15px; left:35px;">${info.stars}★</div><div class="card-txt card-name" style="font-size:24px; bottom:40px;">${s.name}</div>`;
    const btnSwap = document.getElementById('btn-swap-img');
    if (s.specialImg && info.stars >= 5) {
        btnSwap.style.display = 'inline-block';
        btnSwap.innerText = (info.skin === 2) ? "기본 일러스트로" : "5성 일러스트로";
    } else { btnSwap.style.display = 'none'; }
    document.getElementById('modal-card-detail').style.display = 'flex';
}
function toggleCardImage() {
    const info = ownedCards[currentDetailId]; if (!info) return;
    info.skin = (info.skin === 2) ? 1 : 2; saveData(); openCardDetail(currentDetailId); 
    if(document.getElementById('screen-pokedex').classList.contains('active')) renderPokedex('all');
}
function renderPokedex(mode) {
    const list = document.getElementById('pokedex-list');
    const controls = document.getElementById('pokedex-controls');
    list.innerHTML = "";
    if (mode === 'all') {
        controls.innerHTML = `<input type="text" id="pokedex-search" placeholder="이름 검색" onkeyup="renderAllPokedexList()"><div class="filter-row"><select id="pokedex-sort" onchange="renderAllPokedexList()"><option value="name_asc">가나다순</option><option value="grade_desc">등급 높은순</option></select><select id="pokedex-filter" onchange="renderAllPokedexList()"><option value="all">전체 등급</option><option value="5">5성</option></select></div>`;
        renderAllPokedexList(); 
    } else {
        controls.innerHTML = `<input type="text" id="crew-search" placeholder="그룹/크루 또는 멤버 검색" onkeyup="renderCrewPokedexList()">`;
        renderCrewPokedexList();
    }
}
function renderAllPokedexList() {
    const list = document.getElementById('pokedex-list');
    const search = document.getElementById('pokedex-search').value.toLowerCase();
    const sort = document.getElementById('pokedex-sort').value;
    const filter = document.getElementById('pokedex-filter').value;
    list.innerHTML = "";
    let targets = SOOP_DATA.streamers.filter(s => s.name.toLowerCase().includes(search));
    if (filter !== 'all') { targets = targets.filter(s => { const info = ownedCards[s.id]; return info && info.stars == filter; }); }
    targets.sort((a, b) => {
        const infoA = ownedCards[a.id] || { stars: 0 }; const infoB = ownedCards[b.id] || { stars: 0 };
        if (sort === 'grade_desc') return infoB.stars - infoA.stars;
        return a.name.localeCompare(b.name);
    });
    targets.forEach(s => list.appendChild(createCard(s)));
}
function renderCrewPokedexList() {
    const list = document.getElementById('pokedex-list');
    const search = document.getElementById('crew-search').value.toLowerCase();
    list.innerHTML = "";
    const achievements = SOOP_DATA.achievements || [];
    let crews = achievements.filter(a => a.type === 'CREW').map(c => ({...c}));
    const crewMemberNames = new Set();
    crews.forEach(c => c.targetList.forEach(name => crewMemberNames.add(name)));
    const soloMembers = SOOP_DATA.streamers.filter(s => !crewMemberNames.has(s.name));
    if (soloMembers.length > 0) { crews.push({ id: 'soop_original', title: 'SOOP', logoUrl: 'images/soop_logo.svg', targetList: soloMembers.map(s => s.name), type: 'CREW' }); }
    crews = crews.filter(crew => {
        if (crew.title.toLowerCase().includes(search)) return true;
        return crew.targetList.some(name => name.toLowerCase().includes(search));
    });
    crews.forEach(crew => {
        const members = SOOP_DATA.streamers.filter(s => crew.targetList.includes(s.name));
        const collected = members.filter(s => ownedCards[s.id]).length;
        const isDone = (collected === members.length && members.length > 0);
        const shouldExpand = (search.length > 0); 
        const wrapper = document.createElement('div'); wrapper.style.width = "100%";
        wrapper.innerHTML = `<div class="crew-book-header ${isDone ? 'completed' : ''}" onclick="this.nextElementSibling.classList.toggle('active')"><img src="${crew.logoUrl}" class="crew-book-logo" onerror="this.src=DEFAULT_IMG_URL"><div class="crew-book-title">${crew.title} ${isDone ? '<span style="color:#00adef; margin-left:5px;">✨</span>' : ''} <span class="crew-count">(${collected}/${members.length})</span></div><span>▼</span></div>`;
        const body = document.createElement('div'); body.className = `crew-book-body ${shouldExpand ? 'active' : ''}`;
        members.forEach(s => body.appendChild(createCard(s)));
        wrapper.appendChild(body); list.appendChild(wrapper);
    });
}
function renderShop(mode) {
    if (mode) currentShopMode = mode;
    const list = document.getElementById('shop-list');
    const controls = document.getElementById('shop-controls');
    list.innerHTML = "";
    if (currentShopMode === 'all') {
        controls.innerHTML = `<input type="text" id="shop-search" placeholder="이름 검색" onkeyup="renderShopAll()">`;
        renderShopAll(); 
    } else {
        controls.innerHTML = `<input type="text" id="shop-crew-search" placeholder="그룹/크루 또는 멤버 검색" onkeyup="renderShopCrew()">`;
        renderShopCrew();
    }
}

/* [수정] 상점 전체보기 가나다순 정렬 적용 */
function renderShopAll() {
    const list = document.getElementById('shop-list');
    const searchInput = document.getElementById('shop-search');
    const search = searchInput ? searchInput.value.toLowerCase() : "";
    list.innerHTML = "";
    let targets = SOOP_DATA.streamers.filter(s => s.name.toLowerCase().includes(search));
    
    // 가나다순 정렬 추가
    targets.sort((a, b) => a.name.localeCompare(b.name));

    targets.forEach(s => list.appendChild(createShopItem(s)));
}

function renderShopCrew() {
    const list = document.getElementById('shop-list');
    const searchInput = document.getElementById('shop-crew-search');
    const search = searchInput ? searchInput.value.toLowerCase() : "";
    list.innerHTML = "";
    const achievements = SOOP_DATA.achievements || [];
    let crews = achievements.filter(a => a.type === 'CREW');
    crews = crews.filter(crew => {
        if (crew.title.toLowerCase().includes(search)) return true;
        return crew.targetList.some(name => name.toLowerCase().includes(search));
    });
    crews.forEach(crew => {
        const members = SOOP_DATA.streamers.filter(s => crew.targetList.includes(s.name));
        const shouldExpand = (search.length > 0); 
        const wrapper = document.createElement('div'); wrapper.style.width = "100%";
        wrapper.innerHTML = `
            <div class="crew-book-header" onclick="this.nextElementSibling.classList.toggle('active')">
                <img src="${crew.logoUrl}" class="crew-book-logo" onerror="this.src=DEFAULT_IMG_URL" style="margin-right:10px;">
                <div class="crew-book-title">${crew.title}</div>
                <span>▼</span>
            </div>`;
        const body = document.createElement('div'); body.className = `crew-book-body ${shouldExpand ? 'active' : ''}`;
        members.forEach(s => body.appendChild(createShopItem(s)));
        wrapper.appendChild(body); list.appendChild(wrapper);
    });
}

function createShopItem(s) {
    const myCard = ownedCards[s.id];
    const isMax = (s.id === 's226') ? (myCard && myCard.stars === 22) : (myCard && myCard.stars >= 5);
    const wrapper = document.createElement('div'); wrapper.className = "card-wrapper";
    
    const buyButtons = isMax 
        ? `<button class="shop-buy-btn" disabled>MAX</button>`
        : `<div class="shop-btn-group">
             <button class="shop-buy-btn coin" onclick="buyCard('${s.id}', 'coin')">💎 100</button>
             <button class="shop-buy-btn ticket" onclick="buyCard('${s.id}', 'ticket')">🎫 30</button>
           </div>`;

    wrapper.innerHTML = `<div class="card-item star-1" onclick="openCardDetail('${s.id}')"><div class="card-inner"><img src="${s.imgs[0]}" class="card-img" onerror="this.src=DEFAULT_IMG_URL"></div><div class="card-txt card-name">${s.name}</div></div>${buyButtons}`;
    return wrapper;
}

function buyCard(id, type) {
    const s = SOOP_DATA.streamers.find(x => x.id === id); if (!s) return;
    
    let costText = (type === 'coin') ? "100 숲코인" : "30 특별티켓";
    if (!confirm(`[${s.name}] 카드를 ${costText}으로 구매하시겠습니까?`)) return;

    if (type === 'coin') {
        if (userCoins < 100) { alert("숲코인이 부족합니다!"); return; }
        userCoins -= 100; userStats.spent += 100;
    } else {
        if (userBP < 30) { alert("특별티켓이 부족합니다!"); return; }
        userBP -= 30;
    }

    if (ownedCards[id]) {
         if (id === 's226') { if (ownedCards[id].stars === 1) ownedCards[id].stars = 2; else if (ownedCards[id].stars === 2) ownedCards[id].stars = 22; } 
         else { if (ownedCards[id].stars < 5) ownedCards[id].stars++; }
         alert(`${s.name} 강화 완료!`);
    } else { ownedCards[id] = { rank: 1, skin: 1, stars: 1 }; alert(`${s.name} 영입 완료!`); }
    saveData(); updateUI(); if (currentShopMode === 'all') renderShopAll(); else renderShopCrew();
}

function renderAchievements() {
    const list = document.getElementById('achieve-list'); const claimAllBtn = document.getElementById('btn-claim-all');
    list.innerHTML = ""; let claimableCount = 0;
    const achievements = SOOP_DATA.achievements || [];
    const processedList = achievements.map(ach => {
        let isClaimed = false, isDone = false, ratio = 0, currentTarget = 0, currentCount = 0;
        let dynamicId = ach.id, displayTitle = ach.title, progressText = "";
        if (ach.type === 'CREW') {
            isClaimed = clearedAchievements.includes(ach.id);
            currentCount = ach.targetList.filter(name => { const s = SOOP_DATA.streamers.find(x => x.name === name); return s && ownedCards[s.id]; }).length;
            currentTarget = ach.targetList.length; ratio = currentCount / currentTarget; isDone = (currentCount >= currentTarget); progressText = `(${currentCount}/${currentTarget})`;
        } else if (ach.type === 'COUNT') {
            currentCount = Object.keys(ownedCards).length; 
            if (ach.isInfinite) {
                let mult = 1; while (clearedAchievements.includes(`${ach.id}_${ach.targetCount * mult}`)) mult++;
                currentTarget = ach.targetCount * mult; dynamicId = `${ach.id}_${currentTarget}`; displayTitle = `${currentTarget}장 수집하기`; isClaimed = false; 
            } else { currentTarget = ach.targetCount; isClaimed = clearedAchievements.includes(ach.id); }
            ratio = Math.min(currentCount / currentTarget, 1); isDone = (currentCount >= currentTarget); progressText = `(${currentCount}/${currentTarget})`;
        }
        let priority = (isDone && !isClaimed) ? 3 : (isClaimed ? 1 : 2); if (priority === 3) claimableCount++;
        return { ...ach, dynamicId, displayTitle, progressText, ratio, isDone, isClaimed, priority };
    });
    if (claimableCount > 0) { claimAllBtn.style.display = 'block'; claimAllBtn.innerText = `🎁 모두 받기 (${claimableCount})`; } else { claimAllBtn.style.display = 'none'; }
    processedList.sort((a, b) => (b.priority !== a.priority) ? (b.priority - a.priority) : (b.ratio - a.ratio));
    processedList.forEach(ach => {
        const div = document.createElement('div'); div.className = `achievement-item ${ach.isClaimed ? 'claimed' : ''}`;
        div.style.background = (ach.priority === 3) ? "#fff9c4" : ((ach.priority === 1) ? "#f9f9f9" : "white");
        let btnHtml = (ach.priority === 1) ? '<span style="color:#999; font-size:14px;">수령 완료</span>' : (ach.priority === 3 ? `<button class="btn-green" style="width:auto; padding:8px 16px; margin:0;" onclick="claimReward('${ach.dynamicId}', ${ach.reward})">보상 받기</button>` : `<div style="text-align:right; width:80px;"><div style="font-size:12px; color:#888;">${Math.floor(ach.ratio * 100)}%</div><div style="width:100%; height:4px; background:#eee; border-radius:2px; overflow:hidden;"><div style="width:${Math.floor(ach.ratio * 100)}%; height:100%; background:var(--soop-blue);"></div></div></div>`);
        const logoSrc = ach.logoUrl ? ach.logoUrl : 'images/soop_logo.svg';
        div.innerHTML = `<div style="display:flex; align-items:center;"><img src="${logoSrc}" style="width:45px; height:45px; border-radius:10px; border:1px solid #ddd; margin-right:15px; object-fit:contain; background:#fff;" onerror="this.src='images/soop_logo.svg'"><div><div style="font-size:16px; font-weight:bold; color:#333;">${ach.displayTitle}</div><div style="font-size:13px; color:#888; margin-top:4px;">${ach.progressText} · 💰 ${ach.reward}숲코인</div></div></div><div>${btnHtml}</div>`;
        list.appendChild(div);
    });
}
function claimReward(id, r) { userCoins += r; clearedAchievements.push(id); saveData(); alert(`${r}숲코인 획득!`); renderAchievements(); }
function claimAllRewards() {
    let totalReward = 0; let count = 0; const currentCardCount = Object.keys(ownedCards).length; const achievements = SOOP_DATA.achievements || [];
    achievements.forEach(ach => {
        if (ach.type === 'CREW') {
            const isClaimed = clearedAchievements.includes(ach.id);
            if (!isClaimed) {
                const currentCount = ach.targetList.filter(name => { const s = SOOP_DATA.streamers.find(x => x.name === name); return s && ownedCards[s.id]; }).length;
                if (currentCount >= ach.targetList.length) { totalReward += ach.reward; clearedAchievements.push(ach.id); count++; }
            }
        } else if (ach.type === 'COUNT') {
            if (ach.isInfinite) {
                let mult = 1;
                while (true) {
                    const target = ach.targetCount * mult; const dynamicId = `${ach.id}_${target}`;
                    if (currentCardCount < target) break;
                    if (!clearedAchievements.includes(dynamicId)) { totalReward += ach.reward; clearedAchievements.push(dynamicId); count++; }
                    mult++;
                }
            } else {
                const isClaimed = clearedAchievements.includes(ach.id);
                if (!isClaimed && currentCardCount >= ach.targetCount) { totalReward += ach.reward; clearedAchievements.push(ach.id); count++; }
            }
        }
    });
    if (count > 0) { userCoins += totalReward; saveData(); renderAchievements(); alert(`총 ${count}개의 업적을 달성하여\n💰 ${totalReward}숲코인을 받았습니다!`); } 
    else { alert("받을 보상이 없습니다."); }
}

function openSettings() { updateUI(); document.getElementById('modal-settings').style.display = 'flex'; }
function closeSettings() { document.getElementById('modal-settings').style.display = 'none'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function openLogoSelect() { 
    const modal = document.getElementById('modal-logo-select'); const grid = document.getElementById('select-logo-grid'); grid.innerHTML = "";
    const achievements = SOOP_DATA.achievements || [];
    const unlocked = achievements.filter(a => a.type === 'CREW' && clearedAchievements.includes(a.id));
    if(unlocked.length === 0) grid.innerHTML = "<p style='padding:20px; color:#888;'>해금된 크루 로고가 없습니다.<br>크루 도감을 완성해보세요!</p>";
    unlocked.forEach(c => {
        const img = document.createElement('img'); img.src = c.logoUrl; img.className = "logo-select-item";
        img.style = "width:80px; height:80px; border-radius:50%; border:2px solid #ddd; margin:10px; cursor:pointer;";
        img.onclick = () => { myCrewLogo = c.logoUrl; saveData(); closeModal('modal-logo-select'); renderMyCrew(); };
        grid.appendChild(img);
    });
    modal.style.display = 'flex';
}
function openFullImage() { document.getElementById('full-image-src').src = document.getElementById('detail-card-img').src; document.getElementById('modal-full-image').style.display = 'flex'; }
function openSoopChannel() { const s = SOOP_DATA.streamers.find(x => x.id === currentDetailId); if(s) window.open(s.channelUrl, '_blank'); }
function exportSaveData() { 
    const saveObj = { c: userCoins, bp: userBP, d: {}, cr: myCrew, l: myCrewLogo, a: clearedAchievements, s: userStats, t: localStorage.getItem('last_login') };
    for (const [id, info] of Object.entries(ownedCards)) saveObj.d[id] = info.stars;
    const compressed = LZString.compressToBase64(JSON.stringify(saveObj));
    navigator.clipboard.writeText(compressed).then(() => alert("세이브 코드가 복사되었습니다.")).catch(()=>alert("복사 실패"));
}
function importSaveData() { 
    const code = prompt("세이브 코드를 붙여넣으세요:"); if(!code) return; 
    if (code === "wakgood0724") {
        if (!confirm("관리자 모드: 모든 카드를 획득하고 숲코인을 무한으로 설정하시겠습니까?")) return;
        const allCards = {}; SOOP_DATA.streamers.forEach(s => { allCards[s.id] = { stars: 5, rank: 1, skin: 1 }; });
        const allAchievements = (SOOP_DATA.achievements || []).map(a => a.id);
        userCoins = 999999; ownedCards = allCards; clearedAchievements = allAchievements;
        saveData(); alert("관리자 권한 승인 완료!"); location.reload(); return;
    }
    try { 
        let decompressed = LZString.decompressFromBase64(code);
        let data = decompressed ? JSON.parse(decompressed) : JSON.parse(decodeURIComponent(escape(atob(code))));
        if(data) {
             userCoins = data.c || data.coins; ownedCards = {}; 
             if(data.d) for (const [id, stars] of Object.entries(data.d)) ownedCards[id] = { rank: 1, skin: 1, stars: stars };
             else ownedCards = data.cards;
             myCrew = data.cr || data.crew; myCrewLogo = data.l || data.crewLogo; clearedAchievements = data.a || data.achievements; 
             userStats = data.s || data.stats; 
             saveData(); alert("성공적으로 불러왔습니다!"); location.reload();
        }
    } catch(e) { alert("잘못된 세이브 코드입니다."); } 
}

/* 나만의 크루 기능 */
function renderMyCrew() {
    const grid = document.getElementById('my-crew-grid'); 
    grid.innerHTML = ""; 
    const logoImg = document.getElementById('my-crew-logo-img');
    const logoText = document.getElementById('my-crew-logo-text');
    if (myCrewLogo && myCrewLogo !== 'default' && myCrewLogo !== 'images/soop_logo.svg') {
        logoImg.src = myCrewLogo; logoImg.style.display = 'block'; logoText.style.display = 'none';
    } else {
        logoImg.style.display = 'none'; logoText.style.display = 'block';
    }
    const nameInput = document.getElementById('my-crew-name'); if (nameInput) nameInput.value = myCrewName || "";
    const colorInput = document.getElementById('crew-bg-color'); if (colorInput) colorInput.value = myCrewColor || "#ffffff";
    const bgContainer = document.getElementById('my-crew-container'); if (bgContainer) bgContainer.style.backgroundColor = myCrewColor || "#ffffff";
    const sizeSelect = document.getElementById('crew-size-select'); if (sizeSelect) sizeSelect.value = myCrewSize;

    const formationArea = document.getElementById('formation-select-area');
    if (myCrewSize === 11) {
        formationArea.style.display = 'flex';
        document.querySelectorAll('.formation-btn').forEach(btn => {
            btn.classList.remove('active');
            if(btn.getAttribute('onclick').includes(currentFormationKey)) btn.classList.add('active');
        });
    } else { formationArea.style.display = 'none'; }

    if (myCrewSize === 11 && FORMATIONS[currentFormationKey]) {
        const rowConfigs = FORMATIONS[currentFormationKey];
        let slotIndex = 0;
        rowConfigs.forEach(count => {
            const row = document.createElement('div'); row.className = 'crew-row';
            for(let i = 0; i < count; i++) {
                if (slotIndex >= 11) break;
                const div = createSlotElement(slotIndex); row.appendChild(div); slotIndex++;
            }
            grid.appendChild(row);
        });
    } else {
        for(let i = 0; i < myCrewSize; i++) {
            const div = createSlotElement(i); grid.appendChild(div);
        }
    }
}
function createSlotElement(index) {
    const div = document.createElement('div');
    const id = myCrew[index];
    if (id && ownedCards[id]) {
        div.className = "slot"; 
        const s = SOOP_DATA.streamers.find(x => x.id === id);
        const info = ownedCards[id];
        div.innerHTML = `<div class="card-wrapper" style="width:100%; height:100%;"><div class="card-item star-${info.stars}"><div class="card-inner"><img src="${s.imgs[0]}" class="card-img" onerror="this.src=DEFAULT_IMG_URL"></div></div></div><div class="slot-overlay"><button class="overlay-btn" onclick="event.stopPropagation(); openCardSelectForCrew(${index})">🔄 교체</button><button class="overlay-btn red" onclick="event.stopPropagation(); clearCrewSlot(${index})">🗑 비우기</button></div>`;
        div.onclick = () => openCardSelectForCrew(index);
    } else { 
        div.className = "slot empty"; div.innerText = "+"; div.onclick = () => openCardSelectForCrew(index); 
    }
    return div;
}
function changeFormation(key) { currentFormationKey = key; saveData(); renderMyCrew(); }
function saveCrewName() { const input = document.getElementById('my-crew-name'); myCrewName = input.value; saveData(); }
function changeCrewBgColor() { const input = document.getElementById('crew-bg-color'); setCrewPresetColor(input.value); }
function setCrewPresetColor(color) { myCrewColor = color; document.getElementById('crew-bg-color').value = color; document.getElementById('my-crew-container').style.backgroundColor = color; saveData(); }
function changeCrewSize(size) {
    myCrewSize = parseInt(size);
    if (myCrew.length < myCrewSize) { while (myCrew.length < myCrewSize) myCrew.push(null); } 
    else if (myCrew.length > myCrewSize) { if(confirm("인원수를 줄이면 뒤쪽 슬롯의 멤버가 삭제됩니다. 계속하시겠습니까?")) { myCrew = myCrew.slice(0, myCrewSize); } else { document.getElementById('crew-size-select').value = myCrew.length; return; } }
    saveData(); renderMyCrew();
}
function clearCrewSlot(idx) { if(confirm("이 슬롯을 비우시겠습니까?")) { myCrew[idx] = null; saveData(); renderMyCrew(); } }
function openCardSelectForCrew(idx) { currentTargetSlotIndex = idx; const modal = document.getElementById('modal-card-select'); modal.style.display = 'flex'; renderSelectGrid(); }
function renderSelectGrid() {
    const grid = document.getElementById('select-card-grid'); const search = document.getElementById('select-search').value.toLowerCase();
    grid.innerHTML = ""; 
    let list = Object.keys(ownedCards).map(id => ({ ...SOOP_DATA.streamers.find(x => x.id === id), ...ownedCards[id] }));
    list = list.filter(c => c.name.toLowerCase().includes(search));
    list.forEach(c => {
        const wrapper = document.createElement('div'); wrapper.className = "card-wrapper";
        wrapper.innerHTML = `
            <div class="card-item star-${c.stars}">
                <div class="card-inner"><img src="${c.imgs[0]}" class="card-img"></div>
                <div class="card-txt card-name">${c.name}</div>
            </div>`;
        wrapper.onclick = () => {
            const isAlreadyPlaced = myCrew.some((id, index) => id === c.id && index !== currentTargetSlotIndex);
            if (isAlreadyPlaced) { alert("이미 배치된 멤버입니다."); return; }
            myCrew[currentTargetSlotIndex] = c.id; saveData(); closeModal('modal-card-select'); renderMyCrew();
        };
        grid.appendChild(wrapper);
    });
}
function resetMyCrew() { if(confirm("배치된 모든 멤버를 해제하시겠습니까?")) { myCrew = Array(myCrewSize).fill(null); myCrewName = ""; myCrewColor = "#ffffff"; saveData(); renderMyCrew(); } }

/* [NEW] 나만의 확률업 기능 관련 */
function openCustomPickupModal() {
    const modal = document.getElementById('modal-custom-pickup');
    modal.style.display = 'flex';
    renderCustomPickupSlots();
    renderCustomPickupGrid();
}

function renderCustomPickupSlots() {
    const area = document.getElementById('custom-pickup-selected-area');
    area.innerHTML = "";
    
    // 3개의 슬롯 생성
    for(let i=0; i<3; i++) {
        const id = customPickupList[i]; // 저장된 ID
        const slot = document.createElement('div');
        
        if(id) {
            // 선택된 스트리머가 있을 때
            const s = SOOP_DATA.streamers.find(x => x.id === id);
            if(s) {
                slot.className = "slot-small filled";
                slot.innerHTML = `<img src="${s.imgs[0]}" onerror="this.src=DEFAULT_IMG_URL">`;
                slot.onclick = () => removeCustomPickup(id); // 클릭 시 삭제
            } else {
                // 데이터 오류 등으로 못 찾을 경우 초기화
                customPickupList.splice(i, 1);
                saveData();
                renderCustomPickupSlots();
                return;
            }
        } else {
            // 비어있을 때
            slot.className = "slot-small";
            slot.innerHTML = `<span>+</span>`;
        }
        area.appendChild(slot);
    }
    updateUI(); // 카운트 갱신
}

function renderCustomPickupGrid() {
    const grid = document.getElementById('custom-pickup-grid');
    const search = document.getElementById('custom-pickup-search').value.toLowerCase();
    grid.innerHTML = "";
    
    let targets = SOOP_DATA.streamers.filter(s => s.name.toLowerCase().includes(search));
    
    // 가나다순 정렬
    targets.sort((a, b) => a.name.localeCompare(b.name));

    targets.forEach(s => {
        const isSelected = customPickupList.includes(s.id);
        const wrapper = document.createElement('div');
        wrapper.className = "card-wrapper";
        
        // 선택된 상태면 스타일 다르게 (투명도 등)
        const opacityStyle = isSelected ? "opacity: 0.4;" : "";
        
        // 카드 껍데기만 사용 (star-1 스타일 활용)
        wrapper.innerHTML = `
            <div class="card-item star-1" style="${opacityStyle}">
                <div class="card-inner"><img src="${s.imgs[0]}" class="card-img" onerror="this.src=DEFAULT_IMG_URL"></div>
                <div class="card-txt card-name">${s.name}</div>
            </div>`;
            
        wrapper.onclick = () => {
            if(isSelected) {
                removeCustomPickup(s.id);
            } else {
                addCustomPickup(s.id);
            }
        };
        grid.appendChild(wrapper);
    });
}

function addCustomPickup(id) {
    if(customPickupList.length >= 3) {
        alert("최대 3명까지만 선택할 수 있습니다.");
        return;
    }
    if(!customPickupList.includes(id)) {
        customPickupList.push(id);
        saveData();
        renderCustomPickupSlots();
        renderCustomPickupGrid();
    }
}

function removeCustomPickup(id) {
    customPickupList = customPickupList.filter(x => x !== id);
    saveData();
    renderCustomPickupSlots();
    renderCustomPickupGrid();
}
