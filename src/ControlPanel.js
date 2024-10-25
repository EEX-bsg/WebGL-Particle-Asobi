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
        this.createPanel();
        this.setupKeyboardControls();
    }

    createPanel() {
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background-color: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 15px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            border-radius: 5px;
            width: 300px;
            max-height: 90vh;
            overflow-y: auto;
            display: none;
            z-index: 1000;
        `;

        this.createGroups();
        document.body.appendChild(this.container);
    }

    createGroups() {
        // 表示設定グループ
        this.addGroup('Display Settings', [
            {
                type: 'checkbox',
                label: 'Show Status Bar',
                value: this.settings.display.showStatusBar,
                onChange: (value) => {
                    this.settings.display.showStatusBar = value;
                    if (this.app.statusBar) {
                        this.app.statusBar.setVisibility(value);
                    }
                }
            }
        ]);

        // ポストプロセッシング設定グループ
        this.addGroup('Post Processing', [
            {
                type: 'checkbox',
                label: 'Enable Post Processing',
                value: this.settings.postProcessing.enabled,
                onChange: (value) => {
                    this.settings.postProcessing.enabled = value;
                    this.app.setPostProcessingEnabled(value);
                }
            },
            {
                type: 'checkbox',
                label: 'Enable Bloom',
                value: this.settings.postProcessing.bloom.enabled,
                onChange: (value) => {
                    this.settings.postProcessing.bloom.enabled = value;
                    if (this.app.effects && this.app.effects.bloom) {
                        this.app.effects.bloom.enabled = value;
                    }
                }
            },
            {
                type: 'range',
                label: 'Bloom Strength',
                min: 0,
                max: 3,
                step: 0.1,
                value: this.settings.postProcessing.bloom.strength,
                onChange: (value) => {
                    this.settings.postProcessing.bloom.strength = value;
                    if (this.app.effects && this.app.effects.bloom) {
                        this.app.effects.bloom.strength = value;
                    }
                }
            },
            {
                type: 'checkbox',
                label: 'Enable Motion Blur',
                value: this.settings.postProcessing.motionBlur.enabled,
                onChange: (value) => {
                    this.settings.postProcessing.motionBlur.enabled = value;
                    if (this.app.effects && this.app.effects.afterimage) {
                        this.app.effects.afterimage.enabled = value;
                    }
                }
            },
            {
                type: 'range',
                label: 'Motion Blur Strength',
                min: 0,
                max: 0.98,
                step: 0.01,
                value: this.settings.postProcessing.motionBlur.strength,
                onChange: (value) => {
                    this.settings.postProcessing.motionBlur.strength = value;
                    if (this.app.effects && this.app.effects.afterimage) {
                        this.app.effects.afterimage.uniforms['damp'].value = value;
                    }
                }
            }
        ]);

        // パーティクル設定グループ
        const particleControls = [
            {
                type: 'range',
                label: 'Particle Count',
                min: 1000,
                max: 100000,
                step: 1000,
                value: this.settings.particles.count,
                onChange: (value) => {
                    this.settings.particles.count = parseInt(value);
                }
            },
            {
                type: 'range',
                label: 'Simulation Bounds',
                min: 20,
                max: 100,
                step: 5,
                value: this.settings.particles.bounds,
                onChange: (value) => {
                    this.settings.particles.bounds = parseInt(value);
                }
            },
            // {
            //     type: 'range',
            //     label: 'Particle Size',
            //     min: 0.1,
            //     max: 10.0,
            //     step: 0.1,
            //     value: this.settings.particles.size,
            //     onChange: (value) => {
            //         this.settings.particles.size = parseFloat(value);
            //     }
            // },
            {
                type: 'button',
                label: 'Apply Changes',
                onClick: () => {
                    this.app.particleSystem.applySettings({
                        count: this.settings.particles.count,
                        bounds: this.settings.particles.bounds,
                        size: this.settings.particles.size
                    });
                }
            }
        ];
        this.addGroup('Particle Settings', particleControls);

        // カメラ設定グループ
        this.addGroup('Camera Settings', [
            {
                type: 'checkbox',
                label: 'Auto Rotation',
                value: this.settings.camera.autoRotate,
                onChange: (value) => {
                    this.settings.camera.autoRotate = value;
                    if (this.app.cameraController) {
                        this.app.cameraController.setAutoRotate(value);
                    }
                }
            },
            {
                type: 'range',
                label: 'Rotation Speed',
                min: 0,
                max: 2,
                step: 0.01,
                value: this.settings.camera.rotationSpeed,
                onChange: (value) => {
                    this.settings.camera.rotationSpeed = value;
                    if (this.app.cameraController) {
                        this.app.cameraController.setRotationSpeed(value);
                    }
                }
            },
            {
                type: 'range',
                label: 'Camera Distance',
                min: 20,
                max: 100,
                step: 5,
                value: this.settings.camera.distance,
                onChange: (value) => {
                    this.settings.camera.distance = parseInt(value);
                    if (this.app.cameraController) {
                        this.app.cameraController.setDistance(value);
                    }
                }
            }
        ]);
    }

    addGroup(title, controls) {
        const group = document.createElement('div');
        group.style.cssText = `
            margin-bottom: 15px;
            padding: 10px;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
        `;

        const titleElement = document.createElement('div');
        titleElement.style.cssText = `
            font-weight: bold;
            margin-bottom: 10px;
            color: #88ccff;
            border-bottom: 1px solid #88ccff;
            padding-bottom: 5px;
        `;
        titleElement.textContent = title;
        group.appendChild(titleElement);

        controls.forEach(control => {
            const controlContainer = document.createElement('div');
            controlContainer.style.marginBottom = '8px';

            if (control.type === 'button') {
                const button = document.createElement('button');
                button.textContent = control.label;
                button.style.cssText = `
                    width: 100%;
                    padding: 8px;
                    background-color: #88ccff;
                    color: #000;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-weight: bold;
                `;
                button.addEventListener('click', control.onClick);
                controlContainer.appendChild(button);
            } else {
                const label = document.createElement('label');
                label.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 4px;
                `;
                
                const labelText = document.createElement('span');
                labelText.textContent = control.label;
                label.appendChild(labelText);

                if (control.type === 'checkbox') {
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = control.value;
                    checkbox.addEventListener('change', () => control.onChange(checkbox.checked));
                    label.appendChild(checkbox);
                } else if (control.type === 'range') {
                    const valueDisplay = document.createElement('span');
                    valueDisplay.textContent = control.value;
                    valueDisplay.style.marginLeft = '10px';
                    label.appendChild(valueDisplay);

                    const slider = document.createElement('input');
                    slider.type = 'range';
                    slider.min = control.min;
                    slider.max = control.max;
                    slider.step = control.step;
                    slider.value = control.value;
                    slider.style.width = '100%';
                    slider.addEventListener('input', () => {
                        valueDisplay.textContent = slider.value;
                        control.onChange(parseFloat(slider.value));
                    });
                    controlContainer.appendChild(slider);
                }

                controlContainer.insertBefore(label, controlContainer.firstChild);
            }

            group.appendChild(controlContainer);
        });

        this.container.appendChild(group);
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.toggleVisibility();
            }
        });
    }

    toggleVisibility() {
        this.visible = !this.visible;
        this.container.style.display = this.visible ? 'block' : 'none';
    }
}