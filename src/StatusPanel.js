class StatusPanel {
    constructor() {
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fps = 0;
        this.startTime = performance.now();
        this.createPanel();
        this.updateInterval = setInterval(() => this.updateFPS(), 1000);
    }

    createPanel() {
        this.container = document.createElement('div');
        this.container.className = 'status-panel';

        // 各情報要素の作成
        const elements = ['fps', 'visibleParticles', 'position', 'rotation', 'forceField', 'activeSounds', 'elapsedTime'];
        this.elements = {};

        elements.forEach(name => {
            const element = document.createElement('div');
            element.className = `status-${name}`;
            this.elements[name] = element;
            this.container.appendChild(element);
        });

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

    getFPS(){
        return this.fps
    }

    update(camera, cameraController, particleSystem, soundSystem) {
        this.frameCount++;

        const elapsedTime = performance.now() - this.startTime;
        const visibleParticles = particleSystem.getVisibleParticleCount();
        const totalParticles = particleSystem.settings.count;
        const avgForce = particleSystem.getAverageForce();
        const pos = camera.position;
        const rotation = {
            x: (cameraController.state.rotationX * 180 / Math.PI) % 360,
            y: (cameraController.state.rotationY * 180 / Math.PI) % 360
        };

        // 音源数の取得（soundSystemが存在し、初期化されている場合のみ）
        const activeSoundCount = soundSystem && soundSystem.isInitialized ? 
            soundSystem.getActiveSoundCount() : 0;
        const maxSoundSources = soundSystem ? soundSystem.settings.maxSources : 0;

        // 各要素の更新
        this.elements.fps.textContent = `FPS: ${this.fps}`;
        this.elements.visibleParticles.textContent = 
            `Particles: ${this.formatNumber(visibleParticles)}/${this.formatNumber(totalParticles)}`;
        this.elements.position.textContent = 
            `Cam Pos: X:${pos.x.toFixed(2)} Y:${pos.y.toFixed(2)} Z:${pos.z.toFixed(2)}`;
        this.elements.rotation.textContent = 
            `Cam Rot: X:${rotation.x.toFixed(2)}° Y:${rotation.y.toFixed(2)}°`;
        this.elements.forceField.textContent = `Force: ${avgForce.toFixed(3)}`;
        this.elements.activeSounds.textContent = 
        `Active Sounds: ${this.formatNumber(activeSoundCount)}/${this.formatNumber(maxSoundSources)}`;
        this.elements.elapsedTime.textContent = `Time: ${this.formatElapsedTime(elapsedTime)}`;
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