THREE.Cache.enabled = true;
var strDownloadMime = "image/octet-stream";
var saveFile =
    function(strData, filename) {
	var link = document.createElement('a');
	if (typeof link.download === 'string') {
	    document.body.appendChild(
		link); // Firefox requires the link to be in the body
	    link.download = filename;
	    link.href = strData;
	    link.click();
	    document.body.removeChild(link); // remove the link when done
	} else {
	    location.replace(uri);
	}
    }

function getJson(yourUrl){
    var Httpreq = new XMLHttpRequest(); // a new request
    Httpreq.open("GET",yourUrl,false);
    Httpreq.send(null);
    return Httpreq.responseText;          
}

var Menu = function() {
    this.electrons = true;
    this.positrons = true;
    // this.fieldLines = true;
    this.alpha_correction = 1.0;
    this.star_radius = 0.055;
    this.star_color = "#666666";
    this.color1 = "#ffffff";
    this.stepPos1 = 0.1;
    this.color2 = "#ff9900";
    this.stepPos2 = 0.5;
    this.color3 = "#ff0000";
    this.stepPos3 = 1.0;
    this.species = 0;
    this.filepath = fpath;
    this.filename = fname;
    this.screenshot = function() {
        // renderer.render( scene, camera );
        // socket.emit('render-frame', {
        //     // frame: frame++,
        //     frame: 0,
        //     file: document.querySelector('canvas').toDataURL()
        // });
        var strMime = "image/png";
        var data = document.querySelector('#RenderCanvas').toDataURL(strMime);
        saveFile(data.replace(strMime, strDownloadMime), "screenshot.png");
    };
    this.reset_view = resetView;
    this.auto_rotate = false;
    this.wireframe = true;
};
var menu = new Menu();

// Add a fps panel
var stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );

function updateTransferFunction() {
    var canvas = document.createElement('canvas');
    canvas.height = 16;
    canvas.width = 256;
    var ctx = canvas.getContext('2d');
    var grd = ctx.createLinearGradient(0, 0, canvas.width -1 , canvas.height - 1);
    grd.addColorStop(menu.stepPos1, menu.color1);
    grd.addColorStop(menu.stepPos2, menu.color2);
    grd.addColorStop(menu.stepPos3, menu.color3);
    ctx.fillStyle = grd;
    ctx.fillRect(0,0,canvas.width ,canvas.height );

    var transferTexture =  new THREE.CanvasTexture(canvas);
    transferTexture.wrapS = transferTexture.wrapT =  THREE.ClampToEdgeWrapping;
    transferTexture.minFilter = transferTexture.magFilter = THREE.LinearFilter;
    transferTexture.format = THREE.RGBAFormat;
    transferTexture.needsUpdate = true;
    return transferTexture;
}

// Create an empty scene
var scene = new THREE.Scene();
// scene.background = new THREE.Color(0x000000);
var scenefbo = new THREE.Scene();
// scenefbo.background = new THREE.Color(0x000000);

// Create a basic perspective camera
const width = window.innerWidth;
const height = window.innerHeight;
const aspect = width / height;
var paused = false;

// Create a renderer with Antialiasing
var renderer = new THREE.WebGLRenderer(
    {alpha : false,
     antialias : true,
     preserveDrawingBuffer : true});
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setClearColor("#000000");

// Configure renderer size
renderer.setSize(width, height);
renderer.autoClear = true;

// Append Renderer to DOM
var canvas = renderer.domElement;
document.body.appendChild(canvas);
canvas.id = "RenderCanvas"
// var context = canvas.getContext( 'webgl2' );

// document.addEventListener('mousedown', function() {
//     paused = !paused;
// }, false);
var camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
camera.position.y = -1;
camera.position.z = 1;
camera.position.x = 0;
camera.lookAt([ 0, 0, 0 ]);
camera.up = new THREE.Vector3(0, 0, 1);

var controls = new THREE.OrbitControls(camera, renderer.domElement);

controls.keys = {
    LEFT: 65, // key a
    UP: 87, // key w
    RIGHT: 68, // key d
    BOTTOM: 83 // key s
}

