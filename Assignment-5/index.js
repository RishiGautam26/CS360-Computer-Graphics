var fragShaderCode;
var gl;
var animation;
var canvas;
var lightC = [0.7,0.7,0.7];
var lightP = [0.5, 5, 5];
var camP = [0,0,3.1];
var ambI = 1;
var SpecI = 2.0;
var DiffuseI = 0.1;
var bounce = 1;
var refrence ;
var sh = 0;


var sp = [
	{
		centre: [ -0.24, -0.35, 1.7 ],
		radius: 0.15,
		mtl: {
			diffuse_coe: DiffuseI,
			specular_coe: SpecI,
			n: 30,
      color: [0,1,0]
		}
	},
  {
		centre: [ 0.05, -0.35, 1.5 ],
		radius: 0.17,
		mtl: {
			diffuse_coe: DiffuseI,
			specular_coe: SpecI,
			n: 30,
      color: [0.3,1,0.7]
		}
	},
  {
		centre: [ 0.27, -0.1, 1.3 ],
		radius: 0.19,
		mtl: {
			diffuse_coe: DiffuseI,
			specular_coe: SpecI,
			n: 30,
      color: [0,1,1]
		}
	},
  {
		centre: [ 0.27, 0.3, 1.1 ],
		radius: 0.21,
		mtl: {
			diffuse_coe: DiffuseI,
			specular_coe: SpecI,
			n: 30,
      color: [0,0.4,1]
		}
	},
  {
		centre: [ -0.12, 0.5, 0.9 ],
		radius: 0.23,
		mtl: {
			diffuse_coe: DiffuseI,
			specular_coe: SpecI,
			n: 30,
      color: [0.3,0.6,1]
		}
	},
  {
		centre: [ -0.42, 0.3, 0.7 ],
		radius: 0.25,
		mtl: {
			diffuse_coe: DiffuseI,
			specular_coe: SpecI,
			n: 30,
      color: [0,0.1,1]
		}
	},
  {
		centre: [ -0.35, 0, 0.5 ],
		radius: 0.27,
		mtl: {
			diffuse_coe: DiffuseI,
			specular_coe: SpecI,
			n: 30,
      color: [1,0,1]
		}
	}];

