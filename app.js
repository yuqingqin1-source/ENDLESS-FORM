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
let selectedColorName = "Original";
let selectedColorIndex = 0;
let selectedColorValue = "#9fc9df";
let colorEnabled = true;
let customTexture = null;
let customTextureUrl = "";
let materialEditorTexture = null;
let posterPreviewUrl = "";
let posterModelSnapshot = null;
let posterNameValue = "Mesh Rare";
let posterNameUpdateTimer = 0;
let posterNameUpdateToken = 0;
const customSymmetryBounds = new THREE.Vector4(0, 1, 0, 1);
const materialGradient = {
  activeId: 1,
  nextId: 3,
  stops: [
    { id: 1, x: 0.18, y: 0.28, color: "#6fb7d6" },
    { id: 2, x: 0.86, y: 0.74, color: "#f0c5a8" }
  ]
};

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

function drawPosterTitle(context, title, x, y, maxWidth) {
  let fontSize = 250;
  const safeTitle = title || "Mesh Rare";
  do {
    context.font = `400 ${fontSize}px "Gilroy", Arial, sans-serif`;
    fontSize -= 8;
  } while (context.measureText(safeTitle).width > maxWidth && fontSize > 84);
  context.fillText(safeTitle, x, y);
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
  customControls.autoRotate = true;
  customControls.autoRotateSpeed = 0.65;
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
        clone.userData.originalMap = clone.map || createSolidColorTexture(clone.color);
        clone.userData.tintableMetal = Boolean(clone.metalnessMap) || clone.metalness >= 0.35;
        clone.userData.textureEligible = shouldProjectTexture(clone);
        clone.map = clone.userData.originalMap;
        prepareSymmetryProjectionMaterial(clone);
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
    updateCustomSymmetryBounds(source);

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
  bindMaterialEditor();
  document.querySelector("#poster-export").addEventListener("click", exportPoster);
  document.querySelector("#poster-download").addEventListener("click", downloadPosterPreview);
  document.querySelector("#poster-close").addEventListener("click", closePosterPreview);
  document.querySelector("#poster-close-icon").addEventListener("click", closePosterPreview);
  document.querySelector("#poster-name-input").addEventListener("input", updatePosterName);
  document.querySelector("#poster-modal").addEventListener("click", (event) => {
    if (event.target.id === "poster-modal") closePosterPreview();
  });

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
    updateSymmetryProjectionUniforms(material);
    material.color.copy(material.userData.originalColor);
    material.metalness = material.userData.originalMetalness;
    material.roughness = material.userData.originalRoughness;
    material.emissive.set(0x000000);
    material.emissiveMap = null;
    material.emissiveIntensity = 0;
    if (material.userData.tintableMetal && colorEnabled) {
      material.color.multiply(tint.clone().lerp(new THREE.Color(0xffffff), 0.38));
    }
    if (material.userData.textureEligible) {
      material.map = material.userData.originalMap;
    }
    material.needsUpdate = true;
  });
}

function loadCustomTexture(file) {
  if (customTextureUrl) URL.revokeObjectURL(customTextureUrl);
  customTextureUrl = URL.createObjectURL(file);
  new THREE.TextureLoader().load(customTextureUrl, (texture) => {
    if (materialEditorTexture && materialEditorTexture !== customTexture) materialEditorTexture.dispose();
    materialEditorTexture = null;
    customTexture?.dispose();
    customTexture = texture;
    customTexture.colorSpace = THREE.SRGBColorSpace;
    customTexture.wrapS = THREE.RepeatWrapping;
    customTexture.wrapT = THREE.RepeatWrapping;
    customTexture.repeat.set(1, 1);
    customTexture.flipY = false;
    customTexture.needsUpdate = true;
    document.querySelector("#texture-preview").style.backgroundImage = `url("${customTextureUrl}")`;
    document.querySelector("#texture-name").textContent = file.name;
    document.querySelector("#texture-remove").classList.remove("hidden");
    applySymmetricTextureToMaterials();
  });
}

