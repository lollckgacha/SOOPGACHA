/* game.js - 인물 퀴즈 (보유 카드 우선 출제 적용) */

let gameInterval;
let gameScore = 0;
let gameBestScore = 0; // 전역 변수 (script.js 데이터 저장용)
let isGameRunning = false;

// 퀴즈 전용 변수
let quizTimeLeft = 60; // 제한시간 60초
const QUIZ_MAX_TIME = 60;
let currentAnswer = null; // 현재 정답 객체
let isAnswering = false; // 중복 클릭 방지
let lastTime = 0; // 델타 타임 계산용

function initMiniGameUI() {
    // 최고 점수 표시 업데이트
    if(document.getElementById('game-best-score')) {
        document.getElementById('game-best-score').innerText = gameBestScore;
    }
    
    document.getElementById('game-lobby').style.display = 'block';
    document.getElementById('game-play-area').style.display = 'none';
    
    // 이전 게임 스타일 초기화
    document.body.classList.remove('game-active');
}

function startGame() {
    if (isGameRunning) return;

    // UI 전환
    document.getElementById('game-lobby').style.display = 'none';
    document.getElementById('game-play-area').style.display = 'flex';
    document.body.classList.add('game-active');

    // 게임 상태 초기화
    isGameRunning = true;
    gameScore = 0;
    quizTimeLeft = QUIZ_MAX_TIME;
    isAnswering = false;
    
    updateScoreUI();
    updateTimerUI();

    // 델타 타임 초기화 (모바일 백그라운드 시간 오차 방지)
    lastTime = Date.now();

    // 게임 루프 시작
    if(gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, 100); 

    // 첫 문제 로드
    loadNextQuestion();
}

/* 화면 이동 시 게임을 조용히 종료하는 함수 */
function exitMiniGame() {
    if (!isGameRunning) return;
    
    isGameRunning = false;
    clearInterval(gameInterval);
    
    // UI를 로비 상태로 되돌림
    initMiniGameUI();
}

function loadNextQuestion() {
    if(!isGameRunning) return;
    isAnswering = false;
    
    // 피드백(O/X) 초기화
    const feedback = document.getElementById('quiz-feedback-overlay');
    feedback.innerText = "";
    feedback.className = "";

    // [수정] 데이터 풀 설정 (보유 카드 우선)
    const totalStreamers = SOOP_DATA.streamers;
    const myCardIds = Object.keys(ownedCards); // 보유한 카드 ID 목록
    
    // 보유 카드가 있으면 해당 카드들만 필터링하여 후보군 생성
    let candidatePool = [];
    if (myCardIds.length > 0) {
        candidatePool = totalStreamers.filter(s => ownedCards[s.id]);
    }

    // 예외 처리: 보유 카드가 아예 없으면 전체 풀 사용
    if (candidatePool.length === 0) {
        candidatePool = totalStreamers;
    }

    // 1. 정답 데이터 뽑기 (후보군 내에서)
    const answerIdx = Math.floor(Math.random() * candidatePool.length);
    currentAnswer = candidatePool[answerIdx];

    // 2. 오답 보기 3개 뽑기
    // *중요*: 보유 카드가 4장 미만이면 오답 보기는 전체 풀에서 가져옴 (그래야 4지선다가 가능)
    let wrongPool = (candidatePool.length >= 4) ? candidatePool : totalStreamers;

    let options = [currentAnswer];
    while (options.length < 4) {
        const rIdx = Math.floor(Math.random() * wrongPool.length);
        const wrong = wrongPool[rIdx];
        
        // 이미 보기에 없고, 이름이 정답과 다른 경우 추가
        if (!options.find(o => o.id === wrong.id) && wrong.name !== currentAnswer.name) {
            options.push(wrong);
        }
    }

    // 3. 보기 섞기
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }

    // 4. UI 렌더링
    const imgElem = document.getElementById('quiz-image');
    // 데이터에 이미지가 있는지 확인, 없으면 기본 이미지
    if(currentAnswer.imgs && currentAnswer.imgs.length > 0) {
        // [추가] 스킨 적용 (보유 카드라면 스킨 확인)
        let displayImg = currentAnswer.imgs[0];
        if (ownedCards[currentAnswer.id]) {
            const info = ownedCards[currentAnswer.id];
            // 5성 이상이고 스킨2번(specialImg) 적용 중이면 그 이미지 사용
            if (currentAnswer.specialImg && info.skin === 2) {
                displayImg = currentAnswer.specialImg;
            }
        }
        imgElem.src = displayImg;
    } else {
        imgElem.src = "images/gacha/dkhk.png";
    }
    
    const btnGrid = document.getElementById('quiz-options');
    btnGrid.innerHTML = "";
    
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = "quiz-btn";
        btn.innerText = opt.name;
        btn.onclick = () => checkAnswer(opt, btn);
        btnGrid.appendChild(btn);
    });
}

