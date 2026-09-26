import * as THREE from "three";

// The mallet: a felt head on a wooden handle, living in the bowl's group so
// it leans with the bowl but does not spin with it. It rides the rim at an
// angle (the pointer's, usually), hovers above it, presses on it, and is
// laid down beside the bowl when nothing is holding it. Everything here is
// eased toward a target; nothing is animated on a timeline.

export function createMallet(bowl, { rest = 0.6, touch = matchMedia("(hover: none)").matches } = {}) {
  const object = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6f4a2e, roughness: 0.55, metalness: 0 });
  const felt = new THREE.MeshStandardMaterial({ color: 0x4a2f22, roughness: 0.95, metalness: 0 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.072, 28, 20), felt);
  head.scale.set(1, 0.86, 1);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.017, 0.46, 16), wood);
  object.add(head, handle);
  bowl.group.add(object);

  // on a phone there is no room beside the bowl, so it rests close to the rim
  const REST_LIFT = touch ? 0.12 : 0.09, REST_OUT = touch ? 0.13 : 0.27;
  const M = { theta: rest, lift: 0.16, out: 0.15, hitT: 9 };
  const target = { theta: rest, pressed: false, present: false };
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), q = new THREE.Quaternion();
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  function place(dt) {
    M.theta = wrap(M.theta + wrap(target.theta - M.theta) * Math.min(1, dt * 12));
    const hit = M.hitT < 0.12;
    const pressed = target.pressed || hit;
    const liftTo = !target.present ? REST_LIFT : pressed ? 0.028 : 0.15;
    const outTo = !target.present ? REST_OUT : pressed ? 0.045 : 0.15;
    M.lift += (liftTo - M.lift) * Math.min(1, dt * (hit ? 40 : 10));
    M.out += (outTo - M.out) * Math.min(1, dt * (hit ? 40 : 10));
    const R = bowl.rim.r + M.out;
    const y = bowl.rim.y + M.lift;
    head.position.set(Math.cos(M.theta) * R, y, Math.sin(M.theta) * R);
    // the handle leans outward and up from the head
    dir.set(Math.cos(M.theta), 0, Math.sin(M.theta)).multiplyScalar(0.9).addScaledVector(up, 0.44).normalize();
    handle.position.copy(head.position).addScaledVector(dir, 0.26);
    q.setFromUnitVectors(up, dir);
    handle.quaternion.copy(q);
    M.hitT += dt;
  }

  return {
    object, target, rest, place,
    /** the mallet comes down at this angle (the group's), right now */
    hit(thetaGroup) { target.theta = thetaGroup; M.hitT = 0; },
    /** back to where it is laid down */
    lay() { target.present = false; target.pressed = false; target.theta = rest; },
    get theta() { return M.theta; },
    get lift() { return M.lift; },
  };
}
