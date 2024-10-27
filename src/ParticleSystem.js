class ParticleSystem {
    constructor(scene, camera, defaultSettings) {
        this.scene = scene;
        this.camera = camera;
        this.settings = {
            count: defaultSettings.count,
            bounds: defaultSettings.bounds,
            size: defaultSettings.size,
            blackHoleRadius: defaultSettings.blackHoleRadius
        };

        this.initializeSystem();
    }

    initializeSystem() {
        this.particles = new Float32Array(this.settings.count * 3);
        this.velocities = new Float32Array(this.settings.count * 3);
        this.gridSize = 16;
        this.forceField = new Float32Array(this.gridSize ** 3);

        this.initParticles();
        this.createParticleSystem();
    }

    initParticles() {
        for(let i = 0; i < this.particles.length; i += 3) {
            this.particles[i] = (Math.random() - 0.5) * this.settings.bounds;
            this.particles[i + 1] = (Math.random() - 0.5) * this.settings.bounds;
            this.particles[i + 2] = (Math.random() - 0.5) * this.settings.bounds;
        }
    }

    applySettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };

        this.particles = new Float32Array(this.settings.count * 3);
        this.velocities = new Float32Array(this.settings.count * 3);
        this.initParticles();
        this.createParticleSystem();

        // // パーティクルサイズの更新
        // if (this.points) {
        //     this.points.material.uniforms.particleSize.value = this.settings.size;
        // }
    }

    createParticleTexture() {
        const textureCanvas = document.createElement('canvas');
        const size = 64;  // テクスチャサイズ
        textureCanvas.width = textureCanvas.height = size;
        const ctx = textureCanvas.getContext('2d');
        
        // キャンバスをクリア
        ctx.clearRect(0, 0, size, size);
        
        // 中心点
        const center = size / 2;
        const mainRadius = size / 4;  // メインの円を小さめに
        const glowRadius = size / 3;  // グロー効果の半径
        
        // グロー効果（外側の淡いグロー）
        const outerGlow = ctx.createRadialGradient(
            center, center, mainRadius * 0.8,  // 内側の開始位置
            center, center, glowRadius         // 外側の終了位置
        );
        outerGlow.addColorStop(0, 'rgba(180, 210, 255, 0.3)');  // グローの開始色
        outerGlow.addColorStop(0.5, 'rgba(140, 180, 255, 0.1)'); // グローの中間色
        outerGlow.addColorStop(1, 'rgba(100, 150, 255, 0)');    // グローの終了色（完全な透明）

        ctx.fillStyle = outerGlow;
        ctx.fillRect(0, 0, size, size);
        
        // 内側のメインの円
        const innerGradient = ctx.createRadialGradient(
            center, center, 0,           // 中心から
            center, center, mainRadius   // メインの円の半径まで
        );
        
        // メインの円のグラデーション
        innerGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');    // 中心は完全な白
        innerGradient.addColorStop(0.6, 'rgba(230, 240, 255, 1)');  // 少し外側は薄い青みがかった白
        innerGradient.addColorStop(0.8, 'rgba(200, 220, 255, 0.8)'); // 端に向かって透明度が上がる
        innerGradient.addColorStop(1, 'rgba(180, 210, 255, 0)');    // 端は完全な透明

        // メインの円を描画
        ctx.beginPath();
        ctx.arc(center, center, mainRadius, 0, Math.PI * 2);
        ctx.fillStyle = innerGradient;
        ctx.fill();
        
        return textureCanvas;
    }

    createParticleSystem() {
        if (this.points) {
            this.scene.remove(this.points);
            this.geometry.dispose();
            this.points.material.dispose();
        }

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.particles, 3));

        this.points = new THREE.Points(
            this.geometry,
            new THREE.ShaderMaterial({
                uniforms: {
                    particleTexture: { value: new THREE.CanvasTexture(this.createParticleTexture()) },
                    particleSize: { value: this.settings.size * 180 }
                },
                vertexShader: CustomShaders.vertex,
                fragmentShader: CustomShaders.fragment,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            })
        );

        this.scene.add(this.points);
    }

    update(time, blackHoleForce) {
        this.lastBlackHoleForce = blackHoleForce;
        this.updateForceField(time);
        this.updateParticles(blackHoleForce);
        this.geometry.attributes.position.needsUpdate = true;
    }

    updateForceField(time) {
        const waveSpeed = 2.0;  // 波の速さ
        const waveAmplitude = 0.2;  // 波の強さ

        for(let i = 0; i < this.gridSize ** 3; i++) {
            const x = i % this.gridSize;
            const y = (i / this.gridSize | 0) % this.gridSize;
            const z = i / (this.gridSize * this.gridSize) | 0;

            // 既存の力場計算
            this.forceField[i] = Math.sin((x/this.gridSize - 0.5) * 5 + time) * 
                                Math.cos((y/this.gridSize - 0.5) * 4 + time * 1.3) * 
                                Math.sin((z/this.gridSize - 0.5) * 3 + time * 0.7) * 0.5;

            // 波打つ効果を追加
            const distanceFromCenter = Math.sqrt(
                Math.pow((x / this.gridSize) - 0.5, 2) +
                Math.pow((y / this.gridSize) - 0.5, 2) +
                Math.pow((z / this.gridSize) - 0.5, 2)
            );

            // 中心からの距離と時間に基づく波の効果
            const wave = Math.sin(distanceFromCenter * 10 - time * waveSpeed) * waveAmplitude;
            this.forceField[i] += wave;
        }
    }

    updateParticles(blackHoleForce) {
        const positionArray = this.geometry.attributes.position.array;
        const boundsSqr = (this.settings.bounds * 1.2) ** 2;  // 範囲判定用の二乗値

        for(let i = 0; i < positionArray.length; i += 3) {
            this.applyForceField(positionArray, i);
            if (blackHoleForce > 0) {
                this.applyBlackHoleEffect(positionArray, i, blackHoleForce);
            }
            this.updatePosition(positionArray, i);

            // 範囲外チェックとリスポーン
            const distanceSqr = 
                positionArray[i] * positionArray[i] + 
                positionArray[i + 1] * positionArray[i + 1] + 
                positionArray[i + 2] * positionArray[i + 2];

            if (distanceSqr > boundsSqr) {
                this.respawnParticle(positionArray, i);
                // 速度もリセット
                this.velocities[i] = 0;
                this.velocities[i + 1] = 0;
                this.velocities[i + 2] = 0;
            }
        }
    }

    respawnParticle(positionArray, index) {
        // 中心付近のランダムな位置にリスポーン
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 2;
        const r = Math.random() * this.RESPAWN_RADIUS;

        positionArray[index] = r * Math.sin(phi) * Math.cos(theta);
        positionArray[index + 1] = r * Math.sin(phi) * Math.sin(theta);
        positionArray[index + 2] = r * Math.cos(phi);
    }

    applyForceField(positionArray, i) {
        const gridPos = positionArray.slice(i, i + 3).map(
            v => Math.floor((v / this.settings.bounds + 0.5) * (this.gridSize-1))
        );

        if(gridPos.every(v => v >= 0 && v < this.gridSize)) {
            const force = this.forceField[gridPos[0] + gridPos[1] * this.gridSize + 
                         gridPos[2] * this.gridSize * this.gridSize];
            this.velocities[i] += force * 0.01;
            this.velocities[i + 1] += force * 0.01;
            this.velocities[i + 2] += force * 0.008;
        }
    }

    applyBlackHoleEffect(positionArray, i, blackHoleForce) {
        const x = positionArray[i], y = positionArray[i + 1], z = positionArray[i + 2];
        const dist = Math.hypot(x, y, z) * this.settings.blackHoleRadius;
        if (dist > 0) {
            const forceMagnitude = blackHoleForce * (1 / (1 + dist * 0.1));
            const angle = Math.atan2(y, x) + 0.1;
            const xForce = -x / dist * forceMagnitude + Math.cos(angle) * forceMagnitude * 0.5;
            const yForce = -y / dist * forceMagnitude + Math.sin(angle) * forceMagnitude * 0.5;
            const zForce = -z / dist * forceMagnitude;

            this.velocities[i] += xForce;
            this.velocities[i + 1] += yForce;
            this.velocities[i + 2] += zForce;
        }
    }

    updatePosition(positionArray, i) {
        for(let j = 0; j < 3; j++) {
            this.velocities[i + j] *= 0.985;
            positionArray[i + j] += this.velocities[i + j];
            if(Math.abs(positionArray[i + j]) > this.settings.bounds/2) {
                positionArray[i + j] += (Math.random()-0.5) * 10
                positionArray[i + j] *= -0.95;
            }
        }
    }

    updateCameraPosition(cameraPosition) {
        this.points.material.uniforms.cameraPosition = cameraPosition;
    }

    getVisibleParticleCount() {
        if (!this.camera || !this.geometry) return 0;

        const frustum = new THREE.Frustum();
        const matrix = new THREE.Matrix4().multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        frustum.setFromProjectionMatrix(matrix);

        let visibleCount = 0;
        const positions = this.geometry.attributes.position.array;
        const tempVector = new THREE.Vector3();

        for (let i = 0; i < positions.length; i += 3) {
            tempVector.set(positions[i], positions[i + 1], positions[i + 2]);
            if (frustum.containsPoint(tempVector)) {
                visibleCount++;
            }
        }

        return visibleCount;
    }

    getAverageForce() {
        if (!this.forceField) return 0;

        let totalForce = 0;
        let count = 0;

        // 通常の力場の平均を計算
        for (let i = 0; i < this.forceField.length; i++) {
            totalForce += Math.abs(this.forceField[i]);
            count++;
        }

        // ブラックホール効果がある場合はその強度も考慮
        if (this.lastBlackHoleForce > 0) {
            totalForce += this.lastBlackHoleForce * 2; // ブラックホール効果に重み付け
            count++;
        }

        return count > 0 ? totalForce / count : 0;
    }

    dispose() {
        if (this.geometry) this.geometry.dispose();
        if (this.points) {
            this.points.material.dispose();
            this.scene.remove(this.points);
        }
    }
}