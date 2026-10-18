"""Limpia una imagen de "falso pixel art" (p. ej. generada por IA) para el juego.

- La reduce al tamaño exacto que usa el juego (cuadrícula real de píxeles).
- Reduce el número de colores para que todo comparta un estilo coherente.

Uso:
    python3 tools/clean_art.py ENTRADA SALIDA --size 640x360 [--colors 64]
"""
import argparse

from PIL import Image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('entrada')
    parser.add_argument('salida')
    parser.add_argument('--size', required=True, help='ancho x alto, p. ej. 640x360')
    parser.add_argument('--colors', type=int, default=64, help='número máximo de colores (0 = sin límite)')
    args = parser.parse_args()

    ancho, alto = (int(v) for v in args.size.lower().split('x'))
    imagen = Image.open(args.entrada).convert('RGBA')
    imagen = imagen.resize((ancho, alto), Image.Resampling.BOX)

    if args.colors:
        alfa = imagen.getchannel('A')
        rgb = imagen.convert('RGB').quantize(colors=args.colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        imagen = rgb.convert('RGBA')
        imagen.putalpha(alfa)

    imagen.save(args.salida)
    print(f'Guardado {args.salida} ({ancho}x{alto}, {args.colors or "todos los"} colores)')


if __name__ == '__main__':
    main()
