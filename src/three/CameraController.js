class CameraController {
    constructor(camera) {
        this.camera = camera;
        this.settings = {
            autoRotate: true,
            rotationSpeed: 1.0,
            baseRadius: 50
        };
        this.state = {
            active: false,
            lastX: 0,
            lastY: 0,
            rotationX: 0,
            rotationY: 0,
            zoom: 1,
            isDragging: false,
            isLongPress: false,
            blackHoleForce: 0,
            mouseButtonPressed: false,
            // 速度計算用の追加プロパティ
            lastPosition: new THREE.Vector3(),
            lastRotationX: 0,
            lastRotationY: 0,
            velocity: new THREE.Vector3(),
            rotationVelocity: 0,
            velocityHistory: new Array(5).fill(0), // 過去5フレームの速度を保持
            smoothVelocity: 0 // 平滑化された速度
        };

        this.isAutoCamera = true;
        this.cameraTime = 0;
        this.autoBaseRotationX = 0;  // 自動カメラの基準となるX回転
        this.autoBaseRotationY = 0;  // 自動カメラの基準となるY回転
        this.autoStartTime = 0;      // 自動カメラ開始時刻
        this.longPressTimeout = null;

        // 初期位置を保存
        this.state.lastPosition.copy(camera.position);
        this.state.lastRotationX = this.state.rotationX;
        this.state.lastRotationY = this.state.rotationY;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const canvas = document.querySelector('canvas');
        
        // タッチイベント
        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // マウスイベント
        canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        canvas.addEventListener('wheel', this.handleWheel.bind(this));
        // コンテキストメニュー（右クリック）を無効化
        canvas.addEventListener('contextmenu', e => e.preventDefault());
        // マウスがキャンバス外に出た時の処理
        canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    }

    setAutoRotate(enabled) {
        this.settings.autoRotate = enabled;
        if (enabled) {
            this.cameraTime = this.state.rotationX / 0.4;
        }
    }

    setRotationSpeed(speed) {
        this.settings.rotationSpeed = speed;
    }

    setDistance(distance) {
        this.settings.baseRadius = distance;
    }

    // タッチ操作のハンドラー
    handleTouchStart(e) {
        this.state.active = true;
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            this.state.pinchDistance = Math.hypot(dx, dy);
            this.state.isDragging = false;
        } else if (e.touches.length === 1) {
            this.state.lastX = e.touches[0].clientX;
            this.state.lastY = e.touches[0].clientY;
            this.state.isDragging = false;
            
            this.startLongPress();
        }
    }

    handleTouchMove(e) {
        if (!this.state.active) return;
        
        if (e.touches.length === 2) {
            this.clearLongPress();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const newDistance = Math.hypot(dx, dy);
            const scale = newDistance / this.state.pinchDistance;
            this.state.zoom = Math.max(0.5, Math.min(2, this.state.zoom * scale));
            this.state.pinchDistance = newDistance;
        } else if (e.touches.length === 1 && !this.state.isLongPress) {
            this.handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    }

    handleTouchEnd() {
        this.endInteraction();
    }

    // マウス操作のハンドラー
    handleMouseDown(e) {
        this.state.mouseButtonPressed = true;
        this.state.lastX = e.clientX;
        this.state.lastY = e.clientY;
        this.state.isDragging = false;
        
        // 右クリックの場合は即座にブラックホール効果を開始
        if (e.button === 2) {
            this.state.isLongPress = true;
        } else {
            this.startLongPress();
        }
    }

    handleMouseMove(e) {
        if (this.state.mouseButtonPressed && !this.state.isLongPress) {
            this.handleDragMove(e.clientX, e.clientY);
        }
    }

    handleMouseUp() {
        this.endInteraction();
    }

    handleMouseLeave() {
        this.endInteraction();
    }

    handleWheel(e) {
        e.preventDefault();
        const zoomDelta = e.deltaY * 0.001;
        this.state.zoom = Math.max(0.5, Math.min(2, this.state.zoom + zoomDelta));
    }

    // 共通の操作ハンドラー
    handleDragMove(currentX, currentY) {
        const dx = currentX - this.state.lastX;
        const dy = currentY - this.state.lastY;
        
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            this.state.isDragging = true;
            this.clearLongPress();
        }
        
        this.state.rotationX += dx * 0.01;
        this.state.rotationY = Math.max(-Math.PI/3, 
            Math.min(Math.PI/3, this.state.rotationY + dy * 0.01));
            
        this.state.lastX = currentX;
        this.state.lastY = currentY;
        this.isAutoCamera = false;
    }

    startLongPress() {
        this.clearLongPress();
        this.longPressTimeout = setTimeout(() => {
            if (!this.state.isDragging) {
                this.state.isLongPress = true;
            }
        }, 500);
    }

    clearLongPress() {
        if (this.longPressTimeout) {
            clearTimeout(this.longPressTimeout);
            this.longPressTimeout = null;
        }
    }

    endInteraction() {
        this.clearLongPress();
        this.state.active = false;
        this.state.mouseButtonPressed = false;
        this.state.isDragging = false;
        this.state.isLongPress = false;
        this.state.blackHoleForce = 0;
        
        // 自動カメラモードに切り替える際の初期化
        if (!this.isAutoCamera) {
            this.isAutoCamera = true;
            this.autoStartTime = this.cameraTime;
            this.autoBaseRotationX = this.state.rotationX;
            this.autoBaseRotationY = this.state.rotationY;
        }
    }

    update() {
        if (this.settings.autoRotate && this.isAutoCamera) {
            this.cameraTime += 0.005 * this.settings.rotationSpeed;
        }

        if (this.state.isLongPress) {
            this.state.blackHoleForce = Math.min(this.state.blackHoleForce + 0.1, 1);
        } else {
            this.state.blackHoleForce *= 0.95;
        }

        const radius = (this.settings.baseRadius +
                      Math.sin(this.cameraTime * 0.3) * 5 +
                      Math.sin(this.cameraTime * 0.5) * 5) * this.state.zoom;
        
        if (!this.settings.autoRotate || !this.isAutoCamera) {
            this.updateManualCamera(radius);
        } else {
            this.updateAutoCamera(radius);
        }

        this.camera.lookAt(0, 0, 0);
        return this.state.blackHoleForce;
    }

    updateManualCamera(radius) {
        const newPosition = new THREE.Vector3(
            Math.sin(this.state.rotationX) * radius * Math.cos(this.state.rotationY),
            Math.sin(this.state.rotationY) * radius,
            Math.cos(this.state.rotationX) * radius * Math.cos(this.state.rotationY)
        );
        this.updateVelocity(newPosition, radius);
        this.camera.position.copy(newPosition);
    }

    updateAutoCamera(radius) {
        // 自動回転の増分を計算
        const timeSinceAutoStart = this.cameraTime - this.autoStartTime;
        const autoRotationX = Math.sin(timeSinceAutoStart * 0.4) * 0.5;  // 回転の振幅を0.5に制限
        const autoRotationY = Math.sin(timeSinceAutoStart * 0.2) * 0.15; // 回転の振幅を0.15に制限

        // 基準の回転値に自動回転の増分を加える
        this.state.rotationX = this.autoBaseRotationX + autoRotationX;
        this.state.rotationY = this.autoBaseRotationY + autoRotationY;

        // カメラ位置の更新
        const newPosition = new THREE.Vector3(
            Math.sin(this.state.rotationX) * radius * Math.cos(this.state.rotationY),
            Math.sin(this.state.rotationY) * radius,
            Math.cos(this.state.rotationX) * radius * Math.cos(this.state.rotationY)
        );
        this.updateVelocity(newPosition, radius);
        this.camera.position.copy(newPosition);
    }

    updateVelocity(newPosition, radius) {
        // 位置の変化量を計算
        this.state.velocity.subVectors(newPosition, this.state.lastPosition);
        const currentVelocity = this.state.velocity.length();

        // 回転の変化量を計算（ラジアン）
        const rotationDelta = Math.abs(
            (this.state.rotationX - this.state.lastRotationX) + 
            (this.state.rotationY - this.state.lastRotationY)
        );

        // 実際の円周上での移動量に変換（回転角 * 半径）
        const rotationVelocity = rotationDelta * radius;

        // 並進速度と回転速度の大きい方を採用
        const totalVelocity = Math.max(currentVelocity, rotationVelocity);

        // 履歴を更新
        this.state.velocityHistory.shift();
        this.state.velocityHistory.push(totalVelocity);

        // 平滑化
        this.state.smoothVelocity = this.state.velocityHistory.reduce((a, b) => a + b) / 
                                   this.state.velocityHistory.length;

        // 現在の状態を保存
        this.state.lastPosition.copy(newPosition);
        this.state.lastRotationX = this.state.rotationX;
        this.state.lastRotationY = this.state.rotationY;
    }

    getVelocity() {
        // より適切な最大速度値（カメラの動きの実測値に基づいて調整）
        const maxVelocity = 2.0;
        return Math.min(this.state.smoothVelocity / maxVelocity, 1.0);
    }
}