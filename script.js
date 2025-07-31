const gameContainer = document.getElementById('game-container');
const basket = document.getElementById('basket');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const missedFruitsDisplay = document.getElementById('missed-fruits');
const timerDisplay = document.getElementById('timer');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreDisplay = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const flowersContainer = document.getElementById('flowers-container');

// Elementos decorativos que agora estão no HTML
const treeLeft = document.querySelector('.tree-left');
const treeRight = document.querySelector('.tree.right'); // Correção aqui, se houver um erro de classe no HTML
const bird1 = document.querySelector('.bird-1');
const bird2 = document.querySelector('.bird-2');
const bird3 = document.querySelector('.bird-3');
const rabbit1 = document.querySelector('.rabbit-1');
const rabbit2 = document.querySelector('.rabbit-2');
const cloud1 = document.querySelector('.cloud-1');
const cloud2 = document.querySelector('.cloud-2');
const cloud3 = document.querySelector('.cloud-3');
const stream = document.querySelector('.stream');
const grass = document.querySelector('.grass');

let score = 0;
let level = 1;
let fruitSpeed = 1.5; // Velocidade inicial mais lenta (agora usada para calcular a duração da animação)
let fruitsCaught = 0;
let missedFruits = 0;
const MAX_MISSED_FRUITS = 10;
let gameInterval; // Intervalo para criar frutas (será o timeout para 'manageFruitDrops')
let gameTimerInterval; // Intervalo para o tempo de jogo
let fruitDropDelay = 1000; // Intervalo inicial para cair uma "onda" de frutas (em ms)
let gameTime = 0; // Tempo de jogo em segundos
let isGameOver = false;
let weatherInterval;
let currentWeather = 'day'; // Estado inicial do clima

// Variáveis para controlar a queda gradual e múltiplas frutas
let fruitsToDrop = 1; // Quantidade inicial de frutas a cair por "onda" (começa com 1)
let currentFruitDropCount = 0; // Contador de frutas na onda atual
let fruitDropTimeout; // Timeout para a queda gradual

// Variáveis para controle de movimento da cesta
let basketX = 0; // Posição X da cesta (para controle via mouse/touch/teclado)
const BASKET_MOVE_SPEED_KEYBOARD = 5; // Velocidade de movimento da cesta pelo teclado (em pixels por frame)
let keyboardMoveDirection = 0; // -1 para esquerda, 1 para direita, 0 para parado
let isDesktop = false; // Flag para determinar se é desktop (e usar teclado)

const fruitTypes = [
    { name: 'apple' },
    { name: 'banana' },
    { name: 'grapes' },
    { name: 'pear' },
    { name: 'papaya' },
    { name: 'watermelon' },
    { name: 'melon' }
];

// --- Funções Auxiliares ---

// Função para detectar se o dispositivo é desktop
function detectDevice() {
    // Se 'ontouchstart' não estiver presente no window E a tela for maior que um tablet (768px), é provável que seja um desktop.
    isDesktop = !('ontouchstart' in window) && window.matchMedia("(min-width: 768px)").matches;
}

