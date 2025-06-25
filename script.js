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

let score = 0;
let level = 1;
let fruitSpeed = 1.5; // Velocidade inicial mais lenta
let fruitsCaught = 0;
let missedFruits = 0;
const MAX_MISSED_FRUITS = 10;
let gameInterval; // Intervalo para criar frutas
let gameTimerInterval; // Intervalo para o tempo de jogo
let fruitDropDelay = 1500; // Intervalo inicial mais longo para cair uma fruta (em ms)
let gameTime = 0; // Tempo de jogo em segundos
let isGameOver = false;
let weatherInterval; // Adicione esta linha

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
    currentFruitDropCount = 0; // Resetar

    scoreDisplay.textContent = `Pontos: ${score}`;
    levelDisplay.textContent = `Nível: ${level}`;
    missedFruitsDisplay.textContent = `Perdidas: ${missedFruits}/${MAX_MISSED_FRUITS}`;
    timerDisplay.textContent = `Tempo: ${gameTime}s`;

    gameOverScreen.classList.add('hidden');
    startScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');

    // Remove todas as frutas e elementos decorativos existentes
    document.querySelectorAll('.fruit, .tree, .flower, .grass, .bird, .rabbit, .cloud, .stream').forEach(el => el.remove());

    startGame();
}

// --- Movimento da Cesta (Responsivo para Mouse e Touch) ---

// Função para mover a cesta
function moveBasket(clientX) {
    if (isGameOver || startScreen.classList.contains('hidden') === false) return;

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
    // Evita o scroll da página ao mover o dedo
    e.preventDefault(); 
    if (e.touches.length > 0) {
        moveBasket(e.touches[0].clientX);
    }
}, { passive: false }); // `passive: false` é importante para `preventDefault()` funcionar


// --- Criação de Frutas ---
function createFruit() {
    if (isGameOver) return;

    const fruitIndex = Math.floor(Math.random() * fruitTypes.length);
    const fruitData = fruitTypes[fruitIndex];

    const fruit = document.createElement('div');
    fruit.classList.add('fruit', fruitData.name);
    // Ajuste a posição X para levar em conta o tamanho da fruta
    const maxLeft = gameContainer.offsetWidth - fruit.offsetWidth; 
    fruit.style.left = `${Math.random() * maxLeft}px`; 
    
    fruit.dataset.fruitType = fruitData.name;
    gameContainer.appendChild(fruit);

    let fruitPosition = -60;
    const fallInterval = setInterval(() => {
        if (isGameOver) {
            clearInterval(fallInterval);
            fruit.remove();
            return;
        }

        fruitPosition += fruitSpeed;
        fruit.style.top = `${fruitPosition}px`;

        // Colisão com a cesta
        if (checkCollision(fruit, basket)) {
            score += 1;
            fruitsCaught++;
            scoreDisplay.textContent = `Pontos: ${score}`;
            fruit.remove();
            clearInterval(fallInterval);
            checkLevelUp();
        }

        // Fruta caiu no chão
        if (fruitPosition > gameContainer.offsetHeight) {
            fruit.remove();
            clearInterval(fallInterval);
            missedFruits++;
            missedFruitsDisplay.textContent = `Perdidas: ${missedFruits}/${MAX_MISSED_FRUITS}`;
            if (missedFruits >= MAX_MISSED_FRUITS) {
                endGame();
            }
        }
    }, 20);
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
            if (fruitDropDelay < 500) fruitDropDelay = 500; // Garante que não fique menor que 500ms
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
        // Reintroduz um pequeno delay (ex: 80ms) para fluidez na queda de múltiplas frutas
        fruitDropTimeout = setTimeout(manageFruitDrops, 80); 
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

    // Remove todas as classes de clima anteriores para garantir que o jogo comece no 'dia'
    gameContainer.classList.remove('afternoon', 'night', 'rain', 'windy');

    addDecorativeElements();

    manageFruitDrops(); // Inicia a queda de frutas

    gameTimerInterval = setInterval(() => {
        gameTime++;
        timerDisplay.textContent = `Tempo: ${gameTime}s`;
    }, 1000);

    // --- Controle de Clima e Hora do Dia ---
    let currentWeather = 'day'; // Estado inicial do clima
    weatherInterval = setInterval(() => { // Atribua o intervalo à variável weatherInterval
        if (isGameOver) {
            clearInterval(weatherInterval);
            return;
        }

        if (gameTime > 30 && currentWeather === 'day') {
            gameContainer.classList.add('afternoon');
            currentWeather = 'afternoon';
            console.log("Mudando para a Tarde!");
        } else if (gameTime > 60 && currentWeather === 'afternoon') {
            gameContainer.classList.remove('afternoon');
            gameContainer.classList.add('night');
            currentWeather = 'night';
            console.log("Mudando para a Noite!");
        } else if (gameTime > 90 && currentWeather === 'night') {
            gameContainer.classList.remove('night');
            gameContainer.classList.add('rain');
            currentWeather = 'rain';
            addRain(); // Função para adicionar as gotas de chuva
            console.log("Começando a Chover!");
        } else if (gameTime > 120 && currentWeather === 'rain') {
            gameContainer.classList.remove('rain');
            removeRain(); // Função para remover as gotas de chuva
            gameContainer.classList.add('windy');
            currentWeather = 'windy';
            console.log("Ventando!");
        } else if (gameTime > 150 && currentWeather === 'windy') { // Adicionado currentWeather para não reiniciar antes da hora
            gameContainer.classList.remove('windy');
            gameContainer.classList.add('day'); // Volta para o dia
            currentWeather = 'day';
            console.log("Voltando ao Dia!");
            gameTime = 0; // Reinicia o ciclo de clima para o exemplo
        }
    }, 5000); // Verifica o tempo a cada 5 segundos para mudar o clima
}

