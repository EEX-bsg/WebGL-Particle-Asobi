class StatusBar {
    constructor() {
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fps = 0;
        this.effects = new Map();
        this.createStatusBar();
        this.updateInterval = setInterval(() => this.updateFPS(), 1000);
    }

    createStatusBar() {
        // ステータスバーのコンテナ
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            background-color: rgba(0, 10, 10, 0.7);
            color: #91defa;
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

        // カメラ位置表示
        this.positionElement = document.createElement('div');
        this.container.appendChild(this.positionElement);

        // カメラ向き表示
        this.rotationElement = document.createElement('div');
        this.container.appendChild(this.rotationElement);

        // エフェクト情報用のコンテナ
        this.effectsElement = document.createElement('div');
        this.container.appendChild(this.effectsElement);

        document.body.appendChild(this.container);
    }

    updateFPS() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.fps = Math.round((this.frameCount * 1000) / deltaTime);
        this.frameCount = 0;
        this.lastTime = currentTime;
    }

    // エフェクト情報の追加
    addEffect(name, value) {
        this.effects.set(name, value);
        this.updateEffectsDisplay();
    }

    // エフェクト情報の更新
    updateEffect(name, value) {
        this.effects.set(name, value);
        this.updateEffectsDisplay();
    }

    // エフェクト情報の表示更新
    updateEffectsDisplay() {
        let effectsText = '';
        this.effects.forEach((value, name) => {
            effectsText += `${name}: ${value}\n`;
        });
        this.effectsElement.textContent = effectsText;
    }

    update(camera, cameraController) {
        this.frameCount++;

        // FPSの表示
        this.fpsElement.textContent = `FPS: ${this.fps}`;

        // カメラ位置の表示（小数点2桁まで）
        const pos = camera.position;
        this.positionElement.textContent = `Position: X:${pos.x.toFixed(2)} Y:${pos.y.toFixed(2)} Z:${pos.z.toFixed(2)}`;

        // カメラの向き（回転）の表示
        // ラジアンから度に変換して表示
        const rotation = {
            x: (cameraController.state.rotationX * 180 / Math.PI) % 360,
            y: (cameraController.state.rotationY * 180 / Math.PI) % 360
        };
        this.rotationElement.textContent = 
            `Rotation: X:${rotation.x.toFixed(2)}° Y:${rotation.y.toFixed(2)}°`;
    }

    // クリーンアップ用のメソッド
    dispose() {
        clearInterval(this.updateInterval);
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}