// --- Funções de Inicialização e Reinício ---
function initializeGame() {
    score = 0;
    level = 1;
    fruitSpeed = 1.5; // Resetar para a velocidade inicial mais lenta
    fruitsCaught = 0;
    missedFruits = 0;
    gameTime = 0;
    isGameOver = false;
    fruitDropDelay = 1000; // Resetar para o intervalo inicial
    fruitsToDrop = 1; // Resetar para 1 fruta no início
    currentFruitDropCount = 0;
    currentWeather = 'day'; // Resetar clima para dia
    
    // Resetar posição da cesta no centro
    basketX = 0;
    basket.style.setProperty('--basket-x', `${basketX}px`);

    scoreDisplay.textContent = `Pontos: ${score}`;
    levelDisplay.textContent = `Nível: ${level}`;
    missedFruitsDisplay.textContent = `Perdidas: ${missedFruits}/${MAX_MISSED_FRUITS}`;
    timerDisplay.textContent = `Tempo: ${gameTime}s`;

    gameOverScreen.classList.add('hidden');
    startScreen.classList.add('hidden'); // Esconde a tela inicial ao iniciar o jogo
    gameContainer.classList.remove('hidden');

    // Limpa todas as frutas existentes
    document.querySelectorAll('.fruit').forEach(el => el.remove());
    // Limpa elementos de clima (chuva, neve, raios)
    removeWeatherEffects();

    // Garante que o gameContainer comece no estado 'day' e remove outras classes de clima
    gameContainer.className = ''; // Remove todas as classes de clima
    gameContainer.classList.add('day'); // Adiciona a classe 'day' explicitamente para garantir o estilo inicial

    // Inicializa/Reseta os elementos decorativos
    setupDecorativeElements();

    startGame();
}

// --- Movimento da Cesta (Exclusivamente Teclado para Desktop, Mouse/Touch para Mobile) ---
let animationFrameId = null; // Para controlar o requestAnimationFrame

function updateBasketPosition() {
    // A cesta deve se mover APENAS se o jogo NÃO estiver acabado E se a tela inicial ESTIVER OCULTA
    if (isGameOver || !startScreen.classList.contains('hidden')) { // Se o jogo acabou OU a tela inicial está visível, para o loop.
        animationFrameId = null; // Para o loop de animação
        return;
    }

    const gameRect = gameContainer.getBoundingClientRect();
    const basketWidth = basket.offsetWidth;

    // Calcula os limites de movimento da cesta
    // maxBasketX é a distância máxima do centro do gameContainer que a cesta pode ir
    const maxBasketX = (gameRect.width / 2) - (basketWidth / 2);

    let newX = basketX;

    if (isDesktop) {
        // Movimento pelo teclado
        newX = basketX + (keyboardMoveDirection * BASKET_MOVE_SPEED_KEYBOARD);

        // Limita o movimento para que a cesta não saia da tela
        if (newX < -maxBasketX) {
            newX = -maxBasketX;
        }
        if (newX > maxBasketX) {
            newX = maxBasketX;
        }
        basketX = newX;
    } else {
        // Movimento por mouse/touch (para dispositivos não-desktop)
        // A lógica de mouse/touchmove já atualiza basketX diretamente,
        // aqui apenas garantimos que o valor esteja dentro dos limites.
        if (basketX < -maxBasketX) {
            basketX = -maxBasketX;
        }
        if (basketX > maxBasketX) {
            basketX = maxBasketX;
        }
    }

    basket.style.setProperty('--basket-x', `${basketX}px`);
    animationFrameId = requestAnimationFrame(updateBasketPosition);
}

// Eventos de Input
// Listener de mousemove e touchmove só para dispositivos não-desktop
document.addEventListener('mousemove', (e) => {
    // Apenas permite movimento se NÃO for desktop, o jogo NÃO estiver acabado E a tela inicial ESTIVER OCULTA
    if (!isDesktop && !isGameOver && startScreen.classList.contains('hidden')) {
        const gameRect = gameContainer.getBoundingClientRect();
        const basketWidth = basket.offsetWidth;
        // Calcula a posição do mouse em relação ao centro do container
        let newX = e.clientX - gameRect.left - (gameRect.width / 2);
        const maxBasketX = (gameRect.width / 2) - (basketWidth / 2);

        // Limita o movimento para que a cesta não saia da tela
        if (newX < -maxBasketX) newX = -maxBasketX;
        if (newX > maxBasketX) newX = maxBasketX;

        basketX = newX; // Atualiza basketX diretamente
    }
});

