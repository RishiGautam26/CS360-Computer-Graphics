// camera/eye coordinate system 
var eyePos = [-1, 0.4, 0.8];
var lightPos = [1.2, 1.0, 0.5];
var v1Matrix = mat4.create();
var viewMatrix = mat4.create();
var mMatrix = mat4.create();
var projMatrix = mat4.create();
var nodeMatrix = mat3.create();
var lviewMatrix = mat4.create();
var temp = mat4.create();
var xCameraLocation = 0, yCameraLocation = 0, zCameraLocation = 0;

// Shader Programs
var shadowPassShaderProgram ;
var renderPassShaderProgram ;
var depthTexture ;
var shaderProgram ;
var FBO ;
var shadowResolution = 5055;

// locations
var aPositionLocation = 0.0 ;
var aNormalLocation  ;
var aTexCoordLocation  ;
var uVMatrixLocation  ;
var uMMatrixLocation  ;
var uVMatrixLocation  ;
var uNMatrixLocation  ;
var uLVMatrixLocation  ;
var uPMatrixLocation  ;
var uLightLocation  ;
var uCameraLocation  ;
var uColorLocation  ;

// canvas
var gl;
var canvas;
var Animation;
var anim = false;
var matrixStack = [];

// rotation
var rotationZ = 0.1 ;
var rotationY = 0.1 ;
var lastMouseX = 0.1 ;
var lastMouseY = 0.1 ;

// animation speed and color
var color;
var animSpeed = 1;

var objVertexPositionBuffer;
var objVertexNormalBuffer;
var objVertexIndexBuffer;
tea_json = "texture_and_other_files/teapot.json";

// sphere variables
var spVertex = [] ;
var spIndicies = [];
var spNormals = [];
var spTexCoords = [];



const vertexShadowPassShaderCode = `#version 300 es
in vec3 aPosition;

uniform mat4 uMMatrix;
uniform mat4 uProjMatrix;
uniform mat4 uViewMatrix;

void main() {
	gl_Position = uProjMatrix*uViewMatrix*uMMatrix * vec4(aPosition,1.0);
}`;

const fragShadowPassShaderCode = `#version 300 es
precision highp float;
uniform vec3 color;
out vec4 fragColor;

void main() {
	fragColor = vec4(color, 1.0);
}`;

const vertexRenderPassShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoords;

uniform mat4 uMMatrix;
uniform mat4 uProjMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uLViewMatrix;

out vec4 shadowTextureCoord;
out vec3 posInEyeSpace;
out mat4 VMat;
out vec3 normal;

void main() {

	const mat4 textureTransformMat = 
	mat4(0.5, 0.0, 0.0, 0.0,
		 0.0, 0.5, 0.0, 0.0,
		 0.0, 0.0, 0.5, 0.0,
		 0.5, 0.5, 0.5, 1.0);

	mat4 lightProjectionMat = textureTransformMat * uLViewMatrix * uMMatrix;
	shadowTextureCoord = lightProjectionMat * vec4(aPosition, 1.0);

	gl_Position = uProjMatrix * uViewMatrix * uMMatrix * vec4(aPosition, 1.0);
	posInEyeSpace = vec3(uViewMatrix * uMMatrix * vec4(aPosition, 1));

	VMat = uViewMatrix;
	normal = aNormal;
}`;

const fragRenderPassShaderCode = `#version 300 es
precision highp float;
uniform vec3 color;
uniform sampler2D imageTexture;
in vec4 shadowTextureCoord;
in vec3 normal;
in mat4 VMat;
in vec3 posInEyeSpace;
uniform vec3 lightPos;
uniform mat3 uNodeMatrix;
out vec4 fragColor;

