// ControlPanel.js
Vue.component('control-panel', {
    props: {
        settings: {
            type: Object,
            required: true
        }
    },
    data() {
        return {
            visible: false,
            groups: [
                {
                    id: 'display',
                    title: 'Display Settings',
                    settings: [
                        {
                            type: 'checkbox',
                            label: 'Show Status Bar',
                            key: 'showStatusBar',
                            path: 'display.showStatusBar'
                        }
                    ]
                },
                {
                    id: 'postProcessing',
                    title: 'Post Processing',
                    settings: [
                        {
                            type: 'checkbox',
                            label: 'Enable Post Processing',
                            key: 'enabled',
                            path: 'postProcessing.enabled'
                        },
                        {
                            type: 'checkbox',
                            label: 'Enable Bloom',
                            key: 'bloomEnabled',
                            path: 'postProcessing.bloom.enabled'
                        },
                        {
                            type: 'range',
                            label: 'Bloom Strength',
                            key: 'bloomStrength',
                            path: 'postProcessing.bloom.strength',
                            min: 0,
                            max: 3,
                            step: 0.1
                        },
                        {
                            type: 'checkbox',
                            label: 'Enable Motion Blur',
                            key: 'motionBlurEnabled',
                            path: 'postProcessing.motionBlur.enabled'
                        },
                        {
                            type: 'range',
                            label: 'Motion Blur Strength',
                            key: 'motionBlurStrength',
                            path: 'postProcessing.motionBlur.strength',
                            min: 0,
                            max: 0.98,
                            step: 0.01
                        }
                    ]
                },
                {
                    id: 'particles',
                    title: 'Particle Settings',
                    settings: [
                        {
                            type: 'range',
                            label: 'Particle Count',
                            key: 'count',
                            path: 'particles.count',
                            min: 1000,
                            max: 100000,
                            step: 1000
                        },
                        {
                            type: 'range',
                            label: 'Simulation Bounds',
                            key: 'bounds',
                            path: 'particles.bounds',
                            min: 20,
                            max: 100,
                            step: 5
                        }
                    ]
                },
                {
                    id: 'camera',
                    title: 'Camera Settings',
                    settings: [
                        {
                            type: 'checkbox',
                            label: 'Auto Rotation',
                            key: 'autoRotate',
                            path: 'camera.autoRotate'
                        },
                        {
                            type: 'range',
                            label: 'Rotation Speed',
                            key: 'rotationSpeed',
                            path: 'camera.rotationSpeed',
                            min: 0,
                            max: 2,
                            step: 0.01
                        },
                        {
                            type: 'range',
                            label: 'Camera Distance',
                            key: 'distance',
                            path: 'camera.distance',
                            min: 20,
                            max: 100,
                            step: 5
                        }
                    ]
                }
            ]
        };
    },
    methods: {
        toggleVisibility() {
            this.visible = !this.visible;
        },
        updateSetting(path, value) {
            // プロパティパスに基づいて設定を更新
            const pathArray = path.split('.');
            const setting = { ...this.settings };
            let current = setting;

            for (let i = 0; i < pathArray.length - 1; i++) {
                current = current[pathArray[i]];
            }
            current[pathArray[pathArray.length - 1]] = value;

            this.$emit('update:settings', setting);
        },
        getSettingValue(path) {
            // プロパティパスから設定値を取得
            return path.split('.').reduce((obj, key) => obj[key], this.settings);
        }
    },
    mounted() {
        // ESCキーでパネルの表示/非表示を切り替え
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.toggleVisibility();
            }
        });
    },
    template: `
        <div>
            <button class="settings-toggle" @click="toggleVisibility">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            </button>
            
            <div v-show="visible" class="panel control-panel">
                <settings-group 
                    v-for="group in groups" 
                    :key="group.id"
                    :title="group.title"
                >
                    <template v-for="setting in group.settings">
                        <check-box
                            v-if="setting.type === 'checkbox'"
                            :key="setting.key"
                            :label="setting.label"
                            :model-value="getSettingValue(setting.path)"
                            @update:model-value="updateSetting(setting.path, $event)"
                        />
                        <range-slider
                            v-else-if="setting.type === 'range'"
                            :key="setting.key"
                            :label="setting.label"
                            :model-value="getSettingValue(setting.path)"
                            :min="setting.min"
                            :max="setting.max"
                            :step="setting.step"
                            @update:model-value="updateSetting(setting.path, $event)"
                        />
                    </template>
                </settings-group>
            </div>
        </div>
    `
});