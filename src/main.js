class App {
    constructor() {
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
        this.animate();
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
        bloomPass.strength = 1.3;
        bloomPass.radius = 1.0;

        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;

        // モーションブラーエフェクト（AfterimagePass）
        const afterimagePass = new THREE.AfterimagePass();
        afterimagePass.uniforms['damp'].value = 0.1; // 残像の減衰率（0.9-0.98: 大きいほど残像が長く残る）
        this.composer.addPass(afterimagePass);
        this.afterimagePass = afterimagePass;

        // エフェクトの強度を動的に調整できるように保存
        this.effects = {
            bloom: bloomPass,
            afterimage: afterimagePass
        };
    }

    initSystems() {
        this.particleSystem = new ParticleSystem(this.scene, this.camera)
        this.cameraController = new CameraController(this.camera);
        this.statusBar = new StatusBar();
        this.time = 0;

        // ステータスバーに効果の強度情報を追加
        this.statusBar.addEffect('Bloom', this.effects.bloom.strength);
        this.statusBar.addEffect('Motion Blur', this.effects.afterimage.uniforms['damp'].value);
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

        // ステータスバーの更新
        this.statusBar.updateEffect('Motion Blur', 
            this.effects.afterimage.uniforms['damp'].value.toFixed(3));
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        this.time += 0.001;
        const blackHoleForce = this.cameraController.update();
        this.particleSystem.update(this.time, blackHoleForce);
        this.particleSystem.updateCameraPosition(this.camera.position);

        this.updateEffects();
        this.statusBar.update(this.camera, this.cameraController);

        // レンダリングをcomposerに変更
        this.composer.render();
    }

    dispose() {
        this.statusBar.dispose();
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