var canvas;
var gl;
var program;

var shapeColor;

var t1, t2;
t1 = new Date();

var vBuffer;

var objectList = [];

var pointsArray = [
   vec4(-1, -1, 0, 1),
   vec4(-1, 1, 0, 1),
   vec4(1, 1, 0, 1),
   vec4(1, -1, 0, 1)
];

var start = false;
var dropCount = 0;

class Rect {
   constructor() {
      this.left = 0;
      this.top = 0;
      this.right = 0;
      this.bottom = 0;
   }

   setRect(left, top, right, bottom) {
      this.left = left;
      this.top = top;
      this.right = right;
      this.bottom = bottom;
   }
}

class Object {
   constructor() {
      this.position = vec2();
      this.rect = new Rect();
      this.radius = 0.0;
      this.moveDir = vec2(0, -1);
      this.tag = "name";
      this.color = vec4();
      this.isDead = false;
   }

   getWidth() {
      return this.rect.right - this.rect.left;
   }

   getHeight() {
      return this.rect.bottom - this.rect.top;
   }

   getRect() {
      var widthOffset = this.getWidth() / 2;
      var heightOffset = this.getHeight() / 2;
      var myRect = new Rect();
      myRect.setRect(this.position[0] - widthOffset, this.position[1] - heightOffset,
         this.position[0] + widthOffset, this.position[1] + heightOffset);
      return myRect;
   }

   getRectPosition() {
      var widthOffset = this.getWidth() / 2;
      var heightOffset = this.getHeight() / 2;
      var rectPos = [
         vec2(this.position[0] - widthOffset, this.position[1] + heightOffset),
         vec2(this.position[0] - widthOffset, this.position[1] - heightOffset),
         vec2(this.position[0] + widthOffset, this.position[1] - heightOffset),
         vec2(this.position[0] + widthOffset, this.position[1] + heightOffset)
      ];
      return rectPos;
   }
   
   getCircle() {
      var points = [];
      var t1 = vec2(this.position[0] - this.radius, this.position[1] + this.radius);
      var t2 = vec2(this.position[0] + this.radius, this.position[1] - this.radius);
      var xrad = (t2[0] - t1[0]) / 2;
      var yrad = (t2[1] - t1[1]) / 2;
      var center = mix(t1, t2, 1/2);
      for(var i = 0; i < 20; ++i) {
         var rad = Math.PI / 10 * i;
         points.push(vec2(Math.cos(rad) * xrad + center[0], Math.sin(rad) * yrad + center[1]));
      }
      return points;
   }

   isCollision(obj) {
      var rect = obj.getRect();
      var topLine = closestPointOnLine(rect.left, rect.top, rect.right, rect.top, this.position[0], this.position[1]);
      var leftLine = closestPointOnLine(rect.left, rect.top, rect.left, rect.bottom, this.position[0], this.position[1]);
      var rightLine = closestPointOnLine(rect.right, rect.top, rect.right, rect.bottom, this.position[0], this.position[1]);
      var bottomLine = closestPointOnLine(rect.left, rect.bottom, rect.right, rect.bottom, this.position[0], this.position[1]);
      
      var lines = [topLine, leftLine, rightLine, bottomLine];
      for(var i = 1; i <= 4; ++i) {
         var dist = subtract(lines[i - 1], this.position);
         var distSq = dot(dist, dist);
         if(distSq <= this.radius * this.radius)
            return i;
      }

      return 0;
   }
}

function wc2cc(v) {
   return vec4(2 * v[0] / canvas.width - 1,
            -2 * v[1] / canvas.height + 1,
            0, 1);
}

function closestPointOnLine( lx1,  ly1, lx2,  ly2,  x0,  y0 ) { 
   var A1 = ly2 - ly1; 
   var B1 = lx1 - lx2; 
   var C1 = (ly2 - ly1)*lx1 + (lx1 - lx2)*ly1; 
   var C2 = -B1*x0 + A1*y0; 
   var det = A1*A1 - -B1*B1; 
   var cx = 0; 
   var cy = 0; 
   if(det != 0) { 
      cx = (A1*C1 - B1*C2)/det; 
      cy = (A1*C2 - -B1*C1)/det; 
      var minx = (lx1 < lx2) ? lx1 : lx2;
      var maxx = (lx1 > lx2) ? lx1 : lx2;
      var miny = (ly1 < ly2) ? ly1 : ly2;
      var maxy = (ly1 > ly2) ? ly1 : ly2;
      if(!(cx >= minx && cx <= maxx))
         cx = 0;
      if(!(cy >= miny && cy <= maxy))
         cy = 0;
   }
   
   return vec2(cx, cy); 
}

function ElementStream(e) {
   if(typeof e === "string")  e = document.getElementById(e);
   this.e = e;
   this.buffer = "";
 }

 ElementStream.prototype.write = function(a) {
   this.buffer += a;
 };
 
 ElementStream.prototype.writeln = function() {
   this.buffer += Array.protoype.join.call(arguments, "")+"\n";
 };
 
 ElementStream.prototype.close = function() {
   this.e.innerHTML = this.buffer;
   this.buffer = "";
 };

 function setStart() {
   start = true;
 }

function createObject()
{
   var ball = new Object();
   ball.rect.setRect(0, 0, 20, 20);
   ball.position = vec2(512, 360);
   ball.tag = "ball";
   ball.radius = 12.5;
   ball.color = vec4(151 / 255, 222 / 255, 206 / 255, 1);
   objectList.push(ball);

   var bar = new Object();
   bar.rect.setRect(0, 0, 150, 25);
   bar.position = vec2(512, 620);
   bar.tag = "bar";
   bar.color = vec4(98 / 255, 182 / 255, 183 / 255, 1)
   objectList.push(bar);

   for(var i = 0; i < 6; ++i) {
      for(var j = 0; j < 16; ++j) {
         var brick = new Object();
         brick.rect.setRect(0, 0, 64, 40);
         brick.position = vec2(32 + j * 64, 100 + i * 40);
         brick.tag = "brick";
         brick.color = vec4(0, 173 / 255, 181 / 255, 1);
         objectList.push(brick);
      }
   }
}

