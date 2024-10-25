class StatusBar {
    constructor() {
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fps = 0;
        this.startTime = performance.now();
        this.createStatusBar();
        this.updateInterval = setInterval(() => this.updateFPS(), 1000);
    }

    createStatusBar() {
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            background-color: rgba(0, 0, 0, 0.7);
            color: #fff;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            border-radius: 5px;
            z-index: 1000;
            min-width: 200px;
            pointer-events: none;
        `;

        // FPS表示
        this.fpsElement = document.createElement('div');
        this.container.appendChild(this.fpsElement);

        // 画面内パーティクル数
        this.visibleParticlesElement = document.createElement('div');
        this.container.appendChild(this.visibleParticlesElement);

        // カメラ位置表示
        this.positionElement = document.createElement('div');
        this.container.appendChild(this.positionElement);

        // カメラ向き表示
        this.rotationElement = document.createElement('div');
        this.container.appendChild(this.rotationElement);

         // 平均力場強度
         this.forceFieldElement = document.createElement('div');
         this.container.appendChild(this.forceFieldElement);

        // 経過時間表示
        this.elapsedTimeElement = document.createElement('div');
        this.container.appendChild(this.elapsedTimeElement);


        document.body.appendChild(this.container);
    }

    formatElapsedTime(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    formatNumber(num) {
        return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    updateFPS() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.fps = Math.round((this.frameCount * 1000) / deltaTime);
        this.frameCount = 0;
        this.lastTime = currentTime;
    }

    update(camera, cameraController, particleSystem) {
        this.frameCount++;

        // FPSの表示
        this.fpsElement.textContent = `FPS: ${this.fps}`;

        // 経過時間の表示
        const elapsedTime = performance.now() - this.startTime;
        this.elapsedTimeElement.textContent = `Time: ${this.formatElapsedTime(elapsedTime)}`;

        // 画面内パーティクル数の計算と表示
        const visibleParticles = particleSystem.getVisibleParticleCount();
        const totalParticles = particleSystem.settings.count;
        this.visibleParticlesElement.textContent = 
            `Particles: ${this.formatNumber(visibleParticles)}/${this.formatNumber(totalParticles)}`;

        // 平均力場強度の表示（ブラックホール効果を含む）
        const avgForce = particleSystem.getAverageForce();
        this.forceFieldElement.textContent = `Force: ${avgForce.toFixed(3)}`;

        // カメラ位置の表示（小数点2桁まで）
        const pos = camera.position;
        this.positionElement.textContent = `Cam Pos: X:${pos.x.toFixed(2)} Y:${pos.y.toFixed(2)} Z:${pos.z.toFixed(2)}`;

        // カメラの向き（回転）の表示
        // ラジアンから度に変換して表示
        const rotation = {
            x: (cameraController.state.rotationX * 180 / Math.PI) % 360,
            y: (cameraController.state.rotationY * 180 / Math.PI) % 360
        };
        this.rotationElement.textContent = 
            `Cam Rot: X:${rotation.x.toFixed(2)}° Y:${rotation.y.toFixed(2)}°`;
    }

    setVisibility(visible) {
        this.container.style.display = visible ? 'block' : 'none';
    }

    dispose() {
        clearInterval(this.updateInterval);
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}