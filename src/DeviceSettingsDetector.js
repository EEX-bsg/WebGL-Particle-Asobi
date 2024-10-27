class DeviceSettingsDetector {
    constructor() {
        this.deviceType = this.detectDeviceType();
        this.performanceLevel = this.detectPerformanceLevel();
    }

    detectDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
            return 'tablet';
        }
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
            return 'mobile';
        }
        return 'desktop';
    }

    detectPerformanceLevel() {
        const screenPixels = window.screen.width * window.screen.height;
        const isMobile = this.deviceType === 'mobile';
        
        // 超ローエンド: 低解像度のモバイル
        if (isMobile && screenPixels < 1280 * 720) {
            return 'ultra_low';
        }
        // ローエンド: 通常のモバイル
        if (isMobile || (this.deviceType === 'tablet' && screenPixels < 1920 * 1080)) {
            return 'low';
        }
        // ハイエンド: PC、タブレット
        return 'high';
    }

    getDefaultSettings() {
        const defaults = {
            ultra_low: {
                particles: {
                    count: 5000,
                    bounds: 40,
                    size: 1.5,
                    blackHoleRadius: 1.3
                },
                postProcessing: {
                    enabled: false,
                    bloom: {
                        enabled: false,
                        strength: 0.8
                    },
                    motionBlur: {
                        enabled: false,
                        strength: 0.92
                    }
                },
                camera: {
                    autoRotate: true,
                    rotationSpeed: 1.0,
                    distance: 50
                }
            },
            low: {
                particles: {
                    count: 30000,
                    bounds: 50,
                    size: 1.3,
                    blackHoleRadius: 1.3
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
                camera: {
                    autoRotate: true,
                    rotationSpeed: 1.0,
                    distance: 50
                }
            },
            high: {
                particles: {
                    count: 60000,
                    bounds: 100,
                    size: 1.0,
                    blackHoleRadius: 1.3
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
                camera: {
                    autoRotate: true,
                    rotationSpeed: 1.0,
                    distance: 50
                }
            }
        };

        return defaults[this.performanceLevel];
    }
}