fragment_header = `#version 300 es
#define NUM_SPHERES ` + sp.length + `
`;
vertex_header = `#version 300 es
`;
const VERTEX_SHADER = `
in vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition,0.0,1.0);
}
`;
const FRAGMENT_SHADER = `
precision highp float;
struct Material {
	float diffuse_coe;   
	float specular_coe;   
	float n;     
	vec3 color;
};
struct Ray {
	vec3 origin;
	vec3 direction;
};
struct informationOfHit {
	float t;
	vec3 normal;
	vec3 pos;
	int sph;
	Material mtl;
};
struct Sphere {
	vec3 centre;
	float radius;
	Material mtl;
};

uniform Sphere sp[NUM_SPHERES];
uniform float uAmbIntensity;
uniform vec3 uLightPos;
uniform vec3 uCamPos;
uniform vec3 objColor;
uniform vec3 uLightCol;
uniform float uFOV;         
uniform float uAspectRatio; 
uniform int bounceLimit;
uniform float cnvWid;
uniform float cnvHei;
uniform bool sh;
out vec4 fragColor;
informationOfHit IntersectRay(Ray ray, Sphere sphere) {
	informationOfHit hit;
	vec3 oc = ray.origin - sphere.centre;
	float a = dot(ray.direction, ray.direction);
	float b = 2.0 * dot(oc, ray.direction);
	float c = dot(oc, oc) - (sphere.radius * sphere.radius);
	float discri = b * b - 4.0 * a * c;
	if (discri > 0.0) {
		float t1 = (-b - sqrt(discri)) / (2.0 * a);
		float t2 = (-b + sqrt(discri)) / (2.0 * a);
		float t = min(t1, t2);
		if (t > 0.0) {
			hit.t = t;
			hit.normal = normalize(ray.origin + t * ray.direction - sphere.centre);
			hit.mtl = sphere.mtl;
			hit.pos = ray.origin + t * ray.direction;
		} else {
			hit.t = 0.0;
		}
	} else {
		hit.t = 0.0;
	}
	return hit;
}

vec3 phong(Material mtl, vec3 incident, vec3 normal, vec3 viewDir) {
	float DiffuseI = mtl.diffuse_coe;
	float SpecI = mtl.specular_coe;
	float Shininess = mtl.n;
	vec3 objColor = mtl.color;
	vec3 reflected = reflect(incident, normal);
	float dotNL = max(dot(normal, -incident), 0.0);
	vec3 Idiff = DiffuseI * uLightCol * dotNL;
	vec3 Ispec = SpecI * pow(max(dot(reflected, viewDir), 0.0), Shininess) * uLightCol;
	return Idiff + Ispec + uAmbIntensity * objColor;
}

bool isShaodow(vec3 pos, int sphIndex) {
	Ray shadowRay;
	shadowRay.origin = uLightPos;
	shadowRay.direction = normalize(pos - shadowRay.origin);
	float maxDist = length(pos - shadowRay.origin);
	for (int i = 0; i < NUM_SPHERES; ++i) {
		if (i == sphIndex) continue;

		informationOfHit tempHit = IntersectRay(shadowRay, sp[i]);
		if (tempHit.t > 0.0 && maxDist - tempHit.t > 1.0) {
			return true;
		}
	}
	return false;
}

vec3 comBounce(Ray incomingRay) {
	vec3 colorAccum = vec3(0.0);
	for (int i = 0; i < bounceLimit; ++i) {
		informationOfHit closestHit;
		closestHit.t = 0.0;
		for (int j = 0; j < NUM_SPHERES; ++j) {
			informationOfHit currentHit = IntersectRay(incomingRay, sp[j]);
			if (closestHit.t == 0.0 || (currentHit.t > 0.0 && currentHit.t < closestHit.t)) {
				closestHit = currentHit;
				closestHit.sph = j;
			}
		}
		if (closestHit.t == 0.0) break;
		vec3 incident = normalize(closestHit.pos - uLightPos);
		vec3 shadingColor = phong(closestHit.mtl, incident, closestHit.normal, -incomingRay.direction);
		if (i == 0 && sh && isShaodow(closestHit.pos, closestHit.sph)) {
			vec3 ambientShade = 0.3 * closestHit.mtl.color;
			colorAccum += mix(ambientShade, shadingColor, 0.5);
		} else {
			colorAccum += shadingColor;
		}
		colorAccum /= 1.7;
		incomingRay.direction = reflect(incomingRay.direction, closestHit.normal);
		incomingRay.origin = closestHit.pos;
	}
	return colorAccum;
}

void main() {
	Ray primaryRay;
	primaryRay.origin = uCamPos;
	vec2 screenCoords = gl_FragCoord.xy / vec2(cnvWid, cnvHei);
	vec2 ndcCoords = screenCoords * 2.1 - 1.1;
	float scale = tan(uFOV * 0.6);
	ndcCoords.x *= scale * uAspectRatio;
	ndcCoords.y *= scale;
	primaryRay.direction = normalize(vec3(ndcCoords, - 1.1));
	vec3 finalColor = comBounce(primaryRay);
	fragColor = vec4(finalColor, 1.8);
}
`;


function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

var lslider = document.getElementById("LightPos");
lslider.oninput = function() {
  lightP[0] = this.value;
}

function set_mode(mode) {
  sh = (mode === 2 || mode === 4) ? 1 : 0;
  bounce = (mode > 2) ? 2 : 1;
  refrence = (mode > 2);
  bslider.style.display = refrence ? "inline" : "none";
}


function vertexShaderSetup(vertexShaderCode) {
  shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shader, vertexShaderCode);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function fragmentShaderSetup(fragShaderCode) {
  shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shader, fragShaderCode);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}


function initShaders(vsc, fsc) {
  shaderProgram = gl.createProgram();
  vsc = vertex_header + vsc;
  fsc = fragment_header + fsc;
  var vertexShader = vertexShaderSetup(vsc);
  var fragmentShader = fragmentShaderSetup(fsc);
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log(gl.getShaderInfoLog(vertexShader));
    console.log(gl.getShaderInfoLog(fragmentShader));
  }
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");
  uLightPosLocation = gl.getUniformLocation(shaderProgram, "uLightPos");
  uCamPosLocation = gl.getUniformLocation(shaderProgram, "uCamPos");
  uLightColLocation = gl.getUniformLocation(shaderProgram, "uLightCol");
  uAmbIntensityLocation = gl.getUniformLocation(shaderProgram, "uAmbIntensity");
  uBounceLimitLocation = gl.getUniformLocation(shaderProgram, "bounceLimit");
  uCnvWidLocation = gl.getUniformLocation(shaderProgram, "cnvWid");
  uCnvHeiLocation = gl.getUniformLocation(shaderProgram, "cnvHei");
  uShadowLocation = gl.getUniformLocation(shaderProgram, "sh");
  gl.enableVertexAttribArray(aPositionLocation);

  return shaderProgram;
}


