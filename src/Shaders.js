const Shaders = {
    vertex: `
        varying float vDistance;
        void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vDistance = -mvPosition.z;

            // カメラからの距離に基づくサイズの計算
            // 近すぎる場合（10未満）は徐々にサイズを0に
            // 適正距離（10-60）では通常のサイズ計算
            float baseSize = 180.0 / (-mvPosition.z);
            float nearFade = smoothstep(1.0, 5.0, -mvPosition.z);
            gl_PointSize = max(1.2, baseSize * nearFade);

            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragment: `
        uniform sampler2D particleTexture;
        varying float vDistance;
        void main() {
            vec4 texColor = texture2D(particleTexture, gl_PointCoord);

            // 距離に基づく透明度の計算
            // 遠すぎる場合の減衰
            float farFade = 1.0 - smoothstep(30.0, 100.0, vDistance);
            // 近すぎる場合の減衰
            float nearFade = smoothstep(1.0, 8.0, vDistance);
            // 両方の減衰を組み合わせる
            float distanceFade = min(farFade, nearFade);

            // 最終的な不透明度の計算（0.1から0.9の範囲）
            float opacity = mix(0.2, 0.9, distanceFade);

            // カメラからの距離に応じた色の調整
            vec3 color = vec3(0.4, 0.85, 1.0) * (1.0 - vDistance * 0.001);

            // 最終的な色と透明度の設定
            gl_FragColor = vec4(color, texColor.a * opacity);
        }
    `
};