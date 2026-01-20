/* ... 전역 변수 및 기본 설정 ... */

// [1] 나만의 크루 렌더링 수정
function renderMyCrew() {
    const grid = document.getElementById('my-crew-grid'); 
    grid.innerHTML = ""; 
    
    // 로고 표시 로직 수정
    const logoContainer = document.getElementById('my-crew-logo-container');
    const logoImg = document.getElementById('my-crew-logo');
    const logoText = document.getElementById('my-crew-logo-text');
    const logoPlaceholder = document.getElementById('my-crew-logo-placeholder');

    if (logoContainer && logoImg && logoText && logoPlaceholder) {
        logoContainer.onclick = openLogoSelect;
        
        if (myCrewLogo && myCrewLogo !== '') {
            // 커스텀 로고가 있으면 이미지 표시
            logoImg.src = myCrewLogo; 
            logoImg.style.display = 'block';
            logoText.style.display = 'none';
            logoPlaceholder.style.display = 'none';
        } else {
            // 로고가 없으면(기본 상태) 파란색 SOOP 텍스트 표시
            logoImg.style.display = 'none';
            logoText.style.display = 'block'; 
            logoPlaceholder.style.display = 'none';
        }
    }

    // (기존 코드 유지) 이름 및 색상 로드...
    const nameInput = document.getElementById('my-crew-name');
    if (nameInput) nameInput.value = myCrewName || "";
    const colorInput = document.getElementById('crew-bg-color');
    if (colorInput) colorInput.value = myCrewColor || "#ffffff";
    const bgContainer = document.getElementById('my-crew-container');
    if (bgContainer) bgContainer.style.backgroundColor = myCrewColor || "#ffffff";
    const sizeSelect = document.getElementById('crew-size-select');
    if (sizeSelect) sizeSelect.value = myCrewSize;

    // (기존 코드 유지) 포메이션 및 슬롯 렌더링...
    // ...
    // renderMyCrew 함수 끝부분까지 기존과 동일
    const formationArea = document.getElementById('formation-select-area');
    if (myCrewSize === 11) {
        formationArea.style.display = 'flex';
        document.querySelectorAll('.formation-btn').forEach(btn => {
            btn.classList.remove('active');
            if(btn.getAttribute('onclick').includes(currentFormationKey)) btn.classList.add('active');
        });
    } else {
        formationArea.style.display = 'none';
    }

    if (myCrewSize === 11 && FORMATIONS[currentFormationKey]) {
        const rowConfigs = FORMATIONS[currentFormationKey];
        let slotIndex = 0;
        rowConfigs.forEach(count => {
            const row = document.createElement('div');
            row.className = 'crew-row';
            for(let i = 0; i < count; i++) {
                if (slotIndex >= 11) break;
                const div = document.createElement('div');
                const currentIndex = slotIndex;
                const id = myCrew[currentIndex];
                if (id && ownedCards[id]) {
                    div.className = "slot"; 
                    const s = SOOP_DATA.streamers.find(x => x.id === id);
                    const info = ownedCards[id];
                    div.innerHTML = `
                        <div class="card-wrapper" style="width:100%; height:100%;">
                            <div class="card-item star-${info.stars}"><div class="card-inner"><img src="${s.imgs[0]}" class="card-img"></div></div>
                        </div>
                        <div class="slot-overlay">
                            <button class="overlay-btn" onclick="event.stopPropagation(); openCardSelectForCrew(${currentIndex})">🔄 교체</button>
                            <button class="overlay-btn red" onclick="event.stopPropagation(); clearCrewSlot(${currentIndex})">🗑 비우기</button>
                        </div>
                    `;
                    div.onclick = () => openCardSelectForCrew(currentIndex);
                } else { 
                    div.className = "slot empty"; div.innerText = "+"; 
                    div.onclick = () => openCardSelectForCrew(currentIndex); 
                }
                row.appendChild(div);
                slotIndex++;
            }
            grid.appendChild(row);
        });
    } else {
        for(let i = 0; i < myCrewSize; i++) {
            const div = document.createElement('div');
            const currentIndex = i;
            const id = myCrew[currentIndex];
            if (id && ownedCards[id]) {
                div.className = "slot"; 
                const s = SOOP_DATA.streamers.find(x => x.id === id);
                const info = ownedCards[id];
                div.innerHTML = `
                    <div class="card-wrapper" style="width:100%; height:100%;">
                        <div class="card-item star-${info.stars}"><div class="card-inner"><img src="${s.imgs[0]}" class="card-img"></div></div>
                    </div>
                    <div class="slot-overlay">
                        <button class="overlay-btn" onclick="event.stopPropagation(); openCardSelectForCrew(${currentIndex})">🔄 교체</button>
                        <button class="overlay-btn red" onclick="event.stopPropagation(); clearCrewSlot(${currentIndex})">🗑 비우기</button>
                    </div>
                `;
                div.onclick = () => openCardSelectForCrew(currentIndex);
            } else { 
                div.className = "slot empty"; div.innerText = "+"; 
                div.onclick = () => openCardSelectForCrew(currentIndex); 
            }
            grid.appendChild(div);
        }
    }
}

