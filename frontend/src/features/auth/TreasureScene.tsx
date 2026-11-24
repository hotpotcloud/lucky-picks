/** 首页 3D 聚宝盆：Three.js 程序化金盆、金币下落、金尘与灯光。 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const TAU = Math.PI * 2;
const FALLING_COIN_COUNT = 34;
const PILE_COIN_COUNT = 132;
const GROUND_COIN_COUNT = 12;
const DUST_COUNT = 190;
const RANDOM_SEED = 20261124;

/** 金币下落状态。 */
interface FallingCoin {
  mesh: THREE.Mesh;
  baseX: number;
  baseZ: number;
  targetY: number;
  speed: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  phase: number;
  wait: number;
  active: boolean;
}

/** 落点涟漪状态。 */
interface LandingRing {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  life: number;
}

/**
 * 可复现的伪随机数生成器，避免每次加载场景构图跳动。
 * @param seed 随机种子
 */
const createRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * 生成径向渐变纹理，用于光晕与金尘。
 * @param stops 渐变色标
 */
const createRadialTexture = (stops: Array<[number, string]>) => {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  for (const [offset, color] of stops) {
    gradient.addColorStop(offset, color);
  }
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

/**
 * 用二维轮廓创建旋转体，作为盆体外壳与内胆。
 * @param profile 半径与高度组成的轮廓点
 * @param material 材质
 */
const createLathe = (profile: Array<[number, number]>, material: THREE.Material) => {
  const geometry = new THREE.LatheGeometry(
    profile.map(([radius, height]) => new THREE.Vector2(radius, height)),
    96,
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

/**
 * 初始化一枚下落金币的位置与运动参数。
 * @param coin 金币状态
 * @param random 随机函数
 * @param initial 是否为首次加载
 */
const respawnCoin = (coin: FallingCoin, random: () => number, initial = false) => {
  const angle = random() * TAU;
  const radius = Math.sqrt(random()) * 1.05;
  coin.baseX = Math.cos(angle) * radius;
  coin.baseZ = Math.sin(angle) * radius * 0.78;
  coin.mesh.position.set(
    coin.baseX,
    initial ? 1.1 + random() * 4.4 : 3.6 + random() * 2.6,
    coin.baseZ,
  );
  coin.mesh.rotation.set(random() * TAU, random() * TAU, random() * TAU);
  coin.mesh.scale.setScalar(0.72 + random() * 0.5);
  coin.mesh.visible = true;
  coin.targetY = 0.66 + random() * 0.34;
  coin.speed = 1.1 + random() * 1.3;
  coin.spinX = 2.4 + random() * 4.6;
  coin.spinY = 1.8 + random() * 4.2;
  coin.spinZ = 2.2 + random() * 4.8;
  coin.phase = random() * TAU;
  coin.wait = 0;
  coin.active = true;
};

/**
 * 3D 聚宝盆场景。
 */
export const TreasureScene = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setFailed(true);
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const random = createRandom(RANDOM_SEED);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050a10, 0.045);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
    const baseCamera = new THREE.Vector3(0, 2.95, 5.9);
    camera.position.copy(baseCamera);
    camera.lookAt(0, 1.2, 0);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.78;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    room.dispose();
    pmrem.dispose();

    const goldMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf3b53c,
      metalness: 1,
      roughness: 0.24,
      side: THREE.DoubleSide,
      clearcoat: 0.45,
      clearcoatRoughness: 0.22,
      envMapIntensity: 0.9,
    });
    const brightGoldMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffdf8a,
      metalness: 1,
      roughness: 0.16,
      clearcoat: 0.6,
      clearcoatRoughness: 0.16,
      envMapIntensity: 1.0,
    });
    const darkGoldMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x9a641d,
      metalness: 0.95,
      roughness: 0.36,
      envMapIntensity: 0.65,
    });
    const jadeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0a4a42,
      metalness: 0.45,
      roughness: 0.3,
      side: THREE.DoubleSide,
      clearcoat: 0.7,
      clearcoatRoughness: 0.24,
      envMapIntensity: 0.6,
    });

    const bowlGroup = new THREE.Group();
    const outerBowl = createLathe(
      [
        [0.02, 0.04],
        [0.44, 0.05],
        [0.54, 0.11],
        [0.62, 0.2],
        [0.96, 0.43],
        [1.22, 0.7],
        [1.33, 0.94],
        [1.35, 1.0],
      ],
      goldMaterial,
    );
    const innerBowl = createLathe(
      [
        [1.25, 1.0],
        [1.17, 0.73],
        [0.9, 0.45],
        [0.55, 0.28],
        [0.02, 0.24],
      ],
      jadeMaterial,
    );
    bowlGroup.add(outerBowl, innerBowl);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.065, 18, 128), brightGoldMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.0;
    rim.castShadow = true;
    bowlGroup.add(rim);

    const middleBand = new THREE.Mesh(
      new THREE.TorusGeometry(1.095, 0.018, 10, 128),
      darkGoldMaterial,
    );
    middleBand.rotation.x = Math.PI / 2;
    middleBand.position.y = 0.6;
    bowlGroup.add(middleBand);

    const lowerBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.024, 10, 96),
      brightGoldMaterial,
    );
    lowerBand.rotation.x = Math.PI / 2;
    lowerBand.position.y = 0.2;
    bowlGroup.add(lowerBand);

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.54, 0.12, 64), darkGoldMaterial);
    foot.position.y = 0.06;
    foot.castShadow = true;
    foot.receiveShadow = true;
    bowlGroup.add(foot);

    const rivetGeometry = new THREE.SphereGeometry(0.035, 14, 14);
    for (let index = 0; index < 12; index += 1) {
      const angle = (index / 12) * TAU;
      const rivet = new THREE.Mesh(rivetGeometry, brightGoldMaterial);
      rivet.position.set(Math.cos(angle) * 1.31, 1.0, Math.sin(angle) * 1.31);
      bowlGroup.add(rivet);
    }
    scene.add(bowlGroup);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(5.4, 80),
      new THREE.MeshStandardMaterial({
        color: 0x071018,
        metalness: 0.42,
        roughness: 0.52,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.28 }),
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.006;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    scene.add(new THREE.HemisphereLight(0x8be9ff, 0x1a0d02, 0.3));

    const keyLight = new THREE.DirectionalLight(0xffe3b5, 1.4);
    keyLight.position.set(3.6, 7, 4.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -3.2;
    keyLight.shadow.camera.right = 3.2;
    keyLight.shadow.camera.top = 3.2;
    keyLight.shadow.camera.bottom = -3.2;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.camera.updateProjectionMatrix();
    scene.add(keyLight);

    const warmLight = new THREE.PointLight(0xffb347, 14, 9, 2);
    warmLight.position.set(0, 1.75, 1.1);
    scene.add(warmLight);

    const tealLight = new THREE.PointLight(0x2dd4bf, 8, 8, 2);
    tealLight.position.set(-2.8, 2.2, 2.4);
    scene.add(tealLight);

    const backLight = new THREE.PointLight(0x38bdf8, 6, 9, 2);
    backLight.position.set(0, 2.6, -3.2);
    scene.add(backLight);

    const glowTexture = createRadialTexture([
      [0, 'rgba(255, 238, 176, 0.95)'],
      [0.28, 'rgba(255, 191, 73, 0.5)'],
      [0.62, 'rgba(255, 150, 32, 0.14)'],
      [1, 'rgba(255, 150, 32, 0)'],
    ]);
    if (glowTexture) {
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture,
          color: 0xffb733,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0.26,
        }),
      );
      glow.position.set(0, 1.05, -1.1);
      glow.scale.set(7.2, 4.4, 1);
      scene.add(glow);

      const tealGlow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture,
          color: 0x1fb6a8,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0.1,
        }),
      );
      tealGlow.position.set(0, 0.9, -2.2);
      tealGlow.scale.set(9.2, 5.4, 1);
      scene.add(tealGlow);
    }

    const coinGeometry = new THREE.CylinderGeometry(0.11, 0.11, 0.025, 24);
    const pileGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.024, 20);
    const pileMaterial = goldMaterial.clone();
    pileMaterial.color.set(0xffffff);
    const pile = new THREE.InstancedMesh(pileGeometry, pileMaterial, PILE_COIN_COUNT);
    pile.castShadow = true;
    pile.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const pileColors = [
      new THREE.Color(0xffc94f),
      new THREE.Color(0xffe19a),
      new THREE.Color(0xd99a2b),
    ];
    for (let index = 0; index < PILE_COIN_COUNT; index += 1) {
      const angle = random() * TAU;
      const radius = Math.sqrt(random()) * 0.98;
      const mound = Math.max(0, 1 - radius / 1.02);
      const overflowing = index > PILE_COIN_COUNT - 18;
      // 内胆是旋转曲面，金币需贴着曲面向上堆叠，避免穿模。
      const floorY = 0.24 + (radius / 1.17) ** 1.5 * 0.49;
      dummy.position.set(
        Math.cos(angle) * radius,
        overflowing
          ? 0.92 + random() * 0.2
          : floorY + 0.04 + mound * 0.55 + random() * 0.12,
        Math.sin(angle) * radius * 0.86,
      );
      dummy.rotation.set(
        (random() - 0.5) * (overflowing ? 0.8 : 0.5),
        random() * TAU,
        (random() - 0.5) * (overflowing ? 0.8 : 0.5),
      );
      const scale = 0.72 + random() * 0.55;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      pile.setMatrixAt(index, dummy.matrix);
      pile.setColorAt(index, pileColors[index % pileColors.length]);
    }
    pile.instanceMatrix.needsUpdate = true;
    if (pile.instanceColor) {
      pile.instanceColor.needsUpdate = true;
    }
    scene.add(pile);

    const groundCoins = new THREE.InstancedMesh(coinGeometry, goldMaterial, GROUND_COIN_COUNT);
    groundCoins.castShadow = true;
    groundCoins.receiveShadow = true;
    for (let index = 0; index < GROUND_COIN_COUNT; index += 1) {
      const angle = random() * TAU;
      const radius = 1.75 + random() * 1.3;
      dummy.position.set(Math.cos(angle) * radius, 0.04, Math.sin(angle) * radius * 0.8);
      dummy.rotation.set((random() - 0.5) * 0.36, random() * TAU, (random() - 0.5) * 0.36);
      dummy.scale.setScalar(0.82 + random() * 0.5);
      dummy.updateMatrix();
      groundCoins.setMatrixAt(index, dummy.matrix);
    }
    groundCoins.instanceMatrix.needsUpdate = true;
    scene.add(groundCoins);

    const fallingCoins: FallingCoin[] = Array.from({ length: FALLING_COIN_COUNT }, () => {
      const mesh = new THREE.Mesh(coinGeometry, brightGoldMaterial);
      mesh.castShadow = true;
      scene.add(mesh);
      return {
        mesh,
        baseX: 0,
        baseZ: 0,
        targetY: 0.75,
        speed: 1,
        spinX: 1,
        spinY: 1,
        spinZ: 1,
        phase: 0,
        wait: 0,
        active: true,
      };
    });
    fallingCoins.forEach((coin, index) => {
      respawnCoin(coin, random, true);
      // 首次加载错开高度，避免所有金币同时落地。
      coin.mesh.position.y += (index / FALLING_COIN_COUNT) * 0.8;
    });

    const ringGeometry = new THREE.RingGeometry(0.09, 0.14, 32);
    const landingRings: LandingRing[] = Array.from({ length: 10 }, () => {
      const mesh = new THREE.Mesh(
        ringGeometry,
        new THREE.MeshBasicMaterial({
          color: 0xffd166,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      scene.add(mesh);
      return { mesh, life: 0 };
    });

    const dustTexture = createRadialTexture([
      [0, 'rgba(255, 245, 205, 1)'],
      [0.35, 'rgba(255, 214, 120, 0.55)'],
      [1, 'rgba(255, 190, 80, 0)'],
    ]);
    const dustPositions = new Float32Array(DUST_COUNT * 3);
    const dustSpeeds = new Float32Array(DUST_COUNT);
    const dustPhases = new Float32Array(DUST_COUNT);
    for (let index = 0; index < DUST_COUNT; index += 1) {
      dustPositions[index * 3] = (random() - 0.5) * 5.2;
      dustPositions[index * 3 + 1] = 0.15 + random() * 4.2;
      dustPositions[index * 3 + 2] = (random() - 0.5) * 3.2;
      dustSpeeds[index] = 0.07 + random() * 0.22;
      dustPhases[index] = random() * TAU;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMaterial = new THREE.PointsMaterial({
      color: 0xffd98a,
      size: 0.032,
      map: dustTexture ?? undefined,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dust);

    const pointerTarget = new THREE.Vector2();
    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerTarget.set(
        ((event.clientX - rect.left) / rect.width - 0.5) * 0.55,
        ((event.clientY - rect.top) / rect.height - 0.5) * 0.3,
      );
    };
    canvas.addEventListener('pointermove', handlePointerMove);

    let contextLost = false;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      setFailed(true);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) {
        return;
      }
      renderer.setSize(width, height, false);
      const aspect = width / height;
      camera.aspect = aspect;
      if (aspect < 0.9) {
        camera.fov = 42;
        camera.position.z = 8.6;
      } else if (aspect > 1.6) {
        camera.fov = 32;
        camera.position.z = 5.8;
      } else {
        camera.fov = 34;
        camera.position.z = 6.6;
      }
      camera.updateProjectionMatrix();
      if (reducedMotion) {
        renderer.render(scene, camera);
      }
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const spawnRing = (position: THREE.Vector3) => {
      const ring = landingRings.find((item) => item.life <= 0);
      if (!ring) {
        return;
      }
      ring.mesh.position.set(position.x, 0.96, position.z);
      ring.mesh.scale.setScalar(1);
      ring.mesh.visible = true;
      ring.life = 1;
    };

    const updateFallingCoins = (delta: number, elapsed: number) => {
      for (const coin of fallingCoins) {
        if (!coin.active) {
          coin.wait -= delta;
          if (coin.wait <= 0) {
            respawnCoin(coin, random);
          }
          continue;
        }

        coin.speed += 5.1 * delta;
        coin.mesh.position.y -= coin.speed * delta;
        const drift = Math.sin(elapsed * 1.5 + coin.phase) * 0.08;
        coin.mesh.position.x = coin.baseX + drift;
        coin.mesh.position.z = coin.baseZ + Math.cos(elapsed * 1.15 + coin.phase) * 0.05;
        coin.mesh.rotation.x += coin.spinX * delta;
        coin.mesh.rotation.y += coin.spinY * delta;
        coin.mesh.rotation.z += coin.spinZ * delta;

        if (coin.mesh.position.y <= coin.targetY) {
          spawnRing(coin.mesh.position);
          coin.active = false;
          coin.mesh.visible = false;
          coin.wait = 0.12 + random() * 1.5;
        }
      }
    };

    const updateRings = (delta: number) => {
      for (const ring of landingRings) {
        if (ring.life <= 0) {
          continue;
        }
        ring.life -= delta * 2.4;
        if (ring.life <= 0) {
          ring.mesh.visible = false;
          ring.mesh.material.opacity = 0;
          continue;
        }
        const progress = 1 - ring.life;
        ring.mesh.scale.setScalar(1 + progress * 3.6);
        ring.mesh.material.opacity = ring.life * 0.7;
      }
    };

    const updateDust = (delta: number, elapsed: number) => {
      const attribute = dustGeometry.getAttribute('position') as THREE.BufferAttribute;
      for (let index = 0; index < DUST_COUNT; index += 1) {
        const nextY = attribute.getY(index) + dustSpeeds[index] * delta;
        attribute.setY(index, nextY > 4.4 ? 0.1 : nextY);
        attribute.setX(
          index,
          attribute.getX(index) + Math.sin(elapsed * 0.6 + dustPhases[index]) * delta * 0.02,
        );
      }
      attribute.needsUpdate = true;
    };

    if (reducedMotion) {
      // 低动态偏好下保持静态构图，不启动动画循环。
      for (const coin of fallingCoins) {
        coin.mesh.position.y = coin.targetY + 0.35 + random() * 1.6;
        coin.mesh.visible = true;
      }
      renderer.render(scene, camera);
    }

    let frameId = 0;
    let previous = performance.now();
    const renderFrame = (now: number) => {
      if (contextLost) {
        return;
      }
      const delta = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      const elapsed = now / 1000;

      camera.position.x += (baseCamera.x + pointerTarget.x - camera.position.x) * 0.045;
      camera.position.y += (baseCamera.y - pointerTarget.y - camera.position.y) * 0.045;
      camera.lookAt(0, 1.2, 0);

      updateFallingCoins(delta, elapsed);
      updateRings(delta);
      updateDust(delta, elapsed);
      warmLight.intensity = 12 + Math.sin(elapsed * 1.8) * 2;
      tealLight.intensity = 6.5 + Math.sin(elapsed * 1.2 + 1.4) * 1.5;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(renderFrame);
    };

    if (!reducedMotion) {
      frameId = requestAnimationFrame(renderFrame);
    }

    const handleVisibility = () => {
      if (reducedMotion) {
        return;
      }
      if (document.hidden) {
        cancelAnimationFrame(frameId);
      } else {
        previous = performance.now();
        cancelAnimationFrame(frameId);
        frameId = requestAnimationFrame(renderFrame);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('visibilitychange', handleVisibility);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      resizeObserver.disconnect();

      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => materials.add(material));
          } else {
            materials.add(object.material);
          }
        }
        if (object instanceof THREE.Sprite) {
          materials.add(object.material);
        }
      });
      materials.forEach((material) => material.dispose());
      glowTexture?.dispose();
      dustTexture?.dispose();
      environment.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="treasure-scene" aria-hidden="true">
      <canvas ref={canvasRef} className="treasure-canvas" />
      {failed && <div className="treasure-fallback" />}
    </div>
  );
};

export default TreasureScene;
