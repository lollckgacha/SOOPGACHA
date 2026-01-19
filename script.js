/* =========================================================================
   [1] 전역 변수 및 초기화
   ========================================================================= */
let userCoins = 300; 
let ownedCards = {}; 
let myCrew = [null, null, null, null, null, null];
let myCrewLogo = 'images/soop_logo.svg'; 
let clearedAchievements = [];
let currentDetailId = null;
let userStats = { pulls: 0, spent: 0 };
let currentTargetSlotIndex = null; 
let currentShopMode = 'all';

let revealTimer = null;
let isSkipping = false;

window.onload = function() {
    loadData();
    checkDailyLogin();
    setupGachaUI();
    updateUI();
};

/* =========================================================================
   [2] 데이터 저장/로드
   ========================================================================= */
function saveData() {
    const data = {
        coins: userCoins, cards: ownedCards, crew: myCrew, 
        crewLogo: myCrewLogo, achievements: clearedAchievements, 
        stats: userStats, lastLogin: localStorage.getItem('last_login')
    };
    localStorage.setItem('soop_save_final_v14', JSON.stringify(data));
    updateUI();
}

function loadData() {
    const code = localStorage.getItem('soop_save_final_v14');
    if (code) {
        try {
            let data;
            try { data = JSON.parse(code); } catch(e) { data = null; }

            if (!data) {
                const decompressed = LZString.decompressFromBase64(code);
                if (decompressed) data = JSON.parse(decompressed);
            }

            if (data) {
                if (data.d) { 
                    userCoins = data.c;
                    myCrew = data.cr;
                    myCrewLogo = data.l;
                    clearedAchievements = data.a;
                    userStats = data.s;
                    localStorage.setItem('last_login', data.t);
                    
                    ownedCards = {};
                    for (const [id, stars] of Object.entries(data.d)) {
                        ownedCards[id] = { rank: 1, skin: 1, stars: stars };
                    }
                } else { 
                    userCoins = data.coins; 
                    ownedCards = data.cards; 
                    myCrew = data.crew; 
                    myCrewLogo = data.crewLogo; 
                    clearedAchievements = data.achievements; 
                    userStats = data.stats; 
                    localStorage.setItem('last_login', data.lastLogin);
                }
            }
        } catch(e) {
            console.error("데이터 로드 실패", e);
            userCoins = 300;
        }
    } else {
        userCoins = 300;
        saveData();
    }
}

function checkDailyLogin() {
    const today = new Date().toDateString();
    if (localStorage.getItem('last_login') !== today) {
        userCoins += 6;
        localStorage.setItem('last_login', today);
        alert("📅 출석 보상! 6코인이 지급되었습니다.");
        saveData();
    }
}

function resetData() {
    if (confirm("모든 데이터를 초기화하시겠습니까? (복구 불가)")) {
        localStorage.removeItem('soop_save_final_v14');
        localStorage.removeItem('last_login');
        location.reload();
    }
}

/* =========================================================================
   [3] UI 내비게이션
   ========================================================================= */
function setupGachaUI() {
    document.getElementById('gacha-event-title').innerHTML = GAME_SETTINGS.event_text;
    document.getElementById('gacha-banner-img').src = GAME_SETTINGS.pickup_banner;
}

function updateUI() {
    document.getElementById('user-coin').innerText = userCoins;
    const totalCards = SOOP_DATA.streamers.length;
    const myCards = Object.keys(ownedCards).length;
    const rate = totalCards > 0 ? Math.floor((myCards / totalCards) * 100) : 0;
    
    document.getElementById('stat-pulls').innerText = userStats.pulls;
    document.getElementById('stat-coins').innerText = userStats.spent;
    document.getElementById('stat-rate').innerText = rate;
}

function goHome() { goScreen('main'); }

function goScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (id === 'pokedex') renderPokedex('all');
    if (id === 'mycrew') renderMyCrew();
    if (id === 'shop') renderShop();
    if (id === 'achievements') renderAchievements();
    
    const btn = document.querySelector('.settings-btn');
    if(btn) btn.style.display = (id === 'main') ? 'block' : 'none';
    const tutorialBtn = document.querySelector('.tutorial-btn');
    if(tutorialBtn) tutorialBtn.style.display = (id === 'main') ? 'block' : 'none';

    document.getElementById('screen-' + id).classList.add('active');
}

