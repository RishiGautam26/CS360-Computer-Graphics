

// various variables used in program
var eyePos = [-0.0, 0.7, 1.8];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];
var lightColor = [1,1,1];
var lightPos = [0, 2, 2];
var ambIntensity = 0.2;
var diffIntensity = 1.8;
var specIntensity = 0.9;
var shininess = 15;

// variable for Shader Program
var flat_shader;
var vertex_shader;
var fragment_shader;

// initialize model, view, and projection matrices
var vmatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix

var prevMouseX = 0.0;
var prevMouseY = 0.0;

var flat_degX = 0.0;
var flat_deg0 = 0.0;

var vertex_deg1 = 0.0;
var vertex_deg0 = 0.0;

var fragment_deg1 = 0.0;
var fragment_deg0 = 0.0;

var mode;
var gl;
var animation;
var canvas;
var aPositionLocation;
var aNormalLocation;
var uColorLocation;
var uPMatrixLocation;
var uMMatrixLocation;
var uvmatrixLocation;
var matrixStack = [];

// Vertex shader code
const flat_vsc = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uvmatrix;

out vec3 vPos;
out vec3 vLightPos;

void main() {
  aNormal;
  mat4 projectionModelView;
	projectionModelView=uPMatrix*uvmatrix*uMMatrix;
  gl_Position = projectionModelView*vec4(aPosition,1.0);
  vPos = (uvmatrix*uMMatrix*vec4(aPosition,1.0)).xyz;


  gl_PointSize=5.0;
}`;

// Fragment shader code
const flat_fsc = `#version 300 es
precision mediump float;
in vec3 vPos;

uniform float uAmbIntensity;
uniform vec3 uLightPos;
uniform vec3 objColor;
uniform float uDiffuseIntensity;
uniform float uSpecIntensity;
uniform float uShininess;
uniform vec3 uLightCol;

out vec4 fragColor;

void main() {

  vec3 X = dFdx(vPos);
  vec3 Y = dFdy(vPos);

  vec3 lightPos = normalize(-uLightPos);
  vec3 normal = normalize(cross(X,Y));

  vec3 L = normalize(uLightPos - vPos);
  vec3 R = normalize(-reflect(L,normal));
  vec3 V = normalize(-vPos);

  fragColor = vec4(0.0, 0.0, 0.0, 1.0);

  //Diffuse
  float dotNL = max(0.0, dot(normal, L));
  vec3 Idiff =  uDiffuseIntensity * objColor * dotNL;

  //Specular
  vec3 Ispec = uSpecIntensity * pow(max(0.0, dot(R,V)),uShininess) * uLightCol;

  vec3 lights = Idiff + Ispec + uAmbIntensity * objColor;

  fragColor += vec4(lights,0.0);
}`;

// Vertex shader code
const vert_vsc = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uvmatrix;

uniform float uAmbIntensity;
uniform vec3 uLightPos;
uniform vec3 objColor;
uniform float uDiffuseIntensity;
uniform float uSpecIntensity;
uniform float uShininess;
uniform vec3 uLightCol;

out vec3 vcolor;

void main() {
  mat4 projectionModelView;
	projectionModelView=uPMatrix*uvmatrix*uMMatrix;
  gl_Position = projectionModelView*vec4(aPosition,1.0);
  vec3 vPos = (uvmatrix*uMMatrix*vec4(aPosition,1.0)).xyz;
  vec3 vNormal = vec3(transpose(inverse(uvmatrix*uMMatrix))*vec4(aNormal,1.0));

  vec3 lightPos = normalize(-uLightPos);
  vec3 normal = normalize(vNormal);

  vec3 L = normalize(uLightPos - vPos);
  vec3 R = normalize(-reflect(L,normal));
  vec3 V = normalize(-vPos);

  //Diffuse
  float dotNL = max(0.0, dot(normal, L));
  vec3 Idiff =  uDiffuseIntensity * objColor * dotNL;

  //Specular
  vec3 Ispec = uSpecIntensity * pow(max(0.0, dot(R,V)),uShininess) * uLightCol;

  vcolor = Idiff + Ispec + uAmbIntensity * objColor;

  gl_PointSize=5.0;
}`;