document.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Evita o scroll da página ao mover o dedo
    // Apenas permite movimento se NÃO for desktop, houver toques, o jogo NÃO estiver acabado E a tela inicial ESTIVER OCULTA
    if (!isDesktop && e.touches.length > 0 && !isGameOver && startScreen.classList.contains('hidden')) {
        const gameRect = gameContainer.getBoundingClientRect();
        const basketWidth = basket.offsetWidth;
        // Calcula a posição do toque em relação ao centro do container
        let newX = e.touches[0].clientX - gameRect.left - (gameRect.width / 2);
        const maxBasketX = (gameRect.width / 2) - (basketWidth / 2);

        // Limita o movimento para que a cesta não saia da tela
        if (newX < -maxBasketX) newX = -maxBasketX;
        if (newX > maxBasketX) newX = maxBasketX;

        basketX = newX; // Atualiza basketX diretamente
    }
}, { passive: false });


document.addEventListener('keydown', (e) => {
    // Apenas permite controle de teclado se for desktop, o jogo NÃO estiver acabado E a tela inicial ESTIVER OCULTA
    if (isDesktop && !isGameOver && startScreen.classList.contains('hidden')) {
        if (e.key === 'ArrowLeft') { // Apenas seta esquerda
            keyboardMoveDirection = -1;
        } else if (e.key === 'ArrowRight') { // Apenas seta direita
            keyboardMoveDirection = 1;
        }
    }
});

document.addEventListener('keyup', (e) => {
    // Para o movimento quando a tecla de seta é solta no desktop, se o jogo NÃO estiver acabado E a tela inicial ESTIVER OCULTA
    if (isDesktop && !isGameOver && startScreen.classList.contains('hidden')) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            keyboardMoveDirection = 0; // Para o movimento
        }
    }
});


// --- Criação de Frutas (Agora com Animação CSS e Colisão Ajustada) ---
function createFruit() {
    if (isGameOver) return;

    const fruitIndex = Math.floor(Math.random() * fruitTypes.length);
    const fruitData = fruitTypes[fruitIndex];

    const fruit = document.createElement('div');
    fruit.classList.add('fruit', fruitData.name);

    gameContainer.appendChild(fruit); // Adiciona ao DOM para obter as dimensões

    const fruitWidth = fruit.offsetWidth;
    
    // Calcula a posição inicial da fruta
    const gameRectWidth = gameContainer.offsetWidth;
    const padding = 10; 
    const minLeft = padding;
    const maxLeft = gameRectWidth - fruitWidth - padding;
    
    // Garante que minLeft e maxLeft sejam válidos
    if (maxLeft <= minLeft) {
        fruit.style.left = `${minLeft}px`;
    } else {
        fruit.style.left = `${minLeft + Math.random() * (maxLeft - minLeft)}px`;
    }

    // Calcula a duração da animação (velocidade de queda)
    const animationDuration = (gameContainer.offsetHeight / (fruitSpeed * 100)) + 's';
    fruit.style.setProperty('--fall-duration', animationDuration);

    // Listener para quando a animação CSS de queda termina (fruta atinge o chão)
    fruit.addEventListener('animationend', () => {
        // Só conta como fruta perdida se ela ainda estiver no DOM (não foi pega pela cesta antes)
        if (fruit.parentNode === gameContainer) {
            missedFruits++;
            missedFruitsDisplay.textContent = `Perdidas: ${missedFruits}/${MAX_MISSED_FRUITS}`;
            fruit.remove();
            if (missedFruits >= MAX_MISSED_FRUITS) {
                endGame();
            }
        }
    }, { once: true }); // Executa o listener apenas uma vez

    // Função de verificação de colisão via requestAnimationFrame
    function checkFruitCollision() {
        if (isGameOver || !fruit.parentNode) { // Se o jogo acabou ou a fruta já foi removida
            return;
        }

        const fruitRect = fruit.getBoundingClientRect();
        const basketRect = basket.getBoundingClientRect();

        // Verifica a colisão
        if (
            fruitRect.bottom >= basketRect.top &&
            fruitRect.top <= basketRect.bottom &&
            fruitRect.right >= basketRect.left &&
            fruitRect.left <= basketRect.right
        ) {
            score += 1;
            fruitsCaught++;
            scoreDisplay.textContent = `Pontos: ${score}`;
            fruit.remove(); // Remove a fruta ao ser pega
            checkLevelUp();
            return; // Sai da função, não precisa mais verificar esta fruta
        }

        // Se a fruta ainda está visível e não colidiu, continua a verificação
        if (fruitRect.top < gameContainer.offsetHeight) {
            requestAnimationFrame(checkFruitCollision);
        }
    }
    requestAnimationFrame(checkFruitCollision); // Inicia a verificação de colisão para a fruta
}