function toggleTab(btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

/* =========================================================================
   [4] 가챠(영입) 시스템
   ========================================================================= */
let gachaResultsTemp = [];
let revealIndex = 0;

function pullGacha() {
    if (userCoins < 6) { alert("코인이 부족합니다!"); return; }
    userCoins -= 6; userStats.pulls += 1; userStats.spent += 6;
    updateUI();
    
    document.getElementById('gacha-refund-notice').innerText = "";
    document.getElementById('btn-gacha-skip').style.display = "inline-block";
    document.getElementById('btn-gacha-close').style.display = "none";
    isSkipping = false;

    gachaResultsTemp = [];
    let refundCount = 0;

    const pickupTargetList = SOOP_DATA.achievements
        .filter(a => a.title.includes(GAME_SETTINGS.pickup_target))
        .flatMap(a => a.targetList); 

    let totalWeight = 0;
    const pool = SOOP_DATA.streamers.map(s => {
        const weight = pickupTargetList.includes(s.name) ? GAME_SETTINGS.pickup_rate : 1;
        totalWeight += weight;
        return { ...s, weight: weight };
    });

    for (let i = 0; i < 6; i++) {
        let rand = Math.random() * totalWeight;
        let selected = null;
        for (const s of pool) {
            rand -= s.weight;
            if (rand < 0) { selected = s; break; }
        }
        if (!selected) selected = pool[0]; 

        if (ownedCards[selected.id]) {
            let cardInfo = ownedCards[selected.id];
            if (cardInfo.stars >= 5) {
                userCoins += 1; refundCount++;
                gachaResultsTemp.push({ ...selected, isNew: false });
            } else {
                cardInfo.stars++;
                gachaResultsTemp.push({ ...selected, isNew: false });
            }
        } else {
            ownedCards[selected.id] = { rank: 1, skin: 1, stars: 1 };
            gachaResultsTemp.push({ ...selected, isNew: true });
        }
    }
    saveData();
    if(refundCount > 0) document.getElementById('gacha-refund-notice').innerText = `5성 중복 ${refundCount}장 1코인 환급!`;

    const grid = document.getElementById('gacha-result-grid');
    grid.innerHTML = "";
    for(let i=0; i<6; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = "card-wrapper";
        wrapper.id = `gacha-slot-${i}`;
        wrapper.innerHTML = `<div class="card-item locked"><div class="card-inner"><div class="card-back-design">?</div></div></div>`;
        grid.appendChild(wrapper);
    }
    document.getElementById('modal-gacha-result').style.display = 'flex';
    revealIndex = 0;
    revealTimer = setTimeout(revealNextCard, 500); 
}

function skipGachaAnimation() {
    isSkipping = true;
    clearTimeout(revealTimer); 
    while (revealIndex < 6) { revealNextCard(); }
    document.getElementById('btn-gacha-skip').style.display = "none";
    document.getElementById('btn-gacha-close').style.display = "inline-block";
}

function revealNextCard() {
    if (revealIndex >= 6) {
        document.getElementById('btn-gacha-skip').style.display = "none";
        document.getElementById('btn-gacha-close').style.display = "inline-block";
        return; 
    }
    const wrapper = document.getElementById(`gacha-slot-${revealIndex}`);
    const item = gachaResultsTemp[revealIndex];
    const info = ownedCards[item.id] || { stars: 1 };
    const starClass = `star-${info.stars}`; 

    wrapper.innerHTML = `
        <div class="card-item ${starClass} flip-in">
            <div class="card-inner">
                <img src="${item.imgs[0]}" class="card-img" onerror="this.src=DEFAULT_IMG_URL">
            </div>
            <div class="card-txt card-star">${info.stars}★</div>
            <div class="card-txt card-name">${item.name}</div>
        </div>
        ${item.isNew ? '<div class="new-badge">NEW</div>' : ''}
    `;
    revealIndex++;
    if (!isSkipping) revealTimer = setTimeout(revealNextCard, 600);
}

/* =========================================================================
   [5] 공통 카드 생성 및 상세 보기
   ========================================================================= */
function createCard(s, onClickFunc) {
    const wrapper = document.createElement('div');
    wrapper.className = "card-wrapper";
    
    if (ownedCards[s.id]) {
        const info = ownedCards[s.id];
        const starClass = `star-${info.stars}`;
        wrapper.innerHTML = `
            <div class="card-item ${starClass}">
                <div class="card-inner"><img src="${s.imgs[0]}" class="card-img" onerror="this.src=DEFAULT_IMG_URL"></div>
                <div class="card-txt card-star">${info.stars}★</div>
                <div class="card-txt card-name">${s.name}</div>
            </div>`;
        wrapper.onclick = onClickFunc ? onClickFunc : () => openCardDetail(s.id);
    } else {
        wrapper.innerHTML = `
            <div class="card-item locked">
                <div class="card-inner" style="background:#111;">
                    <div style="color:#444; font-size:30px;">?</div>
                </div>
                <div class="card-txt card-name">?</div>
            </div>`;
    }
    return wrapper;
}

function openCardDetail(id) {
    currentDetailId = id;
    const s = SOOP_DATA.streamers.find(x => x.id === id);
    const info = ownedCards[id];
    const starClass = `star-${info.stars}`;
    
    document.getElementById('detail-card-visual').innerHTML = `
        <div class="card-inner">
            <img id="detail-card-img" src="${s.imgs[0]}" class="card-img" onclick="openFullImage()" onerror="this.src=DEFAULT_IMG_URL">
        </div>
        <div class="card-txt card-star" style="font-size:24px; top:15px; left:35px;">${info.stars}★</div>
        <div class="card-txt card-name" style="font-size:24px; bottom:40px;">${s.name}</div>
    `;
    
    document.getElementById('detail-card-visual').className = `card-item large ${starClass}`;
    document.getElementById('modal-card-detail').style.display = 'flex';
}

/* =========================================================================
   [6] 버츄얼 도감 (SOOP 카테고리 포함)
   ========================================================================= */
function renderPokedex(mode) {
    const list = document.getElementById('pokedex-list');
    const controls = document.getElementById('pokedex-controls');
    list.innerHTML = "";

    if (mode === 'all') {
        controls.innerHTML = `
            <input type="text" id="pokedex-search" placeholder="이름 검색" onkeyup="renderAllPokedexList()">
            <div class="filter-row">
                <select id="pokedex-sort" onchange="renderAllPokedexList()">
                    <option value="name_asc">가나다순</option>
                    <option value="grade_desc">등급 높은순</option>
                </select>
                <select id="pokedex-filter" onchange="renderAllPokedexList()">
                    <option value="all">전체 등급</option>
                    <option value="5">5성</option>
                    <option value="4">4성</option>
                    <option value="3">3성</option>
                    <option value="2">2성</option>
                    <option value="1">1성</option>
                </select>
            </div>
        `;
        controls.style.display = 'flex';
        renderAllPokedexList(); 
    } else {
        controls.innerHTML = `
            <input type="text" id="crew-search" placeholder="크루명 또는 멤버 검색" onkeyup="renderCrewPokedexList()">
            <div class="filter-row">
                <select id="crew-sort" onchange="renderCrewPokedexList()">
                    <option value="name_asc">가나다순</option>
                    <option value="rate_desc">달성률순</option>
                </select>
            </div>
        `;
        controls.style.display = 'flex';
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
    
    if (filter !== 'all') {
        targets = targets.filter(s => {
            const info = ownedCards[s.id];
            return info && info.stars == filter;
        });
    }

    targets.sort((a, b) => {
        const infoA = ownedCards[a.id] || { stars: 0 };
        const infoB = ownedCards[b.id] || { stars: 0 };
        if (sort === 'grade_desc') return infoB.stars - infoA.stars;
        if (sort === 'name_asc') return a.name.localeCompare(b.name);
        return 0;
    });

    targets.forEach(s => list.appendChild(createCard(s)));
}

function renderCrewPokedexList() {
    const list = document.getElementById('pokedex-list');
    const search = document.getElementById('crew-search').value.toLowerCase();
    const sort = document.getElementById('crew-sort').value;
    list.innerHTML = "";

    let crews = SOOP_DATA.achievements.filter(a => a.type === 'CREW').map(c => ({...c}));

    const crewMemberNames = new Set();
    crews.forEach(c => c.targetList.forEach(name => crewMemberNames.add(name)));

    const soloMembers = SOOP_DATA.streamers.filter(s => !crewMemberNames.has(s.name));

    if (soloMembers.length > 0) {
        const soopGroup = {
            id: 'soop_original',
            title: 'SOOP',
            logoUrl: 'images/soop_logo.svg',
            targetList: soloMembers.map(s => s.name),
            type: 'CREW'
        };
        crews.push(soopGroup);
    }

    crews = crews.filter(crew => {
        const matchTitle = crew.title.toLowerCase().includes(search);
        const matchMember = crew.targetList.some(name => name.toLowerCase().includes(search));
        return matchTitle || matchMember;
    });

    crews.sort((a, b) => {
        if (sort === 'rate_desc') {
            const rateA = getCrewRate(a);
            const rateB = getCrewRate(b);
            if (rateA !== rateB) return rateB - rateA; 
            return a.title.localeCompare(b.title);
        }
        return a.title.localeCompare(b.title);
    });

    crews.forEach(crew => {
        const members = SOOP_DATA.streamers.filter(s => crew.targetList.includes(s.name));
        const collected = members.filter(s => ownedCards[s.id]).length;
        const isDone = (collected === members.length);

        const wrapper = document.createElement('div');
        wrapper.style.width = "100%";
        
        const header = document.createElement('div');
        header.className = `crew-book-header ${isDone ? 'completed' : ''}`;
        header.onclick = function() {
            const body = this.nextElementSibling;
            body.classList.toggle('active'); 
        };
        header.innerHTML = `
            <img src="${crew.logoUrl}" class="crew-book-logo" onerror="this.src=DEFAULT_IMG_URL">
            <div class="crew-book-title">
                ${crew.title} ${isDone?'✨':''}
                <span class="crew-count">(${collected}/${members.length})</span>
            </div>
            <span style="font-size:12px;">▼</span>
        `;
        wrapper.appendChild(header);

        const body = document.createElement('div');
        body.className = "crew-book-body";
        if (search) body.classList.add('active');

        members.forEach(s => body.appendChild(createCard(s)));
        wrapper.appendChild(body);

        list.appendChild(wrapper);
    });
}

function getCrewRate(crew) {
    const members = SOOP_DATA.streamers.filter(s => crew.targetList.includes(s.name));
    if (members.length === 0) return 0;
    const collected = members.filter(s => ownedCards[s.id]).length;
    return collected / members.length;
}

/* =========================================================================
   [7] 나만의 크루 & 멤버 선택
   ========================================================================= */
function renderMyCrew() {
    const grid = document.getElementById('my-crew-grid');
    const logo = document.getElementById('my-crew-logo');
    grid.innerHTML = "";
    if (myCrewLogo) { logo.src = myCrewLogo; logo.style.display = 'block'; }

    for(let i=0; i<6; i++) {
        const div = document.createElement('div');
        const id = myCrew[i];

        if (id && ownedCards[id]) {
            div.className = "slot"; 
            const s = SOOP_DATA.streamers.find(x => x.id === id);
            const info = ownedCards[id];
            const starClass = `star-${info.stars}`;
            div.innerHTML = `
                <div class="card-wrapper" style="width:100%; height:100%;">
                    <div class="card-item ${starClass}">
                        <div class="card-inner"><img src="${s.imgs[0]}" class="card-img" onerror="this.src=DEFAULT_IMG_URL"></div>
                        <div class="card-txt card-star" style="font-size:12px; top:15px; left:18px;">${info.stars}★</div>
                        <div class="card-txt card-name" style="font-size:12px; bottom:12px;">${s.name}</div>
                    </div>
                </div>`;
            div.onclick = () => openCardSelectForCrew(i);
        } else {
            div.className = "slot empty";
            div.innerText = "+";
            div.onclick = () => openCardSelectForCrew(i);
        }
        grid.appendChild(div);
    }
}

function openCardSelectForCrew(idx) {
    currentTargetSlotIndex = idx;
    const modal = document.getElementById('modal-card-select');
    modal.style.display = 'flex';
    renderSelectGrid(); 
}

function renderSelectGrid() {
    const grid = document.getElementById('select-card-grid');
    const searchInput = document.getElementById('select-search');
    const sortSelect = document.getElementById('select-sort');
    const filterSelect = document.getElementById('select-filter');

    const search = searchInput ? searchInput.value.toLowerCase() : "";
    const sort = sortSelect ? sortSelect.value : "grade_desc";
    const filter = filterSelect ? filterSelect.value : "all";
    grid.innerHTML = "";

    let list = Object.keys(ownedCards).map(id => {
        return { ...SOOP_DATA.streamers.find(x => x.id === id), ...ownedCards[id] };
    });

    list = list.filter(c => c.name.toLowerCase().includes(search));

    if (filter !== 'all') {
        list = list.filter(c => c.stars == filter);
    }

    list.sort((a, b) => {
        if (sort === 'grade_desc') return b.stars - a.stars;
        if (sort === 'grade_asc') return a.stars - b.stars;
        if (sort === 'name_asc') return a.name.localeCompare(b.name);
        if (sort === 'name_desc') return b.name.localeCompare(a.name);
        return 0;
    });

    list.forEach(c => {
        const wrapper = document.createElement('div');
        wrapper.className = "card-wrapper";
        const starClass = `star-${c.stars}`;
        wrapper.innerHTML = `
            <div class="card-item ${starClass}">
                <div class="card-inner"><img src="${c.imgs[0]}" class="card-img"></div>
                <div class="card-txt card-star">${c.stars}★</div>
                <div class="card-txt card-name">${c.name}</div>
            </div>`;
        wrapper.onclick = () => {
            const isAlreadyPlaced = myCrew.some((id, index) => id === c.id && index !== currentTargetSlotIndex);
            if (isAlreadyPlaced) { alert("이미 배치된 멤버입니다."); return; }
            myCrew[currentTargetSlotIndex] = c.id;
            saveData(); closeModal('modal-card-select'); renderMyCrew();
        };
        grid.appendChild(wrapper);
    });
}

function resetMyCrew() {
    if(confirm("배치된 모든 멤버를 해제하시겠습니까?")) {
        myCrew = [null, null, null, null, null, null];
        saveData(); renderMyCrew();
    }
}

/* =========================================================================
   [8] 도전 과제 (모두 받기 - 반복형 포함, 로고 추가 수정)
   ========================================================================= */
function renderAchievements() {
    const list = document.getElementById('achieve-list');
    const claimAllBtn = document.getElementById('btn-claim-all');
    list.innerHTML = "";
    
    let claimableCount = 0;

    const processedList = SOOP_DATA.achievements.map(ach => {
        let isClaimed = false, isDone = false, ratio = 0, currentTarget = 0, currentCount = 0;
        let dynamicId = ach.id, displayTitle = ach.title, progressText = "";

        if (ach.type === 'CREW') {
            isClaimed = clearedAchievements.includes(ach.id);
            currentCount = ach.targetList.filter(name => {
                const s = SOOP_DATA.streamers.find(x => x.name === name);
                return s && ownedCards[s.id];
            }).length;
            currentTarget = ach.targetList.length;
            ratio = currentCount / currentTarget;
            isDone = (currentCount >= currentTarget);
            progressText = `(${currentCount}/${currentTarget})`;
        } else if (ach.type === 'COUNT') {
            currentCount = Object.keys(ownedCards).length; 
            if (ach.isInfinite) {
                let mult = 1;
                while (clearedAchievements.includes(`${ach.id}_${ach.targetCount * mult}`)) mult++;
                currentTarget = ach.targetCount * mult;
                dynamicId = `${ach.id}_${currentTarget}`;
                displayTitle = `${currentTarget}장 수집하기`;
                isClaimed = false; 
            } else {
                currentTarget = ach.targetCount;
                isClaimed = clearedAchievements.includes(ach.id);
            }
            ratio = Math.min(currentCount / currentTarget, 1);
            isDone = (currentCount >= currentTarget);
            progressText = `(${currentCount}/${currentTarget})`;
        }
        let priority = (isDone && !isClaimed) ? 3 : (isClaimed ? 1 : 2);
        if (priority === 3) claimableCount++;
        return { ...ach, dynamicId, displayTitle, progressText, ratio, isDone, isClaimed, priority };
    });

    if (claimableCount > 0) {
        claimAllBtn.style.display = 'block';
        claimAllBtn.innerText = `🎁 모두 받기 (${claimableCount})`;
    } else {
        claimAllBtn.style.display = 'none';
    }

    processedList.sort((a, b) => (b.priority !== a.priority) ? (b.priority - a.priority) : (b.ratio - a.ratio));

    processedList.forEach(ach => {
        const div = document.createElement('div');
        div.className = "achievement-item";
        div.style.background = (ach.priority === 3) ? "#fff9c4" : ((ach.priority === 1) ? "#f9f9f9" : "white");
        div.style.padding = "15px"; 
        div.style.borderBottom = "1px solid #eee"; 
        div.style.display = "flex"; 
        div.style.justifyContent = "space-between"; 
        div.style.alignItems = "center";

        let btnHtml = "";
        if (ach.priority === 1) {
            btnHtml = '<span style="color:#999; font-size:14px;">수령 완료</span>';
        } else if (ach.priority === 3) {
            btnHtml = `<button class="btn-green" style="width:auto; padding:8px 16px; margin:0;" onclick="claimReward('${ach.dynamicId}', ${ach.reward})">보상 받기</button>`;
        } else {
            const p = Math.floor(ach.ratio * 100);
            btnHtml = `<div style="text-align:right; width:80px;"><div style="font-size:12px; color:#888;">${p}%</div><div style="width:100%; height:4px; background:#eee; border-radius:2px; overflow:hidden;"><div style="width:${p}%; height:100%; background:var(--soop-blue);"></div></div></div>`;
        }

        // 로고 이미지 URL 확인 (없으면 기본 이미지)
        const logoSrc = ach.logoUrl ? ach.logoUrl : DEFAULT_IMG_URL;
        
        div.innerHTML = `
            <div style="display:flex; align-items:center;">
                <img src="${logoSrc}" 
                     style="width:45px; height:45px; border-radius:10px; border:1px solid #ddd; margin-right:15px; object-fit:contain; background:#fff;" 
                     onerror="this.src='${DEFAULT_IMG_URL}'">
                <div>
                    <div style="font-size:16px; font-weight:bold; color:#333;">${ach.displayTitle}</div>
                    <div style="font-size:13px; color:#888; margin-top:4px;">${ach.progressText} · 💰 ${ach.reward}</div>
                </div>
            </div>
            <div>${btnHtml}</div>`;
            
        list.appendChild(div);
    });
}

function claimReward(id, r) { 
    userCoins += r; clearedAchievements.push(id); saveData(); alert(`${r}코인 획득!`); renderAchievements(); 
}

function claimAllRewards() {
    let totalReward = 0;
    let count = 0;
    const currentCardCount = Object.keys(ownedCards).length;

    SOOP_DATA.achievements.forEach(ach => {
        if (ach.type === 'CREW') {
            const isClaimed = clearedAchievements.includes(ach.id);
            if (!isClaimed) {
                const currentCount = ach.targetList.filter(name => {
                    const s = SOOP_DATA.streamers.find(x => x.name === name);
                    return s && ownedCards[s.id];
                }).length;
                if (currentCount >= ach.targetList.length) {
                    totalReward += ach.reward;
                    clearedAchievements.push(ach.id);
                    count++;
                }
            }
        } else if (ach.type === 'COUNT') {
            if (ach.isInfinite) {
                let mult = 1;
                while (true) {
                    const target = ach.targetCount * mult;
                    const dynamicId = `${ach.id}_${target}`;
                    if (currentCardCount < target) break;
                    if (!clearedAchievements.includes(dynamicId)) {
                        totalReward += ach.reward;
                        clearedAchievements.push(dynamicId);
                        count++;
                    }
                    mult++;
                }
            } else {
                const isClaimed = clearedAchievements.includes(ach.id);
                if (!isClaimed && currentCardCount >= ach.targetCount) {
                    totalReward += ach.reward;
                    clearedAchievements.push(ach.id);
                    count++;
                }
            }
        }
    });

    if (count > 0) {
        userCoins += totalReward;
        saveData();
        renderAchievements();
        alert(`총 ${count}개의 업적을 달성하여\n💰 ${totalReward}코인을 받았습니다!`);
    } else {
        alert("받을 보상이 없습니다.");
    }
}

/* =========================================================================
   [9] 버츄얼 상점 (SOOP 카테고리 포함)
   ========================================================================= */
function renderShop(mode) {
    if (mode) currentShopMode = mode;
    const list = document.getElementById('shop-list');
    const controls = document.getElementById('shop-controls');
    list.innerHTML = "";

    if (currentShopMode === 'all') {
        controls.innerHTML = `
            <input type="text" id="shop-search" placeholder="이름 검색" onkeyup="renderShopAll()">
            <div class="filter-row">
                <select id="shop-sort" onchange="renderShopAll()">
                    <option value="name_asc">가나다순</option>
                    <option value="grade_asc">등급 낮은순</option>
                    <option value="grade_desc">등급 높은순</option>
                </select>
                <select id="shop-filter" onchange="renderShopAll()">
                    <option value="all">전체 상태</option>
                    <option value="available">구매 가능</option>
                    <option value="max">최대 성장 (구매 불가)</option>
                </select>
            </div>
        `;
        controls.style.display = 'flex';
        renderShopAll(); 
    } else {
        controls.innerHTML = `
            <input type="text" id="shop-crew-search" placeholder="크루명 또는 멤버 검색" onkeyup="renderShopCrew()">
        `;
        controls.style.display = 'flex';
        renderShopCrew();
    }
}

function renderShopAll() {
    const list = document.getElementById('shop-list');
    const search = document.getElementById('shop-search').value.toLowerCase();
    const sort = document.getElementById('shop-sort').value;
    const filter = document.getElementById('shop-filter').value;
    list.innerHTML = "";

    let targets = [...SOOP_DATA.streamers];

    if (search) targets = targets.filter(s => s.name.toLowerCase().includes(search));

    if (filter !== 'all') {
        targets = targets.filter(s => {
            const myCard = ownedCards[s.id];
            const isMax = myCard && myCard.stars >= 5;
            if (filter === 'available') return !isMax;
            if (filter === 'max') return isMax;
            return true;
        });
    }

    targets.sort((a, b) => {
        const infoA = ownedCards[a.id] || { stars: 0 };
        const infoB = ownedCards[b.id] || { stars: 0 };
        if (sort === 'grade_desc') return infoB.stars - infoA.stars;
        if (sort === 'grade_asc') return infoA.stars - infoB.stars;
        return a.name.localeCompare(b.name); 
    });

    targets.forEach(s => list.appendChild(createShopItem(s)));
}

function renderShopCrew() {
    const list = document.getElementById('shop-list');
    const search = document.getElementById('shop-crew-search').value.toLowerCase();
    list.innerHTML = "";

    let crews = SOOP_DATA.achievements.filter(a => a.type === 'CREW').map(c => ({...c}));

    const crewMemberNames = new Set();
    crews.forEach(c => c.targetList.forEach(name => crewMemberNames.add(name)));

    const soloMembers = SOOP_DATA.streamers.filter(s => !crewMemberNames.has(s.name));

    if (soloMembers.length > 0) {
        const soopGroup = {
            id: 'soop_original',
            title: 'SOOP',
            logoUrl: 'images/soop_logo.svg',
            targetList: soloMembers.map(s => s.name),
            type: 'CREW'
        };
        crews.push(soopGroup);
    }

    crews = crews.filter(crew => {
        const matchTitle = crew.title.toLowerCase().includes(search);
        const matchMember = crew.targetList.some(name => name.toLowerCase().includes(search));
        return matchTitle || matchMember;
    });

    crews.sort((a, b) => a.title.localeCompare(b.title));

    crews.forEach(crew => {
        const members = SOOP_DATA.streamers.filter(s => crew.targetList.includes(s.name));
        const collected = members.filter(s => ownedCards[s.id]).length;
        const isDone = (collected === members.length);

        const wrapper = document.createElement('div');
        wrapper.style.width = "100%";
        
        const header = document.createElement('div');
        header.className = `crew-book-header ${isDone ? 'completed' : ''}`;
        header.onclick = function() {
            const body = this.nextElementSibling;
            body.classList.toggle('active'); 
        };
        header.innerHTML = `
            <img src="${crew.logoUrl}" class="crew-book-logo" onerror="this.src=DEFAULT_IMG_URL">
            <div class="crew-book-title">
                ${crew.title}
                <span class="crew-count">(${collected}/${members.length})</span>
            </div>
            <span style="font-size:12px;">▼</span>
        `;
        wrapper.appendChild(header);

        const body = document.createElement('div');
        body.className = "crew-book-body";
        if (search) body.classList.add('active');

        members.forEach(s => body.appendChild(createShopItem(s)));
        wrapper.appendChild(body);
        list.appendChild(wrapper);
    });
}

function createShopItem(s) {
    const myCard = ownedCards[s.id];
    const isMax = myCard && myCard.stars >= 5;
    const price = 100;

    const wrapper = document.createElement('div');
    wrapper.className = "card-wrapper";
    
    const cardHtml = `
        <div class="card-item star-1" onclick="openCardDetail('${s.id}')"> 
            <div class="card-inner"><img src="${s.imgs[0]}" class="card-img" onerror="this.src=DEFAULT_IMG_URL"></div>
            <div class="card-txt card-name">${s.name}</div>
        </div>
    `;
    const btnHtml = `
        <button class="shop-buy-btn" onclick="tryBuyCard('${s.id}', ${isMax})" ${isMax ? 'disabled' : ''}>
            ${isMax ? '구매 불가' : price + ' 코인'}
        </button>
    `;
    wrapper.innerHTML = cardHtml + btnHtml;
    return wrapper;
}

function tryBuyCard(id, isMax) {
    if (isMax) return;
    const s = SOOP_DATA.streamers.find(x => x.id === id);
    if (!s) return;

    if (userCoins < 30) { alert("코인이 부족합니다!"); return; }
    
    if (confirm(`[${s.name}]을(를) 30코인에 구매하시겠습니까?`)) {
        userCoins -= 30; 
        userStats.spent += 30;
        
        if (ownedCards[id]) {
             if (ownedCards[id].stars < 5) {
                 ownedCards[id].stars++;
                 alert(`${s.name} 강화 성공! (${ownedCards[id].stars}성)`);
             }
        } else {
            ownedCards[id] = { rank: 1, skin: 1, stars: 1 };
            alert(`${s.name} 영입 완료!`);
        }
        saveData();
        if (currentShopMode === 'all') renderShopAll();
        else renderShopCrew();
        updateUI();
    }
}

function openSoopChannel() { 
    const s = SOOP_DATA.streamers.find(x => x.id === currentDetailId); 
    if(s) window.open(s.channelUrl, '_blank'); 
}

function openFullImage() { 
    document.getElementById('full-image-src').src = document.getElementById('detail-card-img').src; 
    document.getElementById('modal-full-image').style.display = 'flex'; 
}

function openLogoSelect() { 
    const modal = document.getElementById('modal-logo-select');
    const grid = document.getElementById('select-logo-grid');
    grid.innerHTML = "";
    const unlocked = SOOP_DATA.achievements.filter(a => a.type === 'CREW' && clearedAchievements.includes(a.id));
    if(unlocked.length === 0) grid.innerHTML = "<p style='padding:20px; color:#888;'>해금된 크루 로고가 없습니다.<br>크루 도감을 완성해보세요!</p>";
    unlocked.forEach(c => {
        const img = document.createElement('img');
        img.src = c.logoUrl; img.className = "logo-select-item";
        img.style = "width:80px; height:80px; border-radius:50%; border:2px solid #ddd; margin:10px; cursor:pointer;";
        img.onclick = () => { myCrewLogo = c.logoUrl; saveData(); closeModal('modal-logo-select'); renderMyCrew(); };
        grid.appendChild(img);
    });
    modal.style.display = 'flex';
}

/* =========================================================================
   [10] 유틸리티 (세이브 코드 압축 및 치트키)
   ========================================================================= */
function exportSaveData() { 
    const saveObj = { c: userCoins, d: {}, cr: myCrew, l: myCrewLogo, a: clearedAchievements, s: userStats, t: localStorage.getItem('last_login') };
    for (const [id, info] of Object.entries(ownedCards)) saveObj.d[id] = info.stars;
    const compressed = LZString.compressToBase64(JSON.stringify(saveObj));
    navigator.clipboard.writeText(compressed).then(() => alert(`✅ 세이브 코드가 복사되었습니다.\n(길이: ${compressed.length}자)`)).catch(()=>alert("복사 실패"));
}

function importSaveData() { 
    const code = prompt("세이브 코드를 붙여넣으세요:"); 
    if(!code) return; 

    // [치트키] soop_admin
    if (code === "gkwlgns0603") {
        if (!confirm("⚠️ 관리자 모드: 모든 카드를 획득하고 코인을 무한으로 설정하시겠습니까?")) return;
        const allCards = {};
        SOOP_DATA.streamers.forEach(s => { allCards[s.id] = { stars: 5, rank: 1, skin: 1 }; });
        const allAchievements = SOOP_DATA.achievements.map(a => a.id);
        
        userCoins = 999999;
        ownedCards = allCards;
        clearedAchievements = allAchievements;
        myCrew = [null, null, null, null, null, null];
        saveData();
        alert("👑 관리자 권한 승인 완료!");
        location.reload();
        return;
    }

    try { 
        let decompressed = LZString.decompressFromBase64(code);
        let data;
        if (!decompressed) { try { data = JSON.parse(decodeURIComponent(escape(atob(code)))); } catch(e) { data = null; } } 
        else { data = JSON.parse(decompressed); }

        if(data) {
            if (data.d) { 
                userCoins = data.c; myCrew = data.cr; myCrewLogo = data.l; clearedAchievements = data.a; userStats = data.s; localStorage.setItem('last_login', data.t);
                ownedCards = {}; for (const [id, stars] of Object.entries(data.d)) ownedCards[id] = { rank: 1, skin: 1, stars: stars };
            } else { 
                userCoins = data.coins; ownedCards = data.cards; myCrew = data.crew; myCrewLogo = data.crewLogo; clearedAchievements = data.achievements; userStats = data.stats; localStorage.setItem('last_login', data.lastLogin);
            }
            saveData(); alert("성공적으로 불러왔습니다!"); location.reload();
        } else { throw new Error(); }
    } catch(e) { alert("잘못된 세이브 코드입니다."); } 
}

function openSettings() { updateUI(); document.getElementById('modal-settings').style.display = 'flex'; }
function closeSettings() { document.getElementById('modal-settings').style.display = 'none'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }