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
const flowersContainer = document.getElementById('flowers-container'); // Novo container para flores

// Elementos decorativos que agora estão no HTML
const treeLeft = document.querySelector('.tree-left');
const treeRight = document.querySelector('.tree-right');
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
let gameInterval; // Intervalo para criar frutas
let gameTimerInterval; // Intervalo para o tempo de jogo
let fruitDropDelay = 1500; // Intervalo inicial mais longo para cair uma fruta (em ms)
let gameTime = 0; // Tempo de jogo em segundos
let isGameOver = false;
let weatherInterval;
let currentWeather = 'day'; // Estado inicial do clima

// Variáveis para controlar a queda gradual e múltiplas frutas
let fruitsToDrop = 1; // Quantidade inicial de frutas a cair por "onda" (começa com 1)
let currentFruitDropCount = 0; // Contador de frutas na onda atual
let fruitDropTimeout; // Timeout para a queda gradual

const fruitTypes = [
    { name: 'apple' },
    { name: 'banana' },
    { name: 'grapes' },
    { name: 'pear' },
    { name: 'papaya' },
    { name: 'watermelon' },
    { name: 'melon' }
];

// --- Funções de Inicialização e Reinício ---
function initializeGame() {
    score = 0;
    level = 1;
    fruitSpeed = 1.5; // Resetar para a velocidade inicial mais lenta
    fruitsCaught = 0;
    missedFruits = 0;
    gameTime = 0;
    isGameOver = false;
    fruitDropDelay = 1500; // Resetar para o intervalo inicial mais longo
    fruitsToDrop = 1; // Resetar para 1 fruta no início
    currentFruitDropCount = 0;
    currentWeather = 'day'; // Resetar clima para dia

    scoreDisplay.textContent = `Pontos: ${score}`;
    levelDisplay.textContent = `Nível: ${level}`;
    missedFruitsDisplay.textContent = `Perdidas: ${missedFruits}/${MAX_MISSED_FRUITS}`;
    timerDisplay.textContent = `Tempo: ${gameTime}s`;

    gameOverScreen.classList.add('hidden');
    startScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');

    // Limpa todas as frutas existentes
    document.querySelectorAll('.fruit').forEach(el => el.remove());

    // Garante que o gameContainer comece no estado 'day' e remove outras classes de clima
    gameContainer.classList.remove('afternoon', 'night', 'rain', 'windy');

    // Inicializa/Reseta os elementos decorativos
    setupDecorativeElements();
    
    startGame();
}

// --- Movimento da Cesta (Responsivo para Mouse e Touch) ---
function moveBasket(clientX) {
    if (isGameOver || !startScreen.classList.contains('hidden')) return;

    const gameRect = gameContainer.getBoundingClientRect();
    const basketWidth = basket.offsetWidth;
    let newLeft = clientX - gameRect.left - basketWidth / 2;

    if (newLeft < 0) {
        newLeft = 0;
    }
    if (newLeft > gameRect.width - basketWidth) {
        newLeft = gameRect.width - basketWidth;
    }
    basket.style.left = `${newLeft}px`;
}

// Evento para mouse
document.addEventListener('mousemove', (e) => {
    moveBasket(e.clientX);
});

// Eventos para toque (touch)
document.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Evita o scroll da página ao mover o dedo
    if (e.touches.length > 0) {
        moveBasket(e.touches[0].clientX);
    }
}, { passive: false }); // `passive: false` é importante para `preventDefault()` funcionar


