// Keyboard + mouse input, read once a frame. Movement is WASD or arrows;
// the mouse aims; click or Space fires; P pauses, M mutes, R restarts.
// Actions are edge-triggered bits the loop consumes with takeActions().
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

const KEY_MOVE = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;

  function onKeyDown(event) {
    if (event.code === 'Space') event.preventDefault();
    if (KEY_MOVE[event.code]) {
      keys.add(event.code);
      event.preventDefault();
    }
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyR') actions |= ACTION_RESTART;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  }
  function onMouseDown(event) {
    onMouseMove(event);
    mouseDown = true;
    actions |= ACTION_CONFIRM;
  }
  function onMouseUp() {
    mouseDown = false;
  }
  function onBlur() {
    keys.clear();
    mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', onBlur);

  return {
    /** Normalised movement vector from the held keys. */
    direction() {
      let x = 0;
      let y = 0;
      for (const code of keys) {
        const d = KEY_MOVE[code];
        if (d) {
          x += d[0];
          y += d[1];
        }
      }
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    /** Mouse position in canvas CSS pixels. */
    mouse() {
      return { x: mouseX, y: mouseY };
    },
    firing() {
      return mouseDown || keys.has('Space');
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
