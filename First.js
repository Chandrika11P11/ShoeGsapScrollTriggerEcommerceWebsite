import * as THREE from 'three';
import { GUI } from 'jsm/libs/lil-gui.module.min.js';
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'jsm/loaders/RGBELoader.js';
import { gsap } from 'https://cdn.skypack.dev/gsap';
import { ScrollTrigger } from 'https://cdn.skypack.dev/gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const userAgent = navigator.userAgent.toLowerCase();
const isMobile = /iphone|android|blackberry|mini|windows\sce|palm/i.test(userAgent);
const isTablet = /ipad|tablet|kindle|playbook/i.test(userAgent);

/*const isMobile = window.innerWidth <= 768;
const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;*/

// Global Variables
let camera, scene, renderer, model, gui;
const state = { variant: 'street' };


// Initialization
init();
animate();

function init() {
    const container = document.querySelector('.canvas-container');
    camera = createCamera();
    scene = new THREE.Scene();
    setupRenderer(container);

    loadModel();
    setupControls();


    window.addEventListener('resize', onWindowResize);

    const ambientLight = new THREE.AmbientLight(0x444444, 50);


    scene.add(ambientLight);


    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 10, 0);
    directionalLight.target.position.set(0, 0, 0);


    scene.add(directionalLight);


}

function createCamera() {
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.25, 20);
    /*camera.position.set(2.5, 1.5, 3.0);*/
    camera.position.set(-1.4250411468376494, 1.3949800494471372, -4.02861181643047);
    return camera;
}


function setupRenderer(container) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.zIndex = '10';
}

/*function loadHDRI() {
    new RGBELoader()
        .setPath('./equirectangular/')
        .load('pedestrian_overpass_1k.hdr', (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.background = texture;
            scene.environment = texture;
            loadModel(); 
        });
}

function loadBackground() {
    scene.background = new THREE.Color('#DC2626');
}*/


function loadModel() {
    // Show the loading screen
    document.getElementById('loading-screen').style.display = 'block';

    const loader = new GLTFLoader().setPath('./MaterialsVariantsShoe/glTF/');
    loader.load('MaterialsVariantsShoe.gltf', (gltf) => {
        model = gltf.scene;
        model.scale.set(10.0, 10.0, 10.0);
        setupScrollTrigger();
        selectVariant(scene, gltf.parser, gltf.userData.gltfExtensions['KHR_materials_variants'], 'street'); // Select the "street" variant by default
        scene.add(model);
        /*setupGUI(gltf);*/
        // Set up buttons for variant switching
        const variantsExtension = gltf.userData.gltfExtensions['KHR_materials_variants'];
        setupVariantButtons(gltf.parser, variantsExtension);

        render(); // Initial render

        // Hide the loading screen once the model is loaded
        document.getElementById('loading-screen').style.display = 'none';

    });
}


function setupGUI(gltf) {
    gui = new GUI();
    const parser = gltf.parser;
    const variantsExtension = gltf.userData.gltfExtensions['KHR_materials_variants'];
    const variants = variantsExtension.variants.map((variant) => variant.name);
    const variantsCtrl = gui.add(state, 'variant', variants).name('Variant');

    // Select the initial variant
    selectVariant(scene, parser, variantsExtension, state.variant);

    // Update variant when GUI control changes
    variantsCtrl.onChange((value) => selectVariant(scene, parser, variantsExtension, value));

    // Add GUI controls for position, rotation, and scale
    const positionFolder = gui.addFolder('Position');
    positionFolder.add(model.position, 'x', -10, 10).name('X');
    positionFolder.add(model.position, 'y', -10, 10).name('Y');
    positionFolder.add(model.position, 'z', -10, 10).name('Z');

    const rotationFolder = gui.addFolder('Rotation');
    rotationFolder.add(model.rotation, 'x', -Math.PI, Math.PI).name('X');
    rotationFolder.add(model.rotation, 'y', -Math.PI, Math.PI).name('Y');
    rotationFolder.add(model.rotation, 'z', -Math.PI, Math.PI).name('Z');

    const scaleFolder = gui.addFolder('Scale');
    scaleFolder.add(model.scale, 'x', 0.1, 10).name('X');
    scaleFolder.add(model.scale, 'y', 0.1, 10).name('Y');
    scaleFolder.add(model.scale, 'z', 0.1, 10).name('Z');

}



