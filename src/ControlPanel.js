class ControlPanel {
    constructor(app, deviceSettings) {
        this.app = app;
        this.visible = false;
        this.settings = {
            display: {
                showStatusPanel: true,
                fullscreen: false
            },
            postProcessing: {
                enabled: deviceSettings.postProcessing.enabled,
                bloom: {
                    enabled: deviceSettings.postProcessing.bloom.enabled,
                    strength: deviceSettings.postProcessing.bloom.strength
                },
                motionBlur: {
                    enabled: deviceSettings.postProcessing.motionBlur.enabled,
                    strength: deviceSettings.postProcessing.motionBlur.strength
                }
            },
            particles: {
                count: deviceSettings.particles.count,
                bounds: deviceSettings.particles.bounds,
                size: deviceSettings.particles.size,
                blackHoleRadius: deviceSettings.particles.blackHoleRadius
            },
            camera: {
                autoRotate: deviceSettings.camera.autoRotate,
                rotationSpeed: deviceSettings.camera.rotationSpeed,
                distance: deviceSettings.camera.distance
            }
        };
        //なぜかこれでラグ直る
        this.settings.particles.size += 0.1
        this.settings.particles.size -= 0.1

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
                content.classList.remove('visible');
                content.querySelectorAll('.control-item, .apply-button').forEach(item => {
                    item.classList.remove('visible');
                });
            });
            this.container.querySelectorAll('.section-header').forEach(header => {
                header.classList.remove('active');
            });

            // クリックされたセクションの表示を切り替え
            if (!isExpanded) {
                contentDiv.style.display = 'block';
                header.classList.add('active');
                this.activeSection = title;

                // コンテンツのフェードイン
                setTimeout(() => {
                    contentDiv.classList.add('visible');

                    // コントロール要素とApplyボタンの順次表示
                    const items = contentDiv.querySelectorAll('.control-item, .apply-button');
                    items.forEach((item, index) => {
                        setTimeout(() => {
                            item.classList.add('visible');
                        }, 50 + index * 50);
                    });
                }, 50);
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

        // ステータスパネルの表示設定
        content.appendChild(this.createCheckbox(
            'Show Status Panel',
            this.settings.display.showStatusPanel,
            (value) => {
                this.settings.display.showStatusPanel = value;
                if (this.app.StatusPanel) {
                    this.app.StatusPanel.setVisibility(value);
                }
            }
        ));

        // 全画面表示の設定を追加
        this.fullscreenCheckbox = this.createCheckbox(
            'Fullscreen Mode',
            this.settings.display.fullscreen,
            async (value) => {
                this.settings.display.fullscreen = value;
                if (value) {
                    await this.enterFullscreen();
                } else {
                    await this.exitFullscreen();
                }
            }
        );
        content.appendChild(this.fullscreenCheckbox);

        this.container.appendChild(this.createSection('Display Settings', content));
    }

    updateFullscreenState(isFullscreen) {
        this.settings.display.fullscreen = isFullscreen;
        const checkbox = this.fullscreenCheckbox.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.checked = isFullscreen;
        }
    }

    async enterFullscreen() {
        try {
            // モバイルデバイスかどうかを確認
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isMobile) {
                // モバイルデバイスの場合
                const orientation = screen.orientation;

                if (orientation && 'type' in orientation) {
                    // 現在の向きを確認
                    const isPortrait = orientation.type.includes('portrait');

                    if (isPortrait && 'lock' in orientation) {
                        try {
                            // 可能であれば現在の向きを保持したまま全画面化を試みる
                            await orientation.lock(orientation.type);
                        } catch (error) {
                            // 向きのロックができない場合は横向きで全画面化
                            try {
                                await orientation.lock('landscape');
                            } catch (lockError) {
                                console.log('Unable to lock orientation');
                            }
                        }
                    }
                }
            }

            // フルスクリーン化
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                await elem.msRequestFullscreen();
            }
        } catch (error) {
            console.log('Fullscreen request failed:', error);
            this.updateFullscreenState(false);
        }
    }

    async exitFullscreen() {
        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                await document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                await document.msExitFullscreen();
            }

            // スクリーンの向きのロックを解除（モバイルの場合）
            if ('screen' in window && 'orientation' in screen && 'unlock' in screen.orientation) {
                try {
                    await screen.orientation.unlock();
                } catch (error) {
                    console.log('Unable to unlock orientation:', error);
                }
            }
        } catch (error) {
            console.log('Exit fullscreen failed:', error);
        }
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

        // パーティクルサイズの設定を追加
        content.appendChild(this.createSlider(
            'Particle Size',
            0.2, 2.0, 0.1,
            this.settings.particles.size,
            (value) => {
                this.settings.particles.size = parseFloat(value);
            }
        ));

        // ブラックホール半径の設定を追加
        content.appendChild(this.createSlider(
            'Black Hole Radius',
            0.6, 1.8, 0.05,
            this.settings.particles.blackHoleRadius,
            (value) => {
                this.settings.particles.blackHoleRadius = parseFloat(value);
                // リアルタイムで適用（Apply不要）
                if (this.app.particleSystem) {
                    this.app.particleSystem.settings.blackHoleRadius = value;
                }
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

        const labelText = document.createElement('div');
        labelText.className = 'label-text';
        labelText.textContent = label
        labelElement.appendChild(labelText);

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

        if (this.visible) {
            // パネルの表示開始
            this.container.style.display = 'block';
            // 表示直後のreflowを強制
            this.container.offsetHeight;

            // ベースパネルのアニメーション
            this.container.classList.add('visible');

            // ヘッダーの順次表示
            const headers = this.container.querySelectorAll('.section-header');
            headers.forEach((header, index) => {
                setTimeout(() => {
                    header.classList.add('visible');
                }, 100 + index * 50);
            });

            // アクティブなセクションがある場合は、そのコンテンツも表示
            if (this.activeSection) {
                const activeHeader = this.container.querySelector(`.section-header.active`);
                const activeContent = activeHeader?.nextElementSibling;
                if (activeContent) {
                    activeContent.style.display = 'block';
                    setTimeout(() => {
                        activeContent.classList.add('visible');
                        // コントロール要素の順次表示
                        const items = activeContent.querySelectorAll('.control-item, .apply-button');
                        items.forEach((item, index) => {
                            setTimeout(() => {
                                item.classList.add('visible');
                            }, 50 + index * 50);
                        });
                    }, 300);
                }
            }

        } else {
            // 非表示アニメーション
            this.container.classList.remove('visible');

            // すべての要素のアニメーションクラスを削除
            this.container.querySelectorAll('.section-header').forEach(header => {
                header.classList.remove('visible');
            });

            const activeContent = this.container.querySelector('.section-content.visible');
            if (activeContent) {
                activeContent.querySelectorAll('.control-item, .apply-button').forEach(item => {
                    item.classList.remove('visible');
                });
                activeContent.classList.remove('visible');
            }

            // アニメーション完了後に非表示
            setTimeout(() => {
                if (!this.visible) {
                    this.container.style.display = 'none';
                }
            }, 300);
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