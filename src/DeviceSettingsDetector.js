class DeviceSettingsDetector {
    constructor() {
        this.deviceType = this.detectDeviceType();
        this.performanceLevel = this.detectPerformanceLevel();
    }

    detectDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform.toLowerCase();

        if (
            /(tablet|playbook|silk)|(android(?!.*mobile))/i.test(userAgent) ||
            (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /macintosh/.test(userAgent)) ||
            /ipad/.test(userAgent)
        ) {
            return 'tablet';
        }

        if (
            /android|webos|iphone|ipod|blackberry|iemobile|opera mini|mobile|phone|samsung|pixel/i.test(userAgent) ||
            /android/.test(platform) ||
            /iphone/.test(platform) ||
            (typeof window.orientation !== 'undefined') ||
            navigator.maxTouchPoints > 1
        ) {
            return 'mobile';
        }
        
        return 'desktop';
    }

    detectPerformanceLevel() {
        const isMobile = this.deviceType === 'mobile';

        // 実際の物理解像度に基づく判定
        if (isMobile && this.physicalPixels < (1280 * 720)) {
            return 'ultra_low';
        }
        if (isMobile || (this.deviceType === 'tablet' && this.physicalPixels < (1920 * 1080))) {
            return 'low';
        }
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