window.onload = function init() {
   canvas = document.getElementById( "gl-canvas" );
   
   gl = WebGLUtils.setupWebGL( canvas );
   if ( !gl ) { alert( "WebGL isn't available" ); }

   gl.viewport( 0, 0, canvas.width, canvas.height );
   gl.clearColor( 0.9, 0.9, 0.9, 1 );

   gl.enable(gl.DEPTH_TEST);

   program = initShaders( gl, "vertex-shader", "fragment-shader" );
   gl.useProgram( program );
   
   shapeColor = gl.getUniformLocation(program, "fColor");
   
   createObject();

   for(var obj of objectList) {
      if (obj.tag == "ball")
         var points = obj.getCircle();
      else
         var points = obj.getRectPosition();

      for(var p of points) {
         pointsArray.push(wc2cc(p));
      }
   }

   vBuffer = gl.createBuffer();
   gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
   gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.DYNAMIC_DRAW );
   
   var vPosition = gl.getAttribLocation( program, "vPosition");
   gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(vPosition);

   canvas.addEventListener("mousemove", function(event) {
      var rect = event.target.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      barUpdate(vec2(x, y));
   });

   canvas.addEventListener("click", setStart);

   gameLoop();
}

function ballUpdate( deltaTime ) {
   if (!start) return;

   var ball = objectList[0];

   var moveDir = vec2(ball.moveDir[0] * 600 * deltaTime, 
      ball.moveDir[1] * 600 * deltaTime);

   ball.position[0] += moveDir[0];
   ball.position[1] += moveDir[1];

   if(ball.position[0] > 1024 - ball.radius) {
      ball.position[0] = 1024 - ball.radius;
      ball.moveDir[0] *= -1;
   }
   else if(ball.position[0] < ball.radius) {
      ball.position[0] = ball.radius;
      ball.moveDir[0] *= -1;
   }

   if(ball.position[1] > 786 - ball.radius) {
      ball.position[1] = 786 - ball.radius;
      start = false;
      ++dropCount;
      
      var a = new ElementStream("message");
      a.write("You dropped a ball " + dropCount + " times!");
      a.close();
   }
   else if(ball.position[1] < ball.radius) {
      ball.position[1] = ball.radius;
      ball.moveDir[1] *= -1;
   }
}

function barUpdate( mousePos ) {
   var bar = objectList[1];
   bar.position[0] = mousePos[0];
   
   var barWidth = (bar.rect.right - bar.rect.left) / 2;
   if(bar.position[0] > 1024 - barWidth)
      bar.position[0] = 1024 - barWidth;
   else if(bar.position[0] < barWidth)
      bar.position[0] = barWidth;

   if(!start) {
      var ball = objectList[0];
      ball.position[0] = bar.position[0]
      ball.position[1] = bar.position[1] - ball.radius * 2;
   }
}

function update( deltaTime ) {
   ballUpdate(deltaTime);

   var ball = objectList[0];
   for(var i = 1; i < objectList.length; ++i) {
      var obj = objectList[i];
      if(obj.isDead) continue;

      var collision = ball.isCollision(obj);
      if (collision)
      {
         if(obj.tag == "bar") {
            var dir = subtract(ball.position, obj.position);
            ball.moveDir = normalize(dir);
         }
         else {
            switch (collision) {
               case 1: case 4:
                  ball.moveDir[1] *= -1;
                  obj.isDead = true;
                  break;
               case 2: case 3:
                  ball.moveDir[0] *= -1;
                  obj.isDead = true;
                  break;
            }
         }
         break;
      }
   }

   var deadCount = 0;
   for(var obj of objectList) {
      if(obj.isDead) {
         obj.position = vec2(-100, -100);
         ++deadCount;
      }
   }

   if(deadCount == 16 * 6) {
      var a = new ElementStream("message");
      a.write("Clear!");
      a.close();
      start = false;
      canvas.removeEventListener("click", setStart);
   }


   var i = 4;
   for(var obj of objectList) {
      var shape;
      if(obj.radius > 0)
         shape = obj.getCircle();
      else
         shape = obj.getRectPosition();

      var points = [];
      for (var s of shape) {
         points.push(wc2cc(s));
      }
   
      for(var p of points) {
         pointsArray[i] = p;
         ++i;
      }
   }
}

function render() {

   gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
   gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.DYNAMIC_DRAW );

   gl.uniform4f(shapeColor, 52 / 255, 77 / 255, 103 / 255, 1);
   gl.drawArrays(gl.LINE_LOOP, 0, 4);

   var i = 4;
   for(var obj of objectList) {
      var pointsSize = (obj.radius > 0) ? 20 : 4;
      gl.uniform4fv(shapeColor, obj.color);
      gl.drawArrays( gl.TRIANGLE_FAN, i, pointsSize );

      gl.uniform4f(shapeColor, 52 / 255, 77 / 255, 103 / 255, 1);
      gl.drawArrays( gl.LINE_LOOP, i, pointsSize );

      i += pointsSize;
   }
}

function gameLoop() {

   t2 = new Date()
   var fps = Math.floor(1000/(t2.valueOf()-t1.valueOf())+0.5);
   t1 = t2;

   update( 1 / fps );
   render();

   requestAnimFrame(gameLoop);
}