function selectVariant(scene, parser, extension, variantName) {
    const variantIndex = extension.variants.findIndex((v) => v.name.includes(variantName));

    scene.traverse(async (object) => {
        if (!object.isMesh || !object.userData.gltfExtensions) return;

        const meshVariantDef = object.userData.gltfExtensions['KHR_materials_variants'];
        if (!meshVariantDef) return;

        if (!object.userData.originalMaterial) {
            object.userData.originalMaterial = object.material; // Store original material
        }

        const mapping = meshVariantDef.mappings.find((mapping) =>
            mapping.variants.includes(variantIndex)
        );

        if (mapping) {
            object.material = await parser.getDependency('material', mapping.material);
            parser.assignFinalMaterial(object);
        } else {
            object.material = object.userData.originalMaterial; // Fallback to original material
        }

        render(); // Render after changing variant
    });
}

function setupVariantButtons(parser, variantsExtension) {
    // Select all buttons with the "variant-btn" class
    const buttons = document.querySelectorAll('.variant-btn');

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            // Get the variant name from the button's data-variant attribute
            const variantName = button.getAttribute('data-variant');

            // Call selectVariant with the correct parameters
            selectVariant(model, parser, variantsExtension, variantName);
        });
    });
}


function setupControls() {
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', render);
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.target.set(0, 0.5, -0.2);
    controls.update();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

function render() {

    renderer.render(scene, camera);

}

function animate() {
    requestAnimationFrame(animate);
    render();
}

function setupScrollTrigger() {
    const sections = document.querySelectorAll('.section');
    sections.forEach((section, index) => {
        setupScrollAnimation(section, index, sections);
    });
}



function setupScrollAnimation(section, index) {

    const timeline = gsap.timeline({
        scrollTrigger: {
            trigger: section,
            start: 'top center',
            end: 'bottom center',
            scrub: true,

        }
    });

    if (index === 0) {
        timeline
            .to(model.scale, {
                x: isMobile ? 5 : isTablet ? 10 : 10,
                y: isMobile ? 5 : isTablet ? 10 : 10,
                z: isMobile ? 5 : isTablet ? 10 : 10,
                duration: 3
            }, "<")
            .to(model.position, {
                x: isMobile ? 0.38 : isTablet ? 0.2 : 0,
                y: isMobile ? -0.2 : isTablet ? -0.3 : 0,
                z: isMobile ? 0 : isTablet ? -0.4 : 0,
                duration: 5
            })
            .to(model.rotation, {
                x: 0,
                y: isMobile ? 0.6283 : isTablet ? 0.45 : 0.565486677646163,
                z: isMobile ? -0.942 : isTablet ? -0.35 : -0.521504380495906,
                duration: 5
            }, "<");

    }

    if (index === 1) {
        timeline
            .to(model.position, {
                x: isMobile ? 0.8 : isTablet ? 1.2 : 1.54,
                z: isMobile ? -0.5 : isTablet ? -0.7 : -0.92,
                duration: 3
            }, "<")
            .to(model.rotation, {
                y: isMobile ? 2 : isTablet ? 2.5 : 3.141,
                duration: 3
            }, "<");
    }

    if (index === 2) {
        timeline
            .to(model.position, {
                x: isMobile ? -0.5 : isTablet ? -0.8 : -0.92,
                z: isMobile ? 1 : isTablet ? 1.5 : 2.04,
                duration: 3
            }, "<")
            .to(model.rotation, {
                y: isMobile ? 0.2 : isTablet ? 0.3 : 0.408,
                duration: 3
            }, "<");
    }

    if (index === 3) {
        timeline
            .to(model.scale, {
                x: isMobile ? 5 : isTablet ? 10 : 15,
                y: isMobile ? 5 : isTablet ? 10 : 15,
                z: isMobile ? 5 : isTablet ? 10 : 15,
                duration: 5
            }, "<")
            .to(model.position, {
                x: isMobile ? 0 : isTablet ? -0.5 : -0.92,
                z: isMobile ? 0 : isTablet ? 1.5 : 2.04,
                duration: 3
            }, "<")
            .to(model.rotation, {
                y: isMobile ? 0.2 : isTablet ? 0.3 : 0.408,
                duration: 3
            }, "<");
    }

    if (index === 4) {
        timeline
            .to(model.scale, {
                x: isMobile ? 5 : isTablet ? 10 : 15,
                y: isMobile ? 5 : isTablet ? 10 : 15,
                z: isMobile ? 5 : isTablet ? 10 : 15,
                duration: 1
            })
            .to(model.position, {
                x: isMobile ? 2 : isTablet ? 3.5 : 4.5,
                duration: 3
            }, "<")
            .to(model.rotation, {
                x: 3.141,
                y: isMobile ? 0.1 : isTablet ? 0.15 : 0.175,
                z: isMobile ? 1 : isTablet ? 1.8 : 2.337,
                duration: 3
            }, "<");
    }

    if (index === 5) {
        timeline
            .to(model.scale, {
                x: isMobile ? 5 : isTablet ? 10 : 15,
                y: isMobile ? 5 : isTablet ? 10 : 15,
                z: isMobile ? 5 : isTablet ? 10 : 15,
                duration: 1
            })
            .to(model.position, {
                x: isMobile ? 15 : isTablet ? 20 : 25,
                duration: 3
            }, "<");
    }




    /*
    
        if (index === 0) {
            // This conditional block checks if the current section index is equal to 0.
            // If it is, the code inside this block will execute.
        
            // Animation for section 0
            // It animates the `model` object's position and rotation over a duration of 5 seconds.
        
            timeline
                .to(model.position, { x: 0, y: 0, z: 0, duration: 5 })
                // This line of code animates the `model` object's position to (0, 0, 0) over a duration of 5 seconds.
        
                .to(model.rotation, { x: 0, y: 0.565486677646163, z: -0.521504380495906, duration: 5 }, "<")
                // This line of code animates the `model` object's rotation to a specific angle (x: 0, y: 0.565, z: -0.521) over a duration of 5 seconds.
                // The "<" parameter indicates that the rotation animation should start and end simultaneously with the position animation.
        }
    
        if (index === 1) {
            // Animation for section 1
            timeline
            .to(model.position, { x: 1.54, z: -0.92, duration: 3 }, "<") // Move the model to a specific position
            .to(model.rotation, { y: 3.141592653589793, duration: 3 }, "<") // Rotate the model    
    
        }
    
        if (index === 2) {
            // Animation for section 2
            timeline
            .to(model.position, { x: -0.92, z: 2.04, duration: 3 }, "<") // Move the model to a specific position
            .to(model.rotation, { y: 0.408407044966673, duration: 3 }, "<") // Rotate the model
        }
    
        if (index === 3) {
            // Animation for section 3
            timeline
                .to(model.scale, { x: 15, y: 15, z: 15, duration: 5 }, "<") // Scale the model up
                .to(model.position, { x: -0.92, z: 2.04, duration: 3 }, "<") // Move the model to a specific position
                .to(model.rotation, { y: 0.408407044966673, duration: 3 }, "<") // Rotate the model
        }
    
        if (index === 4) {
            // Animation for section 4
            timeline
                .to(model.scale, { x: 15, y: 15, z: 15, duration: 1 }) // Scale the model up
                .to(model.position, { x: 4.5, duration: 3 }, "<") // Move the model to a specific position
                .to(model.rotation, { x: 3.141592653589793, y: 0.175929188601028, z: 2.33734493427081, duration: 3 }, "<") // Rotate the model
        }
    
        if (index === 5) {
            // Animation for section 5
            timeline
                .to(model.scale, { x: 15, y: 15, z: 15, duration: 1 }) // Scale the model up
                .to(model.position, { x:25,  duration: 3 }, "<"); // Move the model to a specific position
        }*/
}

