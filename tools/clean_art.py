"""Limpia una imagen de "falso pixel art" (p. ej. generada por IA) para el juego.

- Recorta el espacio vacío alrededor (con --trim, para imágenes con fondo transparente).
- La reduce al tamaño exacto que usa el juego (cuadrícula real de píxeles).
- Reduce el número de colores para que todo comparta un estilo coherente.
- Deja los bordes transparentes nítidos (sin semitransparencias borrosas).

Uso:
    python3 tools/clean_art.py ENTRADA SALIDA --size 640x360 [--colors 64]
    python3 tools/clean_art.py ENTRADA SALIDA --scale 0.16 --trim [--colors 96]
"""
import argparse

from PIL import Image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('entrada')
    parser.add_argument('salida')
    parser.add_argument('--size', help='ancho x alto final, p. ej. 640x360')
    parser.add_argument('--scale', type=float, help='escala en lugar de tamaño, p. ej. 0.16')
    parser.add_argument('--trim', action='store_true', help='recorta el espacio transparente de alrededor')
    parser.add_argument('--colors', type=int, default=64, help='número máximo de colores (0 = sin límite)')
    args = parser.parse_args()

    imagen = Image.open(args.entrada).convert('RGBA')
    if args.trim:
        caja = imagen.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox()
        imagen = imagen.crop(caja)
        print(f'Recorte: {caja}')

    if args.size:
        ancho, alto = (int(v) for v in args.size.lower().split('x'))
    elif args.scale:
        ancho, alto = round(imagen.width * args.scale), round(imagen.height * args.scale)
    else:
        parser.error('indica --size o --scale')
    imagen = imagen.resize((ancho, alto), Image.Resampling.BOX)

    # Transparencia de todo o nada: un píxel es visible o no lo es
    alfa = imagen.getchannel('A').point(lambda v: 255 if v > 128 else 0)
    if args.colors:
        rgb = imagen.convert('RGB').quantize(colors=args.colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        imagen = rgb.convert('RGBA')
    imagen.putalpha(alfa)

    imagen.save(args.salida)
    print(f'Guardado {args.salida} ({ancho}x{alto}, {args.colors or "todos los"} colores)')


if __name__ == '__main__':
    main()