function loadPresetTexture(url, name) {
  if (customTextureUrl) URL.revokeObjectURL(customTextureUrl);
  customTextureUrl = "";
  new THREE.TextureLoader().load(url, (texture) => {
    if (materialEditorTexture && materialEditorTexture !== customTexture) materialEditorTexture.dispose();
    materialEditorTexture = null;
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
  customTexture.repeat.set(1, 1);
  customTexture.flipY = false;
  customTexture.needsUpdate = true;
  applySymmetricTextureToMaterials();
}

function clearCustomTexture() {
  if (materialEditorTexture && materialEditorTexture !== customTexture) materialEditorTexture.dispose();
  materialEditorTexture = null;
  customTexture?.dispose();
  customTexture = null;
  customTintMaterials.forEach((material) => {
    material.userData.symmetryEnabled = false;
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

function createSolidColorTexture(color) {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 4;
  const context = canvas.getContext("2d");
  context.fillStyle = `#${color.getHexString()}`;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function shouldProjectTexture(material) {
  const color = material.userData.originalColor || material.color || new THREE.Color(0xffffff);
  return color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722 > 0.16;
}

function updateCustomSymmetryBounds(source) {
  const box = new THREE.Box3().setFromObject(source);
  const size = box.getSize(new THREE.Vector3());
  customSymmetryBounds.set(
    box.getCenter(new THREE.Vector3()).x,
    Math.max(size.x * 0.5, 0.0001),
    box.min.y,
    Math.max(size.y, 0.0001)
  );
}

function prepareSymmetryProjectionMaterial(material) {
  material.userData.symmetryEnabled = false;
  material.userData.symmetryUniforms = {
    customSymmetryMap: { value: material.userData.originalMap },
    customSymmetryBounds: { value: customSymmetryBounds },
    customSymmetryRepeat: { value: new THREE.Vector2(1, 1) },
    customSymmetryEnabled: { value: false }
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, material.userData.symmetryUniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCustomWorldPosition;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvCustomWorldPosition = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", [
        "#include <common>",
        "uniform sampler2D customSymmetryMap;",
        "uniform vec4 customSymmetryBounds;",
        "uniform vec2 customSymmetryRepeat;",
        "uniform bool customSymmetryEnabled;",
        "varying vec3 vCustomWorldPosition;"
      ].join("\n"))
      .replace("#include <map_fragment>", [
        "#ifdef USE_MAP",
        "  vec4 originalTexel = texture2D( map, vMapUv );",
        "  if ( customSymmetryEnabled ) {",
        "    float symmetricX = abs( vCustomWorldPosition.x - customSymmetryBounds.x ) / customSymmetryBounds.y;",
        "    float symmetryU = clamp( symmetricX * customSymmetryRepeat.x, 0.0, 1.0 );",
        "    float symmetryV = clamp( ( ( vCustomWorldPosition.y - customSymmetryBounds.z ) / customSymmetryBounds.w ) * customSymmetryRepeat.y, 0.0, 1.0 );",
        "    vec4 projectedTexel = texture2D( customSymmetryMap, vec2( symmetryU, 1.0 - symmetryV ) );",
        "    float tintMask = step( 0.16, luminance( originalTexel.rgb ) );",
        "    diffuseColor.rgb = mix( diffuseColor.rgb * originalTexel.rgb, projectedTexel.rgb, tintMask );",
        "    diffuseColor.a *= originalTexel.a;",
        "  } else {",
        "    diffuseColor *= originalTexel;",
        "  }",
        "#endif"
      ].join("\n"));
  };
}

function updateSymmetryProjectionUniforms(material) {
  const uniforms = material.userData.symmetryUniforms;
  if (!uniforms) return;
  uniforms.customSymmetryMap.value = customTexture || material.userData.originalMap;
  uniforms.customSymmetryRepeat.value.copy(customTexture?.repeat || new THREE.Vector2(1, 1));
  uniforms.customSymmetryBounds.value = customSymmetryBounds;
  uniforms.customSymmetryEnabled.value = Boolean(customTexture && material.userData.textureEligible);
  material.userData.symmetryEnabled = uniforms.customSymmetryEnabled.value;
}

function bindMaterialEditor() {
  const editorCanvas = document.querySelector("#material-canvas");
  const colorInput = document.querySelector("#material-node-color");
  const addButton = document.querySelector("#material-add-node");
  const removeButton = document.querySelector("#material-remove-node");
  const applyButton = document.querySelector("#material-apply");
  let draggingStopId = null;
  if (!editorCanvas || !colorInput || !addButton || !removeButton || !applyButton) return;

  const setActiveStop = (id) => {
    materialGradient.activeId = id;
    const activeStop = getActiveMaterialStop();
    if (activeStop) colorInput.value = activeStop.color;
    renderGradientHandles();
    drawMaterialEditor();
  };
  const moveStop = (event, id = materialGradient.activeId, options = {}) => {
    const stop = materialGradient.stops.find((item) => item.id === id);
    if (!stop) return;
    const rect = editorCanvas.getBoundingClientRect();
    stop.x = THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width, 0, 1);
    stop.y = THREE.MathUtils.clamp((event.clientY - rect.top) / rect.height, 0, 1);
    updateGradientHandlePosition(stop);
    if (options.refreshHandles) renderGradientHandles();
    drawMaterialEditor();
  };

  editorCanvas.addEventListener("pointerdown", (event) => {
    const rect = editorCanvas.getBoundingClientRect();
    const x = THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = THREE.MathUtils.clamp((event.clientY - rect.top) / rect.height, 0, 1);
    const nearest = materialGradient.stops.reduce((best, stop) => {
      const distance = Math.hypot(stop.x - x, stop.y - y);
      return !best || distance < best.distance ? { stop, distance } : best;
    }, null);
    if (nearest) setActiveStop(nearest.stop.id);
    moveStop(event);
  });
  document.addEventListener("pointermove", (event) => {
    if (draggingStopId === null) return;
    event.preventDefault();
    moveStop(event, draggingStopId);
  });
  document.addEventListener("pointerup", () => {
    draggingStopId = null;
  });
  document.addEventListener("pointercancel", () => {
    draggingStopId = null;
  });
  colorInput.addEventListener("input", () => {
    const activeStop = getActiveMaterialStop();
    if (!activeStop) return;
    activeStop.color = colorInput.value;
    renderGradientHandles();
    drawMaterialEditor();
  });
  addButton.addEventListener("click", () => {
    const activeStop = getActiveMaterialStop() || materialGradient.stops[materialGradient.stops.length - 1];
    const stop = {
      id: materialGradient.nextId,
      x: THREE.MathUtils.clamp((activeStop?.x ?? 0.5) + 0.12, 0.08, 0.92),
      y: THREE.MathUtils.clamp((activeStop?.y ?? 0.5) + 0.08, 0.08, 0.92),
      color: activeStop?.color || colorInput.value
    };
    materialGradient.nextId += 1;
    materialGradient.stops.push(stop);
    setActiveStop(stop.id);
  });
  removeButton.addEventListener("click", () => {
    if (materialGradient.stops.length <= 1) return;
    const activeIndex = materialGradient.stops.findIndex((stop) => stop.id === materialGradient.activeId);
    if (activeIndex === -1) return;
    materialGradient.stops.splice(activeIndex, 1);
    const nextStop = materialGradient.stops[Math.max(0, activeIndex - 1)];
    setActiveStop(nextStop.id);
  });
  applyButton.addEventListener("click", applyMaterialEditorTexture);
  window.materialEditorStartDrag = (id) => {
    draggingStopId = id;
  };
  window.materialEditorMoveStop = moveStop;
  window.materialEditorSetActiveStop = setActiveStop;
  renderGradientHandles();
  drawMaterialEditor();
}

function getActiveMaterialStop() {
  return materialGradient.stops.find((stop) => stop.id === materialGradient.activeId) || materialGradient.stops[0];
}

function renderGradientHandles() {
  const handlesLayer = document.querySelector("#gradient-handles");
  const colorInput = document.querySelector("#material-node-color");
  const removeButton = document.querySelector("#material-remove-node");
  if (!handlesLayer) return;
  handlesLayer.innerHTML = "";
  materialGradient.stops.forEach((stop, index) => {
    const handle = document.createElement("button");
    handle.className = `gradient-handle${stop.id === materialGradient.activeId ? " active" : ""}`;
    handle.type = "button";
    handle.dataset.stopId = String(stop.id);
    handle.style.left = `${stop.x * 100}%`;
    handle.style.top = `${stop.y * 100}%`;
    handle.style.background = stop.color;
    handle.setAttribute("aria-label", `渐变颜色节点 ${index + 1}`);
    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      window.materialEditorSetActiveStop?.(stop.id);
      window.materialEditorStartDrag?.(stop.id);
      window.materialEditorMoveStop?.(event, stop.id);
    });
    handlesLayer.appendChild(handle);
  });
  const activeStop = getActiveMaterialStop();
  if (colorInput && activeStop) colorInput.value = activeStop.color;
  if (removeButton) removeButton.disabled = materialGradient.stops.length <= 1;
}

function updateGradientHandlePosition(stop) {
  const handle = document.querySelector(`.gradient-handle[data-stop-id="${stop.id}"]`);
  if (!handle) return;
  handle.style.left = `${stop.x * 100}%`;
  handle.style.top = `${stop.y * 100}%`;
}

function drawMaterialEditor() {
  const editorCanvas = document.querySelector("#material-canvas");
  if (!editorCanvas) return;

  const width = editorCanvas.width;
  const height = editorCanvas.height;
  const context = editorCanvas.getContext("2d");
  const imageData = context.createImageData(width, height);
  const stops = materialGradient.stops.map((stop) => ({
    x: stop.x * (width - 1),
    y: stop.y * (height - 1),
    color: hexToRgb(stop.color)
  }));

  if (stops.length === 1) {
    const [stop] = stops;
    context.fillStyle = `rgb(${stop.color.r}, ${stop.color.g}, ${stop.color.b})`;
    context.fillRect(0, 0, width, height);
    return;
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let total = 0;
      stops.forEach((stop) => {
        const dx = x - stop.x;
        const dy = y - stop.y;
        const weight = 1 / (dx * dx + dy * dy + 900);
        red += stop.color.r * weight;
        green += stop.color.g * weight;
        blue += stop.color.b * weight;
        total += weight;
      });
      const index = (y * width + x) * 4;
      imageData.data[index] = Math.round(red / total);
      imageData.data[index + 1] = Math.round(green / total);
      imageData.data[index + 2] = Math.round(blue / total);
      imageData.data[index + 3] = 255;
    }
  }
  context.putImageData(imageData, 0, 0);
}

