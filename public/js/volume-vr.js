// Enable caching, file loader seem to only work this way
THREE.Cache.enabled = true;

var opts = {
  lines: 11, // The number of lines to draw
  length: 25, // The length of each line
  width: 18, // The line thickness
  radius: 60, // The radius of the inner circle
  scale: 0.9, // Scales overall size of the spinner
  corners: 0.9, // Corner roundness (0..1)
  color: '#ffffff', // CSS color or array of colors
  fadeColor: 'transparent', // CSS color or array of colors
  speed: 0.6, // Rounds per second
  rotate: 0, // The rotation offset
  animation: 'spinner-line-fade-quick', // The CSS animation name for the lines
  direction: 1, // 1: clockwise, -1: counterclockwise
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  className: 'spinner', // The CSS class to assign to the spinner
  top: '50%', // Top position relative to parent
  left: '50%', // Left position relative to parent
  shadow: '0 0 1px transparent', // Box-shadow for the lines
  position: 'absolute' // Element positioning
};

var strDownloadMime = "image/octet-stream";

// Function for saving a file (screenshot)
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

// Constructing the menu
var Config = function() {
    this.alpha_correction = 0.3;
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
        var strMime = "image/png";
        var data = document.querySelector('#RenderCanvas').toDataURL(strMime);
        saveFile(data.replace(strMime, strDownloadMime), "screenshot.png");
    };
    this.reset_view = resetView;
    this.auto_rotate = false;
    this.wireframe = true;
    this.isPaused = false;
    this.fov = 20;
};
var menu = new Config();

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
scene.background = new THREE.Color(0x000000);
// Create an empty scene for first pass rendering
// var scenefbo = new THREE.Scene();
// scenefbo.background = new THREE.Color(0x000000);

// Create a basic perspective camera
const width = window.innerWidth;
const height = window.innerHeight;
const aspect = width / height;
var paused = false;
var targetFrameTime = 32;
var samplingRate = 1.0;

// Create a renderer with Antialiasing. Note alpha needs to be false or
// there will be weird artifacts
var canvas = document.createElement('canvas');
var context = canvas.getContext( 'webgl2' );
var renderer = new THREE.WebGLRenderer(
    {alpha : false,
     antialias : true,
     preserveDrawingBuffer : true,
     canvas: canvas,
     context: context});
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setClearColor("#ffffff");

// Configure renderer size
renderer.setSize(width, height);
renderer.autoClear = true;

// Append Renderer to DOM
document.body.appendChild(canvas);
canvas.id = "RenderCanvas"

document.body.appendChild( WEBVR.createButton( renderer ) );
renderer.vr.enabled = true;

// Setup the camera initial condition
var camera = new THREE.PerspectiveCamera(menu.fov, aspect, 0.1, 1000);
camera.position.y = -4.0;
camera.position.z = 0;
camera.position.x = 0;
camera.lookAt([ 0, 0, 0 ]);
camera.up = new THREE.Vector3(0, 0, 1);

// Setup orbit controls for the camera
// var controls = new THREE.OrbitControls(camera, renderer.domElement);
// controls.keys = {
//     LEFT: 65, // key a
//     UP: 87, // key w
//     RIGHT: 68, // key d
//     BOTTOM: 83 // key s
// }
// controls.screenSpacePanning = true;

// Camera control functions
function resetView() {
    // controls.reset();
}

function cameraRotateLeftRight(degree) {
    var cam_radius = Math.sqrt(camera.position.x * camera.position.x +
			       camera.position.y * camera.position.y);

    camera.position.y += degree * camera.position.x / cam_radius;
    camera.position.x -= degree * camera.position.y / cam_radius;
    camera.updateProjectionMatrix();
    // controls.update();
}

function cameraRotateUpDown(degree) {
    var cam_radius = Math.sqrt(camera.position.y * camera.position.y +
			       camera.position.z * camera.position.z);

    camera.position.z += degree * camera.position.y / cam_radius;
    camera.position.y -= degree * camera.position.z / cam_radius;
    camera.updateProjectionMatrix();
    // controls.update();
}

camera.updateProjectionMatrix();

