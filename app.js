import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.querySelector("#chair-canvas");
const status = document.querySelector("#model-status");
const customCanvas = document.querySelector("#custom-canvas");
const customStatus = document.querySelector("#custom-status");
const introEnter = document.querySelector("#intro-enter");
const heroCopy = document.querySelector(".hero-copy");
const introSound = new Audio("./assets/audio/intro-sound.mp3");
introSound.preload = "auto";
introSound.volume = 0.72;
const chairNames = ["CY A3", "CY A4", "CY A2", "CY A1", "CY A7", "CY A6", "CY A5"];
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf3f3f3, 38, 68);

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
const introPixelRatio = Math.min(window.devicePixelRatio, 1);
const detailPixelRatio = Math.min(window.devicePixelRatio, 1.5);
renderer.setPixelRatio(introPixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const finalExposure = 1.55;
renderer.toneMappingExposure = finalExposure;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 38;
controls.minPolarAngle = Math.PI * 0.08;
controls.maxPolarAngle = Math.PI * 0.86;
controls.enablePan = false;

const collection = new THREE.Group();
scene.add(collection);
const chairGroups = [];
const desiredTarget = new THREE.Vector3();
const desiredPosition = new THREE.Vector3();
let chairNameMesh = null;
let chairNameFadeStart = 0;
let cameraInitialized = false;
let cameraTransitionActive = false;
const heroLights = [];
const introBackground = new THREE.Color(0x000000);
const finalBackground = new THREE.Color(0xf3f3f3);
const introStartPosition = new THREE.Vector3();
const introStartTarget = new THREE.Vector3();
let introStartTime = 0;
let introActive = false;
let introReady = false;
let detailResolutionApplied = false;
let heroCopyVisible = false;
const introDelay = 450;
const introDuration = 6000;
const customBacks = [];
const customTintMaterials = [];
let selectedBack = 0;
let selectedColorName = "Pale Blue";
let selectedColorIndex = 0;
let selectedColorValue = "#9fc9df";
let colorEnabled = true;
let customTexture = null;
let customTextureUrl = "";

controls.addEventListener("start", () => {
  finishIntro();
  cameraTransitionActive = false;
});

addLights();
loadCollection();
deferCustomizer();
bindSelector();
document.querySelector(".menu-button").addEventListener("click", () => {
  document.querySelector("#selector").scrollIntoView({ behavior: "smooth" });
});
resize();
animate();
window.addEventListener("resize", resize);
introEnter.addEventListener("click", beginIntro);

function addLights() {
  addHeroLight(new THREE.AmbientLight(0xffffff, 2.1));
  addHeroLight(new THREE.HemisphereLight(0xffffff, 0xd8d8d4, 3.4));

  const key = new THREE.DirectionalLight(0xffffff, 5.2);
  key.position.set(-7, 14, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -22;
  key.shadow.camera.right = 22;
  key.shadow.camera.top = 15;
  key.shadow.camera.bottom = -8;
  addHeroLight(key);
  const fill = new THREE.DirectionalLight(0xffffff, 4.2);
  fill.position.set(8, 8, 12);
  addHeroLight(fill);

  const rim = new THREE.DirectionalLight(0xf1f5ff, 3.2);
  rim.position.set(0, 7, -10);
  addHeroLight(rim);

  const front = new THREE.PointLight(0xffffff, 45, 45, 1.6);
  front.position.set(0, 5, 12);
  addHeroLight(front);
}

function addHeroLight(light) {
  light.userData.finalIntensity = light.intensity;
  heroLights.push(light);
  scene.add(light);
}

function loadCollection() {
  new GLTFLoader().load("./assets/seven_chairs_textured.glb", ({ scene: source }) => {
    source.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      if (Array.isArray(node.material)) node.material.forEach(prepareMaterial);
      else prepareMaterial(node.material);
    });
    collection.add(source);
    normalizeCollection(source);
    buildChairGroups(source);
    addFloor();
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    showAll();
    status.classList.add("hidden");
  }, undefined, (error) => {
    console.error(error);
    status.textContent = "模型加载失败，请通过本地服务器打开页面。";
  });
}

