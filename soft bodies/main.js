let canvas;
let context;
let origin;
let debug = false;
let gridBody;
let blobBody;
let paused = false;

let selectedNode;
let mousePosition = [0, 0];

const groundLevel = 100;
let GRAVITY_FORCE;
let FRICTION;

const softBodies = [];

const draw = (now) => {
  context.fillStyle = 'black';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'saddleBrown';
  context.fillRect(0, canvas.height - groundLevel, canvas.width, groundLevel);
  for(let c = 0; c < softBodies.length; ++c)
    softBodies[c].draw(context);
};

const update = (dt) => {
  if(paused)
    return;
  for(let c = 0; c < softBodies.length; ++c)
    softBodies[c].update(dt);
};

let lastTime = 0;
let accumulator = 0;

const frame = () => {
  const now = Date.now().valueOf();
  let dt = (now - lastTime) / 1000;

  lastTime = now;

  const step = .005;

  if(dt >= step*8) {
    dt = 0;
    console.log('throttle');
  }

  accumulator += dt;

  while(accumulator >= step){
    update(step);
    accumulator -= step;
  } 
  
  draw(now);

  requestAnimationFrame(frame);
};

const getSpringValues = (name) => {
  const restLength = Number(document.querySelector(`#${name}RestLength`).value);
  const k = Number(document.querySelector(`#${name}k`).value);
  const damping = Number(document.querySelector(`#${name}Damping`).value);

  return {restLength, k, damping};
};

const resetBodies = () => {
  gridBody.reset(canvas.width / 3, canvas.height / 2, 7, 7, getSpringValues("grid"));
  blobBody.reset(2 * canvas.width / 3, canvas.height / 2, 64, getSpringValues("blob"));
};

const resetSprings = () => {
  gridBody.resetSpring(getSpringValues("grid"));
  blobBody.resetSpring(getSpringValues("blob"));
};

window.onload = () => {
  canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  origin = [canvas.width / 2, canvas.height / 2];
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    origin = [canvas.width / 2, canvas.height / 2];
  });
  document.body.appendChild(canvas);
  context = canvas.getContext('2d');

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const clickPoint = [e.clientX, e.clientY];    
    for(let c = 0; c < softBodies.length; ++c) {
      const node = softBodies[c].raycast(clickPoint[0], clickPoint[1]);
      if(node) {
        if(e.button === 0) {
          selectedNode = node;
          node.selected = true;
        }
        else if(e.button === 2)
          node.anchored = !node.anchored;
        break;
      }
    }
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  canvas.addEventListener('mouseup', (e) => {
    e.preventDefault();
    if(e.button === 0){
      if(selectedNode)
        selectedNode.selected = false;
      selectedNode = undefined;
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    mousePosition = [e.clientX, e.clientY];
    if(selectedNode)
      selectedNode.position = [e.clientX, e.clientY];
  });

  window.addEventListener('keydown', (e) => {
    if(e.repeat)
      return;
    if(e.key === 'd') {
      resetBodies();
    }
    if(e.key === 'p') {
      paused = !paused;
      document.querySelector("#pause").checked = paused;
    }
  });

  gridBody = new GridBody();
  softBodies.push(gridBody);

  blobBody = new BlobBody();
  softBodies.push(blobBody);

  resetBodies();

  const gridInputs = document.querySelectorAll("input[type=range]");
  Object.values(gridInputs).forEach((elem) => {
    elem.onchange = resetSprings;
  });

  const gravSlider = document.querySelector("#gravity");
  GRAVITY_FORCE = Number(gravSlider.value);
  gravSlider.onchange = () => GRAVITY_FORCE = Number(gravSlider.value);

  const frictionSlider = document.querySelector("#friction");
  FRICTION = Number(frictionSlider.value);
  frictionSlider.onchange = () => FRICTION = Number(frictionSlider.value);

  const pauseBox = document.querySelector("#pause");
  pauseBox.onchange = () => {
    paused = pauseBox.checked;
  };

  document.querySelector("#reset").onclick = resetBodies;

  lastTime = Date.now();
  requestAnimationFrame(frame);
};