// Loading shaders and other things
var manager = new THREE.LoadingManager();
var loader = new THREE.FileLoader(manager);
var vs1, fs1, vs2, fs2, vs3, fs3, dataTex, transTex;
var tile_x, tile_y;
var texNeedsUpdate = false;
loader.setResponseType('text');
loader.load("http://localhost:"+my_port+"/public/shaders/first-pass.vert.glsl", function(f) {vs1 = f;});
loader.load("http://localhost:"+my_port+"/public/shaders/first-pass.frag.glsl", function(f) {fs1 = f;});
loader.load("http://localhost:"+my_port+"/public/shaders/second-pass.vert.glsl", function(f) {vs2 = f;});
loader.load("http://localhost:"+my_port+"/public/shaders/second-pass.frag.glsl", function(f) {fs2 = f;});
loader.load("http://localhost:"+my_port+"/public/shaders/volume.vert.glsl", function(f) {vs3 = f;});
loader.load("http://localhost:"+my_port+"/public/shaders/volume.frag.glsl", function(f) {fs3 = f;});

transTex = updateTransferFunction();
manager.onLoad = function() { start(); };

// Properly start the rendering
var start = function() {
    gui = makeGUI();
    // gui.remember(menu);
    // render_res = 256;

    // framebuffer for first pass
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

    // First pass shader
    var mat1 = new THREE.ShaderMaterial({
	// uniforms: {},
	vertexShader: vs1,
	fragmentShader: fs1,
	side: THREE.BackSide
	// vertexColors: true
    });

    // Second pass shader
    // console.log(tile_x)
    var mat2 = new THREE.ShaderMaterial({
	uniforms: {
	    tex: {type: "t", value: rtTexture.texture},
	    cubeTex: { type: "t", value: dataTex},
	    transferTex: { type: "t", value: transTex},
	    starColor: { type: "c", value: new THREE.Color(menu.star_color)},
	    steps: {type: "f", value: 256.0},
	    alphaCorrection: {type: "f", value: 1.0},
	    res_x: {type: "f", value: render_res},
	    res_y: {type: "f", value: render_res},
	    tile_x: {type: "f", value: tile_x},
	    tile_y: {type: "f", value: tile_y},
	    star_radius: {value: menu.star_radius},
	    species: {type: "i", value: 1}
	},
	vertexShader: vs2,
	fragmentShader: fs2,
	side: THREE.FrontSide,
	// depthWrite: true,
	// transparent: true
    });

    tile_x = 16;
    tile_y = 16;
    render_res = 256;

    var mat3 = new THREE.ShaderMaterial({
	uniforms: {
	    eye_pos: new THREE.Uniform(camera.position),
	    volume_scale: new THREE.Uniform(new THREE.Vector3(1.0,1.0,1.0)),
	    cubeTex: { type: "t", value: dataTex},
	    transferTex: { type: "t", value: transTex},
	    alphaCorrection: {type: "f", value: 1.0},
	    dt_scale: {type: "f", value: samplingRate},
	    volume_dims: new THREE.Uniform(new Int32Array([128,128,128])),
	    tile_x: {type: "f", value: tile_x},
	    tile_y: {type: "f", value: tile_y},
	    starColor: { type: "c", value: new THREE.Color(menu.star_color)},
	    star_radius: {value: menu.star_radius},
	    species: {type: "i", value: menu.species}
	},
	vertexShader: vs3,
	fragmentShader: fs3,
	side: THREE.BackSide,
	transparent: true
    });
    console.log("tile_x ", tile_x);
    console.log("tile_y ", tile_y);
    console.log("render_res ", render_res);

    // Functions to load the simulation data (in png texture)
    function initSlowLoadingManager() {
	const manager = new THREE.LoadingManager();
	var spinner;

	manager.onStart = () => {
	    var target = document.body;
	    spinner = new Spinner(opts).spin(target);
	};

	manager.onLoad = function ( ) {
	    spinner.stop();
	};
	
	manager.onError = function ( e ) { 
	    console.error( e ); 
	}
	
	return manager;
    }

    function loadSimData(filename) {
	var slow_manager = initSlowLoadingManager();
	var json_loader = new THREE.FileLoader(slow_manager);
	json_loader.load("http://localhost:"+my_port+"/public/data.json",
    			 function(content) {
			     var texloader = new THREE.TextureLoader(slow_manager);
			     var response = JSON.parse(content);
			     tile_x = response.tile_x;
			     tile_y = response.tile_y;
			     // render_res = response.res;
			     mat3.uniforms.tile_x.value = tile_x;
			     mat3.uniforms.tile_y.value = tile_y;
			     // mat3.uniforms.res_x.value = response.nx;
			     // mat3.uniforms.res_y.value = response.ny;
			     texloader.load(response.imgString, function(f) {
    				 dataTex = f;
    				 dataTex.flipY = false;
    				 dataTex.minFilter = THREE.LinearFilter;
    				 dataTex.magFilter = THREE.LinearFilter;
    				 dataTex.type = THREE.UnsignedByteType;
    				 console.info("Loaded Simulation Data");
    				 texNeedsUpdate = true;
				 // updateTexture();
			     }, slow_manager.onProgress, slow_manager.onError);
    			 }, slow_manager.onProgress, slow_manager.onError);
    }

    loadSimData(menu.filepath + menu.filename);



    // Add a cube
    var cube_geometry = new THREE.BoxGeometry(1, 1, 1);

    // var cube1 = new THREE.Mesh(cube_geometry, mat1);
    // scenefbo.add(cube1);
    var cube2 = new THREE.Mesh(cube_geometry, mat3);
    scene.add(cube2);

    // Add a wireframe of the cube
    var cube_edge = new THREE.EdgesGeometry( cube_geometry );
    var wiremat = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2,
						 depthTest: false, depthWrite: false});
    var wireframe = new THREE.LineSegments( cube_edge, wiremat );

    scene.add( wireframe );

    function makeGUI() {
	// Setup dat.gui
	var gui = new dat.GUI();
	gui.add(menu, 'filepath').onFinishChange(updateFile);
	gui.add(menu, 'filename').onFinishChange(updateFile);
	gui.add(menu, 'alpha_correction', 0, 4.0).listen();
	gui.add(menu, 'star_radius', 0, 0.1).listen();
	gui.addColor(menu, 'star_color').listen().onChange(updateTexture);
	gui.addColor(menu, 'color1').listen().onChange(updateTexture);
	gui.add(menu, 'stepPos1', 0, 1).listen().onChange(updateTexture);
	gui.addColor(menu, 'color2').listen().onChange(updateTexture);
	gui.add(menu, 'stepPos2', 0, 1).listen().onChange(updateTexture);
	gui.addColor(menu, 'color3').listen().onChange(updateTexture);
	gui.add(menu, 'stepPos3', 0, 1).listen().onChange(updateTexture);
	gui.add(menu, 'species', {"dens": 0, "densi": 1,
				  "bdensi": 2, "dens-densi": 3}).listen().onChange(updateSpecies);
	gui.add(menu, 'screenshot');
	gui.add(menu, 'reset_view');
	gui.add(menu, 'auto_rotate').listen();
	gui.add(menu, 'wireframe').listen();
	gui.add(menu, 'isPaused').listen();
	menu.load = loadConfigFile;
	menu.save = saveConfigFile;
	gui.add(menu, 'load');
	gui.add(menu, 'save');
	// gui.add(menu, 'fov', 1.0, 200.0).listen();

	return gui;
    }

    function updateTexture(value) {
	mat3.uniforms.starColor.value = new THREE.Color(menu.star_color);
	mat3.uniforms.transferTex.value = updateTransferFunction();
    }

    function updateSpecies(value) {
	mat3.uniforms.species.value = menu.species;
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
	// if (menu.auto_rotate) {
	//     controls.autoRotate = true;
	// } else {
	//     controls.autoRotate = false;
	// }
	// // requestAnimationFrame(animate);
	// stats.begin();
	// // required if controls.enableDamping or controls.autoRotate are set to true
	// controls.update();
	// // camera.fov = menu.fov;
	// camera.updateProjectionMatrix();
	// render();
    }

    function render() {
	// if (document.hidden) {
	//     return;
	// }
	// var startTime = new Date();
	stats.begin();
	if (texNeedsUpdate) {
	    mat3.uniforms.cubeTex.value = dataTex;
	    texNeedsUpdate = false;
	}
	wireframe.visible = menu.wireframe;
	
	mat3.uniforms.star_radius.value = menu.star_radius;
	mat3.uniforms.alphaCorrection.value = menu.alpha_correction;
	// renderer.render(scenefbo, camera, rtTexture, true);
	renderer.render(scene, camera);
	// var endTime = new Date();
	// var renderTime = endTime - startTime;
	// var targetSamplingRate = renderTime / targetFrameTime;

	// if (targetSamplingRate > samplingRate) {
	//     samplingRate = 0.8 * samplingRate + 0.2 * targetSamplingRate;
	//     mat3.uniforms.dt_scale.value = samplingRate;
	// }

	stats.end();
	// startTime = endTime;
    }

    // canvas.tabIndex = 1000;
    // document.body.onkeydown = function(event) {
    // 	if (document.activeElement.tagName.toLowerCase() == 'input')
    // 	    return;
    // 	// var key = event.which || event.keyCode || 0;
    // 	var key = event.code || 0;
    // 	// console.log(key);
    // 	if (key === 'KeyQ') {
    // 	    menu.alpha_correction -= 0.02;
    // 	} else if (key === 'KeyE') {
    // 	    menu.alpha_correction += 0.02;
    // 	} else if (key === 'Space') { // Reset view point
    // 	    resetView();
    // 	} else if (key === 'ArrowLeft') {
    // 	    cameraRotateLeftRight(0.05);
    // 	} else if (key === 'ArrowRight') {
    // 	    cameraRotateLeftRight(-0.05);
    // 	} else if (key === 'ArrowUp') {
    // 	    if (event.shiftKey) {
    // 		camera.zoom += 0.05;
    // 		camera.updateProjectionMatrix();
    // 	    } else {
    // 		cameraRotateUpDown(0.05);
    // 	    }
    // 	} else if (key === 'ArrowDown') {
    // 	    if (event.shiftKey) {
    // 		camera.zoom -= 0.05;
    // 		camera.updateProjectionMatrix();
    // 	    } else {
    // 		cameraRotateUpDown(-0.05);
    // 	    }
    // 	} else if (key === 'KeyZ') {
    // 	    camera.fov -= 0.5;
    // 	    camera.updateProjectionMatrix();
    // 	} else if (key === 'KeyX') {
    // 	    camera.fov += 0.5;
    // 	    camera.updateProjectionMatrix();
    // 	} else if (key === 'KeyS' && event.ctrlKey) {
    // 	    event.preventDefault();
    // 	    saveConfigFile();
    // 	} else if (key === 'KeyL' && event.ctrlKey) {
    // 	    event.preventDefault();
    // 	    loadConfigFile();
    // 	}
    // };

    renderer.setAnimationLoop( function() { render(); } );
    // var user = new THREE.Group();
    // user.position.set( 0, 4, 0 );
    // scene.add( user );
    // user.add( camera );
    // renderer.vr.userHeight = 1;
    // animate();

    // Function for loading a config file
    function loadConfigFile() {
	var f = document.createElement('input');
	document.body.appendChild(f); // Firefox requires the link to be in the body
	f.setAttribute("type", "file");
	f.setAttribute("id", "file-input");
	f.addEventListener('change', parseConfigFile, false);
	f.click();
	document.body.removeChild(f); // remove the link when done
    }

    function parseConfigFile(e) {
	var file = e.target.files[0];
	if (!file) {
	    return "";
	}
	var reader = new FileReader();
	reader.onload = function(e) {
	    var contents = e.target.result;
	    try {
		var config = JSON.parse(contents);

		menu.alpha_correction = config.alpha_correction;
		menu.star_radius = config.star_radius;
		menu.star_color = config.star_color;
		menu.color1 = config.color1;
		menu.stepPos1 = config.stepPos1;
		menu.color2 = config.color2;
		menu.stepPos2 = config.stepPos2;
		menu.color3 = config.color3;
		menu.stepPos3 = config.stepPos3;
		menu.species = config.species;
		menu.wireframe = config.wireframe;
		menu.auto_rotate = config.auto_rotate;
		menu.fov = config.fov;
		camera.position.x = config.cam_pos.x;
		camera.position.y = config.cam_pos.y;
		camera.position.z = config.cam_pos.z;
		camera.zoom = config.cam_zoom;
		camera.fov = config.fov;

		// Iterate over all controllers
		for (var i in gui.__controllers) {
		    gui.__controllers[i].updateDisplay();
		}
		camera.updateProjectionMatrix();
		updateTexture();
		updateSpecies();
	    } catch (e) {
		return false;
	    }
	};
	reader.readAsText(file);
    }

    function saveConfigFile() {
	var conf = menu;
	conf.cam_pos = camera.position;
	conf.cam_zoom = camera.zoom;
	var conf_str = JSON.stringify(conf);
	console.log(conf_str);
	saveFile("data:application/octet-stream," + encodeURIComponent(conf_str), "config.json");
    }

}
