# Plan del prototipo

> **Estado:** Borrador v1 · **Fecha:** 2026-10-18
> **Documentos relacionados:** `gat/overview/game.md`, `gat/narrative/quests.md`

---

## Objetivo

Comprobar que el corazón del juego funciona y resulta relajante: **un día completo** (mañana en la cafetería, tarde en el barrio y noche con un espíritu) y ver cómo **la niebla retrocede** al terminar.

**Reglas del prototipo**
- **Formas de colores en lugar de arte** (rectángulos y círculos). El arte llegará cuando el juego funcione.
- **Pasos pequeños:** cada paso termina con algo que se puede **ver y probar en el navegador**, en PC y en móvil.
- **Diseño para móvil desde el inicio:** horizontal, tocar para moverse, botones grandes.
- Cada paso se guarda en GitHub al terminar.

## Pasos

### Paso 0. Preparar el proyecto
- Crear el proyecto Phaser 3 con una herramienta de desarrollo web (Vite).
- Una pantalla horizontal que se adapta al tamaño de PC y móvil.
- Publicar automáticamente en una web (por ejemplo, GitHub Pages) para **probar en el móvil con un enlace**.
- ✅ *Se ve:* una pantalla de color con el texto "Hola, librería".

### Paso 1. Caminar por la librería
- Un interior sencillo sobre cuadrícula: paredes, mostrador, estantería y puerta.
- El personaje camina al tocar o hacer clic en el suelo, y con el teclado en PC. Choca con los muebles.
- ✅ *Se ve:* un cuadrado que pasea por la librería.

### Paso 2. Atender a un cliente
- Llega un cliente y dice una frase en una burbuja.
- Menú de bebida: elegir 2 o 3 ingredientes entre unos pocos (té verde, café, leche, miel).
- Menú de libro: elegir entre 3 libros con etiquetas.
- El cliente reacciona y te da yenes. Se muestra un contador de yenes.
- ✅ *Se ve:* un ciclo completo de servicio.

### Paso 3. Las fases del día
- Mañana (2 o 3 clientes) → cartel de "cerrado" → tarde → abrir de noche → dormir → nuevo día.
- Cambio de color de la pantalla en cada fase (cálido, dorado y azul noche).
- ✅ *Se ve:* un día completo que avanza cuando tú decides.

### Paso 4. El barrio por la tarde
- Salir por la puerta a una calle pequeña con una zona cubierta de niebla.
- Un objeto-pista escondido en la calle que se puede recoger.
- ✅ *Se ve:* exploración y recogida de un objeto.

### Paso 5. El primer espíritu
- De noche llega un espíritu (forma translúcida con brillo ámbar) y cuenta su recuerdo en fragmentos.
- Al día siguiente buscas la pista y, de noche, le ofreces la bebida y el objeto.
- Si te equivocas, te da otra pista. Si aciertas, se despide.
- ✅ *Se ve:* el ritual completo.

### Paso 6. La niebla retrocede
- Al despedirse el espíritu: +1 recuerdo y una animación de la niebla retirándose.
- Aparece una nueva zona con un banco antiguo (la huella del recuerdo).
- ✅ *Se ve:* el momento mágico que resume el juego.

## Después del prototipo

1. **Probar y ajustar:** ¿es relajante?, ¿se entiende?, ¿funciona bien en el móvil?
2. Sustituir las formas por **un pack de pixel art**.
3. Añadir sistemas por orden: guardado → modo construcción → vecinos y amistad → gato → Libro del barrio → estación de verano completa.
4. Primer objetivo grande: **la estación de verano jugable de principio a fin**.
