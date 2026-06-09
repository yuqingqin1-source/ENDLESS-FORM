import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.querySelector("#chair-canvas");
const status = document.querySelector("#model-status");
const customCanvas = document.querySelector("#custom-canvas");
const customStatus = document.querySelector("#custom-status");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf3f3f3);
scene.fog = new THREE.Fog(0xf3f3f3, 38, 68);

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.55;
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
let cameraInitialized = false;
let cameraTransitionActive = false;
const customBacks = [];
const customTintMaterials = [];
let selectedBack = 0;
let selectedColorName = "Pale Blue";
let selectedColorIndex = 0;

controls.addEventListener("start", () => {
  cameraTransitionActive = false;
});

addLights();
loadCollection();
initCustomizer();
bindSelector();
document.querySelector(".menu-button").addEventListener("click", () => {
  document.querySelector("#selector").scrollIntoView({ behavior: "smooth" });
});
resize();
animate();
window.addEventListener("resize", resize);

function addLights() {
  scene.add(new THREE.AmbientLight(0xffffff, 2.1));
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d8d4, 3.4));

  const key = new THREE.DirectionalLight(0xffffff, 5.2);
  key.position.set(-7, 14, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -22;
  key.shadow.camera.right = 22;
  key.shadow.camera.top = 15;
  key.shadow.camera.bottom = -8;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 4.2);
  fill.position.set(8, 8, 12);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xf1f5ff, 3.2);
  rim.position.set(0, 7, -10);
  scene.add(rim);

  const front = new THREE.PointLight(0xffffff, 45, 45, 1.6);
  front.position.set(0, 5, 12);
  scene.add(front);

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
    showAll();
    status.classList.add("hidden");
  }, undefined, (error) => {
    console.error(error);
    status.textContent = "模型加载失败，请通过本地服务器打开页面。";
  });
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
      if (button.dataset.chair === "all") showAll();
      else focusChair(Number(button.dataset.chair));
      document.querySelector("#collection").scrollIntoView({ behavior: "smooth" });
    });
  });
}

function initCustomizer() {
  const customScene = new THREE.Scene();
  customScene.background = new THREE.Color(0xf4f4f4);

  const customCamera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
  customCamera.position.set(4.4, 3.1, 6.8);

  const customRenderer = new THREE.WebGLRenderer({ canvas: customCanvas, antialias: true });
  customRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
      updateCustomQuote();
    });
  });

  document.querySelectorAll("[data-color]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedColorName = button.dataset.colorName;
      selectedColorIndex = [...document.querySelectorAll("[data-color]")].indexOf(button);
      applyCustomColor(button.dataset.color);
      document.querySelectorAll("[data-color]").forEach((item) => item.classList.toggle("active", item === button));
      updateCustomSummary();
      updateCustomQuote();
    });
  });

  document.querySelector("#order-button").addEventListener("click", () => {
    const total = calculateCustomQuote().total.toLocaleString("zh-CN");
    document.querySelector("#order-status").textContent =
      `已生成订单意向：Back ${String(selectedBack + 1).padStart(2, "0")} · ${selectedColorName} · ¥${total}。`;
  });

  window.customView = { scene: customScene, camera: customCamera, renderer: customRenderer, controls: customControls };
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
    if (material.userData.tintableMetal) {
      material.color.multiply(tint.clone().lerp(new THREE.Color(0xffffff), 0.38));
    }
    material.needsUpdate = true;
  });
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
  document.querySelector("#custom-summary").textContent = `Back ${String(selectedBack + 1).padStart(2, "0")} · ${selectedColorName}`;
}

function calculateCustomQuote() {
  const base = 8200;
  const backUpgrade = selectedBack === 0 ? 0 : 2000;
  const colorUpgrade = 1000;
  return { base, backUpgrade, colorUpgrade, total: base + backUpgrade + colorUpgrade };
}

function updateCustomQuote() {
  const quote = calculateCustomQuote();
  document.querySelector("#back-price-line strong").textContent = `+ ¥${quote.backUpgrade.toLocaleString("zh-CN")}`;
  document.querySelector("#color-price-line strong").textContent = `+ ¥${quote.colorUpgrade.toLocaleString("zh-CN")}`;
  document.querySelector("#custom-price").textContent = `¥${quote.total.toLocaleString("zh-CN")}`;
  document.querySelector("#order-status").textContent = "";
}

function showAll() {
  const box = new THREE.Box3().setFromObject(collection);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  desiredTarget.set(center.x, center.y * 0.65, center.z);
  desiredPosition.set(center.x, Math.max(6.6, size.y * 1.68), Math.max(25.8, size.x * 0.9));
  if (!cameraInitialized) {
    camera.position.copy(desiredPosition);
    controls.target.copy(desiredTarget);
    cameraInitialized = true;
    return;
  }
  cameraTransitionActive = true;
}

function focusChair(index) {
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
  if (cameraTransitionActive) {
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
  if (window.customView) {
    window.customView.controls.update();
    window.customView.renderer.render(window.customView.scene, window.customView.camera);
  }
  requestAnimationFrame(animate);
}
