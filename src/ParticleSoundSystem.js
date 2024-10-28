class ParticleSoundSystem {
    constructor(camera, particleSystem) {
        this.camera = camera;
        this.particleSystem = particleSystem;
        this.fpsMonitor = null
        this.settings = {
            enabled: false,
            maxSources: 200,      // デフォルトの音源数を200に
            distance: 20,         // 音が聞こえる距離
            volume: 1.0,         // 全体音量（小さめに）
            decayRate: 0.95,      // 音の減衰率
            minPitch: 80,         // 最低周波数（低めに）
            maxPitch: 400,        // 最高周波数
            velocityPitchFactor: 0.5,  // 速度によるピッチ変調の強さ
            fpsThreshold: 20,     // FPS低下の許容値
            gridDivisions: 8      // 空間分割のグリッドサイズ
        };

        this.isInitialized = false;
        this.activeSources = new Map();
        this.lastUpdate = Date.now();
        this.lastCameraPosition = new THREE.Vector3();
        this.cameraVelocity = new THREE.Vector3();
        this.baselineFps = 60;   // 基準FPS
        this.particleSelectionPromise = null;
        this.spatialGrid = new Map(); // 空間分割用のグリッド

        // インタラクションハンドラーの設定
        this.setupInteractionHandlers();
    }

    // 空間グリッドの更新（非同期）
    async updateSpatialGrid() {
        return new Promise(resolve => {
            const positions = this.particleSystem.geometry.attributes.position.array;
            const gridSize = this.settings.gridDivisions;
            const newGrid = new Map();
            
            // グリッドセルサイズの計算
            const bounds = this.particleSystem.settings.bounds;
            const cellSize = (bounds * 2) / gridSize;

            // 100ms以内の処理を保証するためのチャンクサイズ
            const chunkSize = 1000;
            let currentIndex = 0;

            const processChunk = () => {
                const endIndex = Math.min(currentIndex + chunkSize, positions.length);
                
                for (let i = currentIndex; i < endIndex; i += 3) {
                    // グリッド座標の計算
                    const gridX = Math.floor((positions[i] + bounds) / cellSize);
                    const gridY = Math.floor((positions[i + 1] + bounds) / cellSize);
                    const gridZ = Math.floor((positions[i + 2] + bounds) / cellSize);
                    
                    const key = `${gridX},${gridY},${gridZ}`;
                    if (!newGrid.has(key)) {
                        newGrid.set(key, []);
                    }
                    newGrid.get(key).push({
                        index: i,
                        position: new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2])
                    });
                }

                currentIndex = endIndex;
                
                if (currentIndex < positions.length) {
                    setTimeout(processChunk, 0);
                } else {
                    this.spatialGrid = newGrid;
                    resolve();
                }
            };

            processChunk();
        });
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

    async findNearestParticles() {
        if (!this.spatialGrid || this.spatialGrid.size === 0) {
            await this.updateSpatialGrid();
        }
    
        return new Promise(resolve => {
            const candidateParticles = [];
            const cameraPos = this.camera.position;
            const bounds = this.particleSystem.settings.bounds;
            const cellSize = (bounds * 2) / this.settings.gridDivisions;
    
            // カメラの周囲のグリッドセルを確認
            const gridX = Math.floor((cameraPos.x + bounds) / cellSize);
            const gridY = Math.floor((cameraPos.y + bounds) / cellSize);
            const gridZ = Math.floor((cameraPos.z + bounds) / cellSize);
    
            // カメラ速度の計算
            const currentCameraPos = cameraPos.clone();
            this.cameraVelocity.subVectors(currentCameraPos, this.lastCameraPosition);
            this.lastCameraPosition.copy(currentCameraPos);
    
            // 周囲のグリッドセルを探索
            const searchRadius = Math.ceil(this.settings.distance / cellSize);
            
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                for (let dy = -searchRadius; dy <= searchRadius; dy++) {
                    for (let dz = -searchRadius; dz <= searchRadius; dz++) {
                        const key = `${gridX + dx},${gridY + dy},${gridZ + dz}`;
                        const cellParticles = this.spatialGrid.get(key);
                        
                        if (cellParticles) {
                            for (const particle of cellParticles) {
                                const distance = particle.position.distanceTo(cameraPos);
                                if (distance < this.settings.distance) {
                                    const relativeVelocity = this.cameraVelocity.length();
                                    candidateParticles.push({
                                        index: particle.index,
                                        distance: distance,
                                        relativeVelocity: relativeVelocity
                                    });
                                }
                            }
                        }
                    }
                }
            }
    
            // FPSチェックによる音源追加制御
            const currentFps = this.fpsMonitor.getFPS();
            const fpsDrop = this.baselineFps - currentFps;
            const currentSoundCount = this.activeSources.size;
    
            let result;
            if (fpsDrop > this.settings.fpsThreshold) {
                // FPSが低下している場合、現在の音源数を維持
                // 既存の音源のインデックスを取得
                const existingIndices = Array.from(this.activeSources.keys());
                // 既存の音源に対応するパーティクルのみを選択
                result = candidateParticles
                    .filter(p => existingIndices.includes(p.index))
                    .sort((a, b) => a.distance - b.distance);
            } else {
                // FPSが正常な場合、通常の選択処理を実行
                const nearThreshold = this.settings.distance * 0.3;
                const nearParticles = candidateParticles
                    .filter(p => p.distance < nearThreshold)
                    .sort((a, b) => a.distance - b.distance);
    
                const farParticles = candidateParticles
                    .filter(p => p.distance >= nearThreshold)
                    .sort(() => Math.random() - 0.5);
    
                result = [...nearParticles, ...farParticles]
                    .slice(0, this.settings.maxSources);
            }
    
            resolve(result);
        });
    }

    async update() {
        if (!this.isInitialized || !this.settings.enabled) {
            this.stopAllSounds();
            return;
        }

        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                return;
            }

            // 非同期でパーティクル選択を実行
            if (!this.particleSelectionPromise) {
                this.particleSelectionPromise = this.findNearestParticles();
            }

            const nearestParticles = await this.particleSelectionPromise;
            this.particleSelectionPromise = null; // 次のフレームの準備

            const currentParticles = new Set(nearestParticles.map(p => p.index));

            // 範囲外の音源を停止
            for (const [index, sound] of this.activeSources.entries()) {
                if (!currentParticles.has(index)) {
                    this.stopSound(index);
                }
            }

            // 音源の更新と作成
            for (const particle of nearestParticles) {
                if (!this.activeSources.has(particle.index)) {
                    const sound = this.createSound(particle.distance, particle.relativeVelocity);
                    sound.source.start();
                    this.activeSources.set(particle.index, sound);
                } else {
                    this.updateExistingSound(particle);
                }
            }

        } catch (error) {
            console.error('Error in sound update:', error);
            this.particleSelectionPromise = null;
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

    setFPSMonitor(fpsMonitor) {
        this.fpsMonitor = fpsMonitor;
        // 初期FPSを基準として設定
        this.baselineFps = fpsMonitor.getFPS() || 60;
    }

    getActiveSoundCount() {
        return this.activeSources.size;
    }

    dispose() {
        this.stopAllSounds();
        if (this.isInitialized && this.audioContext && 
            this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}