function deferCustomizer() {
  let initialized = false;
  const customizerSection = document.querySelector("#customize");
  let proximityTimer = 0;
  const initializeWhenNear = () => {
    if (initialized || customizerSection.getBoundingClientRect().top > window.innerHeight + 800) return;
    initializeCustomizer();
  };
  const initializeCustomizer = () => {
    if (initialized) return;
    initialized = true;
    window.removeEventListener("scroll", initializeWhenNear);
    window.clearInterval(proximityTimer);
    initCustomizer();
    resize();
  };
  window.addEventListener("scroll", initializeWhenNear, { passive: true });
  document.querySelectorAll('a[href="#customize"]').forEach((link) => {
    link.addEventListener("click", initializeCustomizer, { once: true });
  });
  proximityTimer = window.setInterval(initializeWhenNear, 250);
  initializeWhenNear();
}

function prepareMaterial(material) {
  if (!material) return;
  material.side = THREE.DoubleSide;
  material.needsUpdate = true;
}

function normalizeCollection(source) {
  const box = new THREE.Box3().setFromObject(source);
  const center = box.getCenter(new THREE.Vector3());
  source.position.sub(center);
  source.position.y -= new THREE.Box3().setFromObject(source).min.y;
  source.updateMatrixWorld(true);
}

function buildChairGroups(source) {
  const records = [];
  source.traverse((node) => {
    if (!node.isMesh) return;
    const box = new THREE.Box3().setFromObject(node);
    records.push({ node, center: box.getCenter(new THREE.Vector3()), box });
  });
  records.sort((a, b) => a.center.x - b.center.x);
  records.forEach((record) => {
    const group = chairGroups.find((item) => Math.abs(item.center.x - record.center.x) < 1.15);
    if (group) {
      group.box.union(record.box);
      group.center.copy(group.box.getCenter(new THREE.Vector3()));
      group.nodes.push(record.node);
    } else {
      chairGroups.push({ box: record.box.clone(), center: record.center.clone(), nodes: [record.node] });
    }
  });
}

function addFloor() {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 50),
    new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 0.96 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.025;
  floor.receiveShadow = true;
  scene.add(floor);
}

function bindSelector() {
  document.querySelectorAll("[data-chair]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-chair]").forEach((item) => item.classList.toggle("active", item === button));
      if (button.dataset.chair === "all") {
        hideChairName();
        showAll();
      } else {
        const index = Number(button.dataset.chair);
        showChairName(chairNames[index], index);
        focusChair(index);
      }
      document.querySelector("#collection").scrollIntoView({ behavior: "smooth" });
    });
  });
}

function showChairName(name, index) {
  const chair = chairGroups[index];
  if (!chair) return;
  if (chairNameMesh) {
    scene.remove(chairNameMesh);
    chairNameMesh.geometry.dispose();
    chairNameMesh.material.map.dispose();
    chairNameMesh.material.dispose();
  }

  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 2048;
  labelCanvas.height = 512;
  const context = labelCanvas.getContext("2d");
  context.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
  context.fillStyle = "#c9c9c5";
  context.font = '400 360px "Gilroy", Arial, sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  drawTrackedText(context, name, labelCanvas.width / 2, labelCanvas.height / 2 + 20, 5);

  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const size = chair.box.getSize(new THREE.Vector3());
  const center = chair.box.getCenter(new THREE.Vector3());
  const width = Math.max(size.x * 4.4, 6.8);
  chairNameMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width * 0.25),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
  );
  chairNameMesh.position.set(center.x, center.y * 1.12, chair.box.min.z - 0.72);
  scene.add(chairNameMesh);
  chairNameFadeStart = performance.now() + 350;
}

function drawTrackedText(context, text, centerX, centerY, tracking) {
  const characters = [...text];
  const width = characters.reduce((sum, character) => sum + context.measureText(character).width, 0) +
    tracking * Math.max(0, characters.length - 1);
  let x = centerX - width / 2;
  context.textAlign = "left";
  characters.forEach((character) => {
    context.fillText(character, x, centerY);
    x += context.measureText(character).width + tracking;
  });
}

function hideChairName() {
  if (chairNameMesh) chairNameMesh.visible = false;
}