// --- Checagem de Colisão (não muda, mas é chamada de forma diferente agora) ---
// A função checkCollision foi incorporada diretamente em createFruit para otimização


// --- Aumento de Nível e Dificuldade ---
function checkLevelUp() {
    if (fruitsCaught % 10 === 0 && fruitsCaught > 0) { // A cada 10 frutas pegas
        level++;
        levelDisplay.textContent = `Nível: ${level}`;
        console.log(`Nível ${level}!`);

        // Aumenta a quantidade de frutas a cair por "onda" de forma mais gradual
        if (fruitsToDrop < 5) { // Limita o máximo de frutas por onda para 5
            fruitsToDrop = 1 + Math.floor((level - 1) / 2);
            if (fruitsToDrop > 5) fruitsToDrop = 5;
            console.log(`Nível ${level}: Agora caem ${fruitsToDrop} frutas por onda!`);
        }
    }
}

// Função para aumentar a dificuldade a cada X segundos
function increaseDifficultyByTime() {
    fruitSpeed += 0.15; // Aumenta a velocidade de queda um pouco mais
    // Reduz o delay entre as ondas de frutas
    if (fruitDropDelay > 300) { // Limita o mínimo de atraso para 300ms (para não ficar impossível)
        fruitDropDelay -= 50;
    }
    console.log(`Dificuldade aumentada pelo tempo: Velocidade=${fruitSpeed.toFixed(2)}, Atraso=${fruitDropDelay}ms`);
}


// --- Gerenciamento da Queda de Frutas (com pequeno delay entre elas) ---
function manageFruitDrops() {
    if (isGameOver) {
        clearTimeout(fruitDropTimeout);
        return;
    }

    if (currentFruitDropCount < fruitsToDrop) {
        createFruit();
        currentFruitDropCount++;
        // Pequeno delay para que as frutas da mesma "onda" não apareçam exatamente juntas
        fruitDropTimeout = setTimeout(manageFruitDrops, 150);
    } else {
        currentFruitDropCount = 0;
        // Intervalo para a próxima onda completa de frutas
        fruitDropTimeout = setTimeout(manageFruitDrops, fruitDropDelay);
    }
}


