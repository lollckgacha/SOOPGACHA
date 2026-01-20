let gameCanvas, ctx;
let gameInterval;
let gameScore = 0;
let gameBestScore = 0;
let isGameRunning = false;

// 점프력 -13 유지
let gameChar = { id: null, imgSrc: null, imgObj: null, y: 0, dy: 0, jumpPower: -13, isJumping: false, shield: 0, stars: 1, name: "" };
let obstacles = [];
let projectiles = [];
let gameSpeed = 4;
let scoreMultiplier = 1;
let crewAssistEnabled = false;
let assistMembers = [];
let assistant = { active: false, x: -100, y: 0, img: null, cooldown: 0 };
let currentGameMode = 'pc';

// 모드 설정 함수
function setGameMode(mode) {
    currentGameMode = mode;
    document.getElementById('btn-mode-mobile').classList.remove('active');
    document.getElementById('btn-mode-pc').classList.remove('active');
    document.getElementById(`btn-mode-${mode}`).classList.add('active');
    
    const fsBtn = document.getElementById('btn-fullscreen-toggle');
    if(fsBtn) fsBtn.style.display = (mode === 'mobile') ? 'inline-block' : 'none';
}

function initMiniGameUI() {
    gameCanvas = document.getElementById('game-canvas');
    ctx = gameCanvas.getContext('2d');
    document.getElementById('game-best-score').innerText = gameBestScore;
    
    document.getElementById('game-lobby').style.display = 'block';
    document.getElementById('game-play-area').style.display = 'none';
    document.body.classList.remove('game-active'); 

    if (!gameChar.id) {
        const first = Object.keys(ownedCards)[0];
        if(first) selectGameChar(first);
    }
}

function toggleGameCardSelect() {
    const list = document.getElementById('game-card-list-area');
    list.style.display = (list.style.display === 'none') ? 'block' : 'none';
    if(list.style.display === 'block') renderGameCardList();
}

function renderGameCardList() {
    const grid = document.getElementById('game-card-grid');
    const search = document.getElementById('game-search').value.toLowerCase();
    grid.innerHTML = "";
    Object.keys(ownedCards).forEach(id => {
        const s = SOOP_DATA.streamers.find(x => x.id === id);
        if(!s || !s.name.toLowerCase().includes(search)) return;
        const info = ownedCards[id];
        const wrapper = document.createElement('div');
        wrapper.className = "card-wrapper";
        wrapper.innerHTML = `<div class="card-item star-${info.stars}"><div class="card-inner"><img src="${s.imgs[0]}" class="card-img"></div></div>`;
        wrapper.onclick = () => { selectGameChar(id); toggleGameCardSelect(); };
        grid.appendChild(wrapper);
    });
}

function selectGameChar(id) {
    const s = SOOP_DATA.streamers.find(x => x.id === id);
    const info = ownedCards[id];
    gameChar.id = id;
    gameChar.imgSrc = s.imgs[0];
    gameChar.stars = info.stars;
    gameChar.name = s.name;
    
    // 이미지 미리 로딩
    gameChar.imgObj = new Image();
    gameChar.imgObj.src = s.imgs[0];

    if(gameChar.stars === 1) scoreMultiplier = 1;
    else if(gameChar.stars === 2) scoreMultiplier = 1.2;
    else if(gameChar.stars === 3) scoreMultiplier = 1.5;
    else if(gameChar.stars === 4) scoreMultiplier = 1.8;
    else if(gameChar.stars >= 5) { scoreMultiplier = 2; gameChar.shield = 1; }

    document.getElementById('game-char-preview').innerHTML = `<img src="${s.imgs[0]}">`;
    document.getElementById('game-char-name').innerText = s.name;
    let effectText = `점수 x${scoreMultiplier}`;
    if(gameChar.stars >= 5) effectText += " / 방어막 1회";
    document.getElementById('game-char-effect').innerText = effectText;
    checkCrewBonus(s.name);
}