function initCustomizer() {
  const customScene = new THREE.Scene();
  customScene.background = new THREE.Color(0xf4f4f4);

  const customCamera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
  customCamera.position.set(4.4, 3.1, 6.8);

  const customRenderer = new THREE.WebGLRenderer({ canvas: customCanvas, antialias: true, preserveDrawingBuffer: true });
  customRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  customRenderer.outputColorSpace = THREE.SRGBColorSpace;
  customRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  customRenderer.toneMappingExposure = 1.28;
  customRenderer.shadowMap.enabled = true;
  customRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const customControls = new OrbitControls(customCamera, customCanvas);
  customControls.enableDamping = true;
  customControls.dampingFactor = 0.055;
  customControls.minDistance = 3.2;
  customControls.maxDistance = 10;
  customControls.minPolarAngle = Math.PI * 0.08;
  customControls.maxPolarAngle = Math.PI * 0.86;
  customControls.enablePan = false;
  customControls.target.set(0, 1.25, 0);

  const pmremGenerator = new THREE.PMREMGenerator(customRenderer);
  const studioEnvironment = new THREE.Scene();
  studioEnvironment.background = new THREE.Color(0x8f8f8f);
  addStudioPanel(studioEnvironment, [0, 5, 7], [9, 9], 0xffffff, [-0.35, 0, 0]);
  addStudioPanel(studioEnvironment, [-6, 3, 1], [5, 8], 0xe7edf2, [0, Math.PI * 0.5, 0]);
  addStudioPanel(studioEnvironment, [6, 2, -2], [4, 7], 0xfff1df, [0, -Math.PI * 0.5, 0]);
  addStudioPanel(studioEnvironment, [0, 6, -6], [7, 5], 0xffffff, [Math.PI * 0.35, 0, 0]);
  customScene.environment = pmremGenerator.fromScene(studioEnvironment, 0.08, 0.1, 50).texture;
  pmremGenerator.dispose();

  const customKey = new THREE.DirectionalLight(0xffffff, 4.8);
  customKey.position.set(-6, 10, 8);
  customKey.castShadow = true;
  customScene.add(customKey);
  const customFill = new THREE.DirectionalLight(0xdde8f0, 0.85);
  customFill.position.set(7, 4, 5);
  customScene.add(customFill);

  const customRoot = new THREE.Group();
  customScene.add(customRoot);

  new GLTFLoader().load("./assets/custom_components.glb", ({ scene: source }) => {
    source.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      node.material = materials.map((material) => {
        const clone = material.clone();
        clone.side = THREE.DoubleSide;
        clone.userData.originalColor = clone.color.clone();
        clone.userData.originalMetalness = clone.metalness;
        clone.userData.originalRoughness = clone.roughness;
        clone.userData.originalMap = clone.map;
        clone.userData.tintableMetal = Boolean(clone.metalnessMap) || clone.metalness >= 0.35;
        customTintMaterials.push(clone);
        return clone;
      });
      if (node.material.length === 1) node.material = node.material[0];
    });

    const box = new THREE.Box3().setFromObject(source);
    const size = box.getSize(new THREE.Vector3());
    const scale = 3.4 / Math.max(size.x, size.y, size.z);
    source.scale.setScalar(scale);
    source.updateMatrixWorld(true);
    const scaledBox = new THREE.Box3().setFromObject(source);
    const center = scaledBox.getCenter(new THREE.Vector3());
    source.position.set(-center.x, -scaledBox.min.y, -center.z);
    source.updateMatrixWorld(true);

    for (let index = 1; index <= 6; index += 1) {
      const back = source.getObjectByName(`custom_back_${index}`);
      if (back) customBacks.push(back);
    }
    customBacks.forEach((back, index) => {
      back.visible = index === selectedBack;
    });

    customRoot.add(source);
    applyCustomColor("#9fc9df");
    customStatus.classList.add("hidden");
  }, undefined, (error) => {
    console.error(error);
    customStatus.textContent = "定制组件加载失败";
  });

  const customFloor = new THREE.Mesh(
    new THREE.CircleGeometry(7, 96),
    new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.95 })
  );
  customFloor.rotation.x = -Math.PI / 2;
  customFloor.receiveShadow = true;
  customScene.add(customFloor);

  document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedBack = Number(button.dataset.back);
      customBacks.forEach((back, index) => {
        back.visible = index === selectedBack;
      });
      document.querySelectorAll("[data-back]").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelector("#back-count").textContent = `${String(selectedBack + 1).padStart(2, "0")} / 06`;
      updateCustomSummary();
    });
  });

  document.querySelectorAll("[data-color]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedColorName = button.dataset.colorName;
      selectedColorValue = button.dataset.color;
      colorEnabled = true;
      selectedColorIndex = [...document.querySelectorAll("[data-color]")].indexOf(button);
      applyCustomColor(button.dataset.color);
      document.querySelectorAll("[data-color]").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelector("#color-remove").classList.remove("active");
      updateCustomSummary();
    });
  });

  document.querySelector("#color-remove").addEventListener("click", () => {
    colorEnabled = false;
    selectedColorName = "Original";
    document.querySelectorAll("[data-color]").forEach((item) => item.classList.remove("active"));
    document.querySelector("#color-remove").classList.add("active");
    applyCustomColor(selectedColorValue);
    updateCustomSummary();
  });

  document.querySelector("#texture-input").addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (!file) return;
    document.querySelectorAll("[data-texture]").forEach((item) => item.classList.remove("active"));
    loadCustomTexture(file);
  });

  document.querySelectorAll("[data-texture]").forEach((button) => {
    button.addEventListener("click", () => {
      loadPresetTexture(button.dataset.texture, button.dataset.textureName);
      document.querySelectorAll("[data-texture]").forEach((item) => item.classList.toggle("active", item === button));
    });
  });

  document.querySelector("#texture-remove").addEventListener("click", clearCustomTexture);
  document.querySelector("#poster-export").addEventListener("click", exportPoster);

  window.customView = {
    scene: customScene,
    camera: customCamera,
    renderer: customRenderer,
    controls: customControls,
    root: customRoot,
    active: false
  };
  new IntersectionObserver(([entry]) => {
    window.customView.active = entry.isIntersecting;
  }, { rootMargin: "160px" }).observe(customCanvas);
}

