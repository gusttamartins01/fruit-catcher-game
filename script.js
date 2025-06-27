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
let fruitDropDelay = 1000; // Intervalo inicial um pouco mais rápido para cair uma fruta (em ms)
let gameTime = 0; // Tempo de jogo em segundos
let isGameOver = false;
let weatherInterval;
let currentWeather = 'day'; // Estado inicial do clima

// Variáveis para controlar a queda gradual e múltiplas frutas
let fruitsToDrop = 1; // Quantidade inicial de frutas a cair por "onda" (começa com 1)
let currentFruitDropCount = 0; // Contador de frutas na onda atual
let fruitDropTimeout; // Timeout para a queda gradual
let basketX = 0; // Posição X da cesta (para controle via mouse/touch)
// NOTA: Para mouse/touch, BASKET_MOVE_SPEED não é diretamente usado para o movimento da cesta,
// mas sim a posição do ponteiro/toque.
let activeKeys = {}; // Mantido caso queira reintroduzir teclado facilmente, mas não usado aqui.

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
    fruitDropDelay = 1000; // Resetar para o intervalo inicial
    fruitsToDrop = 1; // Resetar para 1 fruta no início
    currentFruitDropCount = 0;
    currentWeather = 'day'; // Resetar clima para dia
    basketX = 0; // Resetar posição da cesta
    basket.style.setProperty('--basket-x', `${basketX}px`);

    scoreDisplay.textContent = `Pontos: ${score}`;
    levelDisplay.textContent = `Nível: ${level}`;
    missedFruitsDisplay.textContent = `Perdidas: ${missedFruits}/${MAX_MISSED_FRUITS}`;
    timerDisplay.textContent = `Tempo: ${gameTime}s`;

    gameOverScreen.classList.add('hidden');
    startScreen.classList.add('hidden');
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

// --- Movimento da Cesta (Exclusivamente Mouse/Touch) ---
function moveBasket(clientX) {
    if (isGameOver || !startScreen.classList.contains('hidden')) return;

    const gameRect = gameContainer.getBoundingClientRect();
    const basketWidth = basket.offsetWidth;

    // Calcula a posição X da cesta baseada na posição do mouse/touch.
    // O centro da cesta seguirá o ponteiro do mouse/toque.
    let newX = clientX - gameRect.left - (gameRect.width / 2); // Posição relativa ao centro do gameContainer
    
    // Limita o movimento para que a cesta não saia da tela
    // maxBasketX é a distância máxima que o centro da cesta pode ir da borda do gameContainer
    const maxBasketX = (gameRect.width / 2) - (basketWidth / 2);
    if (newX < -maxBasketX) {
        newX = -maxBasketX;
    }
    if (newX > maxBasketX) {
        newX = maxBasketX;
    }
    basketX = newX;
    basket.style.setProperty('--basket-x', `${basketX}px`);
}

// Eventos de Input (Mouse e Touch)
document.addEventListener('mousemove', (e) => {
    moveBasket(e.clientX);
});

document.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Evita o scroll da página ao mover o dedo
    if (e.touches.length > 0) {
        moveBasket(e.touches[0].clientX);
    }
}, { passive: false }); // Usar { passive: false } se precisar de preventDefault


// --- Criação de Frutas (Agora com Animação CSS e Colisão Ajustada) ---
function createFruit() {
    if (isGameOver) return;

    const fruitIndex = Math.floor(Math.random() * fruitTypes.length);
    const fruitData = fruitTypes[fruitIndex];

    const fruit = document.createElement('div');
    fruit.classList.add('fruit', fruitData.name);

    // Adiciona temporariamente ao DOM para obter as dimensões reais da fruta
    // Isso é crucial para posicionar corretamente e evitar que ela nasça fora da tela.
    gameContainer.appendChild(fruit);
    const fruitWidth = fruit.offsetWidth;
    fruit.remove(); // Remove para adicionar novamente com a posição correta

    // Calcula a posição inicial da fruta para que ela caia sempre dentro da largura visível
    // e com uma pequena margem para a cesta poder alcançá-la completamente.
    const gameRectWidth = gameContainer.offsetWidth;
    const padding = 10; // Margem para a fruta não "sumir" nas bordas
    const minLeft = padding;
    const maxLeft = gameRectWidth - fruitWidth - padding;
    
    // Garante que minLeft e maxLeft sejam válidos (evita bugs em telas muito pequenas)
    if (maxLeft <= minLeft) {
        fruit.style.left = `${minLeft}px`;
    } else {
        fruit.style.left = `${minLeft + Math.random() * (maxLeft - minLeft)}px`;
    }

    // Calcula a duração da animação (velocidade de queda)
    // Maior fruitSpeed -> menor animationDuration (cai mais rápido)
    const animationDuration = (gameContainer.offsetHeight / (fruitSpeed * 100)) + 's';
    fruit.style.setProperty('--fall-duration', animationDuration);

    // Adiciona a fruta ao gameContainer para iniciar a animação
    gameContainer.appendChild(fruit);

    // Loop de verificação de colisão contínuo para esta fruta
    function checkFruitCollisionLoop() {
        // Se o jogo acabou ou a fruta já foi removida (ex: pega pela cesta), encerra este loop
        if (isGameOver || !fruit.parentNode) {
            return;
        }

        // Verifica a colisão entre a fruta e a cesta
        if (checkCollision(fruit, basket)) {
            score += 1;
            fruitsCaught++;
            scoreDisplay.textContent = `Pontos: ${score}`;
            fruit.remove(); // Remove a fruta ao ser pega
            checkLevelUp(); // Verifica se é hora de subir de nível
            return; // Encerra o loop de colisão para esta fruta, pois ela foi pega
        }

        // Se a fruta ainda está dentro dos limites verticais da área de jogo, continua verificando
        const fruitRect = fruit.getBoundingClientRect();
        // A colisão precisa ser verificada enquanto a fruta estiver acima da parte inferior da tela
        if (fruitRect.top < gameContainer.offsetHeight) {
            requestAnimationFrame(checkFruitCollisionLoop);
        }
        // Se fruitRect.top já for maior ou igual a gameContainer.offsetHeight,
        // significa que a fruta saiu da tela por baixo, e o evento 'animationend'
        // se encarregará de contá-la como "perdida" e removê-la.
    }
    requestAnimationFrame(checkFruitCollisionLoop); // Inicia o loop de colisão para esta fruta

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
    });
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

        // Aumenta a quantidade de frutas a cair por "onda" de forma mais gradual
        if (fruitsToDrop < 5) { // Limita o máximo de frutas por onda para 5
            fruitsToDrop = 1 + Math.floor((level - 1) / 2); // Ex: Nv1=1, Nv2-3=2, Nv4-5=3, Nv6-7=4, Nv8+=5
            if (fruitsToDrop > 5) fruitsToDrop = 5; // Garante o limite máximo
            console.log(`Nível ${level}: Agora caem ${fruitsToDrop} frutas por onda!`);
        }
    }
}

