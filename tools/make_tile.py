"""Convierte una textura de suelo generada por IA en una pieza que se repite sin cortes.

- La reduce a su tamaño real de píxel (las imágenes de IA son "falso pixel art":
  cada píxel del dibujo ocupa varios píxeles de la imagen).
- Funde los bordes para que, al repetirla, no se note dónde empieza y acaba.
- Reduce los colores para que los píxeles queden nítidos y con una paleta limpia.

Uso:
    python3 tools/make_tile.py ENTRADA SALIDA --size 160 [--colors 32] [--blend 0.35]
"""
import argparse

import numpy as np
from PIL import Image


def make_seamless(pixels, blend):
    """Mezcla la imagen con una copia desplazada media pieza.

    La copia desplazada no tiene cortes en los bordes (los tiene en el centro), así que
    cerca de los bordes se usa la copia y en el centro la original."""
    alto, ancho = pixels.shape[:2]
    desplazada = np.roll(pixels, (alto // 2, ancho // 2), axis=(0, 1))

    def peso(n):
        # 0 en los bordes, 1 en el centro, con una transición suave de ancho "blend"
        t = np.minimum(np.arange(n) + 0.5, n - np.arange(n) - 0.5) / (n * blend / 2)
        return np.clip(t, 0, 1)

    w = np.minimum.outer(peso(alto), peso(ancho))[..., None]
    w = w * w * (3 - 2 * w)  # transición suave
    return pixels * w + desplazada * (1 - w)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('entrada')
    parser.add_argument('salida')
    parser.add_argument('--size', type=int, default=160, help='lado final en píxeles reales')
    parser.add_argument('--colors', type=int, default=32, help='número máximo de colores')
    parser.add_argument('--blend', type=float, default=0.35, help='parte de la pieza usada para fundir los bordes')
    args = parser.parse_args()

    original = Image.open(args.entrada).convert('RGB')
    pequena = original.resize((args.size, args.size), Image.Resampling.BOX)
    paleta = pequena.quantize(colors=args.colors, method=Image.Quantize.MEDIANCUT)

    sin_cortes = make_seamless(np.asarray(pequena, dtype=float), args.blend)
    resultado = Image.fromarray(sin_cortes.round().astype(np.uint8)).quantize(palette=paleta, dither=Image.Dither.NONE)
    resultado.convert('RGB').save(args.salida)
    print(f'{args.salida}: {args.size}x{args.size}, {args.colors} colores')


if __name__ == '__main__':
    main()
