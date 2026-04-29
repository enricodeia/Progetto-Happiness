import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass'
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader'
import { Pane } from 'tweakpane'
import * as EssentialsPlugin from '@tweakpane/plugin-essentials'

import trailFragment from './shaders/trail/fragment.glsl'
import trailSmokeFragment from './shaders/smoke/fragment.glsl'
import iceVertex from './shaders/ice/vertex.glsl'
import iceFragment from './shaders/ice/fragment.glsl'
import smokeVertex from './shaders/ice-smoke/vertex.glsl'
import smokeFragment from './shaders/ice-smoke/fragment.glsl'
import grassFragment from './shaders/grass/fragment.glsl'
import grassParticlesFragment from './shaders/grass-particles/fragment.glsl'
import filmGrainFragment from './shaders/postprocessing/filmgrain.glsl'
import RiceField from './RiceField.js'
import Mushrooms from './Mushrooms.js'
import { hillAt, hillNormalAt } from './HeightField.js'

// ─── Texture loading ────────────────────────────────────────────
const textureLoader = new THREE.TextureLoader()

function loadTexture(path) {
	const tex = textureLoader.load(path)
	tex.wrapS = THREE.RepeatWrapping
	tex.wrapT = THREE.RepeatWrapping
	return tex
}

const textures = {
	cracks: [
		loadTexture('/textures/cracks-1.png'),
		loadTexture('/textures/cracks-2.png'),
		loadTexture('/textures/cracks-3.png'),
		loadTexture('/textures/cracks-7.png'),
		loadTexture('/textures/cracks-8.png'),
		loadTexture('/textures/cracks-11.png'),
		loadTexture('/textures/cracks-12.png'),
	],
	perlin: [
		loadTexture('/textures/super-perlin-1.png'),
		loadTexture('/textures/super-perlin-2.png'),
	],
}

let crackMap = textures.cracks[0]
let perlinMap = textures.perlin[0]

const raycaster = new THREE.Raycaster()

// ─── Parameters ─────────────────────────────────────────────────
const params = {
	// Trail / Brush
	brushSize: 0.08,
	brushSoftness: 0.375,
	decayRate: 1.0,
	noiseScale1: 15,
	noiseScale2: 30,
	noiseAmount1: 0.03,
	noiseAmount2: 0.02,
	texelScale: 0.75,
	trailIntensity: 1.0,
	trailColor: { r: 1.0, g: 1.0, b: 1.0 },

	// Symmetry
	symmetry: 0,

	// Smoke / Curl
	curlScale1: 4,
	curlScale2: 8,
	curlSpeed: 0.1,
	curlStrength1: 0.15,
	curlStrength2: 0.3,
	smokeDecay: 0.5,
	smokeColor1: { r: 0.25, g: 0.1, b: 0.9 },
	smokeColor2: { r: 0.1, g: 0.9, b: 0.8 },
	smokeGlowPower1: 10,
	smokeGlowPower2: 4,

	// Ice Surface
	parallaxDistance: 1.0,
	crackScale: 4.0,
	crackIntensity: 1.0,
	frostedIntensity: 0.6,
	perlinDetailScale: 10.0,
	colorBlue: { r: 0, g: 0.2, b: 0.25 },
	colorDeepBlue: { r: 0, g: 0.01, b: 0.03 },
	colorGreen: { r: 0.1, g: 0.2, b: 0.35 },
	colorAccent: { r: 0.1, g: 0.7, b: 0.7 },
	vignetteStart: 0.2,
	vignetteEnd: 1.0,
	trailTint: { r: 1.0, g: 1.0, b: 1.0 },
	trailGlow: 0.0,

	// Ice Smoke / Frost particles
	glitterScale: 400,
	glitterPower: 32,
	glitterIntensity: 3.0,
	frostPerlinScale1: 2.0,
	frostPerlinScale2: 0.5,
	frostPerlinSpeed: 0.05,
	frostAlphaPower: 0.3,
	frostMaxAlpha: 0.3,
	frostColor: { r: 0.03, g: 0.4, b: 0.7 },
	frostVignetteStart: 0.4,
	frostVignetteEnd: 1.0,
	smokeHeight: 0.5,

	// Post-processing
	bloomEnabled: true,
	bloomStrength: 0.4,
	bloomRadius: 0.5,
	bloomThreshold: 0.8,
	chromaticEnabled: false,
	chromaticAmount: 0.003,
	grainEnabled: false,
	grainIntensity: 0.08,

	// Scene
	bgColor: { r: 0, g: 0.01, b: 0.02 },
	ambientIntensity: 1.5,
	directionalIntensity: 4.5,
	lightX: 3,
	lightY: 10,
	lightZ: 7,

	// Camera
	fov: 60,

	// Textures
	crackTexture: 0,
	perlinTexture: 0,

	// Smoke resolution
	smokeResolution: 0.25,

	// Geometry
	geometry: 'plane',

	// Surface material
	surfaceMaterial: 'ice',

	// Impact
	impactEnabled: true,
	impactRadius: 0.25,
	impactRays: 8,
	impactStrengthMax: 1.5,
	impactShockwave: true,
	shockwaveStrength: 1.5,
	displacementStrength: 0.8,
	deepWaterColor: { r: 0.0, g: 0.03, b: 0.08 },
	deepRevealThreshold: 0.5,
	deepRevealIntensity: 0.9,
	fovPunchAmount: 3,

	// Auto-draw
	autoDrawEnabled: false,
	autoDrawPattern: 'circle',
	autoDrawSpeed: 1.0,
	autoDrawScale: 0.3,
	autoDrawLissajousA: 3,
	autoDrawLissajousB: 2,
	autoDrawComplexity: 5,

	// Rice field (3D blades on top of ground)
	riceEnabled: true,
	riceCount: 11800,
	riceBladeHeight: 0.82,
	riceBladeWidth: 0.082,
	riceWindStrength: 0.13,
	riceWindScale: 5.5,
	riceTrailBend: 0.65,
	riceTrailCutAmount: 1.0,
	riceBaseColor: { r: 0.03, g: 0.09, b: 0.03 },
	riceTipColor: { r: 0.06, g: 0.26, b: 0.08 },

	// Rice hover (proximity shrink)
	riceHoverEnabled: true,
	riceHoverRadius: 5.4,
	riceHoverAmount: 0.62,

	// Disc mask (round plane)
	discRadius: 0.49,
	riceDiscRadius: 20.0,

	// Rice realism
	riceNaturalCurl: 0.33,
	riceTipBoost: 0.0,

	// Fog
	fogEnabled: true,
	fogColor: { r: 0.05, g: 0.08, b: 0.08 },
	fogNear: 8,
	fogFar: 60,

	// Hills (up to 4). radius = 2*sigma of the gaussian bump
	hills: [
		{ enabled: true, x: 0, z: 0, height: 3.0, radius: 14 },
		{ enabled: false, x: 8, z: 6, height: 1.5, radius: 6 },
		{ enabled: false, x: -10, z: 4, height: 1.8, radius: 7 },
		{ enabled: false, x: 4, z: -9, height: 1.2, radius: 5 },
	],

	// Mushrooms
	mushroomsEnabled: true,
	mushroomScale: 1.0,
	mushroomCapColor: '#0a2a35',
	mushroomCapEmissive: '#40c4ff',
	mushroomCapEmissiveIntensity: 1.8,
	mushroomStemColor: '#e8dcc8',
	mushroomLightColor: '#40e0ff',
	mushroomLightIntensityMax: 1.2,
	mushroomLightDistance: 2.5,
	mushroomSpawnRadius: 0.35,
	mushroomMinPerSpawn: 1,
	mushroomMaxPerSpawn: 4,
	mushroomMinCursorMove: 0.15,
	mushroomSpawnCooldownMs: 120,
	mushroomGrowDuration: 0.7,
	mushroomLifetime: 3.0,
	mushroomShrinkDuration: 0.6,
	mushroomBounceOvershoot: 1.15,
}

// ─── Scene ──────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(params.bgColor.r, params.bgColor.g, params.bgColor.b)

const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
}

// ─── Camera ─────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(params.fov, sizes.width / sizes.height, 0.1, 100)
camera.position.set(4, 8, 8)
camera.lookAt(new THREE.Vector3(0, 2.5, 0))

// ─── Renderer ───────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({
	antialias: window.devicePixelRatio < 2,
	preserveDrawingBuffer: true,
})
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
document.body.appendChild(renderer.domElement)

// ─── Controls ───────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// ─── Lights ─────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, params.ambientIntensity)
const directionalLight = new THREE.DirectionalLight(0xffffff, params.directionalIntensity)
directionalLight.position.set(params.lightX, params.lightY, params.lightZ)
scene.add(ambientLight, directionalLight)

// ─── Render Targets ─────────────────────────────────────────────
function createRenderTarget(w, h) {
	return new THREE.WebGLRenderTarget(w, h, {
		type: THREE.HalfFloatType,
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		depthBuffer: false,
	})
}

const rt1 = createRenderTarget(sizes.width, sizes.height)
const rt2 = createRenderTarget(sizes.width, sizes.height)
let inputRT = rt1
let outputRT = rt2

const rt3 = createRenderTarget(sizes.width * params.smokeResolution, sizes.height * params.smokeResolution)
const rt4 = createRenderTarget(sizes.width * params.smokeResolution, sizes.height * params.smokeResolution)
let smokeInputRT = rt3
let smokeOutputRT = rt4

// ─── Trail Scene ────────────────────────────────────────────────
const trailScene = new THREE.Scene()
const trailGeometry = new THREE.BufferGeometry()
trailGeometry.setAttribute(
	'position',
	new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)
)
trailGeometry.setAttribute(
	'uv',
	new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2)
)

