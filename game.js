class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.level = 1;
        this.maxLevel = 10;
        this.bearX = this.canvas.width / 2;
        this.bearY = this.canvas.height / 2;
        this.bearWidth = 60;
        this.bearHeight = 60;
        this.bearSpeed = 5;
        this.mouthOpen = 0;
        this.isAngry = false;
        this.angryTimer = 0;
        this.isEating = false;
        this.eatingTimer = 0;
        this.keys = {};
        this.honeyPots = [];
        this.bees = [];
        this.isGameActive = false;
        this.isGameOver = false;
        this.lastTime = 0;
        this.isPaused = false;
        this.pauseScreen = document.getElementById('pauseScreen');
        this.resumeButton = document.getElementById('resumeButton');
        this.animationFrame = null;
        this.isMobile = window.innerWidth <= 850;

        // Mobil için canvas boyutlarını ayarla
        if (this.isMobile) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        } else {
            this.canvas.width = 800;
            this.canvas.height = 600;
        }

        this.bearSpeed = this.isMobile ? 3 : 5;

        this.init();
        this.setupEventListeners();
        this.createLevelButtons();

        // ESC tuşu için event listener
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isGameActive) {
                if (this.isPaused) {
                    this.resumeGame();
                } else {
                    this.pauseGame();
                }
            }
        });

        // Resume butonu için event listener
        this.resumeButton.addEventListener('click', () => {
            this.resumeGame();
        });
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        if (this.isMobile) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        } else {
            this.canvas.width = 800;
            this.canvas.height = 600;
        }
        this.bearX = this.canvas.width / 2;
        this.bearY = this.canvas.height / 2;
    }

    setupEventListeners() {
        // Mevcut klavye kontrolleri
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        // Mobil kontroller
        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');
        const upBtn = document.getElementById('upBtn');
        const downBtn = document.getElementById('downBtn');
        const pauseBtn = document.getElementById('pauseBtn');

        // Dokunmatik kontroller için yardımcı fonksiyon
        const createTouchHandler = (key) => {
            return {
                start: () => {
                    this.handleKeyDown({ key });
                },
                end: () => {
                    this.handleKeyUp({ key });
                }
            };
        };

        // Her buton için dokunmatik olayları ekle
        const setupButton = (button, key) => {
            const handler = createTouchHandler(key);
            button.addEventListener('touchstart', handler.start);
            button.addEventListener('touchend', handler.end);
            button.addEventListener('mousedown', handler.start);
            button.addEventListener('mouseup', handler.end);
        };

        setupButton(leftBtn, 'ArrowLeft');
        setupButton(rightBtn, 'ArrowRight');
        setupButton(upBtn, 'ArrowUp');
        setupButton(downBtn, 'ArrowDown');

        // Pause butonu için olay dinleyici
        pauseBtn.addEventListener('click', () => {
            if (this.isPaused) {
                this.resumeGame();
            } else {
                this.pauseGame();
            }
        });

        // Dokunmatik cihazlarda varsayılan kaydırma davranışını engelle
        document.addEventListener('touchmove', (e) => {
            if (this.isGameActive) {
                e.preventDefault();
            }
        }, { passive: false });

        const startButton = document.getElementById('startButton');
        if (startButton) {
            startButton.addEventListener('click', () => this.startGame());
        }

        // Restart butonu için event listener
        const restartButton = document.getElementById('restartButton');
        if (restartButton) {
            restartButton.addEventListener('click', () => {
                if (this.isGameOver) {
                    this.restartGame();
                }
            });
        }

        // Space tuşu için event listener'ı da tutalım
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Space' && this.isGameOver) {
                this.restartGame();
            }
        });
    }

    createLevelButtons() {
        const container = document.querySelector('.level-buttons');
        if (container) {
            for (let i = 1; i <= this.maxLevel; i++) {
                const button = document.createElement('button');
                button.textContent = `Level ${i}`;
                button.addEventListener('click', () => {
                    this.level = i;
                    this.startGame();
                });
                container.appendChild(button);
            }
        }
    }

    startGame() {
        const menu = document.getElementById('menu');
        if (menu) {
            menu.style.display = 'none';
        }
        this.isGameActive = true;
        this.isGameOver = false;
        this.score = 0;
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        this.generateLevel();
        this.lastTime = performance.now();
        this.animationFrame = requestAnimationFrame(this.gameLoop.bind(this));
    }

    generateLevel() {
        this.honeyPots = [];
        this.bees = [];
        
        // Her seviye için bal ve arı sayısını ayarla
        const honeyCount = Math.min(3 + this.level, 10);  // Her seviye 3'ten başlayıp max 10 bal
        const beeCount = Math.min(2 + Math.floor(this.level / 2), 8);  // Her 2 seviyede 1 arı artıyor, max 8
        
        const margin = 50;
        
        // Balları yerleştir
        for (let i = 0; i < honeyCount; i++) {
            let newHoney;
            let attempts = 0;
            do {
                newHoney = {
                    x: margin + Math.random() * (this.canvas.width - 2 * margin),
                    y: margin + Math.random() * (this.canvas.height - 2 * margin),
                    width: 30,
                    height: 30
                };
                attempts++;
            } while (this.checkOverlap(newHoney) && attempts < 10);
            
            this.honeyPots.push(newHoney);
        }
        
        // Arıları yerleştir
        for (let i = 0; i < beeCount; i++) {
            const baseSpeed = 1 + (this.level * 0.2); // Her seviye hız artıyor
            this.bees.push({
                x: margin + Math.random() * (this.canvas.width - 2 * margin),
                y: margin + Math.random() * (this.canvas.height - 2 * margin),
                width: 40,
                height: 40,
                speedX: (Math.random() - 0.5) * baseSpeed,
                speedY: (Math.random() - 0.5) * baseSpeed
            });
        }
    }

    checkOverlap(newObj) {
        return [...this.honeyPots, ...this.bees].some(obj => 
            Math.abs(newObj.x - obj.x) < 40 && Math.abs(newObj.y - obj.y) < 40
        );
    }

    update(deltaTime) {
        if (!this.isGameActive) return;

        // Ayı hareketi
        if (this.keys['ArrowLeft']) this.bearX = Math.max(0, this.bearX - this.bearSpeed);
        if (this.keys['ArrowRight']) this.bearX = Math.min(this.canvas.width - this.bearWidth, this.bearX + this.bearSpeed);
        if (this.keys['ArrowUp']) this.bearY = Math.max(0, this.bearY - this.bearSpeed);
        if (this.keys['ArrowDown']) this.bearY = Math.min(this.canvas.height - this.bearHeight, this.bearY + this.bearSpeed);

        // Arı hareketi
        for (const bee of this.bees) {
            bee.x += bee.speedX;
            bee.y += bee.speedY;

            // Ekran sınırlarını kontrol et
            if (bee.x <= 0 || bee.x + bee.width >= this.canvas.width) {
                bee.speedX *= -1;
                bee.x = Math.max(0, Math.min(this.canvas.width - bee.width, bee.x));
            }
            if (bee.y <= 0 || bee.y + bee.height >= this.canvas.height) {
                bee.speedY *= -1;
                bee.y = Math.max(0, Math.min(this.canvas.height - bee.height, bee.y));
            }
        }

        // Kızgınlık durumu kontrolü
        if (this.isAngry) {
            this.angryTimer += deltaTime;
            if (this.angryTimer > 1000) {
                this.isAngry = false;
                this.angryTimer = 0;
            }
        }

        // Yeme animasyonu kontrolü
        if (this.isEating) {
            this.eatingTimer += deltaTime;
            this.mouthOpen = 0.5;
            if (this.eatingTimer > 500) {
                this.isEating = false;
                this.eatingTimer = 0;
                this.mouthOpen = 0;
            }
        }

        this.checkCollisions();
    }

    checkCollisions() {
        if (!this.isGameActive) return;

        // Bal toplama kontrolü
        for (let i = this.honeyPots.length - 1; i >= 0; i--) {
            const honey = this.honeyPots[i];
            if (this.isColliding(
                this.bearX, this.bearY, this.bearWidth, this.bearHeight,
                honey.x, honey.y, honey.width, honey.height
            )) {
                this.honeyPots.splice(i, 1);
                this.score++;
                document.getElementById('score').textContent = this.score;
                
                this.isEating = true;
                this.eatingTimer = 0;
                
                // Tüm ballar toplandı mı kontrol et
                if (this.honeyPots.length === 0) {
                    // Seviye atla ve yeni seviye oluştur
                    this.level++;
                    document.getElementById('level').textContent = this.level;
                    
                    if (this.level <= this.maxLevel) {
                        this.generateLevel();
                    } else {
                        // Maksimum seviyeye ulaşıldı, oyunu bitir
                        this.gameOver();
                    }
                }
            }
        }

        // Arı çarpışma kontrolü
        if (!this.isAngry) {
            for (const bee of this.bees) {
                if (this.isColliding(
                    this.bearX, this.bearY, this.bearWidth, this.bearHeight,
                    bee.x, bee.y, bee.width, bee.height
                )) {
                    this.isAngry = true;
                    this.gameOver();
                    return;
                }
            }
        }
    }

    isColliding(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 &&
               x1 + w1 > x2 &&
               y1 < y2 + h2 &&
               y1 + h1 > y2;
    }

    drawBear() {
        const ctx = this.ctx;
        const x = this.bearX;
        const y = this.bearY;
        const width = this.bearWidth;
        const height = this.bearHeight;

        // Ana yüz
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(x + width/2, y + height/2, width/2, 0, Math.PI * 2);
        ctx.fill();

        // Kulaklar
        ctx.beginPath();
        ctx.arc(x + width/4, y + height/3, width/3.1, 0, Math.PI * 2);
        ctx.arc(x + width*3/4, y + height/3, width/3.1, 0, Math.PI * 2);
        ctx.fill();

        // Gözler
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x + width*0.35, y + height*0.45, width/8, 0, Math.PI * 2);
        ctx.arc(x + width*0.65, y + height*0.45, width/8, 0, Math.PI * 2);
        ctx.fill();

        // Göz bebekleri
        ctx.fillStyle = this.isAngry ? '#FF0000' : '#000000';
        ctx.beginPath();
        ctx.arc(x + width*0.35, y + height*0.45, width/16, 0, Math.PI * 2);
        ctx.arc(x + width*0.65, y + height*0.45, width/16, 0, Math.PI * 2);
        ctx.fill();

        // Burun
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(x + width/2, y + height*0.6, width/10, 0, Math.PI * 2);
        ctx.fill();

        // Ağız
        if (this.isAngry) {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x + width/2, y + height*0.75, width/4, 0, Math.PI, false);
            ctx.stroke();
        } else {
            const mouthWidth = width/3;
            const mouthHeight = height/4 * this.mouthOpen;
            const mouthY = y + height*0.7;
            
            if (this.mouthOpen > 0.2) {
                ctx.fillStyle = '#8B0000';
                ctx.beginPath();
                ctx.ellipse(
                    x + width/2,
                    mouthY + mouthHeight/2,
                    mouthWidth * 0.8,
                    mouthHeight/2,
                    0,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x + width/2 - mouthWidth, mouthY);
            ctx.quadraticCurveTo(
                x + width/2, 
                mouthY - mouthHeight/2, 
                x + width/2 + mouthWidth, 
                mouthY
            );
            ctx.stroke();
        }
    }

    drawBee(x, y, width, height) {
        const ctx = this.ctx;
        
        // Gövde
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.ellipse(x + width/2, y + height/2, width/2, height/3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Çizgiler
        ctx.fillStyle = '#000000';
        for(let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(x + width/2 + (i-1)*width/6, y + height/2, width/12, height/3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Kanatlar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.ellipse(x + width/3, y + height/3, width/4, height/6, Math.PI/4, 0, Math.PI * 2);
        ctx.ellipse(x + 2*width/3, y + height/3, width/4, height/6, -Math.PI/4, 0, Math.PI * 2);
        ctx.fill();
    }

    drawHoney(x, y, radius) {
        const ctx = this.ctx;
        
        // Ana sarı daire
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Petek deseni
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 1;

        // Merkezdeki altıgen
        const hexSize = radius * 0.4;
        this.drawHexagon(ctx, x, y, hexSize);

        // Çevredeki altıgenler
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
            const hx = x + Math.cos(angle) * hexSize * 1.5;
            const hy = y + Math.sin(angle) * hexSize * 1.5;
            this.drawHexagon(ctx, hx, hy, hexSize);
        }
    }

    // Altıgen çizme yardımcı fonksiyonu
    drawHexagon(ctx, x, y, size) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const px = x + Math.cos(angle) * size;
            const py = y + Math.sin(angle) * size;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        ctx.stroke();
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw() {
        this.clearCanvas();

        // Balları çiz
        this.honeyPots.forEach(honey => {
            this.drawHoney(honey.x + honey.width/2, honey.y + honey.height/2, honey.width/2);
        });

        // Arıları çiz
        this.bees.forEach(bee => {
            this.drawBee(bee.x, bee.y, bee.width, bee.height);
        });

        // Ayıyı çiz
        this.drawBear();

        if (!this.isGameActive && this.isGameOver) {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Game Over!', this.canvas.width / 2, this.canvas.height / 2 - 50);
            
            this.ctx.font = '24px Arial';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.fillText('Press Space to Restart', this.canvas.width / 2, this.canvas.height / 2 + 50);
            
            this.ctx.restore();
        }
    }

    gameOver() {
        this.isGameOver = true;
        this.isGameActive = false;
        document.getElementById('gameOverScreen').style.display = 'block';
        document.getElementById('finalScore').textContent = this.score;
        
        // Mobil kontrolleri gizle
        document.querySelector('.mobile-controls').style.display = 'none';
        document.querySelector('.pause-btn').style.display = 'none';
    }

    restartGame() {
        this.score = 0;
        this.level = 1;
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('gameOverScreen').style.display = 'none';
        
        // Mobil kontrolleri tekrar göster
        if (window.innerWidth <= 850) {
            document.querySelector('.mobile-controls').style.display = 'flex';
            document.querySelector('.pause-btn').style.display = 'flex';
        }

        this.isGameOver = false;
        this.isGameActive = true;
        this.generateLevel();
        this.lastTime = performance.now();
        this.animationFrame = requestAnimationFrame(this.gameLoop.bind(this));
    }

    pauseGame() {
        if (this.isGameActive && !this.isGameOver) {
            this.isPaused = true;
            this.pauseScreen.style.display = 'block';
            // Oyun döngüsünü durdur
            cancelAnimationFrame(this.animationFrame);
        }
    }

    resumeGame() {
        if (this.isGameActive && !this.isGameOver) {
            this.isPaused = false;
            this.pauseScreen.style.display = 'none';
            this.lastTime = performance.now();
            // Oyun döngüsünü tekrar başlat
            this.animationFrame = requestAnimationFrame(this.gameLoop.bind(this));
        }
    }

    gameLoop(currentTime) {
        if (this.isPaused) return;
        if (!this.lastTime) this.lastTime = currentTime;
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        if (this.isGameActive) {
            this.update(deltaTime);
            this.draw();
            this.animationFrame = requestAnimationFrame(this.gameLoop.bind(this));
        }
    }

    handleKeyDown(e) {
        this.keys[e.key] = true;
        if (e.key === 'Space' && this.isGameOver) {
            this.restartGame();
        }
    }

    handleKeyUp(e) {
        this.keys[e.key] = false;
    }
}

// Oyunu başlat
window.onload = () => {
    new Game();
};