// --- Criação de Frutas (Agora com Animação CSS) ---
function createFruit() {
    if (isGameOver) return;

    const fruitIndex = Math.floor(Math.random() * fruitTypes.length);
    const fruitData = fruitTypes[fruitIndex];

    const fruit = document.createElement('div');
    fruit.classList.add('fruit', fruitData.name);

    // Define uma largura padrão temporária para calcular a posição inicial
    // Ou usa o estilo computado para ter o tamanho real da fruta no CSS
    const tempFruitWidth = fruit.offsetWidth > 0 ? fruit.offsetWidth : 50; // 50px como fallback
    const maxLeft = gameContainer.offsetWidth - tempFruitWidth;
    fruit.style.left = `${Math.random() * maxLeft}px`;
    
    // Calcula a duração da animação com base na velocidade
    // Quanto maior a velocidade, menor a duração (mais rápido cai)
    // 100vh de queda + 100px para sair completamente da tela
    const animationDuration = (gameContainer.offsetHeight / (fruitSpeed * 60)) + 's'; // Ajuste o multiplicador 60 para sensibilidade
    fruit.style.setProperty('--fall-duration', animationDuration);

    gameContainer.appendChild(fruit);

    // Detectar quando a animação CSS termina para remover a fruta ou contá-la como perdida
    fruit.addEventListener('animationend', () => {
        // Se a fruta ainda existe (não foi pega pela cesta) e a animação de queda terminou
        // Isso significa que ela caiu no chão
        if (fruit.parentNode === gameContainer) { // Verifica se ainda é um filho do gameContainer
            missedFruits++;
            missedFruitsDisplay.textContent = `Perdidas: ${missedFruits}/${MAX_MISSED_FRUITS}`;
            fruit.remove();
            if (missedFruits >= MAX_MISSED_FRUITS) {
                endGame();
            }
        }
    });

    // Colisão (usando requestAnimationFrame para checagem contínua enquanto a fruta cai)
    function checkFruitCollision() {
        if (isGameOver || !fruit.parentNode) return; // Se a fruta já foi removida

        if (checkCollision(fruit, basket)) {
            score += 1;
            fruitsCaught++;
            scoreDisplay.textContent = `Pontos: ${score}`;
            fruit.remove(); // Remove a fruta ao ser pega
            checkLevelUp();
            return; // Termina a checagem para esta fruta
        }

        // Continua checando colisão se a fruta ainda não caiu completamente
        const fruitRect = fruit.getBoundingClientRect();
        if (fruitRect.top < gameContainer.offsetHeight) {
            requestAnimationFrame(checkFruitCollision);
        }
    }
    requestAnimationFrame(checkFruitCollision);
}


// --- Checagem de Colisão ---
function checkCollision(fruit, basket) {
    const fruitRect = fruit.getBoundingClientRect();
    const basketRect = basket.getBoundingClientRect();

    return (
        fruitRect.bottom >= basketRect.top &&
        fruitRect.top <= basketRect.bottom &&
        fruitRect.right >= basketRect.left &&
        fruitRect.left <= basketRect.right
    );
}

// --- Aumento de Nível e Dificuldade ---
function checkLevelUp() {
    if (fruitsCaught % 10 === 0 && fruitsCaught > 0) { // A cada 10 frutas pegas
        level++;
        levelDisplay.textContent = `Nível: ${level}`;
        console.log(`Nível ${level}!`);

        // Aumenta a velocidade sempre que o nível aumenta
        fruitSpeed += 0.2;
        console.log(`Velocidade aumentada para ${fruitSpeed.toFixed(2)}`);

        // Aumenta a quantidade de frutas a partir do nível 5
        if (level >= 5) {
            fruitsToDrop = 1 + Math.floor((level - 4) / 2); // Começa a aumentar em 1 a cada 2 níveis após o nível 4
            console.log(`Nível ${level}: Agora caem ${fruitsToDrop} frutas por onda!`);
        }

        // Diminui ligeiramente o atraso entre as ondas de frutas em níveis mais altos
        if (fruitDropDelay > 500) { // Limita o mínimo de atraso para 500ms
            fruitDropDelay -= 50;
            if (fruitDropDelay < 500) fruitDropDelay = 500;
            console.log(`Atraso de queda diminuído para ${fruitDropDelay}ms`);
        }
    }
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
        fruitDropTimeout = setTimeout(manageFruitDrops, 100);
    } else {
        currentFruitDropCount = 0;
        // Intervalo para a próxima onda completa de frutas
        fruitDropTimeout = setTimeout(manageFruitDrops, fruitDropDelay);
    }
}