function applyCustomColor(colorValue) {
  const tint = new THREE.Color(colorValue);
  customTintMaterials.forEach((material) => {
    material.color.copy(material.userData.originalColor);
    material.metalness = material.userData.originalMetalness;
    material.roughness = material.userData.originalRoughness;
    material.emissive.set(0x000000);
    material.emissiveMap = null;
    material.emissiveIntensity = 0;
    if (material.userData.tintableMetal && colorEnabled) {
      material.color.multiply(tint.clone().lerp(new THREE.Color(0xffffff), 0.38));
    }
    if (material.userData.tintableMetal) {
      material.map = material.userData.customMaskedMap || material.userData.originalMap;
    }
    material.needsUpdate = true;
  });
}

function loadCustomTexture(file) {
  if (customTextureUrl) URL.revokeObjectURL(customTextureUrl);
  customTextureUrl = URL.createObjectURL(file);
  new THREE.TextureLoader().load(customTextureUrl, (texture) => {
    customTexture?.dispose();
    customTexture = texture;
    customTexture.colorSpace = THREE.SRGBColorSpace;
    customTexture.wrapS = THREE.RepeatWrapping;
    customTexture.wrapT = THREE.RepeatWrapping;
    customTexture.repeat.set(1.5, 1.5);
    customTexture.flipY = false;
    customTexture.needsUpdate = true;
    document.querySelector("#texture-preview").style.backgroundImage = `url("${customTextureUrl}")`;
    document.querySelector("#texture-name").textContent = file.name;
    document.querySelector("#texture-remove").classList.remove("hidden");
    applyMaskedTextureToMaterials();
  });
}

function loadPresetTexture(url, name) {
  if (customTextureUrl) URL.revokeObjectURL(customTextureUrl);
  customTextureUrl = "";
  new THREE.TextureLoader().load(url, (texture) => {
    setActiveTexture(texture);
    document.querySelector("#texture-input").value = "";
    document.querySelector("#texture-preview").style.backgroundImage = "";
    document.querySelector("#texture-name").textContent = "上传材质图片";
    document.querySelector("#texture-remove").classList.remove("hidden");
  });
}

