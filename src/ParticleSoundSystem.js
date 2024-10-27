class ParticleSoundSystem {
    constructor(camera, particleSystem) {
        this.camera = camera;
        this.particleSystem = particleSystem;
        this.settings = {
            enabled: true,
            maxSources: 200,      // デフォルトの音源数を200に
            distance: 20,         // 音が聞こえる距離
            volume: 0.15,         // 全体音量（小さめに）
            decayRate: 0.95,      // 音の減衰率
            minPitch: 80,         // 最低周波数（低めに）
            maxPitch: 400,        // 最高周波数
            velocityPitchFactor: 0.5  // 速度によるピッチ変調の強さ
        };

        this.isInitialized = false;
        this.activeSources = new Map();
        this.lastUpdate = Date.now();
        this.lastCameraPosition = new THREE.Vector3();
        this.cameraVelocity = new THREE.Vector3();

        // インタラクションハンドラーの設定
        this.setupInteractionHandlers();
    }

    setupInteractionHandlers() {
        const initEvents = ['click', 'touchstart', 'keydown'];
        const initHandler = () => {
            if (!this.isInitialized) {
                this.initAudioContext();
                initEvents.forEach(event => {
                    document.removeEventListener(event, initHandler);
                });
            }
        };

        initEvents.forEach(event => {
            document.addEventListener(event, initHandler);
        });
    }

    async initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.settings.volume;
            this.masterGain.connect(this.audioContext.destination);
            this.isInitialized = true;

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
            this.isInitialized = false;
        }
    }

    createNoiseBuffer() {
        const bufferSize = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // ブラウンノイズの生成
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const brownNoise = (lastOut + (Math.random() * 2 - 1) * 0.02) / 1.02;
            data[i] = brownNoise;
            lastOut = brownNoise;
        }

        return buffer;
    }

    createSound(particleDistance, relativeVelocity) {
        const bufferSource = this.audioContext.createBufferSource();
        bufferSource.buffer = this.createNoiseBuffer();
        bufferSource.loop = true;

        // フィルター設定
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        const baseFreq = this.settings.minPitch + 
            (this.settings.maxPitch - this.settings.minPitch) * 
            (1 - particleDistance / this.settings.distance);
        // 相対速度によるピッチ変調
        const velocityPitch = baseFreq * (1 + relativeVelocity * this.settings.velocityPitchFactor);
        filter.frequency.value = velocityPitch;

        // ゲイン設定
        const gainNode = this.audioContext.createGain();
        const distanceFactor = Math.max(0, 1 - (particleDistance / this.settings.distance));
        const volume = Math.pow(distanceFactor, 2) * this.settings.volume * 0.05; // 音量を小さく
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

        // エフェクトチェーンの接続
        bufferSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        return {
            source: bufferSource,
            filter: filter,
            gainNode: gainNode,
            startTime: Date.now()
        };
    }

    findNearestParticles() {
        const positions = this.particleSystem.geometry.attributes.position.array;
        const particleDistances = [];

        // カメラ速度の計算
        const currentCameraPos = this.camera.position.clone();
        this.cameraVelocity.subVectors(currentCameraPos, this.lastCameraPosition);
        this.lastCameraPosition.copy(currentCameraPos);

        for (let i = 0; i < positions.length; i += 3) {
            const dx = positions[i] - this.camera.position.x;
            const dy = positions[i + 1] - this.camera.position.y;
            const dz = positions[i + 2] - this.camera.position.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (distance < this.settings.distance) {
                // パーティクルの相対速度を計算
                const particleVelocity = new THREE.Vector3(
                    positions[i] - (positions[i] || 0),
                    positions[i + 1] - (positions[i + 1] || 0),
                    positions[i + 2] - (positions[i + 2] || 0)
                );
                const relativeVelocity = this.cameraVelocity.clone()
                    .sub(particleVelocity).length();

                particleDistances.push({
                    index: i,
                    distance: distance,
                    relativeVelocity: relativeVelocity
                });
            }
        }

        // 近いパーティクルは確実に、遠いパーティクルはランダムに選択
        const nearThreshold = this.settings.distance * 0.3; // 30%以内を「近い」と定義
        const nearParticles = particleDistances.filter(p => p.distance < nearThreshold);
        const farParticles = particleDistances.filter(p => p.distance >= nearThreshold)
            .sort(() => Math.random() - 0.5); // ランダムにシャッフル

        // 残りのスロットで遠いパーティクルをランダムに選択
        const remainingSlots = this.settings.maxSources - nearParticles.length;
        return [...nearParticles, ...farParticles.slice(0, remainingSlots)]
            .sort((a, b) => a.distance - b.distance);
    }

    update() {
        if (!this.isInitialized || !this.settings.enabled) {
            this.stopAllSounds();
            return;
        }

        try {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
                return;
            }

            const now = Date.now();
            const nearestParticles = this.findNearestParticles();
            const currentParticles = new Set(nearestParticles.map(p => p.index));

            // 範囲外になったサウンドを停止
            for (const [index, sound] of this.activeSources.entries()) {
                if (!currentParticles.has(index)) {
                    this.stopSound(index);
                }
            }

            // 新しいパーティクルの音を開始
            for (const particle of nearestParticles) {
                if (!this.activeSources.has(particle.index)) {
                    const sound = this.createSound(particle.distance, particle.relativeVelocity);
                    sound.source.start();
                    this.activeSources.set(particle.index, sound);
                } else {
                    // 既存の音源の更新
                    const sound = this.activeSources.get(particle.index);
                    const distanceFactor = Math.max(0, 1 - (particle.distance / this.settings.distance));
                    const volume = Math.pow(distanceFactor, 2) * this.settings.volume * 0.05;
                    sound.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

                    // ピッチの更新
                    const baseFreq = this.settings.minPitch + 
                        (this.settings.maxPitch - this.settings.minPitch) * 
                        (1 - particle.distance / this.settings.distance);
                    const velocityPitch = baseFreq * (1 + particle.relativeVelocity * this.settings.velocityPitchFactor);
                    sound.filter.frequency.setValueAtTime(velocityPitch, this.audioContext.currentTime);
                }
            }

            this.lastUpdate = now;
        } catch (error) {
            console.error('Error in sound update:', error);
        }
    }

    stopSound(index) {
        const sound = this.activeSources.get(index);
        if (sound) {
            try {
                sound.source.stop();
                sound.source.disconnect();
                sound.filter.disconnect();
                sound.gainNode.disconnect();
            } catch (error) {
                console.error('Error stopping sound:', error);
            }
            this.activeSources.delete(index);
        }
    }

    stopAllSounds() {
        for (const [index] of this.activeSources) {
            this.stopSound(index);
        }
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        if (!newSettings.enabled) {
            this.stopAllSounds();
        }
        if (this.isInitialized && this.masterGain) {
            this.masterGain.gain.setValueAtTime(
                this.settings.volume,
                this.audioContext.currentTime
            );
        }
        
        if (this.activeSources.size > this.settings.maxSources) {
            const toRemove = Array.from(this.activeSources.keys())
                .slice(this.settings.maxSources);
            toRemove.forEach(index => this.stopSound(index));
        }
    }

    dispose() {
        this.stopAllSounds();
        if (this.isInitialized && this.audioContext && 
            this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}