void main() {
	vec3 projectedTexcoord = shadowTextureCoord.xyz / shadowTextureCoord.w;
	float currentDepth = projectedTexcoord.z;

	float closestDepth = texture(imageTexture, projectedTexcoord.xy).x;
	float shadow_fac1 = currentDepth - 0.009 > closestDepth ? -0.33 : 0.69;
	float shadow_fac2 = currentDepth - 0.009 > closestDepth ? 0.33 : 0.99;

	vec3 normal = normalize(uNodeMatrix * normal);

	vec3 L = normalize(vec3(VMat * vec4(lightPos, 1)) - posInEyeSpace);
	vec3 R = normalize(reflect(-L, normal));
	vec3 V = normalize(-posInEyeSpace);

	vec3 difference = max(0.0, dot(L, normal)) * color;
	vec3 specular_color = vec3(1, 1, 1) * pow(max(0.0, dot(R, V)), 33.0);
	vec3 ambient_color = 0.49 * vec3(color);

	vec3 color = (shadow_fac1 * difference) + (shadow_fac2 * specular_color) + ambient_color;

	fragColor = vec4(color, 1.0);
}`;


function tprojMatrix(stack) {
	if (stack.length > 0) return mat4.create(stack[stack.length - 1]);
	else console.log("stack has no matrix to see!");
}

function pprojMatrix(stack) {
	if (stack.length > 0) return stack.pop();
	else console.log("stack has no matrix to pop!");
}

function pushMatrix(stack, m) {
	var copy = mat4.create(m);
	stack.push(copy);
}

function vertexShaderSetup(vertexShaderCode) {
	shader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(shader, vertexShaderCode);
	gl.compileShader(shader);
	// Error check whether the shader is compiled correctly
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
	alert(gl.getShaderInfoLog(shader));
	return null;
	}
	return shader;
}

function fragmentShaderSetup(fragShaderCode) {
	shader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(shader, fragShaderCode);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
	alert(gl.getShaderInfoLog(shader));
	return null;
	}
	return shader;
}

function initShaders(vertexShaderCode, fragShaderCode) {
	shaderProgram = gl.createProgram();

	var vertexShader = vertexShaderSetup(vertexShaderCode);
	var fragmentShader = fragmentShaderSetup(fragShaderCode);

	// attach the shaders
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	//link the shader program
	gl.linkProgram(shaderProgram);

	// check for compiiion and linking status
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
	console.log(gl.getShaderInfoLog(vertexShader));
	console.log(gl.getShaderInfoLog(fragmentShader));
	}

	return shaderProgram;
}

function initGL(canvas) {
	try {
	gl = canvas.getContext("webgl2");
	gl.viewportWidth = canvas.width;
	gl.viewportHeight = canvas.height;
	} catch (e) {}
	if (!gl) {
	alert("WebGL initialization failed");
	}
}

function degToRad(degrees) {
	return (degrees * Math.PI) / 180;
}

function initDepthFBO() {
	depthTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, depthTexture);
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.DEPTH_COMPONENT24,
		shadowResolution,
		shadowResolution,
		0,
		gl.DEPTH_COMPONENT,
		gl.UNSIGNED_INT,
		null
	);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	FBO = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, FBO);
	FBO.width = shadowResolution;
	FBO.height = shadowResolution;

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);

	var FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
	if (FBOstatus != gl.FRAMEBUFFER_COMPLETE)
		console.error("GL_FRAMEBUFFER_COMPLETE fail!!! FBO CANT BE USED");
}

function initObject() {
	var request = new XMLHttpRequest();
	request.open("GET", tea_json);
	request.overrideMimeType("application/json");
	request.onreadystatechange = function () {
		//request.readyState == 4 means operation is done
		if (request.readyState == 4) {
			processObject(JSON.parse(request.responseText));
		}
	};
	request.send();
}

function processObject(objData) {
	objVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array(objData.vertexPositions),
		gl.STATIC_DRAW
	);

	objVertexPositionBuffer.itemSize = 3;
	objVertexPositionBuffer.numItems = objData.vertexPositions.length / 3;

	objVertexNormalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, objVertexNormalBuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array(objData.vertexNormals),
		gl.STATIC_DRAW
	);
	objVertexNormalBuffer.itemSize = 3;
	objVertexNormalBuffer.numItems = objData.vertexNormals.length / 3;

	objVertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objVertexIndexBuffer);
	gl.bufferData(
		gl.ELEMENT_ARRAY_BUFFER,
		new Uint32Array(objData.indices),
		gl.STATIC_DRAW
	);
	objVertexIndexBuffer.itemSize = 1;
	objVertexIndexBuffer.numItems = objData.indices.length;

	renderScene();
}

function drawObject() {
	gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer);
	gl.vertexAttribPointer(
		aPositionLocation,
		objVertexPositionBuffer.itemSize,
		gl.FLOAT,
		false,
		0,
		0
	);

	gl.bindBuffer(gl.ARRAY_BUFFER, objVertexNormalBuffer);
	gl.vertexAttribPointer(
		aNormalLocation,
		objVertexNormalBuffer.itemSize,
		gl.FLOAT,
		false,
		0,
		0
	);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objVertexIndexBuffer);
	
	gl.uniform3fv(uLightLocation, lightPos);
	gl.uniform3fv(uColorLocation, color);
	gl.uniform3fv(uCameraLocation, eyePos);

	gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
	gl.uniformMatrix4fv(uViewMatrixLocation, false, viewMatrix);
	gl.uniformMatrix4fv(uProjMatrixLocation, false, projMatrix);
	gl.uniformMatrix4fv(uLViewMatrixLocation, false, lviewMatrix);

	mat4.multiply(viewMatrix, mMatrix, temp);
	mat4.toInverseMat3(temp, nodeMatrix);
	mat3.transpose(nodeMatrix, nodeMatrix);

	gl.uniformMatrix3fv(uNodeMatrixLocation, false, nodeMatrix);

	gl.drawElements(
		gl.TRIANGLES,
		objVertexIndexBuffer.numItems,
		gl.UNSIGNED_INT,
		0
	);
}

function initSphere(nslices, nstacks, radius) {
	for (var i = 0; i <= nslices; i++) {
	var angle = (i * Math.PI) / nslices;
	var comp1 = Math.sin(angle);
	var comp2 = Math.cos(angle);

	for (var j = 0; j <= nstacks; j++) {
		var phi = (j * 2 * Math.PI) / nstacks;
		var comp3 = Math.sin(phi);
		var comp4 = Math.cos(phi);

		var xcood = comp4 * comp1;
		var ycoord = comp2;
		var zcoord = comp3 * comp1;
		var utex = 1 - j / nstacks;
		var vtex = 1 - i / nslices;

		spVertex.push(radius * xcood, radius * ycoord, radius * zcoord);
		spNormals.push(xcood, ycoord, zcoord);
		spTexCoords.push(utex, vtex);
	}
	}

	// now compute the indices here
	for (var i = 0; i < nslices; i++) {
	for (var j = 0; j < nstacks; j++) {
		var id1 = i * (nstacks + 1) + j;
		var id2 = id1 + nstacks + 1;

		spIndicies.push(id1, id2, id1 + 1);
		spIndicies.push(id2, id2 + 1, id1 + 1);
	}
	}
}

function initSphereBuffer() {
	var nslices = 50;
	var nstacks = 50;
	var radius = 1;

	initSphere(nslices, nstacks, radius);

	// buffer for vertices
	spBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVertex), gl.STATIC_DRAW);
	spBuf.itemSize = 3;
	spBuf.numItems = spVertex.length / 3;

	// buffer for indices
	spIndexBuf = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
	gl.bufferData(
		gl.ELEMENT_ARRAY_BUFFER,
		new Uint32Array(spIndicies),
		gl.STATIC_DRAW
	);
	spIndexBuf.itemsize = 1;
	spIndexBuf.numItems = spIndicies.length;

	// buffer for normals
	spNormalBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
	spNormalBuf.itemSize = 3;
	spNormalBuf.numItems = spNormals.length / 3;

	// buffer for texture coordinates
	spTexBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, spTexBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spTexCoords), gl.STATIC_DRAW);
	spTexBuf.itemSize = 2;
	spTexBuf.numItems = spTexCoords.length / 2;
}

function drawSphere() {
	gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
	gl.vertexAttribPointer(
		aPositionLocation,
		spBuf.itemSize,
		gl.FLOAT,
		false,
		0,
		0
	);

	gl.bindBuffer(gl.ARRAY_BUFFER, spTexBuf);
	gl.vertexAttribPointer(
		aTexCoordLocation,
		spTexBuf.itemSize,
		gl.FLOAT,
		false,
		0,
		0
	);

	gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
	gl.vertexAttribPointer(
		aNormalLocation,
		spNormalBuf.itemSize,
		gl.FLOAT,
		false,
		0,
		0
	);

	// Draw elementary arrays - triangle indices
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

	gl.uniform3fv(uLightLocation, lightPos);
	gl.uniform3fv(uColorLocation, color);
	gl.uniform3fv(uCameraLocation, eyePos);

	gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
	gl.uniformMatrix4fv(uViewMatrixLocation, false, viewMatrix);
	gl.uniformMatrix4fv(uProjMatrixLocation, false, projMatrix);
	gl.uniformMatrix4fv(uLViewMatrixLocation, false, lviewMatrix);

	mat4.multiply(viewMatrix, mMatrix, temp);
	mat4.toInverseMat3(temp, nodeMatrix);
	mat3.transpose(nodeMatrix, nodeMatrix);

	gl.uniformMatrix3fv(uNodeMatrixLocation, false, nodeMatrix);

	gl.drawElements(gl.TRIANGLES, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
}

function initCubeBuffer() {
	var vertices = [
		// Front face
		-0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
		// Back face
		-0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
		// Top face
		-0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
		// Bottom face
		-0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
		// Right face
		0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
		// Left face
		-0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
	];
	buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	buf.itemSize = 3;
	buf.numItems = vertices.length / 3;

	var normals = [
		// Front face
		0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
		// Back face
		0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
		// Top face
		0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
		// Bottom face
		0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
		// Right face
		1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
		// Left face
		-1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
	];
	cubeNormalBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
	cubeNormalBuf.itemSize = 3;
	cubeNormalBuf.numItems = normals.length / 3;

	var texCoords = [
		// Front face
		0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
		// Back face
		0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
		// Top face
		0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
		// Bottom face
		0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
		// Right face
		0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
		// Left face
		0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
	];
	cubeTexBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
	cubeTexBuf.itemSize = 2;
	cubeTexBuf.numItems = texCoords.length / 2;

	var indices = [
		0,
		1,
		2,
		0,
		2,
		3, // Front face
		4,
		5,
		6,
		4,
		6,
		7, // Back face
		8,
		9,
		10,
		8,
		10,
		11, // Top face
		12,
		13,
		14,
		12,
		14,
		15, // Bottom face
		16,
		17,
		18,
		16,
		18,
		19, // Right face
		20,
		21,
		22,
		20,
		22,
		23, // Left face
	];
	indexBuf = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
	gl.bufferData(
		gl.ELEMENT_ARRAY_BUFFER,
		new Uint16Array(indices),
		gl.STATIC_DRAW
	);
	indexBuf.itemSize = 1;
	indexBuf.numItems = indices.length;
}

function drawCube() {
	gl.bindBuffer(gl.ARRAY_BUFFER, buf);
	gl.vertexAttribPointer(
		aPositionLocation,
		buf.itemSize,
		gl.FLOAT,
		false,
		0,
		0
	);

	gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
	gl.vertexAttribPointer(
		aNormalLocation,
		cubeNormalBuf.itemSize,
		gl.FLOAT,
		false,
		0,
		0
	);

	gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexBuf);
	gl.vertexAttribPointer(
		aTexCoordLocation,
		cubeTexBuf.itemSize,
		gl.FLOAT,
		false,
		0,
		0
	);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);

	gl.uniform3fv(uLightLocation, lightPos);
	gl.uniform3fv(uColorLocation, color);
	gl.uniform3fv(uCameraLocation, eyePos);

	gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
	gl.uniformMatrix4fv(uViewMatrixLocation, false, viewMatrix);
	gl.uniformMatrix4fv(uProjMatrixLocation, false, projMatrix);
	gl.uniformMatrix4fv(uLViewMatrixLocation, false, lviewMatrix);
	
	mat4.multiply(viewMatrix, mMatrix, temp);
	mat4.toInverseMat3(temp, nodeMatrix);
	mat3.transpose(nodeMatrix, nodeMatrix);
	
	gl.uniformMatrix3fv(uNodeMatrixLocation, false, nodeMatrix);
	
	gl.drawElements(gl.TRIANGLES, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);
}

function sceneSetup(cam) {
	gl.useProgram(shaderProgram);

	aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
	aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
	aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");
	uLightLocation = gl.getUniformLocation(shaderProgram, "lightPos");
	uColorLocation = gl.getUniformLocation(shaderProgram, "color");
	uCameraLocation = gl.getUniformLocation(shaderProgram, "eyePos");

	uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
	uProjMatrixLocation = gl.getUniformLocation(shaderProgram, "uProjMatrix");
	uViewMatrixLocation = gl.getUniformLocation(shaderProgram, "uViewMatrix");
	uNodeMatrixLocation = gl.getUniformLocation(shaderProgram, "uNodeMatrix");
	uLViewMatrixLocation = gl.getUniformLocation(shaderProgram, "uLViewMatrix");

	uTextureLocation = gl.getUniformLocation(shaderProgram, "imageTexture");

	gl.enableVertexAttribArray(aPositionLocation);
	gl.enableVertexAttribArray(aNormalLocation);
	gl.enableVertexAttribArray(aTexCoordLocation);

	gl.clearColor(0, 0, 0, 1);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);

	mat4.identity(mMatrix);

	mat4.identity(viewMatrix);
	viewMatrix = mat4.lookAt(cam, [xCameraLocation, yCameraLocation, zCameraLocation], [0, 1, 0], viewMatrix);
}


function drawBall(){
	mMatrix = mat4.translate(mMatrix, [0, 0.11, 0.29]);
	mMatrix = mat4.scale(mMatrix, [0.1, 0.1, 0.1]);
	color = [0, 0.55, 0.79];
	drawSphere();
}

function drawBase() {
	mMatrix = mat4.scale(mMatrix, [1.1, 0.001, 1.1]);
	color = [0.4, 0.4, 0.4];
	drawCube();
}

function drawTeapot() {
	mMatrix = mat4.translate(mMatrix, [-0.14, 0.14, -0.14]);
	mMatrix = mat4.rotate(mMatrix, degToRad(-90), [0, 1, 0]);
	mMatrix = mat4.scale(mMatrix, [0.0169, 0.0169, 0.0169]);
	color = [0.14, 0.79, 0.49];
	drawObject();
}


function renderScene() {

	if (Animation) {
		window.cancelAnimationFrame(Animation);
	}
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, FBO);

	shaderProgram = shadowPassShaderProgram;
	sceneSetup(lightPos);
	gl.viewport(0, 0, shadowResolution, shadowResolution);
	mat4.identity(projMatrix);
	mat4.perspective(45, 1.001, 1.02, 3.002, projMatrix);
	mat4.multiply(projMatrix, viewMatrix, lviewMatrix);

	mat4.multiply(mMatrix, v1Matrix, mMatrix);
		pushMatrix(matrixStack, mMatrix);
		drawBall();
		
		mMatrix = tprojMatrix(matrixStack);
		drawBase();
		
		mMatrix = tprojMatrix(matrixStack);
		drawTeapot();
	mMatrix = pprojMatrix(matrixStack);
	

	var animate = function () {
		if (anim) {
			mat4.identity(temp);
			temp = mat4.rotate(temp, degToRad(animSpeed), [0, 1, 0]);
			mat4.multiplyVec3(temp, eyePos, eyePos);
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		
		shaderProgram = renderPassShaderProgram;
		sceneSetup(eyePos);
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		mat4.identity(projMatrix);
		mat4.perspective(45, 1.001, 0.203, 2.003, projMatrix);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, depthTexture);
		gl.uniform1i(uTextureLocation, 0);

		mat4.multiply(mMatrix, v1Matrix, mMatrix);
			pushMatrix(matrixStack, mMatrix);
			drawBall();
			
			mMatrix = tprojMatrix(matrixStack);
			drawBase();
			
			mMatrix = tprojMatrix(matrixStack);
			drawTeapot();
		mMatrix = pprojMatrix(matrixStack);

		Animation = window.requestAnimationFrame(animate);
	}

	animate();
}

function onMouseDown(event) {
	canvas.addEventListener("mousemove", onMouseMove, false);
	canvas.addEventListener("mouseup", onMouseUp, false);
	canvas.addEventListener("mouseout", onMouseOut, false);

	lastMouseX = event.clientX;
	lastMouseY = canvas.height - event.clientY;

	const rect = canvas.getBoundingClientRect();
    centerX = (rect.left + rect.right)/2;
    centerY = (rect.top + rect.bottom)/2;

}

function onMouseMove(event) {

	var mouseX = event.clientX;
	var diffX = mouseX - lastMouseX;
	
	var mouseY = canvas.height - event.clientY;
	var diffY = mouseY - lastMouseY;
	
	mat4.identity(temp);

	temp = mat4.rotate(temp, degToRad(diffX/5), [0, 1, 0]);
	temp = mat4.rotate(temp, degToRad(-diffY/5), [1, 0, 0]);

	lastMouseX = mouseX;
	lastMouseY = mouseY;
	if (!(event.ctrlKey || event.altKey)) {
		mat4.multiply(temp, v1Matrix, v1Matrix);
	}
}

function onMouseUp(event) {
	canvas.removeEventListener("mousemove", onMouseMove, false);
	canvas.removeEventListener("mouseup", onMouseUp, false);
	canvas.removeEventListener("mouseout", onMouseOut, false);
}

function onMouseOut(event) {
	canvas.removeEventListener("mousemove", onMouseMove, false);
	canvas.removeEventListener("mouseup", onMouseUp, false);
	canvas.removeEventListener("mouseout", onMouseOut, false);
}

function webGLStart() {
	canvas = document.getElementById("Canvas");
	canvas.addEventListener("mousedown", onMouseDown, false);

	var lightSlider = document.getElementById("light");

	lightSlider.addEventListener("input", (event) => {
		lightPos[2] = event.target.value;
		renderScene();
	});

	var anima = document.getElementById("anim");

	anima.addEventListener("change", (event) => {
		anim = event.target.checked;
	});

	initGL(canvas);
	shadowPassShaderProgram = initShaders(vertexShadowPassShaderCode, fragShadowPassShaderCode);
	renderPassShaderProgram = initShaders(vertexRenderPassShaderCode, fragRenderPassShaderCode);

	mat4.identity(v1Matrix);

	//initialize buffers for the square

	initDepthFBO();
	initSphereBuffer();
	initCubeBuffer();
	initObject();
}
