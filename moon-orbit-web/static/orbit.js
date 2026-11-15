const element = (id) => document.getElementById(id);
const canvas = element("orbit");
const context = canvas.getContext("2d");
const dateInput = element("date");
const playButton = element("play");
const speed = element("speed");
const status = element("status");
const distanceFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

let date = dateInput.value;
let seconds = 0;
let model;
let trail = [];
let playing = false;
let generation = 0;
let timer;
let yaw = 0;
let pitch = 0.55;
let pointer;

function render() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const density = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * density);
  canvas.height = Math.round(height * density);
  context.setTransform(density, 0, 0, density, 0, 0);
  if (!model) return;

  const scale = Math.min(width, height) / 2.65;
  function project([x, y, z]) {
    const side = x * Math.cos(yaw) - y * Math.sin(yaw);
    const forward = x * Math.sin(yaw) + y * Math.cos(yaw);
    const up = z * Math.cos(pitch) + forward * Math.sin(pitch);
    const depth = forward * Math.cos(pitch) - z * Math.sin(pitch);
    return { x: width / 2 + side * scale, y: height / 2 - up * scale, depth };
  }

  function line(points, color) {
    context.beginPath();
    for (const [index, point] of points.entries()) {
      const {x, y} = project(point);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = color;
    context.stroke();
  }

  const sun = [0, 0, 0];
  line(trail, "#478da4");
  line([sun, model.earth], "#cab66c");
  line([sun, model.moon], "#ba8858");
  line([model.earth, model.moon], "#7bcde9");

  const bodies = [
    { ...project(sun), name: "Sun", color: "#ffc247", radius: 0.09 },
    { ...project(model.earth), name: "Earth", color: "#62d6ff", radius: 0.03 },
    { ...project(model.moon), name: "Moon", color: "#e5eaf2", radius: 0.012 },
  ];
  bodies.sort((a, b) => a.depth - b.depth);
  for (const { x, y, name, color, radius } of bodies) {
    const size = Math.max(3, radius * scale);
    const fill = context.createRadialGradient(x - size / 3, y - size / 3, 0, x, y, size);
    fill.addColorStop(0, "#ffffff");
    fill.addColorStop(0.42, color);
    fill.addColorStop(1, name === "Sun" ? "#cd720a" : "#63738a");
    context.fillStyle = fill;
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = color;
    context.font = "13px system-ui";
    context.fillText(name, x + size + 5, y + (name === "Moon" ? 16 : -6));
  }
}

function stop() {
  playing = false;
  clearTimeout(timer);
  playButton.textContent = "Play";
}

async function update(nextSeconds, token) {
  try {
    const query = new URLSearchParams({ date, seconds: nextSeconds });
    const response = await fetch("/api/orbit?" + query);
    if (!response.ok) throw new Error("Orbit request failed");
    const result = await response.json();
    if (token !== generation) return;

    model = result;
    seconds = nextSeconds;
    trail.push(model.earth);
    if (trail.length > 4000) trail.shift();
    element("time").textContent = model.time;
    element("eccentricity").textContent = model.eccentricity.toFixed(4);
    ["sun-earth", "earth-moon", "sun-moon"].forEach((id, index) => {
      element(id).textContent = distanceFormat.format(model.distances[index]) + " km";
    });
    status.textContent = model.finished ? "Date limit reached. Choose an earlier date to resume." : "";
    playButton.disabled = model.finished;
    render();
    if (model.finished) stop();
    if (playing) queueFrame(token);
  } catch {
    if (token !== generation) return;
    stop();
    status.textContent = "Could not load orbit data. Select Apply to retry.";
  }
}

function queueFrame(token) {
  timer = setTimeout(() => update(seconds + Math.round(Number(speed.value) * 8640), token), 100);
}

playButton.addEventListener("click", () => {
  generation += 1;
  if (playing) {
    stop();
    return;
  }
  playing = true;
  playButton.textContent = "Pause";
  queueFrame(generation);
});

element("date-form").addEventListener("submit", (event) => {
  event.preventDefault();
  stop();
  date = dateInput.value;
  trail = [];
  playButton.disabled = true;
  status.textContent = "Loading simulation…";
  update(0, ++generation);
});

speed.addEventListener("input", () => {
  element("speed-value").value = Number(speed.value).toFixed(1) + "×";
});

function rotate(dx, dy) {
  yaw += dx;
  pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch + dy));
  render();
}

canvas.addEventListener("pointerdown", (event) => {
  pointer = event.pointerId;
  canvas.setPointerCapture(pointer);
});
canvas.addEventListener("pointermove", (event) => {
  if (event.pointerId === pointer) rotate(event.movementX / 160, event.movementY / 160);
});
canvas.addEventListener("lostpointercapture", () => { pointer = undefined; });
canvas.addEventListener("keydown", (event) => {
  const direction = {
    ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0],
    ArrowUp: [0, -0.1], ArrowDown: [0, 0.1],
  }[event.key];
  if (!direction) return;
  event.preventDefault();
  rotate(...direction);
});
new ResizeObserver(render).observe(canvas);
update(0, generation);
