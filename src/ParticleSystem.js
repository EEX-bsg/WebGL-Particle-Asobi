class ParticleSystem {
    constructor(scene, camera) {
        this.NUM_PARTICLES = 80000;
        this.BOUNDS = 80;
        this.GRID_SIZE = 16;
        this.RESPAWN_RADIUS = 5;
        
        this.scene = scene;
        this.camera = camera;
        this.particles = new Float32Array(this.NUM_PARTICLES * 3);
        this.velocities = new Float32Array(this.NUM_PARTICLES * 3);
        this.forceField = new Float32Array(this.GRID_SIZE ** 3);
        this.time = 0;
        
        this.initParticles();
        this.createParticleSystem();
    }

    initParticles() {
        for(let i = 0; i < this.NUM_PARTICLES * 3; i += 3) {
            this.particles[i] = (Math.random() - 0.5) * this.BOUNDS;
            this.particles[i + 1] = (Math.random() - 0.5) * this.BOUNDS;
            this.particles[i + 2] = (Math.random() - 0.5) * this.BOUNDS;
        }
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
        const geometry = new THREE.BufferGeometry().setAttribute('position', 
            new THREE.BufferAttribute(this.particles, 3));

        this.points = new THREE.Points(geometry, new THREE.ShaderMaterial({
            uniforms: {
                particleTexture: { value: new THREE.CanvasTexture(this.createParticleTexture()) },
                cameraPosition: { value: this.camera.position }
            },
            vertexShader: Shaders.vertex,
            fragmentShader: Shaders.fragment,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        }));

        this.scene.add(this.points);
        this.geometry = geometry;
    }

    update(time, blackHoleForce = 0) {
        this.updateForceField(time);
        this.updateParticles(blackHoleForce);
        this.geometry.attributes.position.needsUpdate = true;
    }

    updateForceField(time) {
        const waveSpeed = 2.0;  // 波の速さ
        const waveAmplitude = 0.2;  // 波の強さ

        for(let i = 0; i < this.GRID_SIZE ** 3; i++) {
            const x = i % this.GRID_SIZE;
            const y = (i / this.GRID_SIZE | 0) % this.GRID_SIZE;
            const z = i / (this.GRID_SIZE * this.GRID_SIZE) | 0;

            // 既存の力場計算
            this.forceField[i] = Math.sin((x/this.GRID_SIZE - 0.5) * 5 + time) * 
                                Math.cos((y/this.GRID_SIZE - 0.5) * 4 + time * 1.3) * 
                                Math.sin((z/this.GRID_SIZE - 0.5) * 3 + time * 0.7) * 0.5;

            // 波打つ効果を追加
            const distanceFromCenter = Math.sqrt(
                Math.pow((x / this.GRID_SIZE) - 0.5, 2) +
                Math.pow((y / this.GRID_SIZE) - 0.5, 2) +
                Math.pow((z / this.GRID_SIZE) - 0.5, 2)
            );

            // 中心からの距離と時間に基づく波の効果
            const wave = Math.sin(distanceFromCenter * 10 - time * waveSpeed) * waveAmplitude;
            this.forceField[i] += wave;
        }
    }

    updateParticles(blackHoleForce) {
        const positionArray = this.geometry.attributes.position.array;
        const boundsSqr = (this.BOUNDS * 1.2) ** 2;  // 範囲判定用の二乗値

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
            v => Math.floor((v / this.BOUNDS + 0.5) * (this.GRID_SIZE-1))
        );

        if(gridPos.every(v => v >= 0 && v < this.GRID_SIZE)) {
            const force = this.forceField[gridPos[0] + gridPos[1] * this.GRID_SIZE + 
                         gridPos[2] * this.GRID_SIZE * this.GRID_SIZE];
            this.velocities[i] += force * 0.01;
            this.velocities[i + 1] += force * 0.01;
            this.velocities[i + 2] += force * 0.008;
        }
    }

    applyBlackHoleEffect(positionArray, i, blackHoleForce) {
        const x = positionArray[i], y = positionArray[i + 1], z = positionArray[i + 2];
        const dist = Math.hypot(x, y, z) / 0.6;
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
            if(Math.abs(positionArray[i + j]) > this.BOUNDS/2) {
                positionArray[i + j] += (Math.random()-0.5) * 10
                positionArray[i + j] *= -0.95;
            }
        }
    }

    updateCameraPosition(cameraPosition) {
        this.points.material.uniforms.cameraPosition.value = cameraPosition;
    }
}