function checkAnswer(selectedData, btnElem) {
    if (!isGameRunning || isAnswering) return;
    isAnswering = true; 

    const feedback = document.getElementById('quiz-feedback-overlay');
    
    if (selectedData.id === currentAnswer.id) {
        // [정답]
        gameScore += 100;
        quizTimeLeft = Math.min(quizTimeLeft + 2, QUIZ_MAX_TIME); // 시간 +2초
        
        btnElem.classList.add('correct');
        feedback.innerText = "O";
        feedback.classList.add('feedback-correct');
        
        setTimeout(loadNextQuestion, 400);

    } else {
        // [오답]
        quizTimeLeft -= 5; // 시간 -5초
        if (quizTimeLeft < 0) quizTimeLeft = 0;
        updateTimerUI(); 
        
        btnElem.classList.add('wrong');
        feedback.innerText = "X";
        feedback.classList.add('feedback-wrong');
        
        // 정답 알려주기
        const btns = document.querySelectorAll('.quiz-btn');
        btns.forEach(b => {
            if (b.innerText === currentAnswer.name) b.classList.add('correct');
        });

        setTimeout(loadNextQuestion, 800);
    }
    updateScoreUI();
}

function gameLoop() {
    if (!isGameRunning) return;

    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    quizTimeLeft -= deltaTime;

    if (quizTimeLeft <= 0) {
        quizTimeLeft = 0;
        updateTimerUI();
        gameOver();
    } else {
        updateTimerUI();
    }
}

function updateScoreUI() {
    const scoreElem = document.getElementById('game-score');
    if (scoreElem) scoreElem.innerText = Math.floor(gameScore);
}

function updateTimerUI() {
    const timeText = document.getElementById('quiz-time-text');
    const timeFill = document.getElementById('quiz-timer-fill');
    
    if(!timeText || !timeFill) return;

    timeText.innerText = Math.ceil(quizTimeLeft);
    const pct = (quizTimeLeft / QUIZ_MAX_TIME) * 100;
    timeFill.style.width = `${pct}%`;
    
    if (quizTimeLeft > 30) timeFill.style.background = "#2ecc71";
    else if (quizTimeLeft > 10) timeFill.style.background = "#f1c40f";
    else timeFill.style.background = "#e74c3c";
}

function gameOver() {
    isGameRunning = false;
    clearInterval(gameInterval);

    // [수정] 100점당 1숲코인
    const reward = Math.floor(gameScore / 100);
    
    let msg = `⏰ 시간 종료!\n최종 점수: ${Math.floor(gameScore)}점`;
    if (reward > 0) {
        if(typeof userCoins !== 'undefined') userCoins += reward;
        msg += `\n보상으로 ${reward} 숲코인을 획득했습니다!`;
    }
    
    alert(msg);
    
    if (gameScore > gameBestScore) {
        gameBestScore = Math.floor(gameScore);
        if(typeof saveData === 'function') saveData();
    }
    
    if(typeof updateUI === 'function') updateUI(); 
    initMiniGameUI();
}