// [2] 도감/상점 렌더링 시 기본 로고 대체
function renderAchievements() {
    const list = document.getElementById('achieve-list'); const claimAllBtn = document.getElementById('btn-claim-all');
    list.innerHTML = ""; let claimableCount = 0;
    const achievements = SOOP_DATA.achievements || [];
    const processedList = achievements.map(ach => {
        let isClaimed = false, isDone = false, ratio = 0, currentTarget = 0, currentCount = 0;
        let dynamicId = ach.id, displayTitle = ach.title, progressText = "";
        // ... (계산 로직 유지) ...
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
        
        // [수정] logoUrl이 없으면 텍스트(SOOP) 렌더링
        let imgHtml = "";
        if (ach.logoUrl) {
            imgHtml = `<img src="${ach.logoUrl}" style="width:45px; height:45px; border-radius:10px; border:1px solid #ddd; margin-right:15px; object-fit:contain; background:#fff;">`;
        } else {
            imgHtml = `<div style="width:45px; height:45px; border-radius:10px; border:1px solid #ddd; margin-right:15px; background:#fff; display:flex; align-items:center; justify-content:center; color:#00adef; font-weight:900; font-size:12px;">SOOP</div>`;
        }

        div.innerHTML = `<div style="display:flex; align-items:center;">${imgHtml}<div><div style="font-size:16px; font-weight:bold; color:#333;">${ach.displayTitle}</div><div style="font-size:13px; color:#888; margin-top:4px;">${ach.progressText} · 💰 ${ach.reward}</div></div></div><div>${btnHtml}</div>`;
        list.appendChild(div);
    });
}

// [3] 로고 선택 모달에서 기본 로고(텍스트 버전) 추가
function openLogoSelect() { 
    const modal = document.getElementById('modal-logo-select'); 
    const grid = document.getElementById('select-logo-grid'); 
    grid.innerHTML = "";
    
    // 기본(텍스트) 로고 선택 옵션 추가
    const defaultOption = document.createElement('div');
    defaultOption.style = "width:80px; height:80px; border-radius:50%; border:2px solid #ddd; margin:10px; cursor:pointer; background:white; display:flex; align-items:center; justify-content:center; color:#00adef; font-weight:900; font-size:20px;";
    defaultOption.innerText = "SOOP";
    defaultOption.onclick = () => { myCrewLogo = ""; saveData(); closeModal('modal-logo-select'); renderMyCrew(); };
    grid.appendChild(defaultOption);

    const achievements = SOOP_DATA.achievements || [];
    const unlocked = achievements.filter(a => a.type === 'CREW' && clearedAchievements.includes(a.id));
    
    unlocked.forEach(c => {
        if(c.logoUrl) {
            const img = document.createElement('img'); img.src = c.logoUrl; img.className = "logo-select-item";
            img.style = "width:80px; height:80px; border-radius:50%; border:2px solid #ddd; margin:10px; cursor:pointer;";
            img.onclick = () => { myCrewLogo = c.logoUrl; saveData(); closeModal('modal-logo-select'); renderMyCrew(); };
            grid.appendChild(img);
        }
    });
    modal.style.display = 'flex';
}
