/* game.js - 인물 퀴즈 게임 로직 (최종 수정) */

let gameInterval;
let gameScore = 0;
// gameBestScore는 script.js의 전역 변수를 공유하거나 로컬스토리지에서 관리됨
// 여기서는 script.js가 로드된 상태라고 가정

let isGameRunning = false;

// 퀴즈 설정 변수
let quizTimeLeft = 60; // 제한시간 60초
const QUIZ_MAX_TIME = 60;
let currentAnswer = null; // 현재 정답 객체
let isAnswering = false; // 중복 클릭 방지
let lastTime = 0; // 델타 타임 계산용

/* [1] 게임 UI 초기화 (로비 화면으로) */
function initMiniGameUI() {
    // 최고 점수 표시 (script.js의 변수 활용)
    if(document.getElementById('game-best-score')) {
        // gameBestScore가 정의되어 있으면 사용, 아니면 0
        const best = (typeof gameBestScore !== 'undefined') ? gameBestScore : 0;
        document.getElementById('game-best-score').innerText = best;
    }
    
    // 화면 전환
    const lobby = document.getElementById('game-lobby');
    const playArea = document.getElementById('game-play-area');
    
    if (lobby) lobby.style.display = 'block';
    if (playArea) playArea.style.display = 'none';
    
    // 게임 진행 중 스타일 제거
    document.body.classList.remove('game-active');
}

/* [2] 게임 시작 */
function startGame() {
    if (isGameRunning) return;

    // UI 전환: 로비 숨김 -> 플레이 화면 표시
    document.getElementById('game-lobby').style.display = 'none';
    document.getElementById('game-play-area').style.display = 'flex';
    document.body.classList.add('game-active');

    // 변수 초기화
    isGameRunning = true;
    gameScore = 0;
    quizTimeLeft = QUIZ_MAX_TIME;
    isAnswering = false;
    
    updateScoreUI();
    updateTimerUI();

    // 델타 타임 초기화 (모바일 시간 오차 방지)
    lastTime = Date.now();

    // 게임 루프 시작 (0.1초 간격)
    if(gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, 100); 

    // 첫 문제 출제
    loadNextQuestion();
}

/* [3] 게임 종료 (강제 종료 포함) */
function exitMiniGame() {
    if (!isGameRunning) return;
    isGameRunning = false;
    clearInterval(gameInterval);
    initMiniGameUI();
}

/* [4] 다음 문제 로드 */
function loadNextQuestion() {
    if(!isGameRunning) return;
    isAnswering = false;
    
    // 피드백 오버레이(O/X) 초기화
    const feedback = document.getElementById('quiz-feedback-overlay');
    if(feedback) {
        feedback.innerText = "";
        feedback.className = "";
    }

    // --- 데이터 풀 설정 ---
    // 1. 전체 데이터 가져오기
    // SOOP_DATA가 로드되지 않았을 경우를 대비한 방어 코드
    if (typeof SOOP_DATA === 'undefined' || !SOOP_DATA.streamers) {
        alert("데이터 로딩 중 오류가 발생했습니다. 새로고침 해주세요.");
        exitMiniGame();
        return;
    }

    const totalStreamers = SOOP_DATA.streamers;
    
    // 2. 내가 보유한 카드 ID 목록 가져오기 (script.js의 ownedCards 사용)
    // ownedCards가 없으면 빈 객체 처리
    const myCardsMap = (typeof ownedCards !== 'undefined') ? ownedCards : {};
    const myCardIds = Object.keys(myCardsMap); 
    
    // 3. 출제 후보군 선정 (보유 카드 우선)
    let candidatePool = [];
    if (myCardIds.length > 0) {
        // ownedCards에 있는 ID와 일치하는 streamer 데이터를 찾음
        candidatePool = totalStreamers.filter(s => myCardsMap[s.id]);
    }

    // 만약 보유 카드가 없거나 너무 적으면(데이터 오류 등) 전체 풀 사용
    if (candidatePool.length === 0) {
        candidatePool = totalStreamers;
    }

    // --- 정답 및 오답 선정 ---
    // 1. 정답 뽑기
    if (candidatePool.length === 0) return; // 데이터가 아예 없으면 중단
    const answerIdx = Math.floor(Math.random() * candidatePool.length);
    currentAnswer = candidatePool[answerIdx];

    // 2. 오답 보기 3개 뽑기
    // 오답은 난이도를 위해 '전체 데이터'에서 뽑거나, '보유 카드'에서 뽑을 수 있음
    // 여기서는 섞어서 뽑기 위해 전체 풀을 보조로 사용
    let wrongPool = (totalStreamers.length >= 4) ? totalStreamers : candidatePool;
    
    // 무한 루프 방지용 카운트
    let loopLimit = 0;
    let options = [currentAnswer];
    
    while (options.length < 4 && loopLimit < 100) {
        const rIdx = Math.floor(Math.random() * wrongPool.length);
        const wrong = wrongPool[rIdx];
        
        // 중복 방지: 이미 뽑은 보기가 아니고, 정답과 이름이 다른 경우
        if (wrong && !options.find(o => o.id === wrong.id) && wrong.name !== currentAnswer.name) {
            options.push(wrong);
        }
        loopLimit++;
    }

    // 3. 보기 섞기 (Fisher-Yates Shuffle)
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }

    // --- UI 렌더링 ---
    // 1. 이미지 표시
    const imgElem = document.getElementById('quiz-image');
    if(currentAnswer.imgs && currentAnswer.imgs.length > 0) {
        let displayImg = currentAnswer.imgs[0];
        
        // 보유 중이고 5성 스킨(skin=2)이 있다면 스킨 이미지 보여주기
        if (myCardsMap[currentAnswer.id]) {
            const info = myCardsMap[currentAnswer.id];
            if (currentAnswer.specialImg && info.skin === 2) {
                displayImg = currentAnswer.specialImg;
            }
        }
        imgElem.src = displayImg;
    } else {
        // 이미지가 없을 경우 기본 이미지
        imgElem.src = (typeof DEFAULT_IMG_URL !== 'undefined') ? DEFAULT_IMG_URL : "";
    }
    
    // 2. 버튼 생성
    const btnGrid = document.getElementById('quiz-options');
    btnGrid.innerHTML = "";
    
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = "quiz-btn";
        btn.innerText = opt.name;
        // 버튼 클릭 이벤트
        btn.onclick = () => checkAnswer(opt, btn);
        btnGrid.appendChild(btn);
    });
}

