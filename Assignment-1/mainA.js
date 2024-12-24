////////////////////////////////////////////////////////////////////////
// A simple WebGL program to draw simple 2D shapes.
//


let moonRotation = 0.0; // Moon rotation angle
let rayRotation = 0.0;  // Rays rotation angle

const rotationSpeed = 0.03; // Speed of rotation

let boatPosition2 = 0;         
let boatDirection2 = 1;         // Direction of movement: 1 for right, -1 for left
const boatSpeed2 = 0.01;     // Speed of movement   
const boatLeftLimit2 = -1.0;    // Left Limit
const boatRightLimit2 = 0.5;    // Right Limit


let boatPosition1 = 0;
let boatSpeed1 = 0.01; 
let boatDirection1 = 1; 
const boatLeftLimit1 = 1.0; 
const boatRightLimit1 = -0.5; 


let bladeRotationAngle1 = 0; // Initial rotation angle of blade
const bladeRotationSpeed1 = 0.07; // Speed of rotation in radians

let bladeRotationAngle2 = 0; // Initial rotation angle of blade
const bladeRotationSpeed2 = 0.07; // Speed of rotation in radians



let starScale = 0.9; // Current scale of the star
const minScale = 0.8; // Minimum scale value
const maxScale = 1.2; // Maximum scale value
const scaleSpeed = 0.03; // Speed of scaling up/down
let increasing = true; // Direction of scaling


var gl;
var color;
var matrixStack = [];

// mMatrix is called the model matrix, transforms objects
// from local object space to world space.
var mMatrix = mat4.create();
var uMMatrixLocation;
var aPositionLocation;
var uColorLoc;

var view = 1 ;

// change view to Point View
function pointVariable(){
  view = 2 ;
  drawScene();
}

// change view to Wireframe view
function wireVariable(){
  view = 3 ;
  drawScene();
}

// change view to Solid View
function solidVariable(){
  view = 1 ;
  drawScene();
}

// GLSL Code
const vertexShaderCode = `#version 300 es
in vec2 aPosition;
uniform mat4 uMMatrix;

void main() {
  gl_Position = uMMatrix*vec4(aPosition,0.0,1.0);
  gl_PointSize = 3.0;
}`;
const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

uniform vec4 color;

