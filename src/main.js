new Vue({
    el: '#app',
    data: {
        settings: {
            display: {
                showStatusBar: true
            },
            postProcessing: {
                enabled: true,
                bloom: {
                    enabled: true,
                    strength: 0.8
                },
                motionBlur: {
                    enabled: true,
                    strength: 0.92
                }
            },
            particles: {
                count: 60000,
                bounds: 80,
                size: 1.0
            },
            camera: {
                autoRotate: true,
                rotationSpeed: 1.0,
                distance: 50
            }
        },
        stats: {
            fps: 0,
            visibleParticles: 0,
            totalParticles: 60000,
            avgForce: 0,
            camera: {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0 }
            }
        },
        threeApp: null
    },
    methods: {
        updateSettings(newSettings) {
            this.settings = newSettings;
            if (this.threeApp) {
                this.threeApp.updateSettings(newSettings);
            }
        },
        updateStats() {
            if (!this.threeApp) return;

            const stats = this.threeApp.getStats();
            this.stats = { ...this.stats, ...stats };
        }
    },
    mounted() {
        // Three.jsアプリケーションの初期化
        this.threeApp = new ThreeApp(this.settings);

        // statsの更新を開始
        const animate = () => {
            this.updateStats();
            requestAnimationFrame(animate);
        };
        animate();
    },
    beforeDestroy() {
        if (this.threeApp) {
            this.threeApp.dispose();
        }
    }
});