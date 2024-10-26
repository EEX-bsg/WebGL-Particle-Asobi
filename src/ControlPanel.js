class ControlPanel {
    constructor(app) {
        this.app = app;
        this.visible = false;
        this.settings = {
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
        };

        // パネルの状態管理
        this.activeSection = null;
        this.touchStartY = 0;
        this.scrollStartY = 0;

        this.createSettingsButton();
        this.createPanel();
        this.setupEventListeners();
    }

    createSettingsButton() {
        this.button = document.createElement('button');
        this.button.className = 'settings-button';
        this.button.innerHTML = `<img src="assets/settings-icon.svg" class="settings-icon" alt="Settings">`;
        document.body.appendChild(this.button);
    }

    createPanel() {
        this.container = document.createElement('div');
        this.container.className = 'control-panel';

        // セクションの作成
        this.createDisplaySection();
        this.createPostProcessingSection();
        this.createParticleSection();
        this.createCameraSection();

        document.body.appendChild(this.container);
    }

    createSection(title, content) {
        const section = document.createElement('div');
        section.className = 'control-section';

        const header = document.createElement('div');
        header.className = 'section-header';
        header.textContent = title;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'section-content';
        contentDiv.style.display = 'none';

        header.addEventListener('click', () => {
            const isExpanded = contentDiv.style.display === 'block';
            
            // 他のすべてのセクションを閉じる
            this.container.querySelectorAll('.section-content').forEach(content => {
                content.style.display = 'none';
            });
            this.container.querySelectorAll('.section-header').forEach(header => {
                header.classList.remove('active');
            });

            // クリックされたセクションの表示を切り替え
            if (!isExpanded) {
                contentDiv.style.display = 'block';
                header.classList.add('active');
                this.activeSection = title;
            } else {
                this.activeSection = null;
            }
        });

        section.appendChild(header);
        section.appendChild(contentDiv);
        contentDiv.appendChild(content);
        return section;
    }

    createDisplaySection() {
        const content = document.createElement('div');
        
        const checkbox = this.createCheckbox(
            'Show Status Panel',
            this.settings.display.showStatusBar,
            (value) => {
                this.settings.display.showStatusBar = value;
                if (this.app.statusBar) {
                    this.app.statusBar.setVisibility(value);
                }
            }
        );
        
        content.appendChild(checkbox);
        this.container.appendChild(this.createSection('Display Settings', content));
    }

    createPostProcessingSection() {
        const content = document.createElement('div');
        
        // メインのポストプロセス設定
        content.appendChild(this.createCheckbox(
            'Enable Post Processing',
            this.settings.postProcessing.enabled,
            (value) => {
                this.settings.postProcessing.enabled = value;
                this.app.setPostProcessingEnabled(value);
            }
        ));

        // Bloom設定
        content.appendChild(this.createCheckbox(
            'Enable Bloom',
            this.settings.postProcessing.bloom.enabled,
            (value) => {
                this.settings.postProcessing.bloom.enabled = value;
                if (this.app.effects && this.app.effects.bloom) {
                    this.app.effects.bloom.enabled = value;
                }
            }
        ));

        content.appendChild(this.createSlider(
            'Bloom Strength',
            0, 3, 0.1,
            this.settings.postProcessing.bloom.strength,
            (value) => {
                this.settings.postProcessing.bloom.strength = value;
                if (this.app.effects && this.app.effects.bloom) {
                    this.app.effects.bloom.strength = value;
                }
            }
        ));

        // モーションブラー設定
        content.appendChild(this.createCheckbox(
            'Enable Motion Blur',
            this.settings.postProcessing.motionBlur.enabled,
            (value) => {
                this.settings.postProcessing.motionBlur.enabled = value;
                if (this.app.effects && this.app.effects.afterimage) {
                    this.app.effects.afterimage.enabled = value;
                }
            }
        ));

        content.appendChild(this.createSlider(
            'Motion Blur Strength',
            0, 0.98, 0.01,
            this.settings.postProcessing.motionBlur.strength,
            (value) => {
                this.settings.postProcessing.motionBlur.strength = value;
                if (this.app.effects && this.app.effects.afterimage) {
                    this.app.effects.afterimage.uniforms['damp'].value = value;
                }
            }
        ));

        this.container.appendChild(this.createSection('Post Processing', content));
    }

    createParticleSection() {
        const content = document.createElement('div');

        // パーティクル数の設定
        content.appendChild(this.createSlider(
            'Particle Count',
            1000, 100000, 1000,
            this.settings.particles.count,
            (value) => {
                this.settings.particles.count = parseInt(value);
            }
        ));

        // シミュレーション範囲の設定
        content.appendChild(this.createSlider(
            'Simulation Bounds',
            20, 100, 5,
            this.settings.particles.bounds,
            (value) => {
                this.settings.particles.bounds = parseInt(value);
            }
        ));

        // 適用ボタン
        const applyButton = document.createElement('button');
        applyButton.textContent = 'Apply Changes';
        applyButton.className = 'apply-button';
        applyButton.addEventListener('click', () => {
            this.app.particleSystem.applySettings({
                count: this.settings.particles.count,
                bounds: this.settings.particles.bounds,
                size: this.settings.particles.size
            });
        });
        content.appendChild(applyButton);

        this.container.appendChild(this.createSection('Particle Settings', content));
    }

    createCameraSection() {
        const content = document.createElement('div');

        // 自動回転の設定
        content.appendChild(this.createCheckbox(
            'Auto Rotation',
            this.settings.camera.autoRotate,
            (value) => {
                this.settings.camera.autoRotate = value;
                if (this.app.cameraController) {
                    this.app.cameraController.setAutoRotate(value);
                }
            }
        ));

        // 回転速度の設定
        content.appendChild(this.createSlider(
            'Rotation Speed',
            0, 2, 0.01,
            this.settings.camera.rotationSpeed,
            (value) => {
                this.settings.camera.rotationSpeed = value;
                if (this.app.cameraController) {
                    this.app.cameraController.setRotationSpeed(value);
                }
            }
        ));

        // カメラ距離の設定
        content.appendChild(this.createSlider(
            'Camera Distance',
            20, 100, 5,
            this.settings.camera.distance,
            (value) => {
                this.settings.camera.distance = parseInt(value);
                if (this.app.cameraController) {
                    this.app.cameraController.setDistance(value);
                }
            }
        ));

        this.container.appendChild(this.createSection('Camera Settings', content));
    }

    createSlider(label, min, max, step, value, onChange) {
        const container = document.createElement('div');
        container.className = 'control-item slider-container';

        const labelElement = document.createElement('div');
        labelElement.className = 'control-label';
        labelElement.textContent = label;

        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'value-display';
        valueDisplay.textContent = value;
        labelElement.appendChild(valueDisplay);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = value;

        slider.addEventListener('input', () => {
            valueDisplay.textContent = slider.value;
            onChange(Number(slider.value));
        });

        container.appendChild(labelElement);
        container.appendChild(slider);
        return container;
    }

    createCheckbox(label, checked, onChange) {
        const container = document.createElement('div');
        container.className = 'control-item checkbox-container';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = checked;
        checkbox.addEventListener('change', () => onChange(checkbox.checked));

        const labelElement = document.createElement('label');
        labelElement.textContent = label;
        labelElement.appendChild(checkbox);

        container.appendChild(labelElement);
        return container;
    }

    setupEventListeners() {
        // ボタンのクリックイベント
        this.button.addEventListener('click', () => this.toggleVisibility());

        // キーボードイベント
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.toggleVisibility();
            }
        });

        // タッチイベントの処理
        this.container.addEventListener('touchstart', (e) => {
            this.touchStartY = e.touches[0].clientY;
            this.scrollStartY = this.container.scrollTop;
        });

        this.container.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const touchY = e.touches[0].clientY;
                const deltaY = this.touchStartY - touchY;
                this.container.scrollTop = this.scrollStartY + deltaY;
            }
        });
    }

    toggleVisibility() {
        this.visible = !this.visible;
        this.container.style.display = this.visible ? 'block' : 'none';
        
        if (!this.visible) {
            // パネルを閉じる時にすべてのセクションを閉じる
            this.container.querySelectorAll('.section-content').forEach(content => {
                content.style.display = 'none';
            });
            this.container.querySelectorAll('.section-header').forEach(header => {
                header.classList.remove('active');
            });
            this.activeSection = null;
        }
    }

    dispose() {
        if (this.button && this.button.parentNode) {
            this.button.parentNode.removeChild(this.button);
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // イベントリスナーのクリーンアップ
        document.removeEventListener('keydown', this.handleKeyPress);
    }
}