void main() {
  fragColor = color;
}`;


// Some Tools
function pushMatrix(stack, m) {
  //necessary because javascript only does shallow push
  var copy = mat4.create(m);
  stack.push(copy);
}
function popMatrix(stack) {
  if (stack.length > 0) return stack.pop();
  else console.log("stack has no matrix to pop!");
}
function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}


// Shaders
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
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}


// Initialise Shaders
function initShaders() {
  shaderProgram = gl.createProgram();

  var vertexShader = vertexShaderSetup(vertexShaderCode);
  var fragmentShader = fragmentShaderSetup(fragShaderCode);

  // attach the shaders
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  //link the shader program
  gl.linkProgram(shaderProgram);

  // check for compilation and linking status
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error("Could not initialize shaders");
    console.error(gl.getShaderInfoLog(vertexShader));
    console.error(gl.getShaderInfoLog(fragmentShader));
  }
  
  //finally use the program.
  gl.useProgram(shaderProgram);

  return shaderProgram;
}


// Initialise Canvas
function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl2"); // the graphics webgl2 context
    gl.viewportWidth = canvas.width; // the width of the canvas
    gl.viewportHeight = canvas.height; // the height
  } catch (e) {}
  if (!gl) {
    alert("WebGL initialization failed");
  }
}


// Creating Buffer for Square
function initSquareBuffer() {
  // buffer for point locations
  const sqVertices = new Float32Array([
    0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  ]);
  sqVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
  sqVertexPositionBuffer.itemSize = 2;
  sqVertexPositionBuffer.numItems = 4;

  // buffer for point indices
  const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  sqVertexIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
  sqVertexIndexBuffer.itemsize = 1;
  sqVertexIndexBuffer.numItems = 6;
}
// Initialise Buffer for Circle
function initCircleBuffer() {
  const numSegments = 100; // Number of segments to approximate the circle
  const radius = 0.5; // Radius of the circle
  const circleVertices = [];
  const circleIndices = [];

  // Generate circle vertices
  circleVertices.push(0.0, 0.0); // Center of the circle
  for (let i = 0; i <= numSegments; i++) {
    const angle = (2 * Math.PI * i) / numSegments;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    circleVertices.push(x, y);
  }

  // Generate circle indices
  for (let i = 1; i <= numSegments; i++) {
    circleIndices.push(0, i, i + 1);
  }
  // Close the circle
  circleIndices.push(0, numSegments, 1);

  // Create buffer for circle vertices
  circleVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, circleVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);
  circleVertexBuffer.itemSize = 2;
  circleVertexBuffer.numItems = circleVertices.length / 2;

  // Create buffer for circle indices
  circleIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(circleIndices), gl.STATIC_DRAW);
  circleIndexBuffer.itemSize = 1;
  circleIndexBuffer.numItems = circleIndices.length;
}
// Initialise Triangle Buffer
function initTriangleBuffer() {
  // buffer for point locations
  const triangleVertices = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);
  triangleBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
  gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
  triangleBuf.itemSize = 2;
  triangleBuf.numItems = 3;

  // buffer for point indices
  const triangleIndices = new Uint16Array([0, 1, 2]);
  triangleIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndices, gl.STATIC_DRAW);
  triangleIndexBuf.itemsize = 1;
  triangleIndexBuf.numItems = 3;
}
// Initialise Scalene Triangle Buffer
function initSTriangleBuffer() {
  // buffer for point locations
  const triangleVertices = new Float32Array([0.0, 0.5, -0.35, -0.5, 0.5, -0.5]);
  triangleBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuff);
  gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
  triangleBuff.itemSize = 2;
  triangleBuff.numItems = 3;

  // buffer for point indices
  const triangleIndices = new Uint16Array([0, 1, 2]);
  triangleIndexBuff = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuff);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndices, gl.STATIC_DRAW);
  triangleIndexBuff.itemsize = 1;
  triangleIndexBuff.numItems = 3;
}
// Drawing Square
function drawSquare(color, mMatrix) {
    // Set the transformation matrix for the vertex shader
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  
    // Bind the vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
    gl.vertexAttribPointer(
      aPositionLocation,
      sqVertexPositionBuffer.itemSize,
      gl.FLOAT,
      false,
      0,
      0
    );
  
    // Bind the index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
  
    // Set the color uniform
    gl.uniform4fv(uColorLoc, color);
  
    // Draw the rectangle (square)
    if ( view == 1 ){
      gl.drawElements(gl.TRIANGLES, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if ( view == 2 ){
      gl.drawElements(gl.POINTS, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else{
      gl.drawElements(gl.LINE_LOOP, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
}
// Draw Circle
function drawCircle(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // Bind the circle vertex buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, circleVertexBuffer);
  gl.vertexAttribPointer(
    aPositionLocation,
    circleVertexBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // Bind the circle index buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuffer);

  // Set the color uniform
  gl.uniform4fv(uColorLoc, color);

  // Draw the circle
  if ( view == 1 ){
    gl.drawElements(gl.TRIANGLES, circleIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  }
  else if ( view == 2 ){
    gl.drawElements(gl.POINTS, circleIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  }
  else{
    gl.drawElements(gl.LINE_LOOP, circleIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  }
}
// Draw Triangle
function drawTriangle(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // buffer for point locations
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    triangleBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);

  gl.uniform4fv(uColorLoc, color);

  // now draw the square
  if ( view == 1 ){
    gl.drawElements(gl.TRIANGLES, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
  }
  else if ( view == 2 ){
    gl.drawElements(gl.POINTS, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
  }
  else{
    gl.drawElements(gl.LINE_LOOP, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
  }
}
// Draw Scalene Triangle
function drawSTriangle(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // buffer for point locations
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuff);
  gl.vertexAttribPointer(
    aPositionLocation,
    triangleBuff.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuff);

  gl.uniform4fv(uColorLoc, color);

  // now draw the square
  if ( view == 1 ){
    gl.drawElements(gl.TRIANGLES, triangleIndexBuff.numItems, gl.UNSIGNED_SHORT, 0);
  }
  else if ( view == 2 ){
    gl.drawElements(gl.POINTS, triangleIndexBuff.numItems, gl.UNSIGNED_SHORT, 0);
  }
  else{
    gl.drawElements(gl.LINE_LOOP, triangleIndexBuff.numItems, gl.UNSIGNED_SHORT, 0);
  }
}

/////////////////////////// Now we are Drawing Various Components of the Canvas ///////////////////////////////////////////

// Draw River
function drawRiver() {
  // Preserve current matrix state
  pushMatrix(matrixStack, mMatrix);
  
  // Apply transformations for the river (centered horizontally and vertically)
  mat4.translate(mMatrix, mMatrix, [0.0, 0.0, 0]); // Adjust as needed to center the river horizontally
  mat4.scale(mMatrix, mMatrix, [3.0, 0.2, 1.0]);    // Scale down to create a river shape

  // Set the color to blue for the river
  const riverColor = [0, 0, 1, 0.67]; // Blue color for the river
  drawSquare(riverColor, mMatrix);
  
  // Restore previous matrix state
  mMatrix = popMatrix(matrixStack);
}

// Draw Rays
function drawRays() {
  const rayColor = [1.0, 1.0, 1.0, 1.0]; // White color 
  const rayLength = 0.05; // Length of each ray
  const rayWidth = 0.004;  // Width of each ray

  // Number of rays and angle between them
  const numRays = 8;
  const angleIncrement = (2 * Math.PI) / numRays; // 360 degrees divided by number of rays

  for (let i = 0; i < numRays; i++) {
    pushMatrix(matrixStack, mMatrix);

    // Translate to the moon's center
    mat4.translate(mMatrix, mMatrix, [-0.8, 0.85, 0]);
    // Rotate the ray by the current angle plus an additional rotating angle
    mat4.rotateZ(mMatrix, mMatrix, i * angleIncrement + rayRotation);
    // Translate the ray outwards from the moon's surface
    mat4.translate(mMatrix, mMatrix, [0, 0.11, 0]); // Adjust to position on the moon's surface
    // Scale to form a long thin rectangle (ray)
    mat4.scale(mMatrix, mMatrix, [rayWidth, rayLength, 1]);
    // Draw the ray as a square
    drawSquare(rayColor, mMatrix);

    // Restore previous matrix state
    mMatrix = popMatrix(matrixStack);
  }
}


// Draw TreeStem
function treeStem() {

  // Loop to create multiple strips
  for (let i = 0; i < 3; i++) {
    // Create a model matrix for transformations
    const mMatrix = mat4.create(); // mat4 is from glMatrix library
    // Translate to the top-right corner
    mat4.translate(mMatrix, mMatrix, [0.2 + i * 0.3, 0.28, 0]);
    // Scale the strip to be more rectangular
    mat4.scale(mMatrix, mMatrix, [0.05, 0.3, 1]);
    // Set a color for the strip (alternating colors for visualization)
    const color = [0.55, 0.27, 0.07, 1.0];
    // Draw the transformed square as a strip
    drawSquare(color, mMatrix);
  }
}

// Draw Tree Leaves 
function drawTree() {
  
  // Loop to create four triangles on top of each strip
  for (let i = 0; i < 3; i++) {
    // Draw the first triangle on top of the strip
    const color1 = [0.0, 0.6, 0.0, 1.0];
    const mMatrix1 = mat4.create();
    mat4.translate(mMatrix1, mMatrix1, [0.2 + i * 0.3, 0.46, 0]); // Adjust the Y to move it above the strip
    mat4.scale(mMatrix1, mMatrix1, [0.3, 0.1, 1]); // Adjust the size to fit the strip
    drawTriangle(color1, mMatrix1);

    // Draw the second triangle on top of the first triangle
    const color2 = [0.0, 0.4, 0.0, 1.0];
    const mMatrix2 = mat4.create();
    mat4.translate(mMatrix2, mMatrix2, [0.2 + i * 0.3, 0.48, 0]); // Stack the triangle above the first one
    mat4.scale(mMatrix2, mMatrix2, [0.28, 0.08, 1]); // Slightly smaller
    drawTriangle(color2, mMatrix2);

    // Draw the third triangle on top of the second triangle
    const color3 = [0.0, 0.2, 0.0, 1.0];
    const mMatrix3 = mat4.create();
    mat4.translate(mMatrix3, mMatrix3, [0.2 + i * 0.3, 0.5, 0]); // Stack the triangle above the second one
    mat4.scale(mMatrix3, mMatrix3, [0.26, 0.06, 1]); // Slightly smaller
    drawTriangle(color3, mMatrix3);

    // Draw the fourth triangle on top of the third triangle
    const color4 = [0.0, 0.4, 0.0, 1.0];
    const mMatrix4 = mat4.create();
    mat4.translate(mMatrix4, mMatrix4, [0.2 + i * 0.3, 0.59, 0]); // Stack the triangle above the third one
    mat4.scale(mMatrix4, mMatrix4, [0.24, 0.18, 1]); // Slightly smaller
    drawTriangle(color4, mMatrix4);
  }
}

// Draw riverShine
function riverShine() {
  // Initialize the square buffer if not already done
  initSquareBuffer();

  // Color for the strips (white)
  const color = [1.0, 1.0, 1.0, 1.0]; // White color in RGBA

  // Create a matrix stack for managing transformations
  // const matrixStack = [];

  // Function to push matrix onto stack
  function pushMatrix(stack, matrix) {
    const copy = mat4.clone(matrix);
    stack.push(copy);
  }

  // Function to pop matrix from stack
  function popMatrix(stack) {
    if (stack.length === 0) {
      throw "Invalid popMatrix!";
    }
    return stack.pop();
  }

  // Function to draw a single thin strip
  function drawThinStrip(x, y) {
    // Create a model matrix for transformations
    let mMatrix = mat4.create();
    pushMatrix(matrixStack, mMatrix); // Push current matrix onto stack

    // Translate and scale for the strip
    mat4.translate(mMatrix, mMatrix, [x, y, 1]); // Position of the strip
    mat4.scale(mMatrix, mMatrix, [0.4, 0.0025, 1]); // Scale to create a very thin strip

    // Draw the transformed square as a thin strip
    drawSquare(color, mMatrix);

    // Restore previous matrix state
    mMatrix = popMatrix(matrixStack);
  }

  // Draw three thin strips
  drawThinStrip(-0.7, 0.06); // First strip
  drawThinStrip(0.0, -0.06); // Second strip
  drawThinStrip(0.7, 0.06); // Third strip
}

// Draw Mountains
function drawMountain1() {
  // Color for the mountains (lighter brown)
  const color = [0.4196, 0.2588, 0.0157, 1.0]; // Lighter brown color in RGBA
  // 0.4196, 0.2588, 0.0157, 1.0

  pushMatrix(matrixStack, mMatrix); // Push current matrix onto stack

  // Translate and scale for the first mountain
  mat4.translate(mMatrix, mMatrix, [-0.7, 0.30, 0]); // Adjust x and y for positioning
  mat4.scale(mMatrix, mMatrix, [1, 0.30, 1]); // Scale to create the first mountain
  drawTriangle(color, mMatrix); // Draw the first mountain

  mMatrix = popMatrix(matrixStack); // Restore the matrix

  const color1 = [0.6, 0.4, 0.2, 1.0];

  // Create a model matrix for the third mountain
  pushMatrix(matrixStack, mMatrix); // Push current matrix onto stack

  // Translate and scale for the third mountain
  mat4.translate(mMatrix, mMatrix, [0.6, 0.39, 0]); // Adjust x and y for positioning
  mat4.scale(mMatrix, mMatrix, [1, 0.49, 1]); // Scale to create the third mountain
  drawTriangle(color1, mMatrix); // Draw the third mountain

  mMatrix = popMatrix(matrixStack); // Restore the matrix

}

function drawMountain2(){

  const color = [0.4196, 0.2588, 0.0157, 1.0];
  // Create a model matrix for the second mountain
  pushMatrix(matrixStack, mMatrix); // Push current matrix onto stack

  // Translate and scale for the second mountain
  mat4.translate(mMatrix, mMatrix, [0, 0.39, 0]); // Adjust x and y for positioning
  mat4.scale(mMatrix, mMatrix, [1, 0.49, 1]); // Scale to create the second mountain
  drawTriangle(color, mMatrix); // Draw the second mountain

  mMatrix = popMatrix(matrixStack); // Restore the matrix
}

function mountainShadow1(){
  const color1 = [0.6, 0.4, 0.2, 1.0];

  // Create a model matrix for the third mountain
  pushMatrix(matrixStack, mMatrix); // Push current matrix onto stack

  // Translate and scale for the third mountain
  mat4.translate(mMatrix, mMatrix, [-0.7, 0.30, 0]); // Adjust x and y for positioning
  mat4.scale(mMatrix, mMatrix, [1, 0.30, 1]); // Scale to create the third mountain
  drawSTriangle(color1, mMatrix); // Draw the third mountain

  mMatrix = popMatrix(matrixStack); // Restore the matrix

}

function mountainShadow2(){
  const color = [0.6, 0.4, 0.2, 1.0];
  // Create a model matrix for the second mountain
  pushMatrix(matrixStack, mMatrix); // Push current matrix onto stack

  // Translate and scale for the second mountain
  mat4.translate(mMatrix, mMatrix, [0, 0.39, 0]); // Adjust x and y for positioning
  mat4.scale(mMatrix, mMatrix, [1, 0.49, 1]); // Scale to create the second mountain
  drawSTriangle(color, mMatrix); // Draw the second mountain

  mMatrix = popMatrix(matrixStack); // Restore the matrix
}

// Draw Stars
let star1Scale = 0.5;
const star1MinScale = 0.8;
const star1MaxScale = 1.3;
const star1ScaleSpeed = 0.005;
let star1Increasing = true;

let star2Scale = 0.5;
const star2MinScale = 0.7;
const star2MaxScale = 1.2;
const star2ScaleSpeed = 0.005;
let star2Increasing = true;

let star3Scale = 0.5;
const star3MinScale = 0.7;
const star3MaxScale = 1.22;
const star3ScaleSpeed = 0.02;
let star3Increasing = true;

let star4Scale = 0.5;
const star4MinScale = 0.5;
const star4MaxScale = 1.34;
const star4ScaleSpeed = 0.012;
let star4Increasing = true;

let star5Scale = 0.5;
const star5MinScale = 0.72;
const star5MaxScale = 1.29;
const star5ScaleSpeed = 0.01;
let star5Increasing = true;

// Update the scale for each star
function updateStarScale() {
  // For Star 1
  if (star1Increasing) {
    star1Scale += star1ScaleSpeed;
    if (star1Scale >= star1MaxScale) {
      star1Scale = star1MaxScale;
      star1Increasing = false;
    }
  } else {
    star1Scale -= star1ScaleSpeed;
    if (star1Scale <= star1MinScale) {
      star1Scale = star1MinScale;
      star1Increasing = true;
    }
  }
  // For Star 2
  if (star2Increasing) {
    star2Scale += star2ScaleSpeed;
    if (star2Scale >= star2MaxScale) {
      star2Scale = star2MaxScale;
      star2Increasing = false;
    }
  } else {
    star2Scale -= star2ScaleSpeed;
    if (star2Scale <= star2MinScale) {
      star2Scale = star2MinScale;
      star2Increasing = true;
    }
  }
  // For Star 3
  if (star3Increasing) {
    star3Scale += star3ScaleSpeed;
    if (star3Scale >= star3MaxScale) {
      star3Scale = star3MaxScale;
      star3Increasing = false;
    }
  } else {
    star3Scale -= star3ScaleSpeed;
    if (star3Scale <= star3MinScale) {
      star3Scale = star3MinScale;
      star3Increasing = true;
    }
  }
  // For Star 4
  if (star4Increasing) {
    star4Scale += star4ScaleSpeed;
    if (star4Scale >= star4MaxScale) {
      star4Scale = star4MaxScale;
      star4Increasing = false;
    }
  } else {
    star4Scale -= star4ScaleSpeed;
    if (star4Scale <= star4MinScale) {
      star4Scale = star4MinScale;
      star4Increasing = true;
    }
  }
  // For Star 5
  if (star5Increasing) {
    star5Scale += star5ScaleSpeed;
    if (star5Scale >= star5MaxScale) {
      star5Scale = star5MaxScale;
      star5Increasing = false;
    }
  } else {
    star5Scale -= star5ScaleSpeed;
    if (star5Scale <= star5MinScale) {
      star5Scale = star5MinScale;
      star5Increasing = true;
    }
  }
}
function drawStar1() {
  const starColor = [1.0, 1.0, 1.0, 1.0];
  const baseMatrix = mat4.create();
  mat4.translate(baseMatrix, baseMatrix, [0.0, 0.8, 0.0]);
  mat4.scale(baseMatrix, baseMatrix, [0.01, 0.01, 1.0]);
  drawSquare(starColor, baseMatrix);

  // Draw triangles
  drawStarTriangles(baseMatrix, star1Scale, starColor);
}
function drawStar2() {
  const starColor = [1.0, 1.0, 1.0, 1.0];
  const baseMatrix = mat4.create();
  mat4.translate(baseMatrix, baseMatrix, [0.3, 0.9, 0.0]);
  mat4.scale(baseMatrix, baseMatrix, [0.02, 0.02, 1.0]);
  drawSquare(starColor, baseMatrix);

  // Draw triangles
  drawStarTriangles(baseMatrix, star2Scale, starColor);
}
function drawStar3() {
  const starColor = [1.0, 1.0, 1.0, 1.0];
  const baseMatrix = mat4.create();
  mat4.translate(baseMatrix, baseMatrix, [-0.4, 0.7, 0.0]);
  mat4.scale(baseMatrix, baseMatrix, [0.014, 0.014, 1.0]);
  drawSquare(starColor, baseMatrix);

  // Draw triangles
  drawStarTriangles(baseMatrix, star3Scale, starColor);
}
function drawStar4() {
  const starColor = [1.0, 1.0, 1.0, 1.0];
  const baseMatrix = mat4.create();
  mat4.translate(baseMatrix, baseMatrix, [-0.3, 0.6, 0.0]);
  mat4.scale(baseMatrix, baseMatrix, [0.01, 0.01, 1.0]);
  drawSquare(starColor, baseMatrix);

  // Draw triangles
  drawStarTriangles(baseMatrix, star4Scale, starColor);
}
function drawStar5() {
  const starColor = [1.0, 1.0, 1.0, 1.0];
  const baseMatrix = mat4.create();
  mat4.translate(baseMatrix, baseMatrix, [-0.4, 0.49, 0.0]);
  mat4.scale(baseMatrix, baseMatrix, [0.02, 0.02, 1.0]);
  drawSquare(starColor, baseMatrix);

  // Draw triangles
  drawStarTriangles(baseMatrix, star5Scale, starColor);
}
// Function to draw triangles on each face of the square
function drawStarTriangles(baseMatrix, starScale, starColor) {
  let triangleMatrix = mat4.clone(baseMatrix);
  mat4.translate(triangleMatrix, triangleMatrix, [0.0, -1.0, 0]);
  mat4.scale(triangleMatrix, triangleMatrix, [starScale, starScale, 1.0]);
  mat4.rotateZ(triangleMatrix, triangleMatrix, Math.PI);
  drawTriangle(starColor, triangleMatrix);

  triangleMatrix = mat4.clone(baseMatrix);
  mat4.translate(triangleMatrix, triangleMatrix, [0, 1.0, 0]);
  mat4.scale(triangleMatrix, triangleMatrix, [starScale, starScale, 1.0]);
  drawTriangle(starColor, triangleMatrix);

  triangleMatrix = mat4.clone(baseMatrix);
  mat4.translate(triangleMatrix, triangleMatrix, [-1.0, 0, 0]);
  mat4.scale(triangleMatrix, triangleMatrix, [starScale, starScale, 1.0]);
  mat4.rotateZ(triangleMatrix, triangleMatrix, Math.PI / 2);
  drawTriangle(starColor, triangleMatrix);

  triangleMatrix = mat4.clone(baseMatrix);
  mat4.translate(triangleMatrix, triangleMatrix, [1.0, 0, 0]);
  mat4.scale(triangleMatrix, triangleMatrix, [starScale, starScale, 1.0]);
  mat4.rotateZ(triangleMatrix, triangleMatrix, -Math.PI / 2);
  drawTriangle(starColor, triangleMatrix);
}

// Draw Green Ground
function drawGround() {
  // Preserve current matrix state
  pushMatrix(matrixStack, mMatrix);
  
  // Apply transformations for the Ground (centered horizontally and vertically)
  mat4.translate(mMatrix, mMatrix, [0.0, -0.5, 0]); // Adjust as needed to center the Ground horizontally
  mat4.scale(mMatrix, mMatrix, [2.0, 1.3, 1.0]);    // Scale down to create  Ground shape

  // Set the color to green for the Ground
  const GroundColor = [0, 0.5, 0, 0.5]; // green color for the Grund
  drawSquare(GroundColor, mMatrix);
  
  // Restore previous matrix state
  mMatrix = popMatrix(matrixStack);
}

// Draw Green Path
function DrawGreenPath(){
    // Drawing Road with Triangle
    pushMatrix(matrixStack, mMatrix);
    mat4.translate(mMatrix, mMatrix, [0.15, -0.68, 0]); // Local translation
    mat4.rotate(mMatrix, mMatrix, degToRad(30), [0, 0, 1]); // Local rotation
    mat4.scale(mMatrix, mMatrix, [1.8, 1.8, 1.0]); // Scaling to make it a rectangl
    color = [0.514, 0.710, 0.239, 1.0]; // Color for Road
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// Draw all Oval Shape Objects like Cloud and Bush
function drawOval() {
  // Create a matrix stack for managing transformations
  const matrixStack = [];

  // Function to push matrix onto stack
  function pushMatrix(stack, matrix) {
    const copy = mat4.clone(matrix);
    stack.push(copy);
  }

  // Function to pop matrix from stack
  function popMatrix(stack) {
    if (stack.length === 0) {
      throw "Invalid popMatrix!";
    }
    return stack.pop();
  }

  // Function to draw a single circle for the bush
  function drawOvalObject(position, size, color) {
    // Create a model matrix for transformations
    let mMatrix = mat4.create();
    pushMatrix(matrixStack, mMatrix); // Push current matrix onto stack

    // Apply transformations for the bush circle
    mat4.translate(mMatrix, mMatrix, position); // Position of the bush circle
    mat4.scale(mMatrix, mMatrix, size); // Scale to create the bush circle shape

    // Draw the bush circle with the given color
    drawCircle(color, mMatrix);

    // Restore previous matrix state
    mMatrix = popMatrix(matrixStack);
  }

  // Define the position, sizes, and colors for each bush part
  const bushPosition1 = [-0.98, -0.5, 0]; // House Bush 1
  const bushSize1 = [0.2, 0.1, 1.0]; 
  const bushColor1 = [0.137, 0.714, 0.137,1]; 

  const bushPosition2 = [-0.85, -0.49, 0]; // House Bush 2
  const bushSize2 = [0.2, 0.13, 1.0]; 
  const bushColor2 = [0.110, 0.486, 0.004, 1.0]; 

  const bushPosition3 = [-0.4, -0.5, 0]; // House Bush 3 
  const bushSize3 = [0.2, 0.1, 1.0]; 
  const bushColor3 = [0.004, 0.486, 0.004, 1.0]; 

  const bushPosition4 = [-0.45, -0.98, 0]; // Down Bush 1
  const bushSize4 = [0.2, 0.13, 1.0]; 
  const bushColor4 = [0.004, 0.486, 0.004, 1.0]; 

  const bushPosition5 = [0.94, -0.35, 0]; // Side Bush 2
  const bushSize5 = [0.2, 0.13, 1.0]; 
  const bushColor5 = [0.137, 0.714, 0.137, 1.0]; 

  const bushPosition6 = [0.80, -0.37, 0]; // Side Bush 1
  const bushSize6 = [0.26, 0.17, 1.0]; 
  const bushColor6 = [0.110, 0.486, 0.004, 1.0]; 

  const bushPosition7 = [-0.25, -0.98, 0]; // Down Bush 2
  const bushSize7 = [0.36, 0.17, 1.0]; 
  const bushColor7 = [0.137, 0.714, 0.137, 1.0]; 

  const bushPosition8 = [-0.25, -0.5, 0]; // House Bush 4
  const bushSize8 = [0.2, 0.13, 1.0]; 
  const bushColor8 = [0.137, 0.714, 0.137, 1.0]; 

  // Draw each circle to create a bush
  drawOvalObject(bushPosition1, bushSize1, bushColor1);
  drawOvalObject(bushPosition2, bushSize2, bushColor2);
  drawOvalObject(bushPosition3, bushSize3, bushColor3);
  drawOvalObject(bushPosition4, bushSize4, bushColor4);
  drawOvalObject(bushPosition5, bushSize5, bushColor5);
  drawOvalObject(bushPosition6, bushSize6, bushColor6);
  drawOvalObject(bushPosition7, bushSize7, bushColor7);
  drawOvalObject(bushPosition8, bushSize8, bushColor8);

  // // Now we define position, size and color for moon
  // const moonPostion = [-0.7, 0.8, 0];
  // const moonSize = [0.2, 0.2, 1];
  // const moonColor = [1.0, 1.0, 1.0, 1.0];

  // drawOvalObject(moonPostion, moonSize, moonColor);


  // Now we define position, size and color for cloud
  const cloudPosition1 = [-0.9, 0.55, 0]; // Cloud 1
  const cloudSize1 = [0.4, 0.15, 1.0];
  const cloudColor1 = [0.5, 0.5, 0.5, 1.0];

  const cloudPosition2 = [-0.75, 0.55, 0]; // Cloud 2
  const cloudSize2 = [0.27, 0.15, 1.0];
  const cloudColor2 = [1.0, 1.0, 1.0, 1.0];

  const cloudPosition3 = [-0.6, 0.55, 0]; // Cloud 3
  const cloudSize3 = [0.21, 0.1, 1.0];
  const cloudColor3 = [0.5, 0.5, 0.5, 1.0];

  const cloudPosition4 = [0.6, 0.75, 0]; // Cloud 3
  const cloudSize4 = [0.21, 0.1, 1.0];
  const cloudColor4 = [0.5, 0.5, 0.5, 1.0];

  const cloudPosition5 = [0.75, 0.75, 0]; // Cloud 3
  const cloudSize5 = [0.3, 0.1, 1.0];
  const cloudColor5 = [0.2, 0.2, 0.2, 1.0];

  drawOvalObject(cloudPosition1, cloudSize1, cloudColor1);
  drawOvalObject(cloudPosition2, cloudSize2, cloudColor2);
  drawOvalObject(cloudPosition3, cloudSize3, cloudColor3);
  drawOvalObject(cloudPosition4, cloudSize4, cloudColor4);
  drawOvalObject(cloudPosition5, cloudSize5, cloudColor5);


}

// Draw Car
function drawCar() {
  
  // Car Top (half-circle)
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [-0.55, -0.67, 0]); // Positioning the car top
  mat4.scale(mMatrix, mMatrix, [0.35, 0.2, 1.0]); // Adjust size
  const topColor = [0.1, 0.3, 0.7, 1.0]; // Darker blue color for the car top
  drawCircle(topColor, mMatrix); // Assuming you draw a half-circle with a method
  mMatrix = popMatrix(matrixStack);

  // Car Windows (square)
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [-0.55, -0.67, 0]); // Positioning the car windows
  mat4.scale(mMatrix, mMatrix, [0.24, 0.08, 1.0]);  // Adjust size
  const windowColor = [0.8, 0.8, 0.9, 1.0]; // Light grey for the windows
  drawSquare(windowColor, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // Left Wheel's Concentric Circle (black circle behind the wheel)
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [-0.7, -0.82, 0]); // Positioning the left wheel
  mat4.scale(mMatrix, mMatrix, [0.12, 0.12, 1.0]); // Slightly larger than the wheel
  const blackColor = [0.0, 0.0, 0.0, 1.0]; // Black color for the concentric circle
  drawCircle(blackColor, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // Left Wheel
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [-0.7, -0.82, 0]); // Positioning the left wheel
  mat4.scale(mMatrix, mMatrix, [0.1, 0.1, 1.0]); // Adjust size
  const wheelColor = [0.3, 0.3, 0.3, 1.0]; // Dark grey for the wheels
  drawCircle(wheelColor, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // Right Wheel's Concentric Circle (black circle behind the wheel)
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [-0.4, -0.82, 0]); // Positioning the right wheel
  mat4.scale(mMatrix, mMatrix, [0.12, 0.12, 1.0]); // Slightly larger than the wheel
  drawCircle(blackColor, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // Right Wheel
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [-0.4, -0.82, 0]); // Positioning the right wheel
  mat4.scale(mMatrix, mMatrix, [0.1, 0.1, 1.0]); // Adjust size
  drawCircle(wheelColor, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // Car Body (bottom rectangle)
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [-0.55, -0.75, 0]); // Positioning the car at the bottom left
  mat4.scale(mMatrix, mMatrix, [0.4, 0.125, 1.0]);  // Adjust size
  const bodyColor = [0.3, 0.6, 0.9, 1.0]; // Blue color for the car body
  drawSquare(bodyColor, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // Left Triangle (at the left end of the car body)
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [-0.75, -0.75, 0]); // Positioning the left triangle
  mat4.scale(mMatrix, mMatrix, [0.2, 0.125, 1.0]);  // Adjust size to match car body height
  const triangleColor = [0.3, 0.6, 0.9, 1.0]; // Same color as car body
  drawTriangle(triangleColor, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // Right Triangle (at the right end of the car body)
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [-0.35, -0.75, 0]); // Positioning the right triangle
  mat4.scale(mMatrix, mMatrix, [-0.2, 0.125, 1.0]);  // Negative scale to flip horizontally
  drawTriangle(triangleColor, mMatrix);
  mMatrix = popMatrix(matrixStack);

}

// Draw House
function drawHouse() {

  // Walls (rectangle)
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [-0.65, -0.38, 0]); // Positioning the walls
  mat4.scale(mMatrix, mMatrix, [0.5, 0.35, 1.0]);  // Adjust size
  const wallColor = [1.0, 1.0, 1.0, 1.0]; // White color for the walls
  drawSquare(wallColor, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // Roof Right(triangle)
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [-0.4, -0.2, 0]); // Positioning the roof
  mat4.scale(mMatrix, mMatrix, [0.15, 0.2, 1.0]); // Adjust size
  const roofColor = [1.0, 0.3, 0.0, 1.0]; // Red/orange color for the roof
  drawTriangle(roofColor, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // Roof Left(triangle)
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [-0.9, -0.2, 0]); // Positioning the roof
  mat4.scale(mMatrix, mMatrix, [0.15, 0.2, 1.0]); // Adjust size
  const roofColor2 = [1.0, 0.3, 0.0, 1.0]; // Red/orange color for the roof
  drawTriangle(roofColor2, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // House Top (Top rectangle)
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [-0.65, -0.2, 0]); // Positioning 
  mat4.scale(mMatrix, mMatrix, [0.5, 0.2, 1.0]);  // Adjust size
  const bodyColor = [1.0, 0.3, 0.0, 1.0]; // Red color 
  drawSquare(bodyColor, mMatrix);
  mMatrix = popMatrix(matrixStack);


  // Door (rectangle)
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [-0.65, -0.458, 0]); // Positioning the door
  mat4.scale(mMatrix, mMatrix, [0.08, 0.2, 1.0]);  // Adjust size
  const doorColor = [1.0, 0.8, 0.2, 1.0]; // Yellow color for the door
  drawSquare(doorColor, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // Left Window (square)
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [-0.8, -0.38, 0]); // Positioning the left window
  mat4.scale(mMatrix, mMatrix, [0.06, 0.06, 1.0]);  // Adjust size
  const windowColor = [1.0, 0.8, 0.2, 1.0]; // Yellow color for the window
  drawSquare(windowColor, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // Right Window (square)
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [-0.5, -0.38, 0]); // Positioning the right window
  mat4.scale(mMatrix, mMatrix, [0.06, 0.06, 1.0]);  // Adjust size
  drawSquare(windowColor, mMatrix);
  mMatrix = popMatrix(matrixStack);

}

// Draw Moon
function drawMoon() {
    
  pushMatrix(matrixStack, mMatrix);
  
  // Apply transformations for the moon (in the upper left corner)
  mat4.translate(mMatrix, mMatrix, [-0.8, 0.85, 0]); // Position
  mat4.rotateZ(mMatrix, mMatrix, moonRotation); // Apply rotation
  mat4.scale(mMatrix, mMatrix, [0.2, 0.2, 1.0]); // Scale
  
  // Set moon color
  const moonColor = [1.0, 1.0, 1.0, 1.0]; 

  drawCircle(moonColor, mMatrix);
  
  mMatrix = popMatrix(matrixStack);
}

// Draw Night
function drawNight(){
   // Preserve current matrix state
   pushMatrix(matrixStack, mMatrix);
  
   // Apply transformations for the sky (centered horizontally and vertically)
   mat4.translate(mMatrix, mMatrix, [0.0, 0.5, 0]); 
   mat4.scale(mMatrix, mMatrix, [2.0, 1.0, 1.0]);    
 
   // Set the color to black for the Ground
   const Color = [0.0, 0.0, 0.0, 1]; 
   drawSquare(Color, mMatrix);
   
   // Restore previous matrix state
   mMatrix = popMatrix(matrixStack);
}

// Draw WindMill
function drawWindmill1() {

  
  // Draw the Base (Vertical Rectangle)
  drawBase();
  // Draw the Blades (4 Triangles originating from the hub)
  drawBlades();
  // Draw the Hub (Circle on top of the base)
  drawHub();
}
function drawBase() {
  // translating it to correct position
  const translation = [0.66, 0.5, 0];

  pushMatrix(matrixStack, mMatrix);
  
  
  mat4.translate(mMatrix, mMatrix, translation);   

// Preserve current matrix state
  pushMatrix(matrixStack, mMatrix);
  
  // Apply transformations for the base
  mat4.translate(mMatrix, mMatrix, [0.0, -0.5, 0]); // Center at the bottom
  mat4.scale(mMatrix, mMatrix, [0.04, 0.6, 1.0]);    // Scale to create a vertical rectangle (stem)

  // Set color for the base
  const baseColor = [0.0980, 0.0863, 0.0863,0.9]; // Brown color for the base
  drawSquare(baseColor, mMatrix);
  
  // Restore previous matrix state
  mMatrix = popMatrix(matrixStack);
}
function drawHub() {

  const translation = [0.66, 0.5, 0];

  pushMatrix(matrixStack, mMatrix);
  
  
  mat4.translate(mMatrix, mMatrix, translation);  
  // Preserve current matrix state
  pushMatrix(matrixStack, mMatrix);
  
  // Apply transformations for the hub
  // Translate the hub to the top of the base (0.6/2 for base height + 0.1/2 for hub radius)
  mat4.translate(mMatrix, mMatrix, [0.0, -0.2, 0]); // Base height/2 is 0.3, hub radius/2 is 0.05, so 0.3 - 0.05
  
  // Scale the hub
  mat4.scale(mMatrix, mMatrix, [0.07, 0.07, 1.0]);    // Adjust size of the hub
  
  // Set color for the hub
  const hubColor = [0, 0, 0, 1.0]; // White color for the hub
  drawCircle(hubColor, mMatrix);
  
  // Restore previous matrix state
  mMatrix = popMatrix(matrixStack);
}
function drawBlades() {
  const bladeColor = [0.8, 0.8, 0.8, 1.0]; // Light grey color for the blades
  const bladeLength = 0.35; // Length of the long sides of the blade (3.5 times the base)
  const bladeBase = 0.1;   // Length of the short base of the isosceles triangle

  // Convert 40 degrees to radians
  const rotationAngle = (40 * Math.PI) / 180; // 40 degrees in radians

  for (let i = 0; i < 4; i++) {
      const translation = [0.66, 0.5, 0];
  
      pushMatrix(matrixStack, mMatrix);
      
      mat4.translate(mMatrix, mMatrix, translation);

      // Preserve current matrix state
      pushMatrix(matrixStack, mMatrix);
  
      // Translate to the hub's center (top of the base rectangle)
      mat4.translate(mMatrix, mMatrix, [0.0, -0.2, 0]); 

      // Rotate each blade by the current rotation angle
      mat4.rotateZ(mMatrix, mMatrix, bladeRotationAngle1 + (i * Math.PI) / 2); 

      // Adjust the position so the vertex of the isosceles triangle (formed by two equal sides) is at the hub's center
      mat4.translate(mMatrix, mMatrix, [0.0, -bladeLength / 2, 0]);

      // Scale to form an isosceles triangle with the correct proportions
      mat4.scale(mMatrix, mMatrix, [bladeBase, bladeLength, 1.0]);

      // Draw the blade as a triangle
      drawTriangle(bladeColor, mMatrix);
  
      // Restore previous matrix state
      mMatrix = popMatrix(matrixStack);
  }
}
function updateBladeRotation1() {
  bladeRotationAngle1 += bladeRotationSpeed1; // Increment the rotation angle

  // Reset the angle to avoid overflow
  if (bladeRotationAngle1 > 2 * Math.PI) {
      bladeRotationAngle1 -= 2 * Math.PI;
  }
}
function drawWindmill2() {

  
  // Draw the Base (Vertical Rectangle)
  drawBase2();
  // Draw the Blades (4 Triangles originating from the hub)
  drawBlades2();
  // Draw the Hub (Circle on top of the base)
  drawHub2();
}
function drawBase2() {
  // translating it to correct position
  const translation = [0.35, 0.45, 0];


  pushMatrix(matrixStack, mMatrix);
  
  
  mat4.translate(mMatrix, mMatrix, translation);   

// Preserve current matrix state
  pushMatrix(matrixStack, mMatrix);
  
  // Apply transformations for the base
  mat4.translate(mMatrix, mMatrix, [0.0, -0.5, 0]); // Center at the bottom
  mat4.scale(mMatrix, mMatrix, [0.025, 0.6, 1.0]);    // Scale to create a vertical rectangle (stem)

  // Set color for the base
  const baseColor = [0.0980, 0.0863, 0.0863,0.9]; // Brown color for the base
  drawSquare(baseColor, mMatrix);
  
  // Restore previous matrix state
  mMatrix = popMatrix(matrixStack);
}
function drawHub2() {

  const translation = [0.35, 0.45, 0];


  pushMatrix(matrixStack, mMatrix);
  
  
  mat4.translate(mMatrix, mMatrix, translation);  
  // Preserve current matrix state
  pushMatrix(matrixStack, mMatrix);
  
  // Apply transformations for the hub
  // Translate the hub to the top of the base (0.6/2 for base height + 0.1/2 for hub radius)
  mat4.translate(mMatrix, mMatrix, [0.0, -0.2, 0]); // Base height/2 is 0.3, hub radius/2 is 0.05, so 0.3 - 0.05
  
  // Scale the hub
  mat4.scale(mMatrix, mMatrix, [0.035, 0.035, 1.0]);    // Adjust size of the hub
  
  // Set color for the hub
  const hubColor = [0, 0, 0, 1.0]; // White color for the hub
  drawCircle(hubColor, mMatrix);
  
  // Restore previous matrix state
  mMatrix = popMatrix(matrixStack);
}
function drawBlades2() {
  const bladeColor2 = [0.8, 0.8, 0.8, 1.0]; // Light grey color for the blades
  const bladeLength2 = 0.3; // Length of the long sides of the blade
  const bladeBase2 = 0.1;   // Length of the short base of the isosceles triangle

  for (let i = 0; i < 4; i++) {
      const translation = [0.35, 0.45, 0];

      pushMatrix(matrixStack, mMatrix);

      mat4.translate(mMatrix, mMatrix, translation);

      // Preserve current matrix state
      pushMatrix(matrixStack, mMatrix);

      // Translate to the hub's center (top of the base rectangle)
      mat4.translate(mMatrix, mMatrix, [0.0, -0.2, 0]);

      // Rotate each blade by the updated rotation angle
      mat4.rotateZ(mMatrix, mMatrix, bladeRotationAngle2 + (i * Math.PI) / 2);

      // Adjust the position so the vertex of the isosceles triangle is at the hub's center
      mat4.translate(mMatrix, mMatrix, [0.0, -bladeLength2 / 2, 0]);

      // Scale to form an isosceles triangle with the correct proportions
      mat4.scale(mMatrix, mMatrix, [bladeBase2, bladeLength2, 1.0]);

      // Draw the blade as a triangle
      drawTriangle(bladeColor2, mMatrix);

      // Restore previous matrix state
      mMatrix = popMatrix(matrixStack);
  }
}
function updateBladeRotation2() {
  bladeRotationAngle2 += bladeRotationSpeed2; // Increment the rotation angle

  // Reset the angle to avoid overflow
  if (bladeRotationAngle2 > 2 * Math.PI) {
      bladeRotationAngle2 -= 2 * Math.PI;
  }
}

// Draw Boat
function drawBoat2() {
  // Draw the boat's base 
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [boatPosition2, 0.6, 0]); // Apply boatPosition
  mat4.translate(mMatrix, mMatrix, [0.0, -0.6, 0.0]);
  mat4.scale(mMatrix, mMatrix, [0.2, 0.1, 1.0]);
  const baseColor = [0.7, 0.7, 0.7, 1.0];
  drawSquare(baseColor, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // Draw the left triangle (sail)
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [boatPosition2, 0.6, 0]); // Apply boatPosition
  mat4.translate(mMatrix, mMatrix, [-0.1, -0.6, 0.0]);
  mat4.scale(mMatrix, mMatrix, [0.1, 0.1, 1.0]);
  mat4.rotateZ(mMatrix, mMatrix, Math.PI);
  const sailColor1 = [0.7, 0.7, 0.7, 1.0];
  drawTriangle(sailColor1, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // Draw the right triangle (sail)
  pushMatrix(matrixStack, mMatrix);
    mat4.translate(mMatrix, mMatrix, [boatPosition2, 0.6, 0]); // Apply boatPosition
    mat4.translate(mMatrix, mMatrix, [0.1, -0.6, 0.0]);
    mat4.scale(mMatrix, mMatrix, [0.1, 0.1, 1.0]);
    mat4.rotateZ(mMatrix, mMatrix, Math.PI);
    const sailColor2 = [0.7, 0.7, 0.7, 1.0];
    drawTriangle(sailColor2, mMatrix);
    mMatrix = popMatrix(matrixStack);

  // Draw the flag
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [boatPosition2, 0, 0]); 
  const translation = [-0.0, 0.38, 0];
  const scale = [0.8,0.6,0.5 ] ;
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, translation);
  mat4.scale(mMatrix, mMatrix, scale);
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [0.027, -0.37, 0.0]); // Position flag at the top
  mat4.scale(mMatrix, mMatrix, [0.14, 0.15, 1.0]); // Scale to a small triangle
  mat4.rotateZ(mMatrix, mMatrix, Math.PI/6.7 ); // Rotate the flag 90 degrees
  // Set color 
  const flagColor = [0.8, 0.0, 0.0, 1.0]; // Red color 
  drawTriangle(flagColor, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // Flag Stand

  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [boatPosition2, 0, 0]); 
  const Translation = [-0.6, 0.39, 0];
  const Scale = [0.6,0.6,0.5 ] ;
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, translation);
  mat4.scale(mMatrix, mMatrix, scale);
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [-0.01, -0.425, 0]); 
  mat4.scale(mMatrix, mMatrix, [0.01, 0.25, 1.0]);    
  // Set color for the base
  const baseColor1 = [0.098, 0.086, 0.086, 1.0]; 
  drawSquare(baseColor1, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // Flag Support
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [boatPosition2, 0, 0]); 
  const translation1 = [-0.0, 0.38, 0];
  const scale1 = [0.6,0.6,0.5 ] ;
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, translation1);
  mat4.scale(mMatrix, mMatrix, scale1);
  pushMatrix(matrixStack, mMatrix);
  mat4.translate(mMatrix, mMatrix, [-0.064, -0.443, 0.0]); 
  mat4.rotateZ(mMatrix, mMatrix, (mMatrix, mMatrix, -Math.PI/7)); 
  mat4.scale(mMatrix, mMatrix, [0.005, 0.23, 1.0]); 
  // Set color for the flag's support string
  const stringColor = [0.0980, 0.0863, 0.0863,0.9]; // Black color 
  drawSquare(stringColor, mMatrix);
  mMatrix = popMatrix(matrixStack);
}
function drawBoat1() {

    // Draw the boat's base 
    pushMatrix(matrixStack, mMatrix);
    // Translate and scale for the boat's base position
    mat4.translate(mMatrix, mMatrix, [boatPosition1 - 0.1, 0.0, 0.0]); // Position the boat's base
    mat4.scale(mMatrix, mMatrix, [0.3, 0.09, 1.0]); // Scale to a wide, short rectangle
    // Set color for the boat's base
    const baseColor1 = [0.7, 0.7, 0.7, 1.0]; // Gray color
    drawSquare(baseColor1, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // Draw the left triangle 
    pushMatrix(matrixStack, mMatrix);
    // Translate to the left side of the boat's base
    mat4.translate(mMatrix, mMatrix, [boatPosition1 + 0.05, 0.0, 0.0]); // Adjust position
    mat4.scale(mMatrix, mMatrix, [0.1, 0.09, 1.0]); // Scale to create the left sail
    mat4.rotateZ(mMatrix, mMatrix, Math.PI); 
    // Set color for the left sail
    const sailColor1 = [0.7, 0.7, 0.7, 1.0]; // Gray color
    drawTriangle(sailColor1, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // Draw the right triangle 
    pushMatrix(matrixStack, mMatrix);
    // Translate to the right side of the boat's base
    mat4.translate(mMatrix, mMatrix, [boatPosition1 - 0.25, 0.0, 0.0]); // Adjust position
    mat4.scale(mMatrix, mMatrix, [0.1, 0.09, 1.0]); // Scale to create the right sail
    mat4.rotateZ(mMatrix, mMatrix, Math.PI); // Rotate the triangle to mirror it
    // Set color for the right sail
    const sailColor2 = [0.7, 0.7, 0.7, 1.0]; // Gray color
    drawTriangle(sailColor2, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // Draw the flag
    pushMatrix(matrixStack, mMatrix);
    // Translate to the top of the boat's mast
    mat4.translate(mMatrix, mMatrix, [boatPosition1 - 0.05, 0.23, 0]); // Position flag at the top
    mat4.scale(mMatrix, mMatrix, [0.14, 0.15, 1.0]); // Scale to a small triangle
    mat4.rotateZ(mMatrix, mMatrix, Math.PI/6.7); // Rotate the flag
    // Set color for the flag
    const flagColor = [0.0, 0.0, 0.8, 1.0]; // Blue color
    drawTriangle(flagColor, mMatrix);
    mMatrix = popMatrix(matrixStack);
    pushMatrix(matrixStack, mMatrix);
    // Apply transformations for the base
    mat4.translate(mMatrix, mMatrix, [boatPosition1 - 0.08, 0.17, 0]); // Center at the bottom
    mat4.scale(mMatrix, mMatrix, [0.01, 0.25, 1.0]);    // Scale to create a vertical rectangle (stem)
    // Set color for the base
    const baseColor = [0.0980, 0.0863, 0.0863, 0.9]; // Brown color
    drawSquare(baseColor, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // Draw the flag support string
    pushMatrix(matrixStack, mMatrix);
    // Translate to the position of the flag's base
    mat4.translate(mMatrix, mMatrix, [boatPosition1 - 0.13, 0.15, 0.0]); // Adjust position
    mat4.rotateZ(mMatrix, mMatrix, -Math.PI/7); // Rotate to match the angle
    mat4.scale(mMatrix, mMatrix, [0.005, 0.23, 1.0]); // Scale to make the string thin and long
    // Set color for the flag's support string
    const stringColor = [0.0980, 0.0863, 0.0863, 0.9]; // Black color
    drawSquare(stringColor, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// Required for animation of boat
function updateBoatAnimation() {
  // Update position based on direction
  boatPosition2 += boatSpeed2 * boatDirection2;
  
  // Reverse direction if boundaries are hit
  if (boatPosition2 > boatRightLimit2 || boatPosition2 < boatLeftLimit2) {
      boatDirection2 *= -1;
  }
}
function updateBoatPosition() {
  boatPosition1 += boatSpeed1 * boatDirection1;

  if (boatPosition1 > boatLeftLimit1 || boatPosition1 < boatRightLimit1) {
      boatDirection1 *= -1; // Reverse direction
  }
}
  
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

function animate(){

  // Update rotation angles
  moonRotation += rotationSpeed; // Update moon rotation
  rayRotation += rotationSpeed;  // Update rays rotation
 
  updateBoatAnimation();
  updateBoatPosition();  // Update Boat Position
  updateBladeRotation1(); // Update the blade rotation angle
  updateBladeRotation2(); // Update the blade rotation angle
  

  // Clear the canvas and draw the scene
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Now we draw Various Components of Canvas

  drawNight();
  drawMoon();

  updateStarScale(); 
  drawStar1();
  drawStar2();
  drawStar3();
  drawStar4();
  drawStar5();

  drawRays();
  drawMountain1();
  mountainShadow1();
  drawMountain2();
  mountainShadow2();
  drawGround();
  DrawGreenPath();
  drawRiver();
  drawOval();
  treeStem();
  drawTree();
  riverShine();
  drawHouse();
  drawCar();
  drawWindmill1();
  drawWindmill2();
  drawBoat1();
  drawBoat2();

  requestAnimationFrame(animate);
}

function drawScene() {
    // Set the viewport and clear the screen
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(1, 1, 1, 0.9);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    // Initialize the model matrix to the identity matrix
    mat4.identity(mMatrix);

    // Now we animate our 2D canvas
    animate();
    
}
  
// This is the entry point from the html
function webGLStart() {
    var canvas = document.getElementById("webgl-canvas");

    initGL(canvas);
    shaderProgram = initShaders();
  
    // Get locations of attributes declared in the vertex shader
    aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  
    // Enable the attribute arrays
    gl.enableVertexAttribArray(aPositionLocation);
    uColorLoc = gl.getUniformLocation(shaderProgram, "color");
  
    // Initialize buffers
    initSquareBuffer();   // For rectangle
    initTriangleBuffer(); // For triangle
    initCircleBuffer();   // For circle
    initSTriangleBuffer();  // For Scalene Triangle

    drawScene(); // Draw the scene
   
}
  
  
