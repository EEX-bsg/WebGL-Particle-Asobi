class ThreeApp {
    constructor(settings) {
        this.settings = settings;
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
        this.camera.position.z = this.settings.camera.distance;
    }

    setupPostProcessing() {
        this.composer = new THREE.EffectComposer(this.renderer);
        
        const renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        const bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            this.settings.postProcessing.bloom.strength,
            0.4,
            0.85
        );
        this.composer.addPass(bloomPass);

        const afterimagePass = new THREE.AfterimagePass();
        afterimagePass.uniforms['damp'].value = this.settings.postProcessing.motionBlur.strength;
        this.composer.addPass(afterimagePass);

        this.effects = {
            bloom: bloomPass,
            afterimage: afterimagePass
        };
    }

    initSystems() {
        this.particleSystem = new ParticleSystem(this.scene, this.camera);
        this.cameraController = new CameraController(this.camera);
        this.time = 0;

        // 初期設定の適用
        this.updateSettings(this.settings);
    }

    setupEventListeners() {
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }

    updateSettings(settings) {
        this.settings = settings;

        // Post Processing
        if (this.effects) {
            this.effects.bloom.enabled = settings.postProcessing.bloom.enabled;
            this.effects.bloom.strength = settings.postProcessing.bloom.strength;
            this.effects.afterimage.enabled = settings.postProcessing.motionBlur.enabled;
            this.effects.afterimage.uniforms['damp'].value = settings.postProcessing.motionBlur.strength;
        }

        // Camera
        if (this.cameraController) {
            this.cameraController.setAutoRotate(settings.camera.autoRotate);
            this.cameraController.setRotationSpeed(settings.camera.rotationSpeed);
            this.cameraController.setDistance(settings.camera.distance);
        }

        // Particles
        if (this.particleSystem) {
            this.particleSystem.applySettings(settings.particles);
        }
    }

    getStats() {
        return {
            visibleParticles: this.particleSystem.getVisibleParticleCount(),
            totalParticles: this.particleSystem.settings.count,
            avgForce: this.particleSystem.getAverageForce(),
            camera: {
                position: {
                    x: this.camera.position.x,
                    y: this.camera.position.y,
                    z: this.camera.position.z
                },
                rotation: {
                    x: (this.cameraController.state.rotationX * 180 / Math.PI) % 360,
                    y: (this.cameraController.state.rotationY * 180 / Math.PI) % 360
                }
            }
        };
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        this.time += 0.001;
        const blackHoleForce = this.cameraController.update();
        this.particleSystem.update(this.time, blackHoleForce);
        this.particleSystem.updateCameraPosition(this.camera.position);

        if (this.settings.postProcessing.enabled) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    dispose() {
        // Event listener cleanup
        window.removeEventListener('resize', this.handleResize.bind(this));

        // Three.js cleanup
        this.renderer.dispose();
        this.composer.dispose();
        this.particleSystem.dispose();
        this.scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
    }
}class ThreeApp {
    constructor(settings) {
        this.settings = settings;
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
        this.camera.position.z = this.settings.camera.distance;
    }

    setupPostProcessing() {
        this.composer = new THREE.EffectComposer(this.renderer);
        
        const renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        const bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            this.settings.postProcessing.bloom.strength,
            0.4,
            0.85
        );
        this.composer.addPass(bloomPass);

        const afterimagePass = new THREE.AfterimagePass();
        afterimagePass.uniforms['damp'].value = this.settings.postProcessing.motionBlur.strength;
        this.composer.addPass(afterimagePass);

        this.effects = {
            bloom: bloomPass,
            afterimage: afterimagePass
        };
    }

    initSystems() {
        this.particleSystem = new ParticleSystem(this.scene, this.camera);
        this.cameraController = new CameraController(this.camera);
        this.time = 0;

        // 初期設定の適用
        this.updateSettings(this.settings);
    }

    setupEventListeners() {
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }

    updateSettings(settings) {
        this.settings = settings;

        // Post Processing
        if (this.effects) {
            this.effects.bloom.enabled = settings.postProcessing.bloom.enabled;
            this.effects.bloom.strength = settings.postProcessing.bloom.strength;
            this.effects.afterimage.enabled = settings.postProcessing.motionBlur.enabled;
            this.effects.afterimage.uniforms['damp'].value = settings.postProcessing.motionBlur.strength;
        }

        // Camera
        if (this.cameraController) {
            this.cameraController.setAutoRotate(settings.camera.autoRotate);
            this.cameraController.setRotationSpeed(settings.camera.rotationSpeed);
            this.cameraController.setDistance(settings.camera.distance);
        }

        // Particles
        if (this.particleSystem) {
            this.particleSystem.applySettings(settings.particles);
        }
    }

    getStats() {
        return {
            visibleParticles: this.particleSystem.getVisibleParticleCount(),
            totalParticles: this.particleSystem.settings.count,
            avgForce: this.particleSystem.getAverageForce(),
            camera: {
                position: {
                    x: this.camera.position.x,
                    y: this.camera.position.y,
                    z: this.camera.position.z
                },
                rotation: {
                    x: (this.cameraController.state.rotationX * 180 / Math.PI) % 360,
                    y: (this.cameraController.state.rotationY * 180 / Math.PI) % 360
                }
            }
        };
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        this.time += 0.001;
        const blackHoleForce = this.cameraController.update();
        this.particleSystem.update(this.time, blackHoleForce);
        this.particleSystem.updateCameraPosition(this.camera.position);

        if (this.settings.postProcessing.enabled) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    dispose() {
        // Event listener cleanup
        window.removeEventListener('resize', this.handleResize.bind(this));

        // Three.js cleanup
        this.renderer.dispose();
        this.composer.dispose();
        this.particleSystem.dispose();
        this.scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
    }
}