function resetView() {
    controls.reset();
}

// resetView();
camera.updateProjectionMatrix();

console.log("http://localhost:"+my_port+"/api/img/?filename=" + fpath + fname)

var manager = new THREE.LoadingManager();
var loader = new THREE.FileLoader(manager);
var imgloader = new THREE.TextureLoader();
var vs1, fs1, vs2, fs2, vs3, fs3, dataTex, transTex;
var texNeedsUpdate = false;
loader.setResponseType('text');
loader.load("http://localhost:"+my_port+"/public/shaders/first-pass.vert.glsl", function(f) {vs1 = f;});
loader.load("http://localhost:"+my_port+"/public/shaders/first-pass.frag.glsl", function(f) {fs1 = f;});
loader.load("http://localhost:"+my_port+"/public/shaders/second-pass.vert.glsl", function(f) {vs2 = f;});
loader.load("http://localhost:"+my_port+"/public/shaders/second-pass.frag.glsl", function(f) {fs2 = f;});

function loadSimData(filename) {
    imgloader.load("http://localhost:"+my_port+"/api/img/?filename=" + filename,
		   function(f) {
		       dataTex = f;
		       dataTex.flipY = false;
		       dataTex.minFilter = THREE.LinearFilter;
		       dataTex.magFilter = THREE.LinearFilter;
		       dataTex.type = THREE.UnsignedByteType;
		       console.info("Loaded Simulation Data");
		       texNeedsUpdate = true;
		   });
}

loadSimData(menu.filepath + menu.filename);

transTex = updateTransferFunction();
manager.onLoad = function() { start(); };

