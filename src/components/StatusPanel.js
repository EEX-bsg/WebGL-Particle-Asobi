// StatusPanel.js
Vue.component('status-panel', {
    props: {
        stats: {
            type: Object,
            required: true
        }
    },
    data() {
        return {
            fps: 0,
            frameCount: 0,
            lastTime: performance.now(),
            startTime: performance.now()
        };
    },
    methods: {
        formatNumber(num) {
            return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
        },
        formatElapsedTime(ms) {
            const seconds = Math.floor((ms / 1000) % 60);
            const minutes = Math.floor((ms / (1000 * 60)) % 60);
            const hours = Math.floor(ms / (1000 * 60 * 60));
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        },
        updateFPS() {
            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastTime;
            this.fps = Math.round((this.frameCount * 1000) / deltaTime);
            this.frameCount = 0;
            this.lastTime = currentTime;
        }
    },
    mounted() {
        // FPS更新用のインターバル設定
        this.fpsInterval = setInterval(() => this.updateFPS(), 1000);
    },
    beforeDestroy() {
        if (this.fpsInterval) {
            clearInterval(this.fpsInterval);
        }
    },
    template: `
        <div class="panel status-panel">
            <div>FPS: {{ fps }}</div>
            <div>Particles: {{ formatNumber(stats.visibleParticles) }}/{{ formatNumber(stats.totalParticles) }}</div>
            <div>Force: {{ stats.avgForce.toFixed(3) }}</div>
            <div>Cam Pos: X:{{ stats.camera.position.x.toFixed(2) }} 
                        Y:{{ stats.camera.position.y.toFixed(2) }} 
                        Z:{{ stats.camera.position.z.toFixed(2) }}</div>
            <div>Cam Rot: X:{{ stats.camera.rotation.x.toFixed(2) }}° 
                        Y:{{ stats.camera.rotation.y.toFixed(2) }}°</div>
            <div>Time: {{ formatElapsedTime(performance.now() - startTime) }}</div>
        </div>
    `
});