// --- Início do Jogo ---
function startGame() {
    // Limpa todos os intervalos e timeouts anteriores para um início limpo
    clearInterval(gameInterval);
    clearInterval(gameTimerInterval);
    clearTimeout(fruitDropTimeout);
    clearInterval(weatherInterval);
    cancelAnimationFrame(animationFrameId); // Cancela o loop de animação da cesta

    // Inicia o loop de animação da cesta
    animationFrameId = requestAnimationFrame(updateBasketPosition);

    // Inicia a queda de frutas
    manageFruitDrops();

    let lastDifficultyIncreaseTime = 0;

    // Intervalo principal do jogo para tempo e dificuldade baseada no tempo
    gameTimerInterval = setInterval(() => {
        gameTime++;
        timerDisplay.textContent = `Tempo: ${gameTime}s`;

        // Aumenta a dificuldade a cada 6 segundos
        if (gameTime - lastDifficultyIncreaseTime >= 6) {
            increaseDifficultyByTime();
            lastDifficultyIncreaseTime = gameTime;
        }
    }, 1000);

    // --- Controle de Clima e Hora do Dia ---
    weatherInterval = setInterval(() => {
        if (isGameOver) {
            clearInterval(weatherInterval);
            return;
        }

        removeWeatherEffects(); // Limpa efeitos visuais do clima anterior
        gameContainer.className = ''; // Remove todas as classes de clima atuais
        let newWeather = 'day';

        // Lógica de transição de clima baseada no tempo de jogo (cada fase dura 20 segundos, exceto o ciclo principal)
        const cycleDuration = 140; // Duração total de um ciclo de clima (7 * 20s)
        const currentCycleTime = gameTime % cycleDuration;

        if (currentCycleTime >= 20 && currentCycleTime < 40) {
            newWeather = 'afternoon';
        } else if (currentCycleTime >= 40 && currentCycleTime < 60) {
            newWeather = 'night';
        } else if (currentCycleTime >= 60 && currentCycleTime < 80) {
            newWeather = 'rain';
            addRain();
        } else if (currentCycleTime >= 80 && currentCycleTime < 100) {
            newWeather = 'windy';
        } else if (currentCycleTime >= 100 && currentCycleTime < 120) {
            newWeather = 'snow';
            addSnow();
        } else if (currentCycleTime >= 120) { // storm até o final do ciclo
            newWeather = 'storm';
            addRain(); // Chuva na tempestade
            addLightning();
        } else {
            newWeather = 'day'; // Padrão
        }

        // Aplica a nova classe de clima apenas se for diferente da atual
        if (currentWeather !== newWeather) {
            currentWeather = newWeather;
            gameContainer.classList.add(currentWeather);
            console.log(`Mudando para ${currentWeather}!`);
        }
    }, 5000); // Verifica o tempo a cada 5 segundos para mudar o clima
}

// --- Fim de Jogo ---
function endGame() {
    isGameOver = true;
    clearInterval(gameInterval);
    clearInterval(gameTimerInterval);
    clearTimeout(fruitDropTimeout);
    clearInterval(weatherInterval); // Limpa o intervalo de clima
    cancelAnimationFrame(animationFrameId); // Cancela o loop de animação da cesta

    document.querySelectorAll('.fruit').forEach(fruit => fruit.remove()); // Remove frutas restantes
    removeWeatherEffects(); // Garante que todos os efeitos de clima sejam removidos

    finalScoreDisplay.textContent = `Você pegou ${score} frutas!`;
    gameOverScreen.classList.remove('hidden');
}

// --- Configura e posiciona elementos decorativos (chamado apenas uma vez no início ou reinício) ---
function setupDecorativeElements() {
    flowersContainer.innerHTML = ''; // Remover flores antigas

    // Posiciona flores aleatoriamente
    for (let i = 0; i < 12; i++) {
        const flower = document.createElement('div');
        flower.classList.add('flower');
        flower.style.left = `${Math.random() * 95}%`;
        flower.style.bottom = `${2 + Math.random() * 10}%`;
        flowersContainer.appendChild(flower);
    }

    // Nuvens: Apenas posiciona randomicamente a cada início, se desejar.
    cloud1.style.top = `${Math.random() * 20 + 5}%`;
    cloud1.style.animationDelay = `${Math.random() * 10}s`;
    cloud2.style.top = `${Math.random() * 20 + 15}%`;
    cloud2.style.animationDelay = `${Math.random() * 10}s`;
    cloud3.style.top = `${Math.random() * 20 + 10}%`;
    cloud3.style.animationDelay = `${Math.random() * 10}s`;

    // Garante que elementos decorativos estejam visíveis se o display:none foi aplicado via JS por media queries
    [treeLeft, treeRight, bird1, bird2, bird3, rabbit1, rabbit2, cloud1, cloud2, cloud3, stream, grass].forEach(el => {
        if (el) {
            el.style.display = '';
            el.style.animationPlayState = 'running';
        }
    });
}


