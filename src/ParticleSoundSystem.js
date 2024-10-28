class ParticleSoundSystem {
    constructor(camera, particleSystem, fpsMonitor) {
        this.camera = camera;
        this.particleSystem = particleSystem;
        this.fpsMonitor = fpsMonitor;
        this.settings = {
            enabled: false,
            maxSources: 200,
            distance: 20,
            volume: 0.5,
            decayRate: 0.95,
            minPitch: 80,
            maxPitch: 400,
            velocityPitchFactor: 0.5,
            fpsThreshold: 10,
            gridDivisions: 8
        };

        this.isInitialized = false;
        this.soundPool = null; // Map<soundId, SoundObject>
        this.particleSoundMap = new Map(); // Map<particleIndex, soundId>
        this.lastCameraPosition = new THREE.Vector3();
        this.cameraVelocity = new THREE.Vector3();
        this.baselineFps = 60;
        
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

            // 音源プールの初期化
            if (!this.soundPool) {
                this.soundPool = new Map();
                await this.initializeSoundPool();
            }

            this.isInitialized = true;

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
            this.isInitialized = false;
        }
    }

    async initializeSoundPool() {
        // 設定された最大数の音源を事前に作成
        for (let i = 0; i < this.settings.maxSources; i++) {
            const sound = await this.createPooledSound();
            this.soundPool.set(i, sound);
        }
    }

    async createPooledSound() {
        const baseTone = this.audioContext.createBufferSource();
        const highTone = this.audioContext.createBufferSource();
        baseTone.buffer = await this.createNoiseBuffer();
        highTone.buffer = await this.createHighToneBuffer();
        baseTone.loop = true;
        highTone.loop = true;
    
        // ベース音用のフィルター
        const baseFilter = this.audioContext.createBiquadFilter();
        baseFilter.type = 'lowpass';
        baseFilter.frequency.value = 200;  // 初期値を低めに
        baseFilter.Q.value = 0.5;          // なだらかなカットオフ
    
        // 高音用のフィルター（二段階）
        const highFilter1 = this.audioContext.createBiquadFilter();
        highFilter1.type = 'bandpass';
        highFilter1.frequency.value = 600;  // 初期値を中域に
        highFilter1.Q.value = 1.0;
    
        const highFilter2 = this.audioContext.createBiquadFilter();
        highFilter2.type = 'peaking';
        highFilter2.frequency.value = 800;
        highFilter2.Q.value = 0.5;
        highFilter2.gain.value = 2.0;  // ブースト量を控えめに
    
        const baseGain = this.audioContext.createGain();
        const highGain = this.audioContext.createGain();
        baseGain.gain.value = 0;
        highGain.gain.value = 0;
    
        // エフェクトチェーンの接続
        baseTone.connect(baseFilter);
        baseFilter.connect(baseGain);
        baseGain.connect(this.masterGain);
    
        highTone.connect(highFilter1);
        highFilter1.connect(highFilter2);
        highFilter2.connect(highGain);
        highGain.connect(this.masterGain);
    
        return {
            baseTone,
            highTone,
            baseFilter,
            highFilter1,
            highFilter2,
            baseGain,
            highGain,
            isActive: false,
            particleIndex: null
        };
    }

    async createNoiseBuffer() {
        const bufferSize = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const brownNoise = (lastOut + (Math.random() * 2 - 1) * 0.02) / 1.02;
            data[i] = brownNoise;
            lastOut = brownNoise;
        }

        return buffer;
    }

    async createHighToneBuffer() {
        const bufferSize = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
    
        // より複雑なノイズベースの音を生成
        let lastOut = 0;
        let lastOut2 = 0;
        const pinkNoiseFactor = 0.04; // ピンクノイズの強さ
        const brownNoiseFactor = 0.02; // ブラウンノイズの強さ
    
        for (let i = 0; i < bufferSize; i++) {
            // ホワイトノイズ成分
            const whiteNoise = Math.random() * 2 - 1;
            
            // ブラウンノイズ成分（より低い周波数）
            const brownNoise = (lastOut + (whiteNoise * brownNoiseFactor)) / 1.02;
            lastOut = brownNoise;
    
            // ピンクノイズ成分（1/fノイズ - より中域の周波数）
            const pinkNoise = (lastOut2 + (whiteNoise * pinkNoiseFactor)) / 1.01;
            lastOut2 = pinkNoise;
    
            // 3つの成分を組み合わせる（ピンクノイズをメインに）
            data[i] = pinkNoise * 0.7 + // メインとなる中域成分
                     whiteNoise * 0.2 + // 高域のテクスチャ
                     brownNoise * 0.1;  // 低域の厚み
        }
    
        return buffer;
    }
    

    getAvailableSound() {
        // 未使用の音源を探す
        for (const [id, sound] of this.soundPool.entries()) {
            if (!sound.isActive) {
                return { id, sound };
            }
        }
        return null;
    }

    async update() {
        if(this.soundPool === null) return
        if (!this.isInitialized || !this.settings.enabled) {
            this.deactivateAllSounds();
            return;
        }

        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                return;
            }

            // カメラの位置と速度を更新
            const currentCameraPos = this.camera.position.clone();
            this.cameraVelocity.subVectors(currentCameraPos, this.lastCameraPosition);
            this.lastCameraPosition.copy(currentCameraPos);

            // 範囲内のパーティクルを検出
            const nearbyParticles = this.findNearbyParticles();
            
            // FPSチェック
            const currentFps = this.fpsMonitor.getFPS();
            const fpsDrop = this.baselineFps - currentFps;
            const canAddNewSounds = fpsDrop <= this.settings.fpsThreshold;

            // 既存の音源の更新または無効化
            this.updateActiveSounds(nearbyParticles);

            // 新しいパーティクルへの音源割り当て（FPS低下時は行わない）
            if (canAddNewSounds) {
                this.assignNewSounds(nearbyParticles);
            }

        } catch (error) {
            console.error('Error in sound update:', error);
        }
    }

    findNearbyParticles() {
        const positions = this.particleSystem.geometry.attributes.position.array;
        const nearbyParticles = [];
        const cameraPos = this.camera.position;
    
        // カメラ速度の計算
        const currentCameraPos = cameraPos.clone();
        this.cameraVelocity.subVectors(currentCameraPos, this.lastCameraPosition);
        const velocity = Math.min(this.cameraVelocity.length(), 10); // 速度を制限
        this.lastCameraPosition.copy(currentCameraPos);
    
        for (let i = 0; i < positions.length; i += 3) {
            const dx = positions[i] - cameraPos.x;
            const dy = positions[i + 1] - cameraPos.y;
            const dz = positions[i + 2] - cameraPos.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
            if (distance < this.settings.distance) {
                nearbyParticles.push({
                    index: i,
                    distance: distance,
                    relativeVelocity: velocity,
                    position: new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2])
                });
            }
        }
    
        return nearbyParticles.sort((a, b) => a.distance - b.distance);
    }

    updateActiveSounds(nearbyParticles) {
        const validParticleIndices = new Set(nearbyParticles.map(p => p.index));

        // 既存の音源の更新または無効化
        for (const [particleIndex, soundId] of this.particleSoundMap.entries()) {
            const sound = this.soundPool.get(soundId);
            if (!validParticleIndices.has(particleIndex)) {
                // 範囲外のパーティクルの音源を無効化
                this.deactivateSound(soundId, particleIndex);
            } else {
                // 範囲内のパーティクルの音源を更新
                const particle = nearbyParticles.find(p => p.index === particleIndex);
                if (particle) {
                    this.updateSoundParameters(sound, particle);
                }
            }
        }
    }

    assignNewSounds(nearbyParticles) {
        for (const particle of nearbyParticles) {
            // 既に音源が割り当てられているパーティクルはスキップ
            if (this.particleSoundMap.has(particle.index)) continue;

            // 利用可能な音源を取得
            const available = this.getAvailableSound();
            if (!available) break; // 利用可能な音源がない場合は終了

            // 音源をパーティクルに割り当て
            const { id, sound } = available;
            sound.isActive = true;
            sound.particleIndex = particle.index;
            this.particleSoundMap.set(particle.index, id);

            // 音源パラメータの更新
            this.updateSoundParameters(sound, particle);
        }
    }

    updateSoundParameters(sound, particle) {
        const { distance, relativeVelocity } = particle;
        const maxDistance = this.settings.distance;
        const safeDistance = Math.max(0, Math.min(distance, maxDistance));
        const safeVelocity = Math.min(Math.max(relativeVelocity, 0), 10);
    
        // 基本的な距離係数（0-1の範囲）
        const distanceFactor = 1 - (safeDistance / maxDistance);
        
        try {
            // ベース音の音量制御（シンプルに）
            const baseVolume = distanceFactor * 0.2;  // 最大音量を0.2に
            sound.baseGain.gain.setValueAtTime(
                baseVolume,
                this.audioContext.currentTime
            );
    
            // 高音の音量制御
            // 近距離での急激な変化のためのカーブ
            const proximityFactor = Math.pow(distanceFactor, 2);
            // 速度による音量増幅（控えめに）
            const velocityFactor = 1 + (safeVelocity * 0.1);
            const highVolume = proximityFactor * 0.15 * velocityFactor;  // 最大音量を0.15に
    
            sound.highGain.gain.setValueAtTime(
                highVolume,
                this.audioContext.currentTime
            );
    
            // ベース音のピッチ制御
            const basePitch = this.settings.minPitch + 
                (this.settings.maxPitch - this.settings.minPitch) * distanceFactor;
            const baseVelocityPitch = basePitch * (1 + safeVelocity * 0.1);
            
            sound.baseFilter.frequency.setValueAtTime(
                baseVelocityPitch,
                this.audioContext.currentTime
            );
    
            // 高音のピッチ制御
            const highBasePitch = 400 + (600 * distanceFactor);  // 400-1000Hzの範囲
            const highVelocityPitch = highBasePitch * (1 + safeVelocity * 0.2);
            
            sound.highFilter1.frequency.setValueAtTime(
                highVelocityPitch,
                this.audioContext.currentTime
            );
            sound.highFilter2.frequency.setValueAtTime(
                highVelocityPitch * 1.2,
                this.audioContext.currentTime
            );
    
            // フィルターのQ値も距離に応じて変更
            const qValue = 1 + (distanceFactor * 2);  // 1-3の範囲
            sound.highFilter1.Q.setValueAtTime(
                qValue,
                this.audioContext.currentTime
            );
            sound.highFilter2.Q.setValueAtTime(
                qValue * 0.5,
                this.audioContext.currentTime
            );
    
        } catch (error) {
            console.error('Error updating sound parameters:', error, {
                distance,
                relativeVelocity,
                distanceFactor
            });
        }
    }

    deactivateSound(soundId, particleIndex) {
        const sound = this.soundPool.get(soundId);
        if (sound) {
            sound.baseGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            sound.highGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            sound.isActive = false;
            sound.particleIndex = null;
        }
        this.particleSoundMap.delete(particleIndex);
    }

    deactivateAllSounds() {
        for (const [soundId, sound] of this.soundPool.entries()) {
            if (sound.isActive) {
                this.deactivateSound(soundId, sound.particleIndex);
            }
        }
        this.particleSoundMap.clear();
    }

    getActiveSoundCount() {
        return this.particleSoundMap.size;
    }

    async updateSettings(newSettings) {
        const oldMaxSources = this.settings.maxSources;
        this.settings = { ...this.settings, ...newSettings };

        if (!this.isInitialized) {
            return; // 初期化前は設定の更新のみ
        }

        // 有効/無効の切り替え
        if (!newSettings.enabled) {
            this.deactivateAllSounds();
        }

        // マスターボリュームの更新
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(
                this.settings.volume,
                this.audioContext.currentTime
            );
        }

        // 音源数が減少した場合の処理
        if (newSettings.maxSources < oldMaxSources) {
            await this.adjustSoundPoolSize();
        }
        // 音源数が増加した場合の処理
        else if (newSettings.maxSources > oldMaxSources) {
            await this.expandSoundPool();
        }
    }

    async expandSoundPool() {
        const currentSize = this.soundPool.size;
        for (let i = currentSize; i < this.settings.maxSources; i++) {
            const sound = await this.createPooledSound();
            this.soundPool.set(i, sound);
        }
    }

    async adjustSoundPoolSize() {
        // アクティブな音源をソート（距離が近い順）
        const activeSounds = Array.from(this.particleSoundMap.entries())
            .map(([particleIndex, soundId]) => {
                const sound = this.soundPool.get(soundId);
                const particle = this.findParticle(particleIndex);
                return {
                    particleIndex,
                    soundId,
                    distance: particle ? particle.distance : Infinity
                };
            })
            .sort((a, b) => a.distance - b.distance);

        // 超過分の音源を削除
        if (activeSounds.length > this.settings.maxSources) {
            // 遠い順に削除
            for (let i = this.settings.maxSources; i < activeSounds.length; i++) {
                const { soundId, particleIndex } = activeSounds[i];
                this.deactivateSound(soundId, particleIndex);
            }
        }

        // 未使用の音源をプールから削除
        for (const [id, sound] of this.soundPool.entries()) {
            if (id >= this.settings.maxSources) {
                if (sound.source) {
                    sound.source.stop();
                    sound.source.disconnect();
                }
                if (sound.filter) sound.filter.disconnect();
                if (sound.gainNode) sound.gainNode.disconnect();
                this.soundPool.delete(id);
            }
        }
    }

    findParticle(particleIndex) {
        if (!this.particleSystem.geometry) return null;
        
        const positions = this.particleSystem.geometry.attributes.position.array;
        const x = positions[particleIndex];
        const y = positions[particleIndex + 1];
        const z = positions[particleIndex + 2];
        
        const dx = x - this.camera.position.x;
        const dy = y - this.camera.position.y;
        const dz = z - this.camera.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        return { index: particleIndex, distance };
    }

    setFPSMonitor(fpsMonitor) {
        this.fpsMonitor = fpsMonitor;
        // 初期FPSを基準として設定
        this.baselineFps = fpsMonitor.getFPS() || 60;
    }

    getActiveSoundCount() {
        let count = 0;
        for (const sound of this.soundPool.values()) {
            if (sound.isActive) {
                count++;
            }
        }
        return count;
    }

    dispose() {
        this.deactivateAllSounds();
        for (const sound of this.soundPool.values()) {
            if (sound.baseTone) {
                sound.baseTone.stop();
                sound.baseTone.disconnect();
            }
            if (sound.highTone) {
                sound.highTone.stop();
                sound.highTone.disconnect();
            }
            if (sound.baseFilter) sound.baseFilter.disconnect();
            if (sound.highFilter) sound.highFilter.disconnect();
            if (sound.baseGain) sound.baseGain.disconnect();
            if (sound.highGain) sound.highGain.disconnect();
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}