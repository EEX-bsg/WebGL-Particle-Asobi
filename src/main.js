class App {
    constructor() {
        // デバイス設定の検出を最初に行う
        this.deviceSettings = new DeviceSettingsDetector().getDefaultSettings();

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.querySelector('canvas'),
            antialias: true
        });

        this.setupRenderer();
        this.setupCamera();
        this.setupPostProcessing();
        this.initSystems();
        this.setupEventListeners();
        // デバイス設定を渡してControlPanelを初期化
        this.controlPanel = new ControlPanel(this, this.deviceSettings);

        // フルスクリーンの状態変更を監視
        // const handleFullscreen = this.handleFullscreenChange.bind(this);
        // document.addEventListener('fullscreenchange', handleFullscreen);
        // document.addEventListener('webkitfullscreenchange', handleFullscreen);
        // document.addEventListener('mozfullscreenchange', handleFullscreen);
        // document.addEventListener('MSFullscreenChange', handleFullscreen);

        this.animate();
    }

     // ControlPanel用のメソッド
    setPostProcessingEnabled(enabled) {
        this.postProcessingEnabled = enabled;
    }

    setupRenderer() {
        this.renderer.setSize(innerWidth, innerHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.8;
    }

    setupCamera() {
        this.camera.position.z = 50;
    }

    setupPostProcessing() {
        // EffectComposerの設定
        this.composer = new THREE.EffectComposer(this.renderer);

        // 基本的なレンダーパス
        const renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloomエフェクトの設定
        const bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5,    // bloom強度
            0.4,    // bloom半径
            0.85    // threshold
        );

        // Bloomパラメータの微調整
        bloomPass.threshold = 0;
        bloomPass.strength = 0.8;
        bloomPass.radius = 1.0;

        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;

        // モーションブラーエフェクト（AfterimagePass）
        const afterimagePass = new THREE.AfterimagePass();
        afterimagePass.uniforms['damp'].value = 0.2;
        this.composer.addPass(afterimagePass);

        // エフェクトの参照を保存
        this.effects = {
            bloom: bloomPass,
            afterimage: afterimagePass
        };

        // ポストプロセッシングの初期状態をデバイス設定から設定
        this.postProcessingEnabled = this.deviceSettings.postProcessing.enabled;
        if (this.bloomPass) {
            this.bloomPass.enabled = this.deviceSettings.postProcessing.bloom.enabled;
            this.bloomPass.strength = this.deviceSettings.postProcessing.bloom.strength;
        }
        if (afterimagePass) {
            afterimagePass.enabled = this.deviceSettings.postProcessing.motionBlur.enabled;
            afterimagePass.uniforms['damp'].value = this.deviceSettings.postProcessing.motionBlur.strength;
        }
    }

    initSystems() {
        this.particleSystem = new ParticleSystem(this.scene, this.camera, this.deviceSettings.particles)
        this.cameraController = new CameraController(this.camera);
        this.StatusPanel = new StatusPanel();
        this.time = 0;
    }

    setupEventListeners() {
        addEventListener('resize', this.handleResize.bind(this));
    }

    updateEffects() {
        // パーティクルの速度や動きに応じてエフェクトを動的に調整
        const velocity = this.cameraController.getVelocity();
        const baseAfterimage = 0.6;
        const maxAdditional = 0.05;

        // 速度に応じて残像の強度を調整
        this.effects.afterimage.uniforms['damp'].value = 
            Math.min(0.98, baseAfterimage + velocity * maxAdditional);
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }

    handleFullscreenChange() {
        const isFullscreen =    document.fullscreenElement !== null ||
                                document.webkitFullscreenElement !== null ||
                                document.mozFullScreenElement !== null ||
                                document.msFullscreenElement !== null;

        // ControlPanelの設定とチェックボックスを更新
        if (this.controlPanel) {
            this.controlPanel.updateFullscreenState(isFullscreen);
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        this.time += 0.001;
        const blackHoleForce = this.cameraController.update();
        this.particleSystem.update(this.time, blackHoleForce);
        this.particleSystem.updateCameraPosition(this.camera.position);

        this.updateEffects();
        this.StatusPanel.update(this.camera, this.cameraController, this.particleSystem);

        // レンダリング
        if (this.postProcessingEnabled) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    dispose() {
        this.StatusPanel.dispose();
        if (this.composer) {
            this.composer.dispose();
        }
    }
}

// Start the application
const app = new App();

// クリーンアップ用のイベントリスナー
window.addEventListener('unload', () => {
    app.dispose();
});