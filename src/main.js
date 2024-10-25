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

    initSystems() {
        this.particleSystem = new ParticleSystem(this.scene, this.camera);
        this.cameraController = new CameraController(this.camera);
        this.statusBar = new StatusBar();
        this.time = 0;
    }

    setupEventListeners() {
        addEventListener('resize', this.handleResize.bind(this));
    }

    handleResize() {
        this.camera.aspect = innerWidth/innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(innerWidth, innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        this.time += 0.001;
        const blackHoleForce = this.cameraController.update();
        this.particleSystem.update(this.time, blackHoleForce);
        this.particleSystem.updateCameraPosition(this.camera.position);
        
        this.statusBar.update(this.camera, this.cameraController);
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.statusBar.dispose();
        // 他のクリーンアップ処理があれば追加
    }
}

// Start the application
const app = new App();

// クリーンアップ用のイベントリスナー
window.addEventListener('unload', () => {
    app.dispose();
});