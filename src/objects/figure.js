// Figura provisional de personaje (sombra, cuerpo, cabeza y pelo).
// Se sustituirá por los sprites definitivos cuando tengamos el arte.
export function createFigure(scene, x, y, { cuerpo, pelo, piel = 0xf2d3b3 }) {
  return scene.add.container(x, y, [
    scene.add.ellipse(0, 0, 12, 5, 0x000000, 0.25),
    scene.add.rectangle(0, -7, 10, 12, cuerpo).setStrokeStyle(1, 0x2b2420, 0.6),
    scene.add.circle(0, -16, 5, piel).setStrokeStyle(1, 0x8a6a55),
    scene.add.rectangle(0, -20, 11, 4, pelo),
  ]);
}
