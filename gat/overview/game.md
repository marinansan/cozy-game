# Visión del juego

> **Estado:** Borrador v1 · **Fecha:** 2026-10-18
> **Documentos relacionados:** `gat/narrative/*`, `gat/overview/prototype-plan.md`

---

## 1. Concepto

Juego *cozy* de gestión, exploración y construcción. Heredas la librería-cafetería de tu abuela en un barrio japonés que ha perdido su alma. De día atiendes a los vecinos, por la tarde exploras y reconstruyes el barrio, y de noche ayudas a los espíritus de los recuerdos olvidados. Cada recuerdo recuperado hace retroceder la niebla y devuelve la vida al barrio.

**Objetivo de la experiencia:** relajar la mente, sin presión ni fallos, con una historia que da ganas de seguir jugando.

**Referencias:** Animal Crossing, Cozy Grove, Stardew Valley, Coffee Talk, Studio Ghibli, la literatura *healing* coreana.

## 2. Contexto del proyecto

- **Desarrollo:** una sola persona sin experiencia previa, con *vibe coding* (Claude Code + ChatGPT).
- **Propósito:** proyecto personal y de aprendizaje. Si sale bien, publicarlo más adelante en Steam y en tiendas de apps.
- **Dedicación:** bastante tiempo, sin ser a tiempo completo.
- **Repositorio:** GitHub `marinansan/cozy-game`.

## 3. Tecnología y plataformas

| Aspecto | Decisión |
|---|---|
| Motor | **Phaser 3** (JavaScript, juego web) |
| Plataformas iniciales | Navegador en **PC y móvil** |
| Orientación | **Horizontal** (la misma pantalla en PC y móvil) |
| Publicación futura (opcional) | itch.io, Steam (empaquetado de escritorio), Android/iOS (Capacitor) |
| Rendimiento | Ligero para móviles normales: noche y estaciones con filtros de color, no con arte redibujado |

## 4. Perspectiva y arte

- **Vista cenital en 3/4** sobre cuadrícula recta (como Stardew Valley o Cozy Grove).
- **Pixel art "suave":** contornos suaves, paletas armónicas poco saturadas, luz ambiental. Ver `gat/narrative/world.md` §7.
- **Arte inicial:** imágenes generadas con ChatGPT y limpiadas con `tools/clean_art.py` (cuadrícula real de píxeles y colores limitados). Personaje provisional con formas.
- **Arte definitivo:** se rediseñará la librería y todo lo demás más adelante.
- **Paleta de colores común:** se definirá una paleta propia para lugares, personajes, objetos e interfaz. Toda imagen nueva se ajustará a ella con `tools/clean_art.py`, para que el juego tenga un estilo coherente.

## 5. Controles

| Acción | Móvil | PC |
|---|---|---|
| Moverse | Arrastrar el dedo: el personaje se desliza en esa dirección (joystick flotante) | Clic en un punto o teclado (WASD / flechas) |
| Interactuar | Tocar el personaje u objeto | Clic o tecla de acción |
| Construir | Arrastrar y soltar en la cuadrícula | Arrastrar con el ratón |
| Menús | Tarjetas y botones grandes, pensados para dedos | Los mismos |

## 6. Estructura del tiempo

- **Sin reloj que corra.** El día tiene tres fases y el jugador decide cuándo avanzar:
  - **Mañana** → termina al girar el cartel de "cerrado".
  - **Tarde** → termina al volver y abrir la librería de noche.
  - **Noche** → termina al irse a dormir y empieza un nuevo día.
- Cada mañana llegan de 3 a 5 clientes.
- **Las estaciones avanzan con la historia**: una estación termina al recuperar su recuerdo principal.

## 7. Bucle de juego

### Mañana: la cafetería
1. El cliente llega e insinúa lo que necesita ("Algo caliente, hoy hace frío…").
2. **Preparas la bebida** eligiendo 2 o 3 ingredientes en un menú visual, con una animación breve. Sin temporizadores.
3. **Eliges un libro** de la estantería; los libros tienen etiquetas (nostalgia, aventura, consuelo…).
4. Recompensa: **yenes** y **amistad** con el vecino. Si no aciertas del todo, recibes algo menos, pero nunca hay fallo.

### Tarde: el barrio
- Explorar las zonas abiertas, buscar pistas para los espíritus (con el gato como guía) y hablar con los vecinos.
- **Modo construcción:** cuadrícula visible, catálogo de elementos, colocar, girar y mover sin coste. Los edificios son prediseñados (casa tradicional, puesto de mercado, *sentō*, bancos, farolillos, plantas).
- Construir una casa en un solar atrae a un nuevo vecino.
- Desde otoño, el ayudante cubre la librería y puedes salir cuando quieras.

### Noche: los espíritus
- Ritual: **escuchar → buscar (al día siguiente) → ofrecer** la bebida y el libro u objeto adecuados.
- Recompensa: **recuerdos**, la niebla retrocede, una huella en el barrio y llega un vecino de día.
- Si te equivocas, el espíritu reacciona con cariño y da otra pista.

### Afluencia progresiva
- Al principio de la historia la librería está casi vacía: cada mañana vienen **3 personas** (2 clientes con "!" en momentos distintos y 1 visitante sin interacción).
- A medida que crece el barrio (etapas ligadas a los recuerdos recuperados) llega más gente: más clientes, más visitantes y llegadas más seguidas. Tabla en `src/data/cafe.js` (`NEIGHBORHOOD_STAGES`).
- Nunca hay cola: solo una persona en el mostrador cada vez. Solo se muestra el "!" de quien quiere hablar.

## 8. Recursos

| Recurso | Cómo se consigue | Para qué sirve |
|---|---|---|
| 🌙 **Recuerdos** | Ayudando a los espíritus | **Única forma** de hacer retroceder la niebla y desbloquear zonas y solares |
| 💴 **Yenes** | Atendiendo la cafetería | Construir y decorar el barrio y la librería |
| ❤️ **Amistad** | Atendiendo bien a cada vecino | Desbloquea sus conversaciones y su historia |

El **catálogo de construcción** crece con la historia: algunos recuerdos desbloquean objetos especiales.

## 9. Sistemas del juego

| Sistema | Prioridad para el prototipo |
|---|---|
| Movimiento y cámara (tocar/clic para caminar, teclado) | ✅ Sí |
| Interacción con personajes y objetos | ✅ Sí |
| Diálogos breves en burbujas | ✅ Sí |
| Cafetería: preparar bebida y elegir libro | ✅ Sí |
| Ciclo de fases del día | ✅ Sí |
| Ritual con los espíritus | ✅ Sí (1 espíritu) |
| Niebla y desbloqueo de zonas | ✅ Sí (1 zona) |
| Recursos (recuerdos, yenes, amistad) | ✅ Básico |
| Modo construcción y catálogo | ⏳ Después del prototipo |
| Vecinos que llegan y amistad | ⏳ Después |
| Inventario de libros y objetos | ⏳ Después |
| Libro del barrio (diario) | ⏳ Después |
| Estaciones y festivales | ⏳ Después |
| Gato compañero y ayudante | ⏳ Después |
| Guardado de partida | ⏳ Después |
| Música y sonido | ⏳ Después |

## 10. Preguntas abiertas

- ¿Huerto para cultivar ingredientes de la cafetería?
- Sistema de guardado (en el navegador, en la nube…).
- Música y sonido.
- Nombre del juego.
- Dirección de arte definitiva, rediseño de la librería y paleta de colores común.