function setActiveTexture(texture) {
  customTexture?.dispose();
  customTexture = texture;
  customTexture.colorSpace = THREE.SRGBColorSpace;
  customTexture.wrapS = THREE.RepeatWrapping;
  customTexture.wrapT = THREE.RepeatWrapping;
  customTexture.repeat.set(1.5, 1.5);
  customTexture.flipY = false;
  customTexture.needsUpdate = true;
  applyMaskedTextureToMaterials();
}

function clearCustomTexture() {
  customTexture?.dispose();
  customTexture = null;
  customTintMaterials.forEach((material) => {
    material.userData.customMaskedMap?.dispose();
    material.userData.customMaskedMap = null;
  });
  if (customTextureUrl) URL.revokeObjectURL(customTextureUrl);
  customTextureUrl = "";
  document.querySelector("#texture-input").value = "";
  document.querySelector("#texture-preview").style.backgroundImage = "";
  document.querySelector("#texture-name").textContent = "上传材质图片";
  document.querySelector("#texture-remove").classList.add("hidden");
  document.querySelectorAll("[data-texture]").forEach((item) => item.classList.remove("active"));
  applyCustomColor(selectedColorValue);
}

function applyMaskedTextureToMaterials() {
  customTintMaterials.forEach((material) => {
    material.userData.customMaskedMap?.dispose();
    material.userData.customMaskedMap = createMaskedTexture(material.userData.originalMap, customTexture);
  });
  applyCustomColor(selectedColorValue);
}

function createMaskedTexture(originalTexture, uploadedTexture) {
  if (!uploadedTexture?.image) return null;
  if (!originalTexture?.image) {
    const texture = uploadedTexture.clone();
    texture.needsUpdate = true;
    return texture;
  }

  const width = Math.min(originalTexture.image.width || 1024, 1024);
  const height = Math.min(originalTexture.image.height || 1024, 1024);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(originalTexture.image, 0, 0, width, height);
  const originalPixels = context.getImageData(0, 0, width, height);

  context.clearRect(0, 0, width, height);
  const pattern = context.createPattern(uploadedTexture.image, "repeat");
  context.fillStyle = pattern;
  context.fillRect(0, 0, width, height);
  const uploadedPixels = context.getImageData(0, 0, width, height);

  for (let index = 0; index < originalPixels.data.length; index += 4) {
    const luminance =
      originalPixels.data[index] * 0.2126 +
      originalPixels.data[index + 1] * 0.7152 +
      originalPixels.data[index + 2] * 0.0722;
    if (luminance > 105) {
      originalPixels.data[index] = uploadedPixels.data[index];
      originalPixels.data[index + 1] = uploadedPixels.data[index + 1];
      originalPixels.data[index + 2] = uploadedPixels.data[index + 2];
    }
  }

  context.putImageData(originalPixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = originalTexture.flipY;
  texture.wrapS = originalTexture.wrapS;
  texture.wrapT = originalTexture.wrapT;
  texture.needsUpdate = true;
  return texture;
}

function addStudioPanel(targetScene, position, size, color, rotation) {
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(size[0], size[1]),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, toneMapped: false })
  );
  panel.position.set(...position);
  panel.rotation.set(...rotation);
  targetScene.add(panel);
}

function updateCustomSummary() {
  document.querySelector("#custom-summary").textContent =
    `Back ${String(selectedBack + 1).padStart(2, "0")} · ${selectedColorName}`;
}