// --- Início do Jogo ---
function startGame() {
    clearInterval(gameInterval);
    clearInterval(gameTimerInterval);
    clearTimeout(fruitDropTimeout);
    clearInterval(weatherInterval); // Limpa o intervalo de clima anterior, se existir

    manageFruitDrops(); // Inicia a queda de frutas

    gameTimerInterval = setInterval(() => {
        gameTime++;
        timerDisplay.textContent = `Tempo: ${gameTime}s`;
    }, 1000);

    // --- Controle de Clima e Hora do Dia ---
    weatherInterval = setInterval(() => {
        if (isGameOver) {
            clearInterval(weatherInterval);
            return;
        }

        // Lógica de transição de clima baseada no tempo de jogo
        if (gameTime >= 30 && gameTime < 60 && currentWeather !== 'afternoon') {
            gameContainer.classList.remove('night', 'rain', 'windy');
            gameContainer.classList.add('afternoon');
            currentWeather = 'afternoon';
            removeRain(); // Garante que a chuva seja removida se mudar para tarde
            console.log("Mudando para a Tarde!");
        } else if (gameTime >= 60 && gameTime < 90 && currentWeather !== 'night') {
            gameContainer.classList.remove('afternoon', 'rain', 'windy');
            gameContainer.classList.add('night');
            currentWeather = 'night';
            removeRain();
            console.log("Mudando para a Noite!");
        } else if (gameTime >= 90 && gameTime < 120 && currentWeather !== 'rain') {
            gameContainer.classList.remove('afternoon', 'night', 'windy');
            gameContainer.classList.add('rain');
            currentWeather = 'rain';
            addRain(); // Adiciona as gotas de chuva
            console.log("Começando a Chover!");
        } else if (gameTime >= 120 && gameTime < 150 && currentWeather !== 'windy') {
            gameContainer.classList.remove('afternoon', 'night', 'rain');
            gameContainer.classList.add('windy');
            currentWeather = 'windy';
            removeRain(); // Remove a chuva quando o vento começa
            console.log("Ventando!");
        } else if (gameTime >= 150 && currentWeather !== 'day') {
            gameContainer.classList.remove('afternoon', 'night', 'rain', 'windy');
            // Não adiciona 'day' explicitamente, apenas remove os outros
            currentWeather = 'day';
            removeRain();
            console.log("Voltando ao Dia!");
            gameTime = 0; // Reinicia o ciclo de clima (mantém o gameTime para o jogo, mas reseta o ciclo do tempo)
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
    document.querySelectorAll('.fruit').forEach(fruit => fruit.remove()); // Remove frutas restantes
    removeRain(); // Garante que a chuva seja removida no fim do jogo

    finalScoreDisplay.textContent = `Você pegou ${score} frutas!`;
    gameOverScreen.classList.remove('hidden');
}

// --- Configura e posiciona elementos decorativos (chamado apenas uma vez no início ou reinício) ---
function setupDecorativeElements() {
    // Remover flores antigas antes de gerar novas
    flowersContainer.innerHTML = ''; 

    // Posiciona flores aleatoriamente
    for (let i = 0; i < 12; i++) {
        const flower = document.createElement('div');
        flower.classList.add('flower');
        flower.style.left = `${Math.random() * (gameContainer.offsetWidth - 50)}px`;
        flower.style.bottom = `${2 + Math.random() * 10}%`; // Para ficarem no gramado
        flowersContainer.appendChild(flower);
    }

    // Nuvens: Apenas posiciona randomicamente a cada início, se desejar.
    // As animações já cuidam do movimento.
    cloud1.style.top = `${Math.random() * 20 + 5}%`;
    cloud1.style.animationDelay = `${Math.random() * 10}s`;
    cloud2.style.top = `${Math.random() * 20 + 15}%`;
    cloud2.style.animationDelay = `${Math.random() * 10}s`;
    cloud3.style.top = `${Math.random() * 20 + 10}%`;
    cloud3.style.animationDelay = `${Math.random() * 10}s`;

    // Resetar posições de elementos que podem ter sido escondidos por media queries mobile, etc.
    // Ou garantir que eles estejam visíveis se o display:none foi aplicado via JS em alguma lógica
    [treeLeft, treeRight, bird1, bird2, bird3, rabbit1, rabbit2, cloud1, cloud2, cloud3, stream, grass].forEach(el => {
        if (el) el.style.display = ''; // Remove qualquer display:none inline
    });
}


// --- Funções para adicionar e remover a chuva ---
function addRain() {
    const numDrops = 200; // Quantidade de gotas
    for (let i = 0; i < numDrops; i++) {
        const drop = document.createElement('div');
        drop.classList.add('raindrop');
        drop.style.left = `${Math.random() * 100}vw`;
        drop.style.animationDelay = `${Math.random() * 2}s`; // Atraso maior para parecer mais natural
        drop.style.animationDuration = `${0.8 + Math.random() * 0.4}s`; // Duração variada da queda
        drop.style.opacity = `${0.4 + Math.random() * 0.4}`; // Varia a opacidade
        gameContainer.appendChild(drop);
    }
}

function removeRain() {
    document.querySelectorAll('.raindrop').forEach(drop => drop.remove());
}

// --- Eventos dos Botões ---
startButton.addEventListener('click', initializeGame);
restartButton.addEventListener('click', initializeGame);

// Chamar initializeGame() para configurar a tela inicial corretamente no carregamento
document.addEventListener('DOMContentLoaded', () => {
    // Esconde o game container no início, a tela inicial já está visível por padrão
    gameContainer.classList.add('hidden');
    startScreen.classList.remove('hidden');
});