function checkCrewBonus(charName) {
    assistMembers = []; crewAssistEnabled = false;
    const achievements = SOOP_DATA.achievements || [];
    achievements.forEach(ach => {
        if (ach.type === 'CREW' && ach.targetList.includes(charName)) {
            if (clearedAchievements.includes(ach.id)) {
                ach.targetList.forEach(name => {
                    if (name !== charName) {
                        const member = SOOP_DATA.streamers.find(s => s.name === name);
                        if (member) assistMembers.push(member.imgs[0]);
                    }
                });
            }
        }
    });
    if (assistMembers.length > 0) { crewAssistEnabled = true; assistMembers = [...new Set(assistMembers)]; }
}

function startGame() {
    if (isGameRunning) return;
    if (!gameChar.id) { alert("캐릭터를 선택해주세요!"); return; }
    
    document.getElementById('game-lobby').style.display = 'none';
    const playArea = document.getElementById('game-play-area');
    
    if (currentGameMode === 'mobile') {
        playArea.className = 'mobile-mode-active'; 
        playArea.style.display = 'flex';
        document.body.classList.add('game-active'); 
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    } else {
        playArea.className = 'pc-mode-active'; 
        playArea.style.display = 'block';
        gameCanvas.width = 600;
        gameCanvas.height = 400;
    }

    isGameRunning = true;
    gameScore = 0;
    gameSpeed = 4;
    obstacles = [];
    projectiles = [];
    assistant.active = false;
    assistant.cooldown = 0;

    const groundY = (currentGameMode === 'mobile') ? gameCanvas.height - 50 : 250;
    gameChar.y = groundY - 50; 
    gameChar.dy = 0;
    gameChar.isJumping = false;
    
    const info = ownedCards[gameChar.id];
    gameChar.shield = (info.stars >= 5 || info.stars === 22) ? 1 : 0;
    updateShieldUI();

    gameCanvas.onmousedown = jump;
    gameCanvas.ontouchstart = jump;
    window.addEventListener('keydown', handleKeyInput);
    
    gameInterval = requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    if (currentGameMode === 'mobile') {
        gameCanvas.width = window.innerWidth;
        gameCanvas.height = window.innerHeight;
    }
}

function handleKeyInput(e) {
    if (e.code === 'Space' && isGameRunning) {
        e.preventDefault(); 
        jump(e);
    }
}

function jump(e) {
    if(e && e.preventDefault && e.type !== 'keydown') e.preventDefault();
    if(!gameChar.isJumping) {
        gameChar.dy = gameChar.jumpPower;
        gameChar.isJumping = true;
    }
}

function updateShieldUI() {
    const shieldDiv = document.getElementById('game-shield-status');
    if (gameChar.shield > 0) shieldDiv.innerText = "🛡️ ON";
    else shieldDiv.innerText = "";
}