const trailMaterial = new THREE.ShaderMaterial({
	vertexShader: /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = vec4(position, 1.0);
		}
	`,
	fragmentShader: trailFragment,
	uniforms: {
		uResolution: new THREE.Uniform(new THREE.Vector2(sizes.width, sizes.height)),
		uMap: new THREE.Uniform(),
		uUVPointer: new THREE.Uniform(new THREE.Vector2(0, 0)),
		uDt: new THREE.Uniform(0.0),
		uSpeed: new THREE.Uniform(0),
		uTime: new THREE.Uniform(0),
		uBrushSize: new THREE.Uniform(params.brushSize),
		uBrushSoftness: new THREE.Uniform(params.brushSoftness),
		uDecayRate: new THREE.Uniform(params.decayRate),
		uNoiseScale1: new THREE.Uniform(params.noiseScale1),
		uNoiseScale2: new THREE.Uniform(params.noiseScale2),
		uNoiseAmount1: new THREE.Uniform(params.noiseAmount1),
		uNoiseAmount2: new THREE.Uniform(params.noiseAmount2),
		uTexelScale: new THREE.Uniform(params.texelScale),
		uTrailIntensity: new THREE.Uniform(params.trailIntensity),
		uSymmetry: new THREE.Uniform(params.symmetry),
		uTrailColor: new THREE.Uniform(new THREE.Color(1, 1, 1)),
		uImpactStrength: new THREE.Uniform(0),
		uImpactRadius: new THREE.Uniform(params.impactRadius),
		uImpactRays: new THREE.Uniform(params.impactRays),
	},
})

const trailMesh = new THREE.Mesh(trailGeometry, trailMaterial)
trailScene.add(trailMesh)

// ─── Smoke Trail Scene ──────────────────────────────────────────
const trailSmokeMaterial = new THREE.ShaderMaterial({
	vertexShader: /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = vec4(position, 1.0);
		}
	`,
	fragmentShader: trailSmokeFragment,
	uniforms: {
		uResolution: { value: new THREE.Vector2(sizes.width * params.smokeResolution, sizes.height * params.smokeResolution) },
		uMap: new THREE.Uniform(),
		uUVPointer: trailMaterial.uniforms.uUVPointer,
		uDt: trailMaterial.uniforms.uDt,
		uSpeed: trailMaterial.uniforms.uSpeed,
		uTime: trailMaterial.uniforms.uTime,
		uCurlScale1: new THREE.Uniform(params.curlScale1),
		uCurlScale2: new THREE.Uniform(params.curlScale2),
		uCurlSpeed: new THREE.Uniform(params.curlSpeed),
		uCurlStrength1: new THREE.Uniform(params.curlStrength1),
		uCurlStrength2: new THREE.Uniform(params.curlStrength2),
		uSmokeDecay: new THREE.Uniform(params.smokeDecay),
		uSmokeColor1: new THREE.Uniform(new THREE.Color(params.smokeColor1.r, params.smokeColor1.g, params.smokeColor1.b)),
		uSmokeColor2: new THREE.Uniform(new THREE.Color(params.smokeColor2.r, params.smokeColor2.g, params.smokeColor2.b)),
		uSmokeGlowPower1: new THREE.Uniform(params.smokeGlowPower1),
		uSmokeGlowPower2: new THREE.Uniform(params.smokeGlowPower2),
	},
})

const trailSmokeMesh = new THREE.Mesh(trailGeometry, trailSmokeMaterial)
const trailSmokeScene = new THREE.Scene()
trailSmokeScene.add(trailSmokeMesh)

// ─── Mouse ──────────────────────────────────────────────────────
const pointer = new THREE.Vector2()
const prevPointerUV = new THREE.Vector2(0.5, 0.5)
let pointerSpeed = 0

window.addEventListener('pointermove', (ev) => {
	pointer.x = (ev.clientX / sizes.width) * 2 - 1
	pointer.y = -(ev.clientY / sizes.height) * 2 + 1
})

// ─── Impact System ──────────────────────────────────────────────
const shockwave = { x: 0, y: 0, progress: 0, active: false }
let impactActive = false
let impactDecay = 0
let fovPunch = 0

function handleImpactDown(ev) {
	if (!params.impactEnabled) return
	// Don't trigger on tweakpane clicks
	if (ev.target !== renderer.domElement) return

	impactActive = true
	impactDecay = params.impactStrengthMax

	// Trigger shockwave at current UV pointer
	if (params.impactShockwave) {
		const currentUV = trailMaterial.uniforms.uUVPointer.value
		shockwave.x = currentUV.x
		shockwave.y = currentUV.y
		shockwave.progress = 0.001
		shockwave.active = true
	}

	// FOV punch
	fovPunch = params.fovPunchAmount
}

function handleImpactUp() {
	impactActive = false
}

window.addEventListener('pointerdown', handleImpactDown)
window.addEventListener('pointerup', handleImpactUp)

// ─── Ground (Ice Surface) ───────────────────────────────────────
const groundMaterial = new THREE.ShaderMaterial({
	vertexShader: iceVertex,
	fragmentShader: iceFragment,
	transparent: true,
	uniforms: {
		uTrailMap: new THREE.Uniform(),
		uCracksMap: new THREE.Uniform(crackMap),
		uPerlin: new THREE.Uniform(perlinMap),
		uParallaxDistance: new THREE.Uniform(params.parallaxDistance),
		uColorBlue: new THREE.Uniform(new THREE.Color(params.colorBlue.r, params.colorBlue.g, params.colorBlue.b)),
		uColorDeepBlue: new THREE.Uniform(new THREE.Color(params.colorDeepBlue.r, params.colorDeepBlue.g, params.colorDeepBlue.b)),
		uColorGreen: new THREE.Uniform(new THREE.Color(params.colorGreen.r, params.colorGreen.g, params.colorGreen.b)),
		uColorAccent: new THREE.Uniform(new THREE.Color(params.colorAccent.r, params.colorAccent.g, params.colorAccent.b)),
		uCrackScale: new THREE.Uniform(params.crackScale),
		uCrackIntensity: new THREE.Uniform(params.crackIntensity),
		uFrostedIntensity: new THREE.Uniform(params.frostedIntensity),
		uPerlinDetailScale: new THREE.Uniform(params.perlinDetailScale),
		uVignetteStart: new THREE.Uniform(params.vignetteStart),
		uVignetteEnd: new THREE.Uniform(params.vignetteEnd),
		uBgColor: new THREE.Uniform(new THREE.Color(params.bgColor.r, params.bgColor.g, params.bgColor.b)),
		uTrailTint: new THREE.Uniform(new THREE.Color(1, 1, 1)),
		uTrailGlow: new THREE.Uniform(params.trailGlow),
		uDisplacementStrength: new THREE.Uniform(params.displacementStrength),
		uShockwave: new THREE.Uniform(new THREE.Vector3(0, 0, 0)),
		uShockwaveStrength: new THREE.Uniform(params.shockwaveStrength),
		uTime: new THREE.Uniform(0),
		uDeepWaterColor: new THREE.Uniform(new THREE.Color(params.deepWaterColor.r, params.deepWaterColor.g, params.deepWaterColor.b)),
		uDeepRevealThreshold: new THREE.Uniform(params.deepRevealThreshold),
		uDeepRevealIntensity: new THREE.Uniform(params.deepRevealIntensity),
		uDiscRadius: new THREE.Uniform(params.discRadius),
		uHills: { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, 0, 0)) },
		uFogColor: new THREE.Uniform(new THREE.Color(params.fogColor.r, params.fogColor.g, params.fogColor.b)),
		uFogNear: new THREE.Uniform(params.fogNear),
		uFogFar: new THREE.Uniform(params.fogFar),
		uFogEnabled: new THREE.Uniform(params.fogEnabled ? 1 : 0),
	},
})

// Helper to write hill state into a uniform array
function hillsToVec4Array(hills, vec4Array) {
	for (let i = 0; i < 4; i++) {
		const h = hills[i]
		if (h && h.enabled) {
			vec4Array[i].set(h.x, h.z, h.height, h.radius)
		} else {
			vec4Array[i].set(0, 0, 0, 0)
		}
	}
}

function syncHills() {
	hillsToVec4Array(params.hills, groundMaterial.uniforms.uHills.value)
	if (riceField?.material) {
		hillsToVec4Array(params.hills, riceField.material.uniforms.uHills.value)
	}
}

// ─── Geometry Factory ───────────────────────────────────────────
function createGroundGeometry(type) {
	switch (type) {
		case 'plane': {
			const g = new THREE.PlaneGeometry(40, 40, 256, 256)
			g.rotateX(-Math.PI * 0.5)
			return g
		}
		case 'sphere':
			return new THREE.SphereGeometry(8, 128, 128)
		case 'torus':
			return new THREE.TorusGeometry(6, 2.5, 64, 128)
		case 'cylinder': {
			const g = new THREE.CylinderGeometry(6, 6, 12, 128, 64, true)
			return g
		}
		case 'torusknot':
			return new THREE.TorusKnotGeometry(5, 1.5, 128, 32)
		default: {
			const g = new THREE.PlaneGeometry(40, 40, 256, 256)
			g.rotateX(-Math.PI * 0.5)
			return g
		}
	}
}

function createSmokeGeometry(type) {
	switch (type) {
		case 'plane': {
			const g = new THREE.PlaneGeometry(40, 40, 100, 100)
			g.rotateX(-Math.PI * 0.5)
			return g
		}
		case 'sphere':
			return new THREE.SphereGeometry(8.5, 100, 100)
		case 'torus':
			return new THREE.TorusGeometry(6, 3.0, 64, 128)
		case 'cylinder':
			return new THREE.CylinderGeometry(6.5, 6.5, 12, 100, 50, true)
		case 'torusknot':
			return new THREE.TorusKnotGeometry(5, 2.0, 128, 32)
		default: {
			const g = new THREE.PlaneGeometry(40, 40, 100, 100)
			g.rotateX(-Math.PI * 0.5)
			return g
		}
	}
}

let ground = new THREE.Mesh(createGroundGeometry('plane'), groundMaterial)
scene.add(ground)

// ─── Rice Field (3D blades on top of ground) ───────────────────
const riceField = new RiceField({ scene, params, fieldSize: 40 })
riceField.setNoiseTexture(perlinMap)

// ─── Scene fog (for MeshStandardMaterial objects like mushrooms) ─
scene.fog = new THREE.Fog(
	new THREE.Color(params.fogColor.r, params.fogColor.g, params.fogColor.b),
	params.fogNear,
	params.fogFar,
)

// ─── Mushrooms (grow on cursor hit) ────────────────────────────
const mushrooms = new Mushrooms({
	scene,
	config: {
		stemColor: new THREE.Color(params.mushroomStemColor).getHex(),
		capColor: new THREE.Color(params.mushroomCapColor).getHex(),
		capEmissive: new THREE.Color(params.mushroomCapEmissive).getHex(),
		capEmissiveIntensity: params.mushroomCapEmissiveIntensity,
		lightColor: new THREE.Color(params.mushroomLightColor).getHex(),
		lightIntensityMax: params.mushroomLightIntensityMax,
		lightDistance: params.mushroomLightDistance,
		spawnRadius: params.mushroomSpawnRadius,
		minPerSpawn: params.mushroomMinPerSpawn,
		maxPerSpawn: params.mushroomMaxPerSpawn,
		minCursorMove: params.mushroomMinCursorMove,
		spawnCooldownMs: params.mushroomSpawnCooldownMs,
		growDuration: params.mushroomGrowDuration,
		lifetime: params.mushroomLifetime,
		shrinkDuration: params.mushroomShrinkDuration,
		bounceOvershoot: params.mushroomBounceOvershoot,
		scale: params.mushroomScale,
	},
})
mushrooms.setEnabled(params.mushroomsEnabled)

const _mushPoint = new THREE.Vector3()
const _mushNormal = new THREE.Vector3()