var start = function() {
    // Setup dat.gui
    var gui = new dat.GUI();
    ctlPath = gui.add(menu, 'filepath');
    ctlFile = gui.add(menu, 'filename');
    gui.add(menu, 'alpha_correction', 0, 4.0).listen();
    gui.add(menu, 'star_radius', 0, 0.1).listen();
    ctlStarColor = gui.addColor(menu, 'star_color');
    ctlColor1 = gui.addColor(menu, 'color1');
    ctlStep1 = gui.add(menu, 'stepPos1', 0, 1);
    ctlColor2 = gui.addColor(menu, 'color2');
    ctlStep2 = gui.add(menu, 'stepPos2', 0, 1);
    ctlColor3 = gui.addColor(menu, 'color3');
    ctlStep3 = gui.add(menu, 'stepPos3', 0, 1);
    ctlSpecies = gui.add(menu, 'species', {"dens": 0, "densi": 1,
					   "dens+densi": 2, "dens-densi": 3}).listen();
    gui.add(menu, 'screenshot');
    gui.add(menu, 'reset_view');
    gui.add(menu, 'auto_rotate').listen();
    gui.add(menu, 'wireframe').listen();

    ctlPath.onFinishChange(updateFile);
    ctlFile.onFinishChange(updateFile);
    ctlStarColor.onChange(updateTexture);
    ctlColor1.onChange(updateTexture);
    ctlColor2.onChange(updateTexture);
    ctlColor3.onChange(updateTexture);
    ctlStep1.onChange(updateTexture);
    ctlStep2.onChange(updateTexture);
    ctlStep3.onChange(updateTexture);
    ctlSpecies.onChange(updateSpecies);

    var rtTexture = new THREE.WebGLRenderTarget(
	window.innerWidth, window.innerHeight, {
	    minFilter: THREE.LinearFilter,
	    magFilter: THREE.LinearFilter,
	    wrapS:  THREE.ClampToEdgeWrapping,
	    wrapT:  THREE.ClampToEdgeWrapping,
	    format: THREE.RGBAFormat,
	    type: THREE.FloatType,
	    // generateMipmaps: false,
	    // flipY: false,
	    // depthBuffer: false,
	    // stencilBuffer: false
	} );

    // First pass
    var mat1 = new THREE.ShaderMaterial({
	// uniforms: {},
	vertexShader: vs1,
	fragmentShader: fs1,
	side: THREE.BackSide
	// vertexColors: true
    });

    var mat2 = new THREE.ShaderMaterial({
	uniforms: {
	    tex: {type: "t", value: rtTexture.texture},
	    cubeTex: { type: "t", value: dataTex},
	    transferTex: { type: "t", value: transTex},
	    starColor: { type: "c", value: new THREE.Color(menu.star_color)},
	    steps: {type: "f", value: 256.0},
	    alphaCorrection: {type: "f", value: 1.0},
	    res: {type: "f", value: 512.0},
	    row: {type: "f", value: 32.0},
	    star_radius: {value: menu.star_radius},
	    species: {type: "i", value: menu.species}
	},
	vertexShader: vs2,
	fragmentShader: fs2,
	side: THREE.FrontSide,
	// depthWrite: true,
	// transparent: true
    });

    // Add a cube
    var cube_geometry = new THREE.BoxGeometry(1, 1, 1);

    var cube1 = new THREE.Mesh(cube_geometry, mat1);
    scenefbo.add(cube1);
    var cube2 = new THREE.Mesh(cube_geometry, mat2);
    scene.add(cube2);

    var cube_edge = new THREE.EdgesGeometry( cube_geometry );
    var wiremat = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2,
						 depthTest: false, depthWrite: false});
    var wireframe = new THREE.LineSegments( cube_edge, wiremat );

    scene.add( wireframe );

    function updateTexture(value) {
	mat2.uniforms.starColor.value = new THREE.Color(menu.star_color);
	mat2.uniforms.transferTex.value = updateTransferFunction();
    }

    function updateSpecies(value) {
	mat2.uniforms.species.value = menu.species;
    }

    function updateFile(value) {
	loadSimData(menu.filepath + menu.filename);
    }

    function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
	if (menu.auto_rotate) {
	    controls.autoRotate = true;
	} else {
	    controls.autoRotate = false;
	}
	requestAnimationFrame(animate);
	stats.begin();
	// required if controls.enableDamping or controls.autoRotate are set to true
	controls.update();
	camera.updateProjectionMatrix();
	// console.log(camera.position);
	render();
	stats.end();
    }

    function render() {
	if (texNeedsUpdate) {
	    mat2.uniforms.cubeTex.value = dataTex;
	    texNeedsUpdate = false;
	}
	wireframe.visible = menu.wireframe;
	// console.log(menu.star_radius);
	mat2.uniforms.star_radius.value = menu.star_radius;
	mat2.uniforms.alphaCorrection.value = menu.alpha_correction;
	renderer.render(scenefbo, camera, rtTexture, true);
	renderer.render(scene, camera);
    }

    function cameraRotateLeftRight(degree) {
	var cam_radius = Math.sqrt(camera.position.x * camera.position.x +
				   camera.position.y * camera.position.y);

        camera.position.y += degree * camera.position.x / cam_radius;
        camera.position.x -= degree * camera.position.y / cam_radius;
	camera.updateProjectionMatrix();
	controls.update();
    }

    function cameraRotateUpDown(degree) {
	var cam_radius = Math.sqrt(camera.position.y * camera.position.y +
				   camera.position.z * camera.position.z);

        camera.position.z += degree * camera.position.y / cam_radius;
        camera.position.y -= degree * camera.position.z / cam_radius;
	camera.updateProjectionMatrix();
	controls.update();
    }

    document.body.onkeydown = function(event) {
	// var key = event.which || event.keyCode || 0;
	var key = event.code || 0;
	// console.log(key);
	if (key === 'KeyQ') { // Q key
	    menu.alpha_correction -= 0.02;
	} else if (key === 'KeyE') { // W key
	    menu.alpha_correction += 0.02;
	} else if (key === 'Space') { // Reset view point
	    resetView();
	} else if (key === 'ArrowLeft') {
	    cameraRotateLeftRight(0.05);
	} else if (key === 'ArrowRight') {
	    cameraRotateLeftRight(-0.05);
	} else if (key === 'ArrowUp') {
	    cameraRotateUpDown(-0.05);
	} else if (key === 'ArrowDown') {
	    cameraRotateUpDown(0.05);
	}
    };

    animate();

}