async function exportPoster() {
  const button = document.querySelector("#poster-export");
  const statusElement = document.querySelector("#poster-status");
  const view = window.customView;
  if (!view || !customBacks.length) {
    statusElement.textContent = "模型仍在载入，请稍后再试。";
    return;
  }

  button.disabled = true;
  button.textContent = "生成中...";
  statusElement.textContent = "正在渲染高分辨率海报...";

  try {
    await document.fonts.ready;
    const signature = await loadImage("./assets/poster/signature.png");
    const previousSize = view.renderer.getSize(new THREE.Vector2());
    const previousPixelRatio = view.renderer.getPixelRatio();
    const previousAspect = view.camera.aspect;
    const previousBackground = view.scene.background;
    const posterBackground = new THREE.Color(0xf2f2f0);

    view.renderer.setPixelRatio(1);
    view.renderer.setSize(1800, 1800, false);
    view.camera.aspect = 1;
    view.camera.updateProjectionMatrix();
    view.scene.background = posterBackground;
    view.renderer.render(view.scene, view.camera);

    const poster = document.createElement("canvas");
    poster.width = 1800;
    poster.height = 2400;
    const context = poster.getContext("2d");
    context.fillStyle = "#f2f2f0";
    context.fillRect(0, 0, poster.width, poster.height);

    context.fillStyle = "#111111";
    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    context.font = '400 40px "Gilroy", Arial, sans-serif';
    context.fillText("Endless Form", 122, 138);
    context.font = '400 16px "Gilroy", Arial, sans-serif';
    drawTrackedText(context, "DIGITAL ART PRACTICE · 2026", 1500, 138, 5);

    context.fillStyle = "rgba(17,17,17,.25)";
    context.fillRect(122, 190, 1556, 2);

    context.fillStyle = "#111111";
    context.font = '400 250px "Gilroy", Arial, sans-serif';
    context.fillText("Mesh Rare", 112, 530);
    context.font = '400 38px "Gilroy", "PingFang SC", Arial, sans-serif';
    context.fillText("我们，生而不同。", 150, 660);

    // Keep the model clear of the headline and slogan so every character
    // remains fully readable.
    context.drawImage(customCanvas, 180, 680, 1440, 1440);

    context.fillStyle = "#111111";
    context.font = '400 18px "Gilroy", Arial, sans-serif';
    drawTrackedText(context, `BACK ${String(selectedBack + 1).padStart(2, "0")} · ${selectedColorName.toUpperCase()}`, 420, 1995, 3);
    context.drawImage(signature, 1135, 1875, 480, 194);
    context.fillStyle = "rgba(17,17,17,.25)";
    context.fillRect(122, 2070, 1556, 2);
    context.fillStyle = "#111111";
    context.font = '400 28px "Gilroy", Arial, sans-serif';
    context.fillText("ONE STRUCTURE, ENDLESS IDENTITIES.", 122, 2170);
    context.font = '400 17px "Gilroy", Arial, sans-serif';
    context.fillText("MESH RARE · CUSTOM OBJECT", 122, 2240);

    view.scene.background = previousBackground;
    view.renderer.setPixelRatio(previousPixelRatio);
    view.renderer.setSize(previousSize.x, previousSize.y, false);
    view.camera.aspect = previousAspect;
    view.camera.updateProjectionMatrix();
    view.renderer.render(view.scene, view.camera);

    const link = document.createElement("a");
    link.download = `mesh-rare-back-${String(selectedBack + 1).padStart(2, "0")}.png`;
    link.href = poster.toDataURL("image/png");
    link.click();
    statusElement.textContent = "海报已生成并下载。";
  } catch (error) {
    console.error(error);
    statusElement.textContent = "海报生成失败，请重试。";
  } finally {
    button.disabled = false;
    button.textContent = "导出 PNG";
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function showAll() {
  const box = new THREE.Box3().setFromObject(collection);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  desiredTarget.set(center.x, center.y * 0.65, center.z);
  desiredPosition.set(center.x, Math.max(6.6, size.y * 1.68), Math.max(25.8, size.x * 0.9));
  if (!cameraInitialized) {
    startIntro();
    cameraInitialized = true;
    return;
  }
  cameraTransitionActive = true;
}

function startIntro() {
  const centerChair = chairGroups[Math.floor(chairGroups.length / 2)];
  if (!centerChair) {
    camera.position.copy(desiredPosition);
    controls.target.copy(desiredTarget);
    return;
  }

  const center = centerChair.box.getCenter(new THREE.Vector3());
  const size = centerChair.box.getSize(new THREE.Vector3());
  introStartTarget.set(center.x, center.y * 0.94, center.z);
  introStartPosition.set(center.x, center.y * 0.92, center.z + Math.max(2.25, size.y * 0.82));

  // Warm up every chair, material, texture and the final-view shadow map before
  // the animation clock starts, while the loading state still covers the stage.
  camera.position.copy(desiredPosition);
  controls.target.copy(desiredTarget);
  scene.background = finalBackground.clone();
  renderer.toneMappingExposure = finalExposure;
  heroLights.forEach((light) => {
    light.intensity = light.userData.finalIntensity;
  });
  const frustumCullStates = [];
  collection.traverse((node) => {
    if (!node.isMesh) return;
    frustumCullStates.push([node, node.frustumCulled]);
    node.frustumCulled = false;
  });
  renderer.compile(scene, camera);
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
  frustumCullStates.forEach(([node, frustumCulled]) => {
    node.frustumCulled = frustumCulled;
  });

  camera.position.copy(introStartPosition);
  controls.target.copy(introStartTarget);
  scene.background = introBackground.clone();
  renderer.toneMappingExposure = 0.03;
  heroLights.forEach((light) => {
    light.intensity = 0;
  });
  renderer.render(scene, camera);
  introReady = true;
  introEnter.classList.remove("hidden");
}

function updateIntro(now) {
  const progress = THREE.MathUtils.clamp((now - introStartTime - introDelay) / introDuration, 0, 1);
  const eased = progress * progress * (3 - 2 * progress);
  const lightProgress = Math.pow(eased, 1.35);
  if (!heroCopyVisible && progress >= 0.3) {
    heroCopyVisible = true;
    heroCopy.classList.add("visible");
  }

  camera.position.lerpVectors(introStartPosition, desiredPosition, eased);
  controls.target.lerpVectors(introStartTarget, desiredTarget, eased);
  scene.background.copy(introBackground).lerp(finalBackground, lightProgress);
  renderer.toneMappingExposure = THREE.MathUtils.lerp(0.03, finalExposure, lightProgress);
  heroLights.forEach((light) => {
    light.intensity = light.userData.finalIntensity * lightProgress;
  });

  if (progress >= 1) finishIntro();
}

function finishIntro() {
  if (!introActive) return;
  introActive = false;
  scene.background = finalBackground.clone();
  renderer.toneMappingExposure = finalExposure;
  heroLights.forEach((light) => {
    light.intensity = light.userData.finalIntensity;
  });
  if (!heroCopyVisible) {
    heroCopyVisible = true;
    heroCopy.classList.add("visible");
  }
  window.requestAnimationFrame(applyDetailResolution);
}

function beginIntro() {
  if (!introReady || introActive) return;
  introReady = false;
  introEnter.classList.add("hidden");
  introSound.currentTime = 0;
  introSound.play().catch(() => {});
  introStartTime = performance.now();
  introActive = true;
}

function applyDetailResolution() {
  if (detailResolutionApplied) return;
  detailResolutionApplied = true;
  renderer.setPixelRatio(detailPixelRatio);
  resize();
}

function focusChair(index) {
  finishIntro();
  const chair = chairGroups[index];
  if (!chair) return;
  const center = chair.box.getCenter(new THREE.Vector3());
  const size = chair.box.getSize(new THREE.Vector3());
  desiredTarget.set(center.x, center.y * 0.78, center.z);
  desiredPosition.set(center.x + size.x * 1.3, center.y + size.y * 0.55, center.z + Math.max(5.2, size.y * 2.15));
  cameraTransitionActive = true;
}

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  if (window.customView) {
    const customWidth = customCanvas.clientWidth;
    const customHeight = customCanvas.clientHeight;
    window.customView.renderer.setSize(customWidth, customHeight, false);
    window.customView.camera.aspect = customWidth / customHeight;
    window.customView.camera.updateProjectionMatrix();
  }
}

function animate() {
  const now = performance.now();
  if (chairNameMesh?.visible && chairNameFadeStart) {
    chairNameMesh.material.opacity = THREE.MathUtils.smoothstep((now - chairNameFadeStart) / 1200, 0, 1) * 0.72;
  }
  if (introActive) {
    updateIntro(now);
  }
  if (cameraTransitionActive && !introActive) {
    camera.position.lerp(desiredPosition, 0.065);
    controls.target.lerp(desiredTarget, 0.075);

    if (
      camera.position.distanceTo(desiredPosition) < 0.025 &&
      controls.target.distanceTo(desiredTarget) < 0.015
    ) {
      camera.position.copy(desiredPosition);
      controls.target.copy(desiredTarget);
      cameraTransitionActive = false;
    }
  }
  controls.update();
  renderer.render(scene, camera);
  if (window.customView?.active) {
    window.customView.controls.update();
    window.customView.renderer.render(window.customView.scene, window.customView.camera);
  }
  requestAnimationFrame(animate);
}