// ─── Ice Smoke (Frost Particles) ────────────────────────────────
const iceSmokeMaterial = new THREE.ShaderMaterial({
	vertexShader: smokeVertex,
	fragmentShader: smokeFragment,
	transparent: true,
	uniforms: {
		uTrailSmokeMap: new THREE.Uniform(),
		uPerlin: new THREE.Uniform(perlinMap),
		uTime: trailMaterial.uniforms.uTime,
		uGlitterScale: new THREE.Uniform(params.glitterScale),
		uGlitterPower: new THREE.Uniform(params.glitterPower),
		uGlitterIntensity: new THREE.Uniform(params.glitterIntensity),
		uPerlinScale1: new THREE.Uniform(params.frostPerlinScale1),
		uPerlinScale2: new THREE.Uniform(params.frostPerlinScale2),
		uPerlinSpeed: new THREE.Uniform(params.frostPerlinSpeed),
		uAlphaPower: new THREE.Uniform(params.frostAlphaPower),
		uMaxAlpha: new THREE.Uniform(params.frostMaxAlpha),
		uFrostColor: new THREE.Uniform(new THREE.Color(params.frostColor.r, params.frostColor.g, params.frostColor.b)),
		uFrostVignetteStart: new THREE.Uniform(params.frostVignetteStart),
		uFrostVignetteEnd: new THREE.Uniform(params.frostVignetteEnd),
		uFrostBgColor: new THREE.Uniform(new THREE.Color(params.bgColor.r, params.bgColor.g, params.bgColor.b)),
	},
})

let smokeMesh = new THREE.Mesh(createSmokeGeometry('plane'), iceSmokeMaterial)
smokeMesh.position.y = params.smokeHeight
// Frost particles disabled
// scene.add(smokeMesh)

// ─── Material defaults (color palettes per material) ────────────
const materialDefaults = {
	ice: {
		smokeColor1: { r: 0.25, g: 0.1, b: 0.9 },
		smokeColor2: { r: 0.1, g: 0.9, b: 0.8 },
		colorBlue: { r: 0, g: 0.2, b: 0.25 },
		colorDeepBlue: { r: 0, g: 0.01, b: 0.03 },
		colorGreen: { r: 0.1, g: 0.2, b: 0.35 },
		colorAccent: { r: 0.1, g: 0.7, b: 0.7 },
		bgColor: { r: 0, g: 0.01, b: 0.02 },
		frostColor: { r: 0.03, g: 0.4, b: 0.7 },
		trailColor: { r: 1.0, g: 1.0, b: 1.0 },
		trailTint: { r: 1.0, g: 1.0, b: 1.0 },
		trailGlow: 0.0,
		deepWaterColor: { r: 0.0, g: 0.03, b: 0.08 },
		bloomStrength: 0.4,
		// Tuned for ice
		crackScale: 4.0,
		crackIntensity: 1.0,
		frostedIntensity: 0.6,
		perlinDetailScale: 10.0,
		glitterScale: 400,
		glitterPower: 32,
		glitterIntensity: 3.0,
		frostMaxAlpha: 0.3,
	},
	grass: {
		smokeColor1: { r: 0.2, g: 0.5, b: 0.1 },
		smokeColor2: { r: 0.6, g: 0.8, b: 0.2 },
		colorBlue: { r: 0.15, g: 0.35, b: 0.08 },      // grass mid green
		colorDeepBlue: { r: 0.04, g: 0.1, b: 0.02 },    // shadow / deep
		colorGreen: { r: 0.55, g: 0.75, b: 0.2 },       // bright tip
		colorAccent: { r: 0.95, g: 0.75, b: 0.2 },      // wildflower yellow
		bgColor: { r: 0.03, g: 0.05, b: 0.02 },
		frostColor: { r: 0.7, g: 0.6, b: 0.2 },         // pollen golden
		trailColor: { r: 0.7, g: 0.85, b: 0.3 },
		trailTint: { r: 0.85, g: 0.95, b: 0.45 },
		trailGlow: 0.4,
		deepWaterColor: { r: 0.18, g: 0.1, b: 0.04 },   // earth/dirt
		bloomStrength: 0.25,
		// Tuned for grass - much higher density
		crackScale: 6.0,
		crackIntensity: 1.5,
		frostedIntensity: 1.2,
		perlinDetailScale: 8.0,
		glitterScale: 250,
		glitterPower: 4,        // softer particles
		glitterIntensity: 1.5,
		frostMaxAlpha: 0.6,     // more visible particle layer
	},
}

function applyMaterialDefaults(type) {
	const d = materialDefaults[type]
	if (!d) return
	Object.assign(params, d)
	// Apply to uniforms
	trailSmokeMaterial.uniforms.uSmokeColor1.value.setRGB(d.smokeColor1.r, d.smokeColor1.g, d.smokeColor1.b)
	trailSmokeMaterial.uniforms.uSmokeColor2.value.setRGB(d.smokeColor2.r, d.smokeColor2.g, d.smokeColor2.b)
	groundMaterial.uniforms.uColorBlue.value.setRGB(d.colorBlue.r, d.colorBlue.g, d.colorBlue.b)
	groundMaterial.uniforms.uColorDeepBlue.value.setRGB(d.colorDeepBlue.r, d.colorDeepBlue.g, d.colorDeepBlue.b)
	groundMaterial.uniforms.uColorGreen.value.setRGB(d.colorGreen.r, d.colorGreen.g, d.colorGreen.b)
	groundMaterial.uniforms.uColorAccent.value.setRGB(d.colorAccent.r, d.colorAccent.g, d.colorAccent.b)
	scene.background.setRGB(d.bgColor.r, d.bgColor.g, d.bgColor.b)
	groundMaterial.uniforms.uBgColor.value.setRGB(d.bgColor.r, d.bgColor.g, d.bgColor.b)
	iceSmokeMaterial.uniforms.uFrostBgColor.value.setRGB(d.bgColor.r, d.bgColor.g, d.bgColor.b)
	iceSmokeMaterial.uniforms.uFrostColor.value.setRGB(d.frostColor.r, d.frostColor.g, d.frostColor.b)
	trailMaterial.uniforms.uTrailColor.value.setRGB(d.trailColor.r, d.trailColor.g, d.trailColor.b)
	groundMaterial.uniforms.uTrailTint.value.setRGB(d.trailTint.r, d.trailTint.g, d.trailTint.b)
	groundMaterial.uniforms.uTrailGlow.value = d.trailGlow
	groundMaterial.uniforms.uDeepWaterColor.value.setRGB(d.deepWaterColor.r, d.deepWaterColor.g, d.deepWaterColor.b)
	groundMaterial.uniforms.uCrackScale.value = d.crackScale
	groundMaterial.uniforms.uCrackIntensity.value = d.crackIntensity
	groundMaterial.uniforms.uFrostedIntensity.value = d.frostedIntensity
	groundMaterial.uniforms.uPerlinDetailScale.value = d.perlinDetailScale
	iceSmokeMaterial.uniforms.uGlitterScale.value = d.glitterScale
	iceSmokeMaterial.uniforms.uGlitterPower.value = d.glitterPower
	iceSmokeMaterial.uniforms.uGlitterIntensity.value = d.glitterIntensity
	iceSmokeMaterial.uniforms.uMaxAlpha.value = d.frostMaxAlpha
	bloomPass.strength = d.bloomStrength
	pane.refresh()
}

// ─── Material swap ──────────────────────────────────────────────
function swapSurfaceMaterial(type, applyDefaults = true) {
	if (type === 'ice') {
		groundMaterial.fragmentShader = iceFragment
		iceSmokeMaterial.fragmentShader = smokeFragment
	} else if (type === 'grass') {
		groundMaterial.fragmentShader = grassFragment
		iceSmokeMaterial.fragmentShader = grassParticlesFragment
	}
	groundMaterial.needsUpdate = true
	iceSmokeMaterial.needsUpdate = true
	if (applyDefaults) applyMaterialDefaults(type)
}

// ─── Geometry swap ──────────────────────────────────────────────
function swapGeometry(type) {
	scene.remove(ground)
	ground.geometry.dispose()
	ground = new THREE.Mesh(createGroundGeometry(type), groundMaterial)
	scene.add(ground)

	// Frost particles disabled - skip smokeMesh swap
}

// ─── Post-Processing ────────────────────────────────────────────
const composer = new EffectComposer(renderer)

const renderPass = new RenderPass(scene, camera)
composer.addPass(renderPass)

const bloomPass = new UnrealBloomPass(
	new THREE.Vector2(sizes.width, sizes.height),
	params.bloomStrength,
	params.bloomRadius,
	params.bloomThreshold
)
composer.addPass(bloomPass)

const rgbShiftPass = new ShaderPass(RGBShiftShader)
rgbShiftPass.uniforms['amount'].value = params.chromaticAmount
rgbShiftPass.enabled = params.chromaticEnabled
composer.addPass(rgbShiftPass)