/* [5] 정답 확인 */
function checkAnswer(selectedData, btnElem) {
    if (!isGameRunning || isAnswering) return;
    isAnswering = true; 

    const feedback = document.getElementById('quiz-feedback-overlay');
    
    if (selectedData.id === currentAnswer.id) {
        // [정답]
        gameScore += 100;
        quizTimeLeft = Math.min(quizTimeLeft + 2, QUIZ_MAX_TIME); // 시간 +2초
        
        // UI 효과
        btnElem.classList.add('correct');
        if(feedback) {
            feedback.innerText = "O";
            feedback.classList.add('feedback-correct');
        }
        
        setTimeout(loadNextQuestion, 400); // 0.4초 후 다음 문제

    } else {
        // [오답]
        quizTimeLeft -= 5; // 시간 -5초
        if (quizTimeLeft < 0) quizTimeLeft = 0;
        updateTimerUI(); 
        
        // UI 효과
        btnElem.classList.add('wrong');
        if(feedback) {
            feedback.innerText = "X";
            feedback.classList.add('feedback-wrong');
        }
        
        // 정답 버튼 알려주기 (학습 효과)
        const btns = document.querySelectorAll('.quiz-btn');
        btns.forEach(b => {
            if (b.innerText === currentAnswer.name) b.classList.add('correct');
        });

        setTimeout(loadNextQuestion, 800); // 0.8초 후 다음 문제
    }
    updateScoreUI();
}

/* [6] 게임 루프 (타이머) */
function gameLoop() {
    if (!isGameRunning) return;

    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    quizTimeLeft -= deltaTime;

    if (quizTimeLeft <= 0) {
        quizTimeLeft = 0;
        updateTimerUI();
        gameOver(); // 시간 종료
    } else {
        updateTimerUI();
    }
}

/* [7] UI 업데이트 함수들 */
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
    
    // 시간 임박 색상 변경
    if (quizTimeLeft > 30) timeFill.style.background = "#2ecc71";
    else if (quizTimeLeft > 10) timeFill.style.background = "#f1c40f";
    else timeFill.style.background = "#e74c3c";
}

/* [8] 게임 오버 */
function gameOver() {
    isGameRunning = false;
    clearInterval(gameInterval);

    // 보상: 100점당 1 코인
    const reward = Math.floor(gameScore / 100);
    
    let msg = `⏰ 시간 종료!\n최종 점수: ${Math.floor(gameScore)}점`;
    if (reward > 0) {
        // 전역 userCoins에 추가 (script.js 변수)
        if(typeof userCoins !== 'undefined') userCoins += reward;
        msg += `\n보상으로 💰 ${reward} 숲코인을 획득했습니다!`;
    }
    
    alert(msg);
    
    // 최고 점수 갱신 및 저장
    if (typeof gameBestScore !== 'undefined' && gameScore > gameBestScore) {
        gameBestScore = Math.floor(gameScore);
        // 저장 함수 호출 (script.js)
        if(typeof saveData === 'function') saveData();
    } else {
        // 점수 갱신 안 해도 코인은 저장해야 함
        if(typeof saveData === 'function') saveData();
    }
    
    // UI 전체 갱신 (코인 등)
    if(typeof updateUI === 'function') updateUI(); 
    
    initMiniGameUI();
}