function gameLoop() {
    if (!isGameRunning) return;

    gameScore += (1 * scoreMultiplier);

    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    const groundY = (currentGameMode === 'mobile') ? gameCanvas.height - 50 : 250;

    // 바닥
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(gameCanvas.width, groundY);
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 플레이어 물리
    gameChar.dy += 0.5; 
    gameChar.y += gameChar.dy;
    if (gameChar.y > groundY - 50) { 
        gameChar.y = groundY - 50;
        gameChar.isJumping = false;
        gameChar.dy = 0;
    }

    // 플레이어 그리기
    const pX = (currentGameMode === 'mobile') ? 100 : 75; 
    ctx.save();
    ctx.beginPath();
    ctx.arc(pX + 25, gameChar.y + 25, 25, 0, Math.PI * 2);
    ctx.clip();
    
    const img = gameChar.imgObj;
    if (img && img.complete && img.naturalWidth > 0) {
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2; 
        const sy = 0; 
        ctx.drawImage(img, sx, sy, minDim, minDim, pX, gameChar.y, 50, 50);
    } else {
        ctx.fillStyle = "#ccc";
        ctx.fillRect(pX, gameChar.y, 50, 50);
    }
    ctx.restore();
    
    // 테두리
    ctx.beginPath();
    ctx.arc(pX + 25, gameChar.y + 25, 25, 0, Math.PI * 2);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    if(gameChar.shield > 0) {
        ctx.strokeStyle = "cyan"; ctx.lineWidth = 3; ctx.beginPath();
        ctx.arc(pX + 25, gameChar.y + 25, 29, 0, Math.PI*2); ctx.stroke();
    }

    // 크루 어시스트
    if (crewAssistEnabled) {
        if (!assistant.active && assistant.cooldown <= 0 && Math.random() < 0.003) { 
            assistant.active = true;
            assistant.x = -50;
            assistant.y = groundY - 150; 
            assistant.img = assistMembers[Math.floor(Math.random() * assistMembers.length)];
            projectiles.push({ x: assistant.x + 50, y: assistant.y + 25, active: true });
        }
        if (assistant.active) {
            assistant.x += (gameSpeed + 2); 
            ctx.save();
            ctx.globalAlpha = 0.8;
            const assistImg = new Image();
            assistImg.src = assistant.img;
            ctx.drawImage(assistImg, assistant.x, assistant.y, 40, 40);
            ctx.restore();
            if (assistant.x > gameCanvas.width) {
                assistant.active = false;
                assistant.cooldown = 300; 
            }
        }
        if (assistant.cooldown > 0) assistant.cooldown--;
    }

    // 투사체
    for (let i = 0; i < projectiles.length; i++) {
        let p = projectiles[i];
        p.x += 8; 
        ctx.fillStyle = "gold";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fill();
        if (p.x > gameCanvas.width) { projectiles.splice(i, 1); i--; }
    }

    // 장애물 로직
    const minGap = 350;
    let lastX = obstacles.length > 0 ? obstacles[obstacles.length - 1].x : 0;
    
    if (gameCanvas.width - lastX > minGap || obstacles.length === 0) {
        if (Math.random() < 0.012) { 
            obstacles.push({ x: gameCanvas.width, w: 30, h: 50 }); 
        }
    }

    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= gameSpeed;
        
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(obs.x, groundY - obs.h, obs.w, obs.h);

        // 투사체 충돌
        for (let j = 0; j < projectiles.length; j++) {
            let p = projectiles[j];
            if (p.x > obs.x && p.x < obs.x + obs.w && p.y > groundY - obs.h) {
                obstacles.splice(i, 1); i--;
                projectiles.splice(j, 1); j--;
                ctx.fillStyle = "gold"; ctx.font = "20px bold sans-serif";
                ctx.fillText("Nice!", obs.x, groundY - obs.h - 10);
                break;
            }
        }
        if (i < 0) continue;

        // 플레이어 충돌
        if (
            pX + 50 > obs.x + 5 && 
            pX < obs.x + obs.w - 5 && 
            gameChar.y + 50 > groundY - obs.h + 5
        ) {
            if (gameChar.shield > 0) {
                gameChar.shield--; 
                updateShieldUI();
                obstacles.splice(i, 1); 
                i--;
            } else {
                gameOver();
                return;
            }
        }

        if (obs.x + obs.w < 0) {
            obstacles.splice(i, 1);
            i--;
        }
    }
    
    document.getElementById('game-score').innerText = Math.floor(gameScore);
    gameInterval = requestAnimationFrame(gameLoop);
}

function gameOver() {
    isGameRunning = false;
    cancelAnimationFrame(gameInterval);
    window.removeEventListener('resize', resizeCanvas);
    window.removeEventListener('keydown', handleKeyInput);

    /* [수정] 텍스트 변경 */
    const reward = Math.floor(gameScore / 100);
    if (reward > 0) {
        userCoins += reward;
        alert(`게임 오버! 점수: ${Math.floor(gameScore)}\n보상으로 ${reward} 숲코인을 획득했습니다!`);
    } else {
        alert(`게임 오버! 점수: ${Math.floor(gameScore)}`);
    }
    
    if (gameScore > gameBestScore) {
        gameBestScore = Math.floor(gameScore);
        saveData(); 
    }
    updateUI();
    initMiniGameUI();
}

function toggleFullScreen() {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(err => {
            alert(`Error: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}