// --- Fim de Jogo ---
function endGame() {
    isGameOver = true;
    clearInterval(gameInterval);
    clearInterval(gameTimerInterval);
    clearTimeout(fruitDropTimeout);
    finalScoreDisplay.textContent = `Você pegou ${score} frutas!`;
    gameOverScreen.classList.remove('hidden');
}

// --- Adiciona elementos decorativos (árvores, flores, animais, nuvens, riacho) ---
function addDecorativeElements() {
    // Remove elementos antigos para reiniciar
    document.querySelectorAll('.tree, .flower, .grass, .bird, .rabbit, .cloud, .stream').forEach(el => el.remove());

    const grassDetail = document.createElement('div');
    grassDetail.classList.add('grass');
    gameContainer.appendChild(grassDetail);

    const tree1 = document.createElement('div');
    tree1.classList.add('tree', 'left');
    tree1.innerHTML = '<div class="trunk"></div><div class="leaves"></div>';
    gameContainer.appendChild(tree1);

    const tree2 = document.createElement('div');
    tree2.classList.add('tree', 'right');
    tree2.innerHTML = '<div class="trunk"></div><div class="leaves"></div>';
    gameContainer.appendChild(tree2);

    for (let i = 0; i < 12; i++) {
        const flower = document.createElement('div');
        flower.classList.add('flower');
        flower.style.left = `${Math.random() * (gameContainer.offsetWidth - 50)}px`;
        flower.style.bottom = `${2 + Math.random() * 10}%`;
        gameContainer.appendChild(flower);
    }

    // --- Pássaros ---
    const bird1 = document.createElement('div');
    bird1.classList.add('bird');
    gameContainer.appendChild(bird1);

    const bird2 = document.createElement('div');
    bird2.classList.add('bird');
    bird2.style.animationDelay = '7s';
    bird2.style.top = '15%';
    gameContainer.appendChild(bird2);

    const bird3 = document.createElement('div'); // Mais um pássaro
    bird3.classList.add('bird');
    bird3.style.animationDelay = '12s';
    bird3.style.top = '20%';
    gameContainer.appendChild(bird3);

    // --- Coelhos ---
    const rabbit1 = document.createElement('div');
    rabbit1.classList.add('rabbit');
    gameContainer.appendChild(rabbit1);

    const rabbit2 = document.createElement('div'); // Mais um coelho
    rabbit2.classList.add('rabbit');
    rabbit2.style.animationDelay = '10s'; // Para se moverem em tempos diferentes
    rabbit2.style.left = '80%'; // Posição inicial diferente
    gameContainer.appendChild(rabbit2);

    // --- Nuvens ---
    const cloud1 = document.createElement('div');
    cloud1.classList.add('cloud', 'small');
    cloud1.style.top = `${Math.random() * 20 + 5}%`; // Posição vertical aleatória
    cloud1.style.animationDelay = `${Math.random() * 10}s`; // Atraso aleatório
    gameContainer.appendChild(cloud1);

    const cloud2 = document.createElement('div');
    cloud2.classList.add('cloud', 'medium');
    cloud2.style.top = `${Math.random() * 20 + 15}%`;
    cloud2.style.animationDelay = `${Math.random() * 10}s`;
    gameContainer.appendChild(cloud2);

    const cloud3 = document.createElement('div'); // Mais uma nuvem
    cloud3.classList.add('cloud', 'small');
    cloud3.style.top = `${Math.random() * 20 + 10}%`;
    cloud3.style.animationDelay = `${Math.random() * 10}s`;
    gameContainer.appendChild(cloud3);

    // --- Riacho ---
    const stream = document.createElement('div');
    stream.classList.add('stream');
    gameContainer.appendChild(stream);
}

// --- Eventos dos Botões ---
startButton.addEventListener('click', initializeGame);
restartButton.addEventListener('click', initializeGame);

// --- Funções para adicionar e remover a chuva ---
function addRain() {
    const numDrops = 200; // Quantidade de gotas
    for (let i = 0; i < numDrops; i++) {
        const drop = document.createElement('div');
        drop.classList.add('raindrop');
        drop.style.left = `${Math.random() * 100}vw`;
        drop.style.animationDelay = `${Math.random()}s`;
        drop.style.opacity = `${0.4 + Math.random() * 0.4}`; // Varia a opacidade
        gameContainer.appendChild(drop);
    }
}

function removeRain() {
    document.querySelectorAll('.raindrop').forEach(drop => drop.remove());
}