function hexToRgb(hex) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function applyMaterialEditorTexture() {
  const editorCanvas = document.querySelector("#material-canvas");
  if (!editorCanvas) return;
  materialEditorTexture?.dispose();
  materialEditorTexture = new THREE.CanvasTexture(editorCanvas);
  materialEditorTexture.colorSpace = THREE.SRGBColorSpace;
  materialEditorTexture.wrapS = THREE.RepeatWrapping;
  materialEditorTexture.wrapT = THREE.RepeatWrapping;
  materialEditorTexture.repeat.set(1, 1);
  materialEditorTexture.flipY = false;
  materialEditorTexture.needsUpdate = true;
  setActiveTexture(materialEditorTexture);
  document.querySelector("#texture-remove").classList.remove("hidden");
  document.querySelectorAll("[data-texture]").forEach((item) => item.classList.remove("active"));
}

function applySymmetricTextureToMaterials() {
  customTintMaterials.forEach((material) => {
    material.userData.customMaskedMap?.dispose();
    material.userData.customMaskedMap = null;
    updateSymmetryProjectionUniforms(material);
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
  drawSymmetricTextureFill(context, uploadedTexture.image, width, height);
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

function drawSymmetricTextureFill(context, image, width, height) {
  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const sourceContext = source.getContext("2d");
  const pattern = sourceContext.createPattern(image, "repeat");
  sourceContext.fillStyle = pattern;
  sourceContext.fillRect(0, 0, width, height);
  drawMirroredLeftHalf(context, source, width, height);
}

function drawMirroredLeftHalf(context, source, width, height) {
  const halfWidth = Math.ceil(width / 2);
  context.clearRect(0, 0, width, height);
  context.drawImage(source, 0, 0, halfWidth, height, 0, 0, halfWidth, height);
  context.save();
  context.translate(width, 0);
  context.scale(-1, 1);
  context.drawImage(source, 0, 0, halfWidth, height, 0, 0, halfWidth, height);
  context.restore();
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
  const summaryElement = document.querySelector("#custom-summary");
  if (!summaryElement) return;
  summaryElement.textContent = `Back ${String(selectedBack + 1).padStart(2, "0")}`;
}

async function exportPoster() {
  const button = document.querySelector("#poster-export");
  const statusElement = document.querySelector("#poster-status");
  const modal = document.querySelector("#poster-modal");
  const previewImage = document.querySelector("#poster-preview");
  const posterNumber = document.querySelector("#poster-number");
  const view = window.customView;
  if (!view || !customBacks.length) {
    statusElement.textContent = "模型仍在载入，请稍后再试。";
    return;
  }

  button.disabled = true;
  button.textContent = "生成中...";
  statusElement.textContent = "正在生成海报预览...";

  try {
    posterNameValue = getPosterName();
    posterModelSnapshot = await createPosterModelSnapshot();
    posterPreviewUrl = await createPosterImage(posterNameValue, posterModelSnapshot);
    previewImage.src = posterPreviewUrl;
    posterNumber.textContent = `NO.${String(selectedBack + 1).padStart(3, "0")}`;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("poster-modal-open");
    statusElement.textContent = "海报预览已打开。";
  } catch (error) {
    console.error(error);
    statusElement.textContent = "海报生成失败，请重试。";
  } finally {
    button.disabled = false;
    button.textContent = "重新创建";
  }
}

async function createPosterModelSnapshot() {
  const view = window.customView;
  const previousSize = view.renderer.getSize(new THREE.Vector2());
  const previousPixelRatio = view.renderer.getPixelRatio();
  const previousAspect = view.camera.aspect;
  const previousBackground = view.scene.background;
  const posterBackground = new THREE.Color(0xf2f2f0);
  let snapshotUrl = "";
  try {
    view.renderer.setPixelRatio(1);
    view.renderer.setSize(1800, 1800, false);
    view.camera.aspect = 1;
    view.camera.updateProjectionMatrix();
    view.scene.background = posterBackground;
    view.renderer.render(view.scene, view.camera);
    snapshotUrl = customCanvas.toDataURL("image/png");
  } finally {
    view.scene.background = previousBackground;
    view.renderer.setPixelRatio(previousPixelRatio);
    view.renderer.setSize(previousSize.x, previousSize.y, false);
    view.camera.aspect = previousAspect;
    view.camera.updateProjectionMatrix();
    view.renderer.render(view.scene, view.camera);
  }
  return await loadImage(snapshotUrl);
}

async function createPosterImage(title = getPosterName(), modelImage = posterModelSnapshot) {
  if (!modelImage) modelImage = await createPosterModelSnapshot();
  await document.fonts.ready;
  const signature = await loadImage("./assets/poster/signature.png");
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
  drawPosterTitle(context, title, 112, 530, 1350);
  context.font = '400 38px "Gilroy", "PingFang SC", Arial, sans-serif';
  context.fillText("我们，生而不同。", 150, 660);

  // Keep the model clear of the headline and slogan so every character
  // remains fully readable.
  context.drawImage(modelImage, 180, 680, 1440, 1440);

  context.fillStyle = "#111111";
  context.font = '400 18px "Gilroy", Arial, sans-serif';
  drawTrackedText(context, `BACK ${String(selectedBack + 1).padStart(2, "0")}`, 260, 1995, 3);
  context.drawImage(signature, 1135, 1875, 480, 194);
  context.fillStyle = "rgba(17,17,17,.25)";
  context.fillRect(122, 2070, 1556, 2);
  context.fillStyle = "#111111";
  context.font = '400 28px "Gilroy", Arial, sans-serif';
  context.fillText("ONE STRUCTURE, ENDLESS IDENTITIES.", 122, 2170);
  context.font = '400 17px "Gilroy", Arial, sans-serif';
  context.fillText("MESH RARE · CUSTOM OBJECT", 122, 2240);

  return poster.toDataURL("image/png");
}

function downloadPosterPreview() {
  const statusElement = document.querySelector("#poster-status");
  if (!posterPreviewUrl) {
    statusElement.textContent = "请先生成海报预览。";
    return;
  }
  const link = document.createElement("a");
  link.download = `${slugifyPosterName(getPosterName())}-back-${String(selectedBack + 1).padStart(2, "0")}.png`;
  link.href = posterPreviewUrl;
  link.click();
  statusElement.textContent = "图片已下载。";
}

function getPosterName() {
  const input = document.querySelector("#poster-name-input");
  const value = input?.value.trim();
  return value || "Mesh Rare";
}

function slugifyPosterName(name) {
  return (name || "mesh-rare")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "") || "mesh-rare";
}

function updatePosterName() {
  posterNameValue = getPosterName();
  const modal = document.querySelector("#poster-modal");
  if (modal.classList.contains("hidden") || !posterPreviewUrl) return;
  window.clearTimeout(posterNameUpdateTimer);
  posterNameUpdateTimer = window.setTimeout(refreshPosterNamePreview, 420);
}

async function refreshPosterNamePreview() {
  const token = posterNameUpdateToken + 1;
  posterNameUpdateToken = token;
  const statusElement = document.querySelector("#poster-status");
  const previewImage = document.querySelector("#poster-preview");
  statusElement.textContent = "正在更新海报命名...";
  try {
    const nextPreviewUrl = await createPosterImage(getPosterName());
    if (token !== posterNameUpdateToken) return;
    posterPreviewUrl = nextPreviewUrl;
    previewImage.src = posterPreviewUrl;
    statusElement.textContent = "命名已更新，可下载图片。";
  } catch (error) {
    console.error(error);
    statusElement.textContent = "命名更新失败，请重试。";
  }
}

function closePosterPreview() {
  const modal = document.querySelector("#poster-modal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("poster-modal-open");
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