function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl2", {preserveDrawingBuffer: true}); 
    window.addEventListener('resize',resizeCanvas,false);
    function resizeCanvas() {
      canvas.width = Math.min(window.innerWidth/1,1000);
      canvas.height = canvas.width;
      gl.viewportWidth = canvas.width; 
      gl.viewportHeight = canvas.height; 
      drawScene();
    }
    resizeCanvas();
  } catch (e) {}
  if (!gl) {
    console.log("WebGL initialization failed");
  }
  mode = gl.TRIANGLES;
}

function initSquareBuffer() {
  const sqVertices = new Float32Array([1,1,-1,1,-1,-1,1,-1]);
  sqVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
  sqVertexPositionBuffer.itemSize = 2;
  sqVertexPositionBuffer.numItems = 4;
  const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  sqVertexIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
  sqVertexIndexBuffer.itemsize = 1;
  sqVertexIndexBuffer.numItems = 6;
}

function drawSq(color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
  gl.vertexAttribPointer(
    aPositionLocation,
    sqVertexPositionBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
  gl.uniform3fv(uColorLocation, color);
  gl.drawElements(
    mode,
    sqVertexIndexBuffer.numItems,
    gl.UNSIGNED_SHORT,
    0
  );
}

function init_sp(){
  gl.useProgram(fragShaderCode);
  function setMaterial( v, mtl )
  {
    gl.uniform1f( gl.getUniformLocation( fragShaderCode, v+'.diffuse_coe' ), mtl.diffuse_coe );
    gl.uniform1f( gl.getUniformLocation( fragShaderCode, v+'.specular_coe' ), mtl.specular_coe );
    gl.uniform1f ( gl.getUniformLocation( fragShaderCode, v+'.n'   ), mtl.n   );
    gl.uniform3fv( gl.getUniformLocation( fragShaderCode, v+'.color' ), mtl.color );
  }
  for ( var i=0; i<sp.length; ++i ) {
    gl.uniform3fv( gl.getUniformLocation( fragShaderCode, 'sp['+i+'].centre' ), sp[i].centre );
    gl.uniform1f ( gl.getUniformLocation( fragShaderCode, 'sp['+i+'].radius' ), sp[i].radius );
    setMaterial( 'sp['+i+'].mtl', sp[i].mtl );
  }
}

function seting_shader(shaderProgram){
  gl.useProgram(shaderProgram);
  gl.uniform3fv(uLightPosLocation, lightP);
  gl.uniform3fv(uCamPosLocation, camP);
  gl.uniform3fv(uLightColLocation, lightC);
  gl.uniform1f(uAmbIntensityLocation, ambI);
  gl.uniform1i(uBounceLimitLocation, bounce);
  gl.uniform1i(uShadowLocation, sh);
  gl.uniform1f(uCnvWidLocation, canvas.width);
  gl.uniform1f(uCnvHeiLocation, canvas.height);
  // New perspective uniforms
  const fov = 43.0 * Math.PI / 180.0; 
  const aspectRatio = canvas.width / canvas.height;
  const uFOVLocation = gl.getUniformLocation(shaderProgram, "uFOV");
  const uAspectRatioLocation = gl.getUniformLocation(shaderProgram, "uAspectRatio");
  gl.uniform1f(uFOVLocation, fov);
  gl.uniform1f(uAspectRatioLocation, aspectRatio);

}

var animate = function () {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  seting_shader(fragShaderCode);
  drawSq([0.0, 0.0, 0.0]);
  animation = window.requestAnimationFrame(animate);
}

function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  if (animation) {
    window.cancelAnimationFrame(animation);
  }
  animate();
}

function webGLStart() {
  canvas = document.getElementById("canvas");
  initGL(canvas);
  fragShaderCode = initShaders(VERTEX_SHADER, FRAGMENT_SHADER);
  init_sp();
  initSquareBuffer();
  drawScene();
}