const FilmGrainShader = {
	uniforms: {
		tDiffuse: { value: null },
		uGrainIntensity: { value: params.grainIntensity },
		uTime: { value: 0 },
	},
	vertexShader: /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`,
	fragmentShader: filmGrainFragment,
}

const grainPass = new ShaderPass(FilmGrainShader)
grainPass.enabled = params.grainEnabled
composer.addPass(grainPass)

const outputPass = new OutputPass()
composer.addPass(outputPass)

// ─── Auto-Draw ──────────────────────────────────────────────────
function getAutoDrawUV(t) {
	const s = params.autoDrawScale
	const pattern = params.autoDrawPattern

	switch (pattern) {
		case 'circle': {
			return {
				x: 0.5 + Math.cos(t) * s,
				y: 0.5 + Math.sin(t) * s,
			}
		}
		case 'lissajous': {
			const a = params.autoDrawLissajousA
			const b = params.autoDrawLissajousB
			return {
				x: 0.5 + Math.cos(t * a) * s,
				y: 0.5 + Math.sin(t * b) * s,
			}
		}
		case 'spiral': {
			const r = s * (1 - Math.exp(-t * 0.15))
			return {
				x: 0.5 + Math.cos(t) * r,
				y: 0.5 + Math.sin(t) * r,
			}
		}
		case 'rose': {
			const k = params.autoDrawComplexity
			const r = s * Math.cos(k * t)
			return {
				x: 0.5 + r * Math.cos(t),
				y: 0.5 + r * Math.sin(t),
			}
		}
		case 'random': {
			return {
				x: 0.5 + Math.sin(t * 1.17) * Math.cos(t * 0.33) * s,
				y: 0.5 + Math.sin(t * 0.87) * Math.cos(t * 0.71) * s,
			}
		}
		case 'figure8': {
			return {
				x: 0.5 + Math.sin(t) * s,
				y: 0.5 + Math.sin(t * 2) * s * 0.5,
			}
		}
		case 'star': {
			const n = params.autoDrawComplexity
			const r1 = s
			const r2 = s * 0.4
			const angle = t
			const idx = Math.floor((angle / (Math.PI * 2)) * n * 2) % (n * 2)
			const r = idx % 2 === 0 ? r1 : r2
			return {
				x: 0.5 + Math.cos(angle) * r,
				y: 0.5 + Math.sin(angle) * r,
			}
		}
		default:
			return { x: 0.5, y: 0.5 }
	}
}

// ─── Tweakpane UI ───────────────────────────────────────────────
const pane = new Pane({ title: 'WebGL Studio', expanded: true })
pane.registerPlugin(EssentialsPlugin)

// ─── Rice Field — separate panel (left side) ────────────────────
const ricePaneContainer = document.createElement('div')
ricePaneContainer.id = 'rice-pane'
ricePaneContainer.style.cssText = 'position:fixed;top:8px;left:8px;z-index:1000;width:300px;'
document.body.appendChild(ricePaneContainer)

const ricePane = new Pane({ container: ricePaneContainer, title: 'Rice Field', expanded: true })

ricePane.addBinding(params, 'riceEnabled', { label: 'enabled' })
	.on('change', (e) => { riceField.setVisible(e.value) })

ricePane.addBinding(params, 'riceCount', { min: 100, max: 30000, step: 100, label: 'count' })
ricePane.addBinding(params, 'riceDiscRadius', { min: 3, max: 20, step: 0.5, label: 'disc radius' })
	.on('change', (e) => {
		params.discRadius = Math.min(0.49, e.value / 40)
		groundMaterial.uniforms.uDiscRadius.value = params.discRadius
	})
ricePane.addButton({ title: 'Rebuild field' }).on('click', () => {
	riceField.rebuild()
	riceField.setNoiseTexture(perlinMap)
	syncHills()
})

const riceBladeFolder = ricePane.addFolder({ title: 'Blade', expanded: true })
riceBladeFolder.addBinding(params, 'riceBladeHeight', { min: 0.1, max: 4.0, step: 0.01, label: 'height' })
	.on('change', (e) => { riceField.material.uniforms.uBladeHeight.value = e.value })
riceBladeFolder.addBinding(params, 'riceBladeWidth', { min: 0.005, max: 0.3, step: 0.001, label: 'width' })
	.on('change', (e) => { riceField.material.uniforms.uBladeWidth.value = e.value })
riceBladeFolder.addBinding(params, 'riceNaturalCurl', { min: 0, max: 2, step: 0.01, label: 'natural curl' })
	.on('change', (e) => { riceField.material.uniforms.uNaturalCurl.value = e.value })
riceBladeFolder.addBinding(params, 'riceTipBoost', { min: 0, max: 2, step: 0.01, label: 'tip glow' })
	.on('change', (e) => { riceField.material.uniforms.uTipBoost.value = e.value })
riceBladeFolder.addBinding(params, 'riceBaseColor', { color: { type: 'float' }, label: 'base color' })
	.on('change', (e) => { riceField.material.uniforms.uBaseColor.value.setRGB(e.value.r, e.value.g, e.value.b) })
riceBladeFolder.addBinding(params, 'riceTipColor', { color: { type: 'float' }, label: 'tip color' })
	.on('change', (e) => { riceField.material.uniforms.uTipColor.value.setRGB(e.value.r, e.value.g, e.value.b) })

const riceWindFolder = ricePane.addFolder({ title: 'Wind', expanded: true })
riceWindFolder.addBinding(params, 'riceWindStrength', { min: 0, max: 2, step: 0.01, label: 'strength' })
	.on('change', (e) => { riceField.material.uniforms.uWindStrength.value = e.value })
riceWindFolder.addBinding(params, 'riceWindScale', { min: 2, max: 80, step: 0.5, label: 'scale' })
	.on('change', (e) => { riceField.material.uniforms.uWindScale.value = e.value })

const riceHoverFolder = ricePane.addFolder({ title: 'Hover (proximity)', expanded: true })
riceHoverFolder.addBinding(params, 'riceHoverEnabled', { label: 'enabled' })
	.on('change', (e) => { riceField.material.uniforms.uHoverEnabled.value = e.value ? 1 : 0 })
riceHoverFolder.addBinding(params, 'riceHoverRadius', { min: 0.5, max: 15, step: 0.1, label: 'radius' })
	.on('change', (e) => { riceField.material.uniforms.uHoverRadius.value = e.value })
riceHoverFolder.addBinding(params, 'riceHoverAmount', { min: 0, max: 1, step: 0.01, label: 'amount' })
	.on('change', (e) => { riceField.material.uniforms.uHoverAmount.value = e.value })

const riceTrailFolder = ricePane.addFolder({ title: 'Trail interaction', expanded: false })
riceTrailFolder.addBinding(params, 'riceTrailBend', { min: 0, max: 2, step: 0.01, label: 'bend' })
	.on('change', (e) => { riceField.material.uniforms.uTrailBend.value = e.value })
riceTrailFolder.addBinding(params, 'riceTrailCutAmount', { min: 0, max: 1, step: 0.01, label: 'cut amount' })
	.on('change', (e) => { riceField.material.uniforms.uTrailCutAmount.value = e.value })

const fpsGraph = pane.addBlade({ view: 'fpsgraph', label: 'fps', rows: 2 })

// ── TRAIL / BRUSH ───
const trailFolder = pane.addFolder({ title: 'Trail / Brush', expanded: false })

trailFolder.addBinding(params, 'brushSize', { min: 0.01, max: 0.3, step: 0.001, label: 'size' })
	.on('change', (e) => { trailMaterial.uniforms.uBrushSize.value = e.value })

trailFolder.addBinding(params, 'brushSoftness', { min: 0.1, max: 1.0, step: 0.01, label: 'softness' })
	.on('change', (e) => { trailMaterial.uniforms.uBrushSoftness.value = e.value })

trailFolder.addBinding(params, 'trailIntensity', { min: 0.0, max: 2.0, step: 0.01, label: 'intensity' })
	.on('change', (e) => { trailMaterial.uniforms.uTrailIntensity.value = e.value })

trailFolder.addBinding(params, 'decayRate', { min: 0.0, max: 5.0, step: 0.1, label: 'decay' })
	.on('change', (e) => { trailMaterial.uniforms.uDecayRate.value = e.value })

trailFolder.addBinding(params, 'texelScale', { min: 0.1, max: 3.0, step: 0.05, label: 'spread' })
	.on('change', (e) => { trailMaterial.uniforms.uTexelScale.value = e.value })

trailFolder.addBinding(params, 'trailColor', { color: { type: 'float' }, label: 'color' })
	.on('change', (e) => { trailMaterial.uniforms.uTrailColor.value.setRGB(e.value.r, e.value.g, e.value.b) })

const trailNoiseFolder = trailFolder.addFolder({ title: 'Noise', expanded: false })

trailNoiseFolder.addBinding(params, 'noiseScale1', { min: 1, max: 60, step: 1, label: 'scale 1' })
	.on('change', (e) => { trailMaterial.uniforms.uNoiseScale1.value = e.value })

trailNoiseFolder.addBinding(params, 'noiseAmount1', { min: 0.0, max: 0.15, step: 0.005, label: 'amount 1' })
	.on('change', (e) => { trailMaterial.uniforms.uNoiseAmount1.value = e.value })

trailNoiseFolder.addBinding(params, 'noiseScale2', { min: 1, max: 80, step: 1, label: 'scale 2' })
	.on('change', (e) => { trailMaterial.uniforms.uNoiseScale2.value = e.value })

trailNoiseFolder.addBinding(params, 'noiseAmount2', { min: 0.0, max: 0.1, step: 0.005, label: 'amount 2' })
	.on('change', (e) => { trailMaterial.uniforms.uNoiseAmount2.value = e.value })

// ── ENVIRONMENT PANE (Fog + Hills) ──────────────────────────────
const envPaneContainer = document.createElement('div')
envPaneContainer.id = 'env-pane'
envPaneContainer.style.cssText = 'position:fixed;top:8px;left:320px;z-index:1000;width:300px;max-height:calc(100vh - 16px);overflow:auto;'
document.body.appendChild(envPaneContainer)

const envPane = new Pane({ container: envPaneContainer, title: 'Environment', expanded: true })
envPane.registerPlugin(EssentialsPlugin)

// Fog
const fogFolder = envPane.addFolder({ title: 'Fog', expanded: true })
fogFolder.addBinding(params, 'fogEnabled', { label: 'enabled' })
	.on('change', (e) => {
		const v = e.value ? 1 : 0
		groundMaterial.uniforms.uFogEnabled.value = v
		riceField.material.uniforms.uFogEnabled.value = v
		scene.fog = e.value
			? new THREE.Fog(new THREE.Color(params.fogColor.r, params.fogColor.g, params.fogColor.b), params.fogNear, params.fogFar)
			: null
	})
fogFolder.addBinding(params, 'fogColor', { color: { type: 'float' }, label: 'color' })
	.on('change', (e) => {
		groundMaterial.uniforms.uFogColor.value.setRGB(e.value.r, e.value.g, e.value.b)
		riceField.material.uniforms.uFogColor.value.setRGB(e.value.r, e.value.g, e.value.b)
		scene.background.setRGB(e.value.r, e.value.g, e.value.b)
		if (scene.fog) scene.fog.color.setRGB(e.value.r, e.value.g, e.value.b)
	})
fogFolder.addBinding(params, 'fogNear', { min: 0, max: 100, step: 0.5, label: 'near' })
	.on('change', (e) => {
		groundMaterial.uniforms.uFogNear.value = e.value
		riceField.material.uniforms.uFogNear.value = e.value
		if (scene.fog) scene.fog.near = e.value
	})
fogFolder.addBinding(params, 'fogFar', { min: 5, max: 300, step: 1, label: 'far' })
	.on('change', (e) => {
		groundMaterial.uniforms.uFogFar.value = e.value
		riceField.material.uniforms.uFogFar.value = e.value
		if (scene.fog) scene.fog.far = e.value
	})

// Hills
const hillsFolder = envPane.addFolder({ title: 'Hills', expanded: true })
params.hills.forEach((hill, i) => {
	const f = hillsFolder.addFolder({ title: `Hill ${i + 1}`, expanded: i === 0 })
	f.addBinding(hill, 'enabled').on('change', syncHills)
	f.addBinding(hill, 'x', { min: -20, max: 20, step: 0.1 }).on('change', syncHills)
	f.addBinding(hill, 'z', { min: -20, max: 20, step: 0.1 }).on('change', syncHills)
	f.addBinding(hill, 'height', { min: 0, max: 10, step: 0.05 }).on('change', syncHills)
	f.addBinding(hill, 'radius', { min: 1, max: 30, step: 0.5 }).on('change', syncHills)
})

// Push initial hill values into uniforms
syncHills()

// Mushrooms
const mushFolder = envPane.addFolder({ title: 'Mushrooms', expanded: true })
mushFolder.addBinding(params, 'mushroomsEnabled', { label: 'enabled' })
	.on('change', (e) => mushrooms.setEnabled(e.value))
mushFolder.addBinding(params, 'mushroomScale', { min: 0.2, max: 3.0, step: 0.05, label: 'scale' })
	.on('change', (e) => mushrooms.setConfig({ scale: e.value }))

const mushColorsFolder = mushFolder.addFolder({ title: 'Colors', expanded: false })
mushColorsFolder.addBinding(params, 'mushroomCapEmissive', { label: 'cap emissive' })
	.on('change', (e) => mushrooms.setConfig({ capEmissive: new THREE.Color(e.value).getHex() }))
mushColorsFolder.addBinding(params, 'mushroomCapEmissiveIntensity', { min: 0, max: 6, step: 0.1, label: 'emissive intensity' })
	.on('change', (e) => mushrooms.setConfig({ capEmissiveIntensity: e.value }))
mushColorsFolder.addBinding(params, 'mushroomCapColor', { label: 'cap color' })
	.on('change', (e) => mushrooms.setConfig({ capColor: new THREE.Color(e.value).getHex() }))
mushColorsFolder.addBinding(params, 'mushroomStemColor', { label: 'stem color' })
	.on('change', (e) => mushrooms.setConfig({ stemColor: new THREE.Color(e.value).getHex() }))

const mushLightFolder = mushFolder.addFolder({ title: 'Light', expanded: false })
mushLightFolder.addBinding(params, 'mushroomLightColor', { label: 'color' })
	.on('change', (e) => mushrooms.setConfig({ lightColor: new THREE.Color(e.value).getHex() }))
mushLightFolder.addBinding(params, 'mushroomLightIntensityMax', { min: 0, max: 4, step: 0.05, label: 'intensity' })
	.on('change', (e) => mushrooms.setConfig({ lightIntensityMax: e.value }))
mushLightFolder.addBinding(params, 'mushroomLightDistance', { min: 0.2, max: 10, step: 0.1, label: 'distance' })
	.on('change', (e) => mushrooms.setConfig({ lightDistance: e.value }))

const mushSpawnFolder = mushFolder.addFolder({ title: 'Spawn', expanded: false })
mushSpawnFolder.addBinding(params, 'mushroomSpawnRadius', { min: 0.05, max: 2.0, step: 0.01, label: 'radius' })
	.on('change', (e) => mushrooms.setConfig({ spawnRadius: e.value }))
mushSpawnFolder.addBinding(params, 'mushroomMinPerSpawn', { min: 1, max: 10, step: 1, label: 'min per burst' })
	.on('change', (e) => mushrooms.setConfig({ minPerSpawn: e.value }))
mushSpawnFolder.addBinding(params, 'mushroomMaxPerSpawn', { min: 1, max: 12, step: 1, label: 'max per burst' })
	.on('change', (e) => mushrooms.setConfig({ maxPerSpawn: e.value }))
mushSpawnFolder.addBinding(params, 'mushroomMinCursorMove', { min: 0.01, max: 1.0, step: 0.01, label: 'min move' })
	.on('change', (e) => mushrooms.setConfig({ minCursorMove: e.value }))
mushSpawnFolder.addBinding(params, 'mushroomSpawnCooldownMs', { min: 0, max: 500, step: 5, label: 'cooldown (ms)' })
	.on('change', (e) => mushrooms.setConfig({ spawnCooldownMs: e.value }))

const mushAnimFolder = mushFolder.addFolder({ title: 'Animation', expanded: false })
mushAnimFolder.addBinding(params, 'mushroomGrowDuration', { min: 0.1, max: 3.0, step: 0.05, label: 'grow (s)' })
	.on('change', (e) => mushrooms.setConfig({ growDuration: e.value }))
mushAnimFolder.addBinding(params, 'mushroomLifetime', { min: 0.2, max: 15, step: 0.1, label: 'lifetime (s)' })
	.on('change', (e) => mushrooms.setConfig({ lifetime: e.value }))
mushAnimFolder.addBinding(params, 'mushroomShrinkDuration', { min: 0.1, max: 3.0, step: 0.05, label: 'shrink (s)' })
	.on('change', (e) => mushrooms.setConfig({ shrinkDuration: e.value }))
mushAnimFolder.addBinding(params, 'mushroomBounceOvershoot', { min: 1.0, max: 1.6, step: 0.01, label: 'bounce' })
	.on('change', (e) => mushrooms.setConfig({ bounceOvershoot: e.value }))

// ── SYMMETRY ───
const symmetryFolder = pane.addFolder({ title: 'Symmetry', expanded: false })

symmetryFolder.addBlade({
	view: 'list',
	label: 'mode',
	options: [
		{ text: 'None', value: 0 },
		{ text: 'Mirror X', value: 1 },
		{ text: 'Mirror Y', value: 2 },
		{ text: 'Mirror XY', value: 3 },
		{ text: 'Radial 4', value: 4 },
		{ text: 'Radial 6', value: 5 },
		{ text: 'Radial 8', value: 6 },
	],
	value: 0,
}).on('change', (e) => {
	params.symmetry = e.value
	trailMaterial.uniforms.uSymmetry.value = e.value
})

// ── AUTO-DRAW ───
const autoDrawFolder = pane.addFolder({ title: 'Auto-Draw', expanded: false })

autoDrawFolder.addBinding(params, 'autoDrawEnabled', { label: 'enabled' })

autoDrawFolder.addBlade({
	view: 'list',
	label: 'pattern',
	options: [
		{ text: 'Circle', value: 'circle' },
		{ text: 'Lissajous', value: 'lissajous' },
		{ text: 'Spiral', value: 'spiral' },
		{ text: 'Rose', value: 'rose' },
		{ text: 'Figure 8', value: 'figure8' },
		{ text: 'Star', value: 'star' },
		{ text: 'Drift', value: 'random' },
	],
	value: 'circle',
}).on('change', (e) => { params.autoDrawPattern = e.value })

autoDrawFolder.addBinding(params, 'autoDrawSpeed', { min: 0.1, max: 5.0, step: 0.1, label: 'speed' })
autoDrawFolder.addBinding(params, 'autoDrawScale', { min: 0.05, max: 0.45, step: 0.01, label: 'scale' })
autoDrawFolder.addBinding(params, 'autoDrawLissajousA', { min: 1, max: 9, step: 1, label: 'ratio A' })
autoDrawFolder.addBinding(params, 'autoDrawLissajousB', { min: 1, max: 9, step: 1, label: 'ratio B' })
autoDrawFolder.addBinding(params, 'autoDrawComplexity', { min: 2, max: 12, step: 1, label: 'complexity' })

// ── IMPACT ───
const impactFolder = pane.addFolder({ title: 'Impact / Crack', expanded: false })

impactFolder.addBinding(params, 'impactEnabled', { label: 'click to crack' })

impactFolder.addBinding(params, 'impactStrengthMax', { min: 0.1, max: 3.0, step: 0.1, label: 'strength' })

impactFolder.addBinding(params, 'impactRadius', { min: 0.05, max: 0.5, step: 0.01, label: 'radius' })
	.on('change', (e) => { trailMaterial.uniforms.uImpactRadius.value = e.value })

impactFolder.addBinding(params, 'impactRays', { min: 3, max: 16, step: 1, label: 'crack rays' })
	.on('change', (e) => { trailMaterial.uniforms.uImpactRays.value = e.value })

impactFolder.addBinding(params, 'displacementStrength', { min: 0.0, max: 3.0, step: 0.1, label: 'displacement' })
	.on('change', (e) => { groundMaterial.uniforms.uDisplacementStrength.value = e.value })

impactFolder.addBinding(params, 'impactShockwave', { label: 'shockwave' })

impactFolder.addBinding(params, 'shockwaveStrength', { min: 0.0, max: 5.0, step: 0.1, label: 'wave strength' })
	.on('change', (e) => { groundMaterial.uniforms.uShockwaveStrength.value = e.value })

impactFolder.addBinding(params, 'fovPunchAmount', { min: 0, max: 10, step: 0.5, label: 'fov punch' })

const deepFolder = impactFolder.addFolder({ title: 'Deep Water', expanded: false })

deepFolder.addBinding(params, 'deepRevealThreshold', { min: 0.1, max: 0.9, step: 0.05, label: 'threshold' })
	.on('change', (e) => { groundMaterial.uniforms.uDeepRevealThreshold.value = e.value })

deepFolder.addBinding(params, 'deepRevealIntensity', { min: 0.0, max: 1.0, step: 0.05, label: 'intensity' })
	.on('change', (e) => { groundMaterial.uniforms.uDeepRevealIntensity.value = e.value })

deepFolder.addBinding(params, 'deepWaterColor', { color: { type: 'float' }, label: 'color' })
	.on('change', (e) => { groundMaterial.uniforms.uDeepWaterColor.value.setRGB(e.value.r, e.value.g, e.value.b) })

// ── SMOKE / CURL ───
const smokeFolder = pane.addFolder({ title: 'Smoke / Curl Noise', expanded: false })

smokeFolder.addBinding(params, 'curlScale1', { min: 1, max: 20, step: 0.5, label: 'curl scale 1' })
	.on('change', (e) => { trailSmokeMaterial.uniforms.uCurlScale1.value = e.value })

smokeFolder.addBinding(params, 'curlScale2', { min: 1, max: 30, step: 0.5, label: 'curl scale 2' })
	.on('change', (e) => { trailSmokeMaterial.uniforms.uCurlScale2.value = e.value })

smokeFolder.addBinding(params, 'curlSpeed', { min: 0.01, max: 1.0, step: 0.01, label: 'speed' })
	.on('change', (e) => { trailSmokeMaterial.uniforms.uCurlSpeed.value = e.value })

smokeFolder.addBinding(params, 'curlStrength1', { min: 0.01, max: 1.0, step: 0.01, label: 'strength 1' })
	.on('change', (e) => { trailSmokeMaterial.uniforms.uCurlStrength1.value = e.value })

smokeFolder.addBinding(params, 'curlStrength2', { min: 0.01, max: 1.0, step: 0.01, label: 'strength 2' })
	.on('change', (e) => { trailSmokeMaterial.uniforms.uCurlStrength2.value = e.value })

smokeFolder.addBinding(params, 'smokeDecay', { min: 0.0, max: 3.0, step: 0.1, label: 'decay' })
	.on('change', (e) => { trailSmokeMaterial.uniforms.uSmokeDecay.value = e.value })

smokeFolder.addBinding(params, 'smokeGlowPower1', { min: 1, max: 30, step: 1, label: 'glow power 1' })
	.on('change', (e) => { trailSmokeMaterial.uniforms.uSmokeGlowPower1.value = e.value })

smokeFolder.addBinding(params, 'smokeGlowPower2', { min: 1, max: 20, step: 1, label: 'glow power 2' })
	.on('change', (e) => { trailSmokeMaterial.uniforms.uSmokeGlowPower2.value = e.value })

const smokeColorFolder = smokeFolder.addFolder({ title: 'Colors', expanded: false })

smokeColorFolder.addBinding(params, 'smokeColor1', { color: { type: 'float' }, label: 'primary' })
	.on('change', (e) => { trailSmokeMaterial.uniforms.uSmokeColor1.value.setRGB(e.value.r, e.value.g, e.value.b) })

smokeColorFolder.addBinding(params, 'smokeColor2', { color: { type: 'float' }, label: 'secondary' })
	.on('change', (e) => { trailSmokeMaterial.uniforms.uSmokeColor2.value.setRGB(e.value.r, e.value.g, e.value.b) })

// ── ICE SURFACE ───
const iceFolder = pane.addFolder({ title: 'Ice Surface', expanded: false })

iceFolder.addBinding(params, 'parallaxDistance', { min: 0.0, max: 3.0, step: 0.1, label: 'parallax depth' })
	.on('change', (e) => { groundMaterial.uniforms.uParallaxDistance.value = e.value })

iceFolder.addBinding(params, 'crackScale', { min: 1, max: 10, step: 0.5, label: 'crack scale' })
	.on('change', (e) => { groundMaterial.uniforms.uCrackScale.value = e.value })

iceFolder.addBinding(params, 'crackIntensity', { min: 0.0, max: 3.0, step: 0.1, label: 'crack intensity' })
	.on('change', (e) => { groundMaterial.uniforms.uCrackIntensity.value = e.value })

iceFolder.addBinding(params, 'frostedIntensity', { min: 0.0, max: 2.0, step: 0.1, label: 'frost intensity' })
	.on('change', (e) => { groundMaterial.uniforms.uFrostedIntensity.value = e.value })

iceFolder.addBinding(params, 'perlinDetailScale', { min: 1, max: 30, step: 1, label: 'detail scale' })
	.on('change', (e) => { groundMaterial.uniforms.uPerlinDetailScale.value = e.value })

iceFolder.addBinding(params, 'trailTint', { color: { type: 'float' }, label: 'trail tint' })
	.on('change', (e) => { groundMaterial.uniforms.uTrailTint.value.setRGB(e.value.r, e.value.g, e.value.b) })

iceFolder.addBinding(params, 'trailGlow', { min: 0.0, max: 5.0, step: 0.1, label: 'trail glow' })
	.on('change', (e) => { groundMaterial.uniforms.uTrailGlow.value = e.value })

iceFolder.addBinding(params, 'vignetteStart', { min: 0.0, max: 1.0, step: 0.05, label: 'vignette start' })
	.on('change', (e) => { groundMaterial.uniforms.uVignetteStart.value = e.value })

iceFolder.addBinding(params, 'vignetteEnd', { min: 0.0, max: 2.0, step: 0.05, label: 'vignette end' })
	.on('change', (e) => { groundMaterial.uniforms.uVignetteEnd.value = e.value })

const iceColorFolder = iceFolder.addFolder({ title: 'Colors', expanded: false })

iceColorFolder.addBinding(params, 'colorBlue', { color: { type: 'float' }, label: 'ice blue' })
	.on('change', (e) => { groundMaterial.uniforms.uColorBlue.value.setRGB(e.value.r, e.value.g, e.value.b) })

iceColorFolder.addBinding(params, 'colorDeepBlue', { color: { type: 'float' }, label: 'deep blue' })
	.on('change', (e) => { groundMaterial.uniforms.uColorDeepBlue.value.setRGB(e.value.r, e.value.g, e.value.b) })

iceColorFolder.addBinding(params, 'colorGreen', { color: { type: 'float' }, label: 'green' })
	.on('change', (e) => { groundMaterial.uniforms.uColorGreen.value.setRGB(e.value.r, e.value.g, e.value.b) })

iceColorFolder.addBinding(params, 'colorAccent', { color: { type: 'float' }, label: 'accent' })
	.on('change', (e) => { groundMaterial.uniforms.uColorAccent.value.setRGB(e.value.r, e.value.g, e.value.b) })

// ── POST-PROCESSING ───
const postFolder = pane.addFolder({ title: 'Post-Processing', expanded: false })

const bloomFolder = postFolder.addFolder({ title: 'Bloom', expanded: true })

bloomFolder.addBinding(params, 'bloomEnabled', { label: 'enabled' })
	.on('change', (e) => { bloomPass.enabled = e.value })

bloomFolder.addBinding(params, 'bloomStrength', { min: 0.0, max: 3.0, step: 0.05, label: 'strength' })
	.on('change', (e) => { bloomPass.strength = e.value })

bloomFolder.addBinding(params, 'bloomRadius', { min: 0.0, max: 2.0, step: 0.05, label: 'radius' })
	.on('change', (e) => { bloomPass.radius = e.value })

bloomFolder.addBinding(params, 'bloomThreshold', { min: 0.0, max: 1.5, step: 0.05, label: 'threshold' })
	.on('change', (e) => { bloomPass.threshold = e.value })

const chromFolder = postFolder.addFolder({ title: 'Chromatic Aberration', expanded: false })

chromFolder.addBinding(params, 'chromaticEnabled', { label: 'enabled' })
	.on('change', (e) => { rgbShiftPass.enabled = e.value })

chromFolder.addBinding(params, 'chromaticAmount', { min: 0.0, max: 0.02, step: 0.001, label: 'amount' })
	.on('change', (e) => { rgbShiftPass.uniforms['amount'].value = e.value })

const grainFolder = postFolder.addFolder({ title: 'Film Grain', expanded: false })

grainFolder.addBinding(params, 'grainEnabled', { label: 'enabled' })
	.on('change', (e) => { grainPass.enabled = e.value })

grainFolder.addBinding(params, 'grainIntensity', { min: 0.0, max: 0.3, step: 0.01, label: 'intensity' })
	.on('change', (e) => { grainPass.uniforms['uGrainIntensity'].value = e.value })

// ── SCENE / LIGHTING ───
const sceneFolder = pane.addFolder({ title: 'Scene', expanded: false })

sceneFolder.addBinding(params, 'bgColor', { color: { type: 'float' }, label: 'background' })
	.on('change', (e) => {
		scene.background.setRGB(e.value.r, e.value.g, e.value.b)
		groundMaterial.uniforms.uBgColor.value.setRGB(e.value.r, e.value.g, e.value.b)
		iceSmokeMaterial.uniforms.uFrostBgColor.value.setRGB(e.value.r, e.value.g, e.value.b)
	})

sceneFolder.addBinding(params, 'ambientIntensity', { min: 0, max: 5, step: 0.1, label: 'ambient' })
	.on('change', (e) => { ambientLight.intensity = e.value })

sceneFolder.addBinding(params, 'directionalIntensity', { min: 0, max: 15, step: 0.5, label: 'directional' })
	.on('change', (e) => { directionalLight.intensity = e.value })

sceneFolder.addBinding(params, 'lightX', { min: -20, max: 20, step: 0.5, label: 'light X' })
	.on('change', (e) => { directionalLight.position.x = e.value })

sceneFolder.addBinding(params, 'lightY', { min: 0, max: 30, step: 0.5, label: 'light Y' })
	.on('change', (e) => { directionalLight.position.y = e.value })

sceneFolder.addBinding(params, 'lightZ', { min: -20, max: 20, step: 0.5, label: 'light Z' })
	.on('change', (e) => { directionalLight.position.z = e.value })

// ── SURFACE MATERIAL ───
const materialFolder = pane.addFolder({ title: 'Surface Material', expanded: false })

materialFolder.addBlade({
	view: 'list',
	label: 'material',
	options: [
		{ text: 'Ice', value: 'ice' },
		{ text: 'Grass', value: 'grass' },
	],
	value: 'ice',
}).on('change', (e) => {
	params.surfaceMaterial = e.value
	swapSurfaceMaterial(e.value)
})

// ── GEOMETRY ───
const geoFolder = pane.addFolder({ title: 'Geometry', expanded: false })

geoFolder.addBlade({
	view: 'list',
	label: 'shape',
	options: [
		{ text: 'Plane', value: 'plane' },
		{ text: 'Sphere', value: 'sphere' },
		{ text: 'Torus', value: 'torus' },
		{ text: 'Cylinder', value: 'cylinder' },
		{ text: 'Torus Knot', value: 'torusknot' },
	],
	value: 'plane',
}).on('change', (e) => {
	params.geometry = e.value
	swapGeometry(e.value)
})

// ── CAMERA ───
const cameraFolder = pane.addFolder({ title: 'Camera', expanded: false })

cameraFolder.addBinding(params, 'fov', { min: 20, max: 120, step: 1, label: 'fov' })
	.on('change', (e) => {
		camera.fov = e.value
		camera.updateProjectionMatrix()
	})

const cameraPresets = {
	default: { pos: [4, 8, 8], target: [0, 2.5, 0] },
	top: { pos: [0, 15, 0.01], target: [0, 0, 0] },
	close: { pos: [2, 3, 3], target: [0, 0, 0] },
	wide: { pos: [10, 12, 15], target: [0, 0, 0] },
	side: { pos: [12, 4, 0], target: [0, 0, 0] },
	front: { pos: [0, 0, 15], target: [0, 0, 0] },
}

cameraFolder.addBlade({
	view: 'list',
	label: 'preset',
	options: [
		{ text: 'Default', value: 'default' },
		{ text: 'Top Down', value: 'top' },
		{ text: 'Close Up', value: 'close' },
		{ text: 'Wide', value: 'wide' },
		{ text: 'Side', value: 'side' },
		{ text: 'Front', value: 'front' },
	],
	value: 'default',
}).on('change', (e) => {
	const preset = cameraPresets[e.value]
	camera.position.set(...preset.pos)
	controls.target.set(...preset.target)
	controls.update()
})

// ── TEXTURES ───
const textureFolder = pane.addFolder({ title: 'Textures', expanded: false })

textureFolder.addBlade({
	view: 'list',
	label: 'cracks',
	options: textures.cracks.map((_, i) => ({ text: `Cracks ${i + 1}`, value: i })),
	value: 0,
}).on('change', (e) => {
	crackMap = textures.cracks[e.value]
	groundMaterial.uniforms.uCracksMap.value = crackMap
})

textureFolder.addBlade({
	view: 'list',
	label: 'perlin',
	options: textures.perlin.map((_, i) => ({ text: `Perlin ${i + 1}`, value: i })),
	value: 0,
}).on('change', (e) => {
	perlinMap = textures.perlin[e.value]
	groundMaterial.uniforms.uPerlin.value = perlinMap
	iceSmokeMaterial.uniforms.uPerlin.value = perlinMap
})

// ── EXPORT ───
const exportFolder = pane.addFolder({ title: 'Export', expanded: false })

exportFolder.addButton({ title: 'Screenshot (PNG)' }).on('click', () => {
	composer.render()
	const link = document.createElement('a')
	link.download = `webgl-studio-${Date.now()}.png`
	link.href = renderer.domElement.toDataURL('image/png')
	link.click()
})

exportFolder.addButton({ title: 'Screenshot (4K)' }).on('click', () => {
	const prevWidth = sizes.width
	const prevHeight = sizes.height
	const scale = 4

	renderer.setSize(prevWidth * scale, prevHeight * scale)
	renderer.setPixelRatio(1)
	composer.setSize(prevWidth * scale, prevHeight * scale)
	camera.aspect = prevWidth / prevHeight
	camera.updateProjectionMatrix()
	composer.render()

	const link = document.createElement('a')
	link.download = `webgl-studio-4k-${Date.now()}.png`
	link.href = renderer.domElement.toDataURL('image/png')
	link.click()

	renderer.setSize(prevWidth, prevHeight)
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
	composer.setSize(prevWidth, prevHeight)
	camera.aspect = prevWidth / prevHeight
	camera.updateProjectionMatrix()
})

exportFolder.addButton({ title: 'Clear Canvas' }).on('click', () => {
	renderer.setRenderTarget(rt1)
	renderer.clear()
	renderer.setRenderTarget(rt2)
	renderer.clear()
	renderer.setRenderTarget(rt3)
	renderer.clear()
	renderer.setRenderTarget(rt4)
	renderer.clear()
	renderer.setRenderTarget(null)
})

// ── PRESETS ───
const presetsFolder = pane.addFolder({ title: 'Presets', expanded: false })

function applyAllColors() {
	trailSmokeMaterial.uniforms.uSmokeColor1.value.setRGB(params.smokeColor1.r, params.smokeColor1.g, params.smokeColor1.b)
	trailSmokeMaterial.uniforms.uSmokeColor2.value.setRGB(params.smokeColor2.r, params.smokeColor2.g, params.smokeColor2.b)
	groundMaterial.uniforms.uColorBlue.value.setRGB(params.colorBlue.r, params.colorBlue.g, params.colorBlue.b)
	groundMaterial.uniforms.uColorDeepBlue.value.setRGB(params.colorDeepBlue.r, params.colorDeepBlue.g, params.colorDeepBlue.b)
	groundMaterial.uniforms.uColorGreen.value.setRGB(params.colorGreen.r, params.colorGreen.g, params.colorGreen.b)
	groundMaterial.uniforms.uColorAccent.value.setRGB(params.colorAccent.r, params.colorAccent.g, params.colorAccent.b)
	scene.background.setRGB(params.bgColor.r, params.bgColor.g, params.bgColor.b)
	groundMaterial.uniforms.uBgColor.value.setRGB(params.bgColor.r, params.bgColor.g, params.bgColor.b)
	iceSmokeMaterial.uniforms.uFrostBgColor.value.setRGB(params.bgColor.r, params.bgColor.g, params.bgColor.b)
	iceSmokeMaterial.uniforms.uFrostColor.value.setRGB(params.frostColor.r, params.frostColor.g, params.frostColor.b)
	trailMaterial.uniforms.uTrailColor.value.setRGB(params.trailColor.r, params.trailColor.g, params.trailColor.b)
	groundMaterial.uniforms.uTrailTint.value.setRGB(params.trailTint.r, params.trailTint.g, params.trailTint.b)
	groundMaterial.uniforms.uTrailGlow.value = params.trailGlow
	groundMaterial.uniforms.uDeepWaterColor.value.setRGB(params.deepWaterColor.r, params.deepWaterColor.g, params.deepWaterColor.b)
}

const presetConfigs = {
	'Ice (Default)': () => {
		params.smokeColor1 = { r: 0.25, g: 0.1, b: 0.9 }
		params.smokeColor2 = { r: 0.1, g: 0.9, b: 0.8 }
		params.colorBlue = { r: 0, g: 0.2, b: 0.25 }
		params.colorDeepBlue = { r: 0, g: 0.01, b: 0.03 }
		params.colorGreen = { r: 0.1, g: 0.2, b: 0.35 }
		params.colorAccent = { r: 0.1, g: 0.7, b: 0.7 }
		params.bgColor = { r: 0, g: 0.01, b: 0.02 }
		params.frostColor = { r: 0.03, g: 0.4, b: 0.7 }
		params.trailColor = { r: 1.0, g: 1.0, b: 1.0 }
		params.trailTint = { r: 1.0, g: 1.0, b: 1.0 }
		params.trailGlow = 0.0
		params.deepWaterColor = { r: 0.0, g: 0.03, b: 0.08 }
		params.bloomStrength = 0.4
		bloomPass.strength = 0.4
		applyAllColors()
		pane.refresh()
	},
	'Lava': () => {
		params.smokeColor1 = { r: 1.0, g: 0.2, b: 0.0 }
		params.smokeColor2 = { r: 1.0, g: 0.8, b: 0.0 }
		params.colorBlue = { r: 0.3, g: 0.05, b: 0.0 }
		params.colorDeepBlue = { r: 0.1, g: 0.0, b: 0.0 }
		params.colorGreen = { r: 0.5, g: 0.1, b: 0.0 }
		params.colorAccent = { r: 1.0, g: 0.4, b: 0.0 }
		params.bgColor = { r: 0.02, g: 0.0, b: 0.0 }
		params.frostColor = { r: 0.8, g: 0.2, b: 0.0 }
		params.trailColor = { r: 1.0, g: 0.6, b: 0.2 }
		params.trailTint = { r: 1.0, g: 0.5, b: 0.1 }
		params.trailGlow = 2.0
		params.deepWaterColor = { r: 0.15, g: 0.02, b: 0.0 }
		params.bloomStrength = 1.0
		bloomPass.strength = 1.0
		applyAllColors()
		pane.refresh()
	},
	'Toxic': () => {
		params.smokeColor1 = { r: 0.0, g: 0.9, b: 0.1 }
		params.smokeColor2 = { r: 0.4, g: 1.0, b: 0.0 }
		params.colorBlue = { r: 0.0, g: 0.15, b: 0.05 }
		params.colorDeepBlue = { r: 0.0, g: 0.02, b: 0.0 }
		params.colorGreen = { r: 0.0, g: 0.3, b: 0.1 }
		params.colorAccent = { r: 0.2, g: 1.0, b: 0.3 }
		params.bgColor = { r: 0.0, g: 0.01, b: 0.0 }
		params.frostColor = { r: 0.1, g: 0.7, b: 0.2 }
		params.trailColor = { r: 0.3, g: 1.0, b: 0.2 }
		params.trailTint = { r: 0.2, g: 1.0, b: 0.3 }
		params.trailGlow = 1.5
		params.bloomStrength = 0.8
		bloomPass.strength = 0.8
		applyAllColors()
		pane.refresh()
	},
	'Void': () => {
		params.smokeColor1 = { r: 0.5, g: 0.0, b: 0.8 }
		params.smokeColor2 = { r: 0.8, g: 0.0, b: 1.0 }
		params.colorBlue = { r: 0.1, g: 0.0, b: 0.2 }
		params.colorDeepBlue = { r: 0.02, g: 0.0, b: 0.05 }
		params.colorGreen = { r: 0.2, g: 0.0, b: 0.3 }
		params.colorAccent = { r: 0.6, g: 0.1, b: 0.9 }
		params.bgColor = { r: 0.01, g: 0.0, b: 0.02 }
		params.frostColor = { r: 0.3, g: 0.05, b: 0.6 }
		params.trailColor = { r: 0.7, g: 0.3, b: 1.0 }
		params.trailTint = { r: 0.6, g: 0.1, b: 1.0 }
		params.trailGlow = 1.8
		params.bloomStrength = 1.2
		bloomPass.strength = 1.2
		applyAllColors()
		pane.refresh()
	},
	'Gold': () => {
		params.smokeColor1 = { r: 0.8, g: 0.6, b: 0.1 }
		params.smokeColor2 = { r: 1.0, g: 0.9, b: 0.5 }
		params.colorBlue = { r: 0.15, g: 0.1, b: 0.0 }
		params.colorDeepBlue = { r: 0.05, g: 0.03, b: 0.0 }
		params.colorGreen = { r: 0.25, g: 0.15, b: 0.0 }
		params.colorAccent = { r: 1.0, g: 0.8, b: 0.3 }
		params.bgColor = { r: 0.02, g: 0.01, b: 0.0 }
		params.frostColor = { r: 0.7, g: 0.5, b: 0.1 }
		params.trailColor = { r: 1.0, g: 0.85, b: 0.4 }
		params.trailTint = { r: 1.0, g: 0.8, b: 0.3 }
		params.trailGlow = 1.5
		params.bloomStrength = 0.9
		bloomPass.strength = 0.9
		applyAllColors()
		pane.refresh()
	},
	'Neon': () => {
		params.smokeColor1 = { r: 1.0, g: 0.0, b: 0.5 }
		params.smokeColor2 = { r: 0.0, g: 0.8, b: 1.0 }
		params.colorBlue = { r: 0.05, g: 0.0, b: 0.1 }
		params.colorDeepBlue = { r: 0.01, g: 0.0, b: 0.02 }
		params.colorGreen = { r: 0.1, g: 0.0, b: 0.15 }
		params.colorAccent = { r: 0.0, g: 1.0, b: 0.8 }
		params.bgColor = { r: 0.005, g: 0.0, b: 0.01 }
		params.frostColor = { r: 0.5, g: 0.0, b: 0.8 }
		params.trailColor = { r: 1.0, g: 0.2, b: 0.8 }
		params.trailTint = { r: 1.0, g: 0.0, b: 0.6 }
		params.trailGlow = 3.0
		params.deepWaterColor = { r: 0.02, g: 0.0, b: 0.05 }
		params.bloomStrength = 1.5
		bloomPass.strength = 1.5
		applyAllColors()
		pane.refresh()
	},
	'Meadow': () => {
		params.surfaceMaterial = 'grass'
		swapSurfaceMaterial('grass', false)
		params.smokeColor1 = { r: 0.2, g: 0.5, b: 0.1 }
		params.smokeColor2 = { r: 0.6, g: 0.8, b: 0.2 }
		params.colorBlue = { r: 0.1, g: 0.25, b: 0.05 }     // base green
		params.colorDeepBlue = { r: 0.03, g: 0.08, b: 0.02 } // shadow green
		params.colorGreen = { r: 0.3, g: 0.5, b: 0.1 }       // bright tip green
		params.colorAccent = { r: 0.9, g: 0.7, b: 0.2 }      // wildflower yellow
		params.bgColor = { r: 0.02, g: 0.03, b: 0.01 }
		params.frostColor = { r: 0.4, g: 0.55, b: 0.15 }     // pollen green-gold
		params.trailColor = { r: 0.6, g: 0.8, b: 0.3 }
		params.trailTint = { r: 0.8, g: 0.9, b: 0.4 }
		params.trailGlow = 0.5
		params.deepWaterColor = { r: 0.08, g: 0.05, b: 0.02 } // earth/dirt
		params.bloomStrength = 0.3
		bloomPass.strength = 0.3
		applyAllColors()
		pane.refresh()
	},
	'Golden Hour': () => {
		params.surfaceMaterial = 'grass'
		swapSurfaceMaterial('grass', false)
		params.smokeColor1 = { r: 0.8, g: 0.5, b: 0.1 }
		params.smokeColor2 = { r: 1.0, g: 0.7, b: 0.2 }
		params.colorBlue = { r: 0.15, g: 0.2, b: 0.03 }      // warm green
		params.colorDeepBlue = { r: 0.05, g: 0.06, b: 0.01 }  // deep shadow
		params.colorGreen = { r: 0.5, g: 0.45, b: 0.1 }       // golden tips
		params.colorAccent = { r: 1.0, g: 0.5, b: 0.15 }      // orange flower
		params.bgColor = { r: 0.03, g: 0.02, b: 0.005 }
		params.frostColor = { r: 0.7, g: 0.5, b: 0.15 }       // golden pollen
		params.trailColor = { r: 1.0, g: 0.8, b: 0.3 }
		params.trailTint = { r: 1.0, g: 0.7, b: 0.2 }
		params.trailGlow = 1.5
		params.deepWaterColor = { r: 0.1, g: 0.06, b: 0.02 }
		params.bloomStrength = 0.8
		bloomPass.strength = 0.8
		applyAllColors()
		pane.refresh()
	},
	'Night Garden': () => {
		params.surfaceMaterial = 'grass'
		swapSurfaceMaterial('grass', false)
		params.smokeColor1 = { r: 0.05, g: 0.15, b: 0.3 }
		params.smokeColor2 = { r: 0.1, g: 0.3, b: 0.2 }
		params.colorBlue = { r: 0.02, g: 0.08, b: 0.04 }
		params.colorDeepBlue = { r: 0.01, g: 0.02, b: 0.02 }
		params.colorGreen = { r: 0.05, g: 0.15, b: 0.08 }
		params.colorAccent = { r: 0.3, g: 0.8, b: 1.0 }
		params.bgColor = { r: 0.005, g: 0.008, b: 0.01 }
		params.frostColor = { r: 0.1, g: 0.2, b: 0.15 }
		params.trailColor = { r: 0.2, g: 0.6, b: 0.4 }
		params.trailTint = { r: 0.15, g: 0.5, b: 0.3 }
		params.trailGlow = 2.5
		params.deepWaterColor = { r: 0.01, g: 0.02, b: 0.02 }
		params.bloomStrength = 1.3
		bloomPass.strength = 1.3
		applyAllColors()
		pane.refresh()
	},
	'Garden Moonlit': () => {
		params.surfaceMaterial = 'grass'
		swapSurfaceMaterial('grass', false)

		// Trail / Brush
		params.brushSize = 0.082
		params.brushSoftness = 0.71
		params.trailIntensity = 1.96
		params.decayRate = 2.7
		params.texelScale = 2.90
		params.trailColor = { r: 0.20, g: 0.60, b: 0.20 }
		trailMaterial.uniforms.uBrushSize.value = 0.082
		trailMaterial.uniforms.uBrushSoftness.value = 0.71
		trailMaterial.uniforms.uTrailIntensity.value = 1.96
		trailMaterial.uniforms.uDecayRate.value = 2.7
		trailMaterial.uniforms.uTexelScale.value = 2.90

		// Impact / Crack
		params.impactEnabled = true
		params.impactStrengthMax = 1.5
		params.impactRadius = 0.25
		params.impactRays = 8
		params.displacementStrength = 0.8
		params.impactShockwave = true
		params.shockwaveStrength = 1.5
		params.fovPunchAmount = 3.0
		trailMaterial.uniforms.uImpactRadius.value = 0.25
		trailMaterial.uniforms.uImpactRays.value = 8
		groundMaterial.uniforms.uDisplacementStrength.value = 0.8
		groundMaterial.uniforms.uShockwaveStrength.value = 1.5

		// Deep Water
		params.deepRevealThreshold = 0.45
		params.deepRevealIntensity = 1.00
		params.deepWaterColor = { r: 0.05, g: 0.04, b: 0.01 }
		groundMaterial.uniforms.uDeepRevealThreshold.value = 0.45
		groundMaterial.uniforms.uDeepRevealIntensity.value = 1.00

		// Smoke / Curl Noise (kept for posterity even if particles disabled)
		params.curlScale1 = 5.0
		params.curlScale2 = 13.0
		params.curlSpeed = 0.11
		params.curlStrength1 = 0.18
		params.curlStrength2 = 0.13
		params.smokeDecay = 0.0
		params.smokeGlowPower1 = 1
		params.smokeGlowPower2 = 4
		trailSmokeMaterial.uniforms.uCurlScale1.value = 5.0
		trailSmokeMaterial.uniforms.uCurlScale2.value = 13.0
		trailSmokeMaterial.uniforms.uCurlSpeed.value = 0.11
		trailSmokeMaterial.uniforms.uCurlStrength1.value = 0.18
		trailSmokeMaterial.uniforms.uCurlStrength2.value = 0.13
		trailSmokeMaterial.uniforms.uSmokeDecay.value = 0.0
		trailSmokeMaterial.uniforms.uSmokeGlowPower1.value = 1
		trailSmokeMaterial.uniforms.uSmokeGlowPower2.value = 4

		// Ice Surface (mapped to grass uniforms)
		params.parallaxDistance = 0.0
		params.crackScale = 5.0
		params.crackIntensity = 1.0
		params.frostedIntensity = 0.8
		params.perlinDetailScale = 13
		params.trailTint = { r: 0.08, g: 0.23, b: 0.10 }
		params.trailGlow = 1.9
		params.vignetteStart = 0.50
		params.vignetteEnd = 1.05
		groundMaterial.uniforms.uParallaxDistance.value = 0.0
		groundMaterial.uniforms.uCrackScale.value = 5.0
		groundMaterial.uniforms.uCrackIntensity.value = 1.0
		groundMaterial.uniforms.uFrostedIntensity.value = 0.8
		groundMaterial.uniforms.uPerlinDetailScale.value = 13
		groundMaterial.uniforms.uTrailGlow.value = 1.9
		groundMaterial.uniforms.uVignetteStart.value = 0.50
		groundMaterial.uniforms.uVignetteEnd.value = 1.05

		// Colors (dark moody garden + cyan bioluminescent accent)
		params.colorBlue = { r: 0.02, g: 0.04, b: 0.02 }
		params.colorDeepBlue = { r: 0.01, g: 0.02, b: 0.01 }
		params.colorGreen = { r: 0.05, g: 0.15, b: 0.08 }
		params.colorAccent = { r: 0.39, g: 0.83, b: 1.0 }
		params.bgColor = { r: 0.005, g: 0.008, b: 0.01 }
		params.smokeColor1 = { r: 0.20, g: 0.60, b: 0.20 }
		params.smokeColor2 = { r: 0.39, g: 0.83, b: 1.0 }
		params.frostColor = { r: 0.39, g: 0.83, b: 1.0 }

		applyAllColors()
		pane.refresh()
	},
}

for (const [name, fn] of Object.entries(presetConfigs)) {
	presetsFolder.addButton({ title: name }).on('click', fn)
}

// ─── Init ───────────────────────────────────────────────────────
handleResize()

// Apply default preset
presetConfigs['Garden Moonlit']()

const clock = new THREE.Clock()
let time = 0
let autoDrawTime = 0

// ─── Frame Loop ─────────────────────────────────────────────────
function tic() {
	fpsGraph.begin()

	const dt = clock.getDelta()
	time += dt

	// Auto-draw or mouse
	if (params.autoDrawEnabled) {
		autoDrawTime += dt * params.autoDrawSpeed
		const uv = getAutoDrawUV(autoDrawTime)
		trailMaterial.uniforms.uUVPointer.value.lerp(
			new THREE.Vector2(uv.x, uv.y),
			dt * 15
		)
	} else {
		raycaster.setFromCamera(pointer, camera)
		const intersections = raycaster.intersectObject(ground)
		if (intersections.length > 0) {
			const { uv, point } = intersections[0]
			if (uv) {
				const currentUV = trailMaterial.uniforms.uUVPointer.value
				const dx = uv.x - prevPointerUV.x
				const dy = uv.y - prevPointerUV.y
				pointerSpeed = Math.sqrt(dx * dx + dy * dy) / Math.max(dt, 0.001)
				prevPointerUV.copy(uv)
				currentUV.lerp(uv, dt * 10)
			}
			if (point) {
				riceField.setMouseWorld(point)
				// Offset hit to sit on top of the hills and spawn mushrooms there
				const hy = hillAt(point.x, point.z, params.hills)
				_mushPoint.set(point.x, hy, point.z)
				hillNormalAt(point.x, point.z, params.hills, _mushNormal)
				mushrooms.trySpawnAt(_mushPoint, _mushNormal)
			}
		} else {
			riceField.clearMouseWorld()
		}
	}

	mushrooms.update(dt)

	trailMaterial.uniforms.uTime.value = time
	trailMaterial.uniforms.uDt.value = dt
	trailMaterial.uniforms.uSpeed.value = pointerSpeed
	groundMaterial.uniforms.uTime.value = time

	// Impact decay
	if (impactActive) {
		trailMaterial.uniforms.uImpactStrength.value = impactDecay
	} else {
		impactDecay *= 0.85
		trailMaterial.uniforms.uImpactStrength.value = impactDecay > 0.01 ? impactDecay : 0
	}

	// Shockwave update
	if (shockwave.active) {
		shockwave.progress += dt * 2.0
		if (shockwave.progress >= 1.0) {
			shockwave.active = false
			shockwave.progress = 0
		}
		groundMaterial.uniforms.uShockwave.value.set(shockwave.x, shockwave.y, shockwave.progress)
	} else {
		groundMaterial.uniforms.uShockwave.value.z = 0
	}

	// FOV punch decay
	if (fovPunch > 0.05) {
		fovPunch *= 0.88
		camera.fov = params.fov + fovPunch
		camera.updateProjectionMatrix()
	} else if (fovPunch > 0) {
		fovPunch = 0
		camera.fov = params.fov
		camera.updateProjectionMatrix()
	}

	// Film grain time
	grainPass.uniforms['uTime'].value = time

	controls.update(dt)

	// Render trail to RT
	renderer.setRenderTarget(outputRT)
	renderer.render(trailScene, camera)

	renderer.setRenderTarget(null)

	// Feed textures to main scene
	trailMaterial.uniforms.uMap.value = outputRT.texture
	groundMaterial.uniforms.uTrailMap.value = inputRT.texture
	riceField.setTrailTexture(inputRT.texture)
	riceField.update(time)

	// Render through post-processing
	composer.render()

	// Swap ping-pong
	let temp = inputRT
	inputRT = outputRT
	outputRT = temp

	fpsGraph.end()
	requestAnimationFrame(tic)
}

requestAnimationFrame(tic)

// ─── Resize ─────────────────────────────────────────────────────
window.addEventListener('resize', handleResize)

function handleResize() {
	sizes.width = window.innerWidth
	sizes.height = window.innerHeight

	camera.aspect = sizes.width / sizes.height
	camera.updateProjectionMatrix()

	trailMaterial.uniforms.uResolution.value.set(sizes.width, sizes.height)
	trailSmokeMaterial.uniforms.uResolution.value.set(
		sizes.width * params.smokeResolution,
		sizes.height * params.smokeResolution
	)

	renderer.setSize(sizes.width, sizes.height)
	composer.setSize(sizes.width, sizes.height)
	rt1.setSize(sizes.width, sizes.height)
	rt2.setSize(sizes.width, sizes.height)
	rt3.setSize(sizes.width * params.smokeResolution, sizes.height * params.smokeResolution)
	rt4.setSize(sizes.width * params.smokeResolution, sizes.height * params.smokeResolution)

	const pixelRatio = Math.min(window.devicePixelRatio, 2)
	renderer.setPixelRatio(pixelRatio)
}
