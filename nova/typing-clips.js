// Loopable typing motion clips for the existing NOVA rig sampler.
// Values are local joint offsets in rig units and rotation degrees.
const frame = (time, left, right, head) => ({
  time,
  pose: {
    wrist_l: { x: 0, y: left, rotation: left * 8 },
    wrist_r: { x: 0, y: right, rotation: right * -8 },
    head: { x: 0, y: head, rotation: head * 2 }
  }
});
export const NOVA_TYPING_CLIPS = Object.freeze({
  chibi: {
    variant: 'chibi',
    frames: [
      frame(0, 0, 0, 0),
      frame(0.15, -2, 0, -0.4),
      frame(0.3, 0, -2, 0),
      frame(0.45, -2, 0, -0.4),
      frame(0.6, 0, 0, 0)
    ]
  },
  adult: {
    variant: 'adult',
    frames: [
      frame(0, 0, 0, 0),
      frame(0.2, -1, 0, -0.2),
      frame(0.4, 0, -1, 0),
      frame(0.6, -1, 0, -0.2),
      frame(0.8, 0, 0, 0)
    ]
  }
});