// Fragment shader code
const vert_fsc = `#version 300 es
precision mediump float;
in vec3 vcolor;

out vec4 fragColor;

void main() {
  fragColor = vec4(vcolor,1.0);
}`;

// Vertex shader code
const frag_vsc = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uvmatrix;

out vec3 vNormal;
out vec3 vPos;

void main() {
  mat4 projectionModelView;
	projectionModelView=uPMatrix*uvmatrix*uMMatrix;
  gl_Position = projectionModelView*vec4(aPosition,1.0);

  vPos = (uvmatrix*uMMatrix*vec4(aPosition,1.0)).xyz;
  vNormal = vec3(transpose(inverse(uvmatrix*uMMatrix))*vec4(aNormal,1.0));

  gl_PointSize=5.0;
}`;

// Fragment shader code
const frag_fsc = `#version 300 es
precision mediump float;
in vec3 vPos;
in vec3 vNormal;

uniform float uAmbIntensity;
uniform vec3 uLightPos;
uniform vec3 objColor;
uniform float uDiffuseIntensity;
uniform float uSpecIntensity;
uniform float uShininess;
uniform vec3 uLightCol;

out vec4 fragColor;

void main() {

  vec3 normal = normalize(vNormal);

  vec3 L = normalize(uLightPos - vPos);
  vec3 R = normalize(-reflect(L,normal));
  vec3 V = normalize(-vPos);

  //Diffuse
  float dotNL = max(0.0, dot(normal, L));
  vec3 Idiff =  uDiffuseIntensity * objColor * dotNL;

  //Specular
  vec3 Ispec = uSpecIntensity * pow(max(0.0, dot(R,V)),uShininess) * uLightCol;

  vec3 vcolor = Idiff + Ispec + uAmbIntensity * objColor;
  fragColor = vec4(vcolor,1.0);
}`;

function popMatrix(stack) {
  if (stack.length > 0) return stack.pop();
  else console.log("stack has no matrix to pop!");
}

function pushMatrix(stack, m) {
  var copy = mat4.create(m);
  stack.push(copy);
}

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function fragmentShaderSetup(fragShaderCode) {
  shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shader, fragShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
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

function initShaders(vsc, fsc) {
  shaderProgram = gl.createProgram();

  var vertexShader = vertexShaderSetup(vsc);
  var fragmentShader = fragmentShaderSetup(fsc);

  // attach the shaders
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  //link the shader program
  gl.linkProgram(shaderProgram);

  // check for compilation and linking status
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log(gl.getShaderInfoLog(vertexShader));
    console.log(gl.getShaderInfoLog(fragmentShader));
  }

  return shaderProgram;
}


function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl2"); // the graphics webgl2 context
    window.addEventListener('resize',resizeCanvas,false);
    function resizeCanvas() {
      canvas.width = Math.min(window.innerWidth/1.03);
      canvas.height = canvas.width/3;
      gl.viewportWidth = canvas.width; // the width of the canvas
      gl.viewportHeight = canvas.height; // the height
      drawScene();
    }
    mode = gl.TRIANGLES;
    gl.enable(gl.SCISSOR_TEST);
    gl.enable(gl.DEPTH_TEST);
    resizeCanvas();
  } catch (e) {}
  if (!gl) {
    alert("WebGL initialization failed");
  }
}

function initSphere(nslices, nstacks, radius) {
  var theta1, theta2;

  spVerts=[],spNormals=[],spIndicies=[];

  for (i = 0; i < nslices; i++) {
    spVerts.push(0);
    spVerts.push(-radius);
    spVerts.push(0);

    spNormals.push(0);
    spNormals.push(-1.0);
    spNormals.push(0);
  }

  for (j = 1; j < nstacks; j++) {
    theta1 = (j * Math.PI) / nstacks - Math.PI / 2;
    for (i = 0; i < nslices; i++) {
      theta2 = (i * 2 * Math.PI) / nslices;
      spVerts.push(radius * Math.cos(theta1) * Math.cos(theta2));
      spVerts.push(radius * Math.sin(theta1));
      spVerts.push(radius * Math.cos(theta1) * Math.sin(theta2));

      spNormals.push(Math.cos(theta1) * Math.cos(theta2));
      spNormals.push(Math.sin(theta1));
      spNormals.push(Math.cos(theta1) * Math.sin(theta2));
    }
  }

  for (i = 0; i < nslices; i++) {
    spVerts.push(0);
    spVerts.push(radius);
    spVerts.push(0);

    spNormals.push(0);
    spNormals.push(1.0);
    spNormals.push(0);
  }

  for (j = 0; j < nstacks; j++)
    for (i = 0; i < nslices; i++) {
      var mi = i % nslices;
      var mi2 = (i + 1) % nslices;
      var idx = (j + 1) * nslices + mi;
      var idx2 = j * nslices + mi;
      var idx3 = j * nslices + mi2;
      var idx4 = (j + 1) * nslices + mi;
      var idx5 = j * nslices + mi2;
      var idx6 = (j + 1) * nslices + mi2;

      spIndicies.push(idx);
      spIndicies.push(idx2);
      spIndicies.push(idx3);
      spIndicies.push(idx4);
      spIndicies.push(idx5);
      spIndicies.push(idx6);
    }

}

function initSphereBuffer() {
  var nslices = 30; 
  var nstacks = 15;
  var radius = 0.5;
  initSphere(nslices, nstacks, radius);

  spBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
  spBuf.itemSize = 3;
  spBuf.numItems = nslices * nstacks;

  spNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
  spNormalBuf.itemSize = 3;
  spNormalBuf.numItems = nslices * nstacks;

  spIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(spIndicies),
    gl.STATIC_DRAW
  );
  spIndexBuf.itemsize = 1;
  spIndexBuf.numItems = (nstacks) * 6 * (nslices);
}

function drawSphere(color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    spBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
  if(aNormalLocation != -1)
  gl.vertexAttribPointer(
    aNormalLocation,
    spNormalBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

  gl.uniform3fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uvmatrixLocation, false, vmatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
  gl.drawElements(mode, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
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

  var normals = [];
  for (j = 0; j < 4; j++)
    normals.push(0,0,1);
  for (j = 0; j < 4; j++)
    normals.push(0,0,-1);
  for (j = 0; j < 4; j++)
    normals.push(0,1,0);
  for (j = 0; j < 4; j++)
    normals.push(0,-1,0);
  for (j = 0; j < 4; j++)
    normals.push(1,0,0);
  for (j = 0; j < 4; j++)
    normals.push(-1,0,0);

  normalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  normalBuf.itemSize = 3;
  normalBuf.numItems = vertices.length / 3;



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

function drawCube(color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.vertexAttribPointer(
    aPositionLocation,
    buf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuf);
  if(aNormalLocation != -1)
  gl.vertexAttribPointer(
    aNormalLocation,
    normalBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);

  gl.uniform3fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uvmatrixLocation, false, vmatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);


  gl.drawElements(mode, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);
}

function set_shader(shaderProgram){

  gl.useProgram(shaderProgram);
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uvmatrixLocation = gl.getUniformLocation(shaderProgram, "uvmatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");
  uLightPosLocation = gl.getUniformLocation(shaderProgram, "uLightPos");
  uLightColLocation = gl.getUniformLocation(shaderProgram, "uLightCol");
  uAmbIntensityLocation = gl.getUniformLocation(shaderProgram, "uAmbIntensity");
  uDiffuseIntensityLocation = gl.getUniformLocation(shaderProgram, "uDiffuseIntensity");
  uSpecIntensityLocation = gl.getUniformLocation(shaderProgram, "uSpecIntensity");
  uShininessLocation = gl.getUniformLocation(shaderProgram, "uShininess");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  if(aNormalLocation != -1)
  gl.enableVertexAttribArray(aNormalLocation);

  gl.uniform3fv(uLightPosLocation, lightPos);
  gl.uniform3fv(uLightColLocation, lightColor);
  gl.uniform1f(uAmbIntensityLocation, ambIntensity);
  gl.uniform1f(uDiffuseIntensityLocation, diffIntensity);
  gl.uniform1f(uSpecIntensityLocation, specIntensity);
  gl.uniform1f(uShininessLocation, shininess);


}

function drawing1() {

  sCol = [0.00392, 0.34902, 0.49412];
  cCol = [0.63137, 0.62745, 0.44706];

  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, 0.5, 0.0]);
  drawSphere(sCol);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.scale(mMatrix, [1.0, 1.8, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.5, 0.0]);
  drawCube(cCol);
  mMatrix = popMatrix(matrixStack);
}

function drawing2() {

  sCol = [0.47843, 0.47843, 0.47843];
  cCol = [0.15294, 0.40784, 0.15294];

  pushMatrix(matrixStack,mMatrix);
  drawSphere(sCol);
  mMatrix = mat4.rotate(mMatrix, degToRad(49), [0, 0, 1]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-25), [0, 1, 0]);
  mMatrix = mat4.translate(mMatrix, [0.0, 0.5, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.7, 0.7, 0.7]);
  mMatrix = mat4.translate(mMatrix, [0.0, 0.5, 0.0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(12), [0, 0, 1]);
  drawCube(cCol);
  mMatrix = mat4.translate(mMatrix, [1.0, 0.0, 0.0]);
  drawSphere(sCol);
  mMatrix = mat4.rotate(mMatrix, degToRad(-29), [0, 0, 1]);
  mMatrix = mat4.rotate(mMatrix, degToRad(14), [1, 0, 0]);
  mMatrix = mat4.translate(mMatrix, [0.5, 0.0, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.65, 0.65, 0.65]);
  mMatrix = mat4.translate(mMatrix, [0.5, 0.0, 0.0]);
  drawCube(cCol);
  mMatrix = mat4.translate(mMatrix, [0.0, 1.0, 0.0]);
  drawSphere(sCol);
  mMatrix = popMatrix(matrixStack);
}

function drawing3() {

  sCol = [0.0, 0.32, 0.42];
  cCol = [0.67, 0.62, 0.44];

  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, 1.1, 0.0]);
  mMatrix = mat4.scale(mMatrix, [2.7, 0.1, 1.2]);
  drawCube([0.6, 0.2, 0.0]);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -1.1, 0.0]);
  mMatrix = mat4.scale(mMatrix, [2.9, 0.1, 1.1]);
  drawCube([0.6, 0.2, 0.0]);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [-1.0, 0.0, 0.0]);
  mMatrix = mat4.scale(mMatrix, [1.0, 0.1, 3.5]);
  drawCube([0.6, 0.6, 0.0]);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [1.0, 0.0, 0.0]);
  mMatrix = mat4.scale(mMatrix, [1.0, 0.1, 3.5]);
  drawCube([0.1, 0.6, 0.5]);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [1.0, 0.55, 0.0]);
  drawSphere([0.4, 0.3, 0.1]);
  mMatrix = mat4.translate(mMatrix, [0.0, -1.1, 0.0]);
  drawSphere([0.1, 0.4, 0.4]);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [-1.0, 0.55, 0.0]);
  drawSphere([0.4, 0.0, 0.4]);
  mMatrix = mat4.translate(mMatrix, [0.0, -1.1, 0.0]);
  drawSphere([0.3, 0.3, 0.7]);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, 1.65, 0.0]);
  drawSphere([0.5, 0.5, 0.65]);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -1.65, 0.0]);
  drawSphere([0.0, 0.6, 0.1]);
  mMatrix = popMatrix(matrixStack);


}

function draw_flat() {
  shaderProgram = flat_shader;
  set_shader(flat_shader);
  gl.viewport(0, 0, gl.viewportWidth/3, gl.viewportHeight);
  gl.scissor(0, 0, gl.viewportWidth/3, gl.viewportHeight);


  gl.clearColor(0.65, 0.65, 0.8, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  pushMatrix(matrixStack,mMatrix);
  // transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(flat_deg0), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(flat_degX), [1, 0, 0]);

  mMatrix = mat4.translate(mMatrix, [0.0, 0.1, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 0.5]);

  // Now draw the cube
  drawing1();
  mMatrix = popMatrix(matrixStack);

}

function draw_vertex() {
  shaderProgram = vertex_shader;
  set_shader(vertex_shader);
  gl.viewport(gl.viewportWidth/3, 0, gl.viewportWidth/3, gl.viewportHeight);
  gl.scissor(gl.viewportWidth/3, 0, gl.viewportWidth/3, gl.viewportHeight);


  gl.clearColor(0.89, 0.6, 0.6, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  pushMatrix(matrixStack,mMatrix);
  // transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(vertex_deg0), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(vertex_deg1), [1, 0, 0]);

  mMatrix = mat4.translate(mMatrix, [0.0, -0.45, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.6, 0.6, 0.6]);

  // Now draw the cube
  drawing2();
  mMatrix = popMatrix(matrixStack);

}

function draw_fragment() {
  shaderProgram = fragment_shader;
  set_shader(fragment_shader);
  gl.viewport(2*gl.viewportWidth/3, 0, gl.viewportWidth/3, gl.viewportHeight);
  gl.scissor(2*gl.viewportWidth/3, 0, gl.viewportWidth/3, gl.viewportHeight);


  gl.clearColor(0.8, 1.0, 0.8, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  pushMatrix(matrixStack,mMatrix);
  // transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(fragment_deg0), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(fragment_deg1), [1, 0, 0]);


  mMatrix = mat4.scale(mMatrix, [0.4, 0.4, 0.4]);

  // Now draw the cube
  drawing3();
  mMatrix = popMatrix(matrixStack);

}

var animate = function () {
  // set up the view matrix, multiply into the modelview matrix
  mat4.identity(vmatrix);
  vmatrix = mat4.lookAt(eyePos, COI, viewUp, vmatrix);

  //set up perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 100, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);

  draw_flat();
  draw_vertex();
  draw_fragment();

  animation = window.requestAnimationFrame(animate);
}

function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

  if (animation) {
    window.cancelAnimationFrame(animation);
  }

  animate();
}

function onMouseDown(event) {
  canvas.addEventListener("mousemove", onMouseMove, false);
  canvas.addEventListener("mouseup", onMouseUp, false);
  canvas.addEventListener("mouseout", onMouseOut, false);

  if (
    event.layerX <= canvas.width &&
    event.layerX >= 0 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    prevMouseX = event.clientX;
    prevMouseY = event.clientY;
  }
}

function onMouseUp(event) {
  canvas.removeEventListener("mousemove", onMouseMove, false);
  canvas.removeEventListener("mouseup", onMouseUp, false);
  canvas.removeEventListener("mouseout", onMouseOut, false);
}

function onMouseMove(event) {
  // make mouse interaction only within canvas
  if (
    event.layerX <= canvas.width &&
    event.layerX >= 0 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    var mouseX = event.clientX;
    var diffX = mouseX - prevMouseX;
    prevMouseX = mouseX;

    var mouseY = event.clientY;
    var diffY = mouseY - prevMouseY;
    prevMouseY = mouseY;

    if(event.layerX < canvas.width/3){
      flat_deg0 += diffX / 5;
      flat_degX += diffY / 5;
    }else if(event.layerX < 2*canvas.width/3){
      vertex_deg0 += diffX / 5;
      vertex_deg1 += diffY / 5;
    }else{
      fragment_deg0 += diffX / 5;
      fragment_deg1 += diffY / 5;
    }

    drawScene();
  }
}

function onMouseOut(event) {
  canvas.removeEventListener("mousemove", onMouseMove, false);
  canvas.removeEventListener("mouseup", onMouseUp, false);
  canvas.removeEventListener("mouseout", onMouseOut, false);
}

function webGLStart() {
  canvas = document.getElementById("canvas");
  canvas.addEventListener("mousedown", onMouseDown, false);

  // initialize WebGL
  initGL(canvas);

  // initialize shader program
  flat_shader = initShaders(flat_vsc, flat_fsc);
  vertex_shader = initShaders(vert_vsc, vert_fsc);
  fragment_shader = initShaders(frag_vsc, frag_fsc);

  //initialize buffers for the square
  initCubeBuffer();
  initSphereBuffer();

  drawScene();
}

var slider = document.getElementById("LightPosSlider");
slider.oninput = function() {
  lightPos[0] = this.value;
}
var slider = document.getElementById("CamZoomSlider");

slider.oninput = function() {
  eyePos[2] = this.value;
}