// Função para aumentar a dificuldade a cada 10 segundos
function increaseDifficultyByTime() {
    fruitSpeed += 0.1; // Aumenta a velocidade de queda
    // Reduz o delay entre as ondas de frutas
    if (fruitDropDelay > 400) { // Limita o mínimo de atraso para 400ms
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

    // REMOVIDO: requestAnimationFrame(updateBasketPosition); // Não é mais necessário para controle de teclado

    // Inicia a queda de frutas
    manageFruitDrops();

    let lastDifficultyIncreaseTime = 0;

    // Intervalo principal do jogo para tempo e dificuldade baseada no tempo
    gameTimerInterval = setInterval(() => {
        gameTime++;
        timerDisplay.textContent = `Tempo: ${gameTime}s`;

        // Aumenta a dificuldade a cada 10 segundos
        if (gameTime - lastDifficultyIncreaseTime >= 10) {
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

        // Lógica de transição de clima baseada no tempo de jogo (cada fase dura 20 segundos)
        if (gameTime >= 20 && gameTime < 40) {
            newWeather = 'afternoon';
        } else if (gameTime >= 40 && gameTime < 60) {
            newWeather = 'night';
        } else if (gameTime >= 60 && gameTime < 80) {
            newWeather = 'rain';
            addRain();
        } else if (gameTime >= 80 && gameTime < 100) {
            newWeather = 'windy';
        } else if (gameTime >= 100 && gameTime < 120) {
            newWeather = 'snow';
            addSnow();
        } else if (gameTime >= 120 && gameTime < 140) {
            newWeather = 'storm';
            addRain(); // Chuva na tempestade
            addLightning();
        } else {
            // Volta para o dia e reinicia o ciclo de clima e tempo
            newWeather = 'day';
            gameTime = 0; // Reinicia o tempo de jogo para recomeçar o ciclo de climas
            lastDifficultyIncreaseTime = 0; // Reinicia o contador de dificuldade baseada no tempo
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
    document.querySelectorAll('.fruit').forEach(fruit => fruit.remove()); // Remove frutas restantes
    removeWeatherEffects(); // Garante que todos os efeitos de clima sejam removidos

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
        // Usar '%' para posicionamento mais responsivo
        flower.style.left = `${Math.random() * 95}%`; // Evita que saia da tela
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
        if (el) el.style.display = ''; // Remove qualquer display:none inline que possa ter sido aplicado
        el.style.animationPlayState = 'running'; // Garante que as animações estejam rodando
    });
}


// --- Funções para adicionar e remover efeitos de clima ---
let lightningTimeout; // Variável para controlar o timeout dos raios
function removeWeatherEffects() {
    document.querySelectorAll('.raindrop').forEach(drop => drop.remove());
    document.querySelectorAll('.snow-flake').forEach(flake => flake.remove());
    document.querySelectorAll('.lightning').forEach(light => light.remove());
    clearTimeout(lightningTimeout); // Limpa o timeout de raios para parar a geração
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
        const lightning = document.createElement('div');
        lightning.classList.add('lightning');
        // Posição aleatória na parte superior da tela
        lightning.style.left = `${10 + Math.random() * 80}vw`;
        lightning.style.top = `${Math.random() * 20}vh`; // Mais alto para ser visível
        gameContainer.appendChild(lightning);

        setTimeout(() => {
            lightning.remove();
        }, 500); // Remove o raio rapidamente
    }

    // Cria raios intermitentemente
    function strikeLoop() {
        // Continua criando raios apenas se o clima atual for 'storm' e o jogo não estiver acabado
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

// Chamar initializeGame() para configurar a tela inicial corretamente no carregamento
document.addEventListener('DOMContentLoaded', () => {
    // Esconde o game container no início, a tela inicial já está visível por padrão
    gameContainer.classList.add('hidden');
    startScreen.classList.remove('hidden');
});

// Define a posição inicial da cesta no carregamento, centralizada
document.addEventListener('DOMContentLoaded', () => {
    // A cesta é centralizada automaticamente pelo CSS com transform,
    // mas garantimos que a variável --basket-x esteja em 0
    basketX = 0;
    basket.style.setProperty('--basket-x', `${basketX}px`);
});