// --- Funções para adicionar e remover efeitos de clima ---
let lightningTimeout;
function removeWeatherEffects() {
    document.querySelectorAll('.raindrop').forEach(drop => drop.remove());
    document.querySelectorAll('.snow-flake').forEach(flake => flake.remove());
    document.querySelectorAll('.lightning').forEach(light => light.remove());
    clearTimeout(lightningTimeout);
}

function addRain() {
    const numDrops = 150;
    for (let i = 0; i < numDrops; i++) {
        const drop = document.createElement('div');
        drop.classList.add('raindrop');
        drop.style.left = `${Math.random() * 100}vw`;
        drop.style.animationDelay = `${Math.random() * 2}s`;
        drop.style.animationDuration = `${0.8 + Math.random() * 0.4}s`;
        drop.style.opacity = `${0.4 + Math.random() * 0.4}`;
        gameContainer.appendChild(drop);
    }
}

function addSnow() {
    const numFlakes = 100;
    const flakeSizes = ['small', 'medium', 'large'];
    for (let i = 0; i < numFlakes; i++) {
        const flake = document.createElement('div');
        flake.classList.add('snow-flake', flakeSizes[Math.floor(Math.random() * flakeSizes.length)]);
        flake.style.left = `${Math.random() * 100}vw`;
        flake.style.animationDelay = `${Math.random() * 5}s`;
        flake.style.animationDuration = `${8 + Math.random() * 4}s`;
        gameContainer.appendChild(flake);
    }
}

function addLightning() {
    function createLightningStrike() {
        if (currentWeather !== 'storm' || isGameOver) { // Para de criar se o clima mudar ou jogo acabar
            return;
        }
        const lightning = document.createElement('div');
        lightning.classList.add('lightning');
        lightning.style.left = `${10 + Math.random() * 80}vw`;
        lightning.style.top = `${Math.random() * 20}vh`;
        gameContainer.appendChild(lightning);

        // Remover o raio após a animação (0.3s)
        setTimeout(() => {
            lightning.remove();
        }, 300);
    }

    // Cria raios intermitentemente
    function strikeLoop() {
        if (currentWeather === 'storm' && !isGameOver) {
            createLightningStrike();
            lightningTimeout = setTimeout(strikeLoop, 1000 + Math.random() * 3000); // Intervalo de 1 a 4 segundos
        }
    }
    strikeLoop(); // Inicia o loop de raios
}

// --- Eventos dos Botões ---
startButton.addEventListener('click', initializeGame);
restartButton.addEventListener('click', initializeGame);

// Chamar detectDevice e initializeGame no carregamento da página
document.addEventListener('DOMContentLoaded', () => {
    detectDevice(); // Detecta o tipo de dispositivo uma vez no carregamento
    gameContainer.classList.add('hidden'); // Garante que o container do jogo está oculto
    startScreen.classList.remove('hidden'); // Garante que a tela inicial está visível

    // Define a posição inicial da cesta, centralizada
    basketX = 0;
    basket.style.setProperty('--basket-x', `${basketX}px`);
});

// Listener para redimensionamento da janela para reajustar basketX (caso mude orientação/tamanho)
window.addEventListener('resize', () => {
    // Reajusta a cesta apenas se o jogo NÃO estiver acabado e a tela inicial estiver OCULTA (jogo em andamento)
    if (!isGameOver && startScreen.classList.contains('hidden')) {
        const gameRect = gameContainer.getBoundingClientRect();
        const basketWidth = basket.offsetWidth;
        const maxBasketX = (gameRect.width / 2) - (basketWidth / 2);

        // Garante que basketX não exceda os novos limites
        if (basketX < -maxBasketX) basketX = -maxBasketX;
        if (basketX > maxBasketX) basketX = maxBasketX;

        basket.style.setProperty('--basket-x', `${basketX}px`);
    }
});