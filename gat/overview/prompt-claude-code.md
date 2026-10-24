# Prompt para Claude Code: el videojuego completo

> Copia todo lo que hay debajo de la línea en una sesión nueva de Claude Code (o úsalo como `CLAUDE.md`)
> para que entienda el juego antes de trabajar en él.
> Si algo de los documentos de `gat/narrative/` contradice este prompt, **manda este prompt**: es lo más reciente.

---

Eres mi compañero de desarrollo en un videojuego *cozy* que estoy creando sola, sin experiencia previa en programación (hago "vibe coding": tú escribes el código y yo pruebo y decido). Es un proyecto personal y de aprendizaje; si sale bien, quizá lo publique en Steam y en móviles. Háblame siempre en **español**, con explicaciones sencillas y sin jerga. Escribe también en español los comentarios del código y los textos del juego.

## 1. El juego en una frase

Heredas la **librería-cafetería de tu abuela** en un **pueblo rural japonés de montaña**, casi vacío y cubierto de niebla. De día atiendes a los pocos vecinos que quedan; por la tarde exploras el pueblo; de noche recibes a los **espíritus de los recuerdos olvidados**. Cada recuerdo que recuperas hace **retroceder la niebla**, enciende un farolillo y devuelve la vida al pueblo.

**Sensación que buscamos:** relajar la mente, sin presión ni fallos, con un misterio que da ganas de seguir. Referencias: Animal Crossing, Cozy Grove, Stardew Valley, Coffee Talk, Studio Ghibli y la literatura *healing* coreana (*Bienvenidos a la librería Hyunam-dong*).

**Reglas de tono (siempre):** cálido, sincero, melancólico pero esperanzador. Sin villanos, sin violencia, sin terror, sin muertes explícitas. **Nada se puede hacer mal**: si el jugador se equivoca, el juego responde con cariño y da otra pista. Nada se destruye: el pueblo se recupera.

## 2. La historia

- **El pasado:** cada verano el pueblo celebraba un **festival de farolillos** para mantener despierto al **espíritu guardián del gran árbol** del santuario. El **farolero**, un vecino mayor, encendía siempre el **primer farolillo**.
- **La noche de los farolillos apagados:** un año el farolero **no encendió** el primer farolillo (el porqué es un secreto que se revela poco a poco; aún está por decidir). El espíritu del árbol se durmió, subió la **niebla del olvido** y la gente fue olvidando el pueblo y marchándose sin saber por qué.
- **La abuela** nunca se fue: su librería fue la última luz encendida. Al morir deja una **carta repartida en fragmentos**, que el jugador irá encontrando en los recuerdos.
- **El presente:** el protagonista llega en tren, quemado tras años en Tokio, y hereda la librería.
- **El final:** reunidos todos los recuerdos, el festival vuelve a celebrarse; el farolero **enciende por fin el primer farolillo** y el gran árbol despierta y florece. Después, el juego sigue sin fin.
- **Tema:** ¿cómo empezar de nuevo sin olvidar lo que fuimos?
- **Estructura:** un año en cuatro estaciones (verano → otoño → invierno → primavera), una por capítulo.

**Reglas del mundo:** la niebla cubre lo que el pueblo ha olvidado y nadie puede entrar en ella; solo retrocede al recuperar un recuerdo. Los recuerdos toman forma de espíritus de noche, perdidos y sin nombre, nunca dan miedo. Solo pueden manifestarse en la librería. Solo el protagonista y el gato de la abuela los ven.

## 3. Personajes

- **Protagonista:** adulto joven (25–30), nombre y aspecto elegidos por el jugador, personalidad suave. Pasó los veranos de su infancia con la abuela en la librería.
- **La abuela (ausente):** cálida y testaruda; creía en el poder de un buen libro y una buena taza. Presente a través de la carta, los objetos del local y los recuerdos.
- **El farolero:** hombre mayor, algo más joven que la abuela, el único vecino que nunca se fue. Vive escondido tras una arboleda cerca del santuario, en una casa llena de farolillos apagados. Va a la cafetería por las mañanas, callado. Carga con la culpa. Habla poco y deja las frases a medias. Su arco: de la culpa al perdón.
- **El gato de la abuela:** negro, casi una silueta, ojos expresivos. No habla. Ve a los espíritus y guía hacia las pistas.
- **El ayudante (otoño):** un vecino que cuida el local para que el protagonista pueda salir.
- **El espíritu del gran árbol:** dormido; despierta un poco con cada recuerdo.
- **Espíritus de los recuerdos:** cada uno es una historia corta. El primero es **la señora Okiku**, que hacía los farolillos de papel del festival (pide **té verde con miel** y su **farolillo de papel**; está en `src/data/spirits.js`).
- **Clientes y vecinos:** Kenji, la señora Hana, Yui, Mori, Sora, Riku… (en `src/data/cafe.js`). Al cerrar cada recuerdo llega un vecino nuevo.

## 4. La librería-cafetería (el corazón del juego)

**Por fuera:** casa tradicional japonesa de madera oscura, de dos plantas, con tejado de tejas, una cortina **noren azul** con una taza dibujada en la puerta, plantas, farolillos y una pizarra. Junto a ella, **un pequeño huerto** donde el jugador empezará a cultivar. Está al sur del pueblo, cerca de la estación.

**Por dentro** (vista cenital 3/4; distribución en `src/data/libraryLayout.js` sobre la imagen `public/assets/libreria-interior.webp`):
- **Puerta de entrada** con el **cartel de abierto/cerrado**.
- **Estanterías de libros** al fondo, una estantería baja y dos expositores.
- **Banco junto a la ventana** con su lámpara.
- **La barra de la cafetería** con taburetes; detrás, la **zona del barista** (se entra por el hueco de la derecha). Solo desde ahí se puede atender.
- **Mesas** (dos redondas y una grande) con sillas donde los clientes se sientan.
- **Plantas** y **farolillos** por las paredes; de noche las lámparas se encienden en lavanda.
- **La cortina del fondo**, que sube a casa: ahí se va a **dormir** y empieza un nuevo día.

## 5. Cómo se juega

**El día avanza cuando el jugador decide (no hay reloj):**

1. **Mañana: la cafetería.**
   - Llegan clientes poco a poco; **nunca hay cola**: solo una persona en la barra cada vez. El ritmo es tranquilo.
   - Tipos: los que **piden en la barra** (bebida y/o comida), los que **miran libros** y te llaman con un **"!"** para que les recomiendes uno, los que **se sientan** un rato después, y **visitantes** que solo pasean (no se puede hablar con ellos). Solo se muestra el "!"; no hay más iconos.
   - **Atender:** se prepara la **bebida** eligiendo 2 o 3 ingredientes (té verde, café, leche, miel, hielo), después la **comida** (dorayaki, tarta de matcha, onigiri, sándwich de tamago) y el **libro**, cada uno con una etiqueta: nostalgia, aventura o consuelo.
   - El cliente reacciona con frases propias y paga **yenes**. Si no se acierta del todo, paga algo menos, pero nunca hay fallo.
   - **Afluencia progresiva:** al principio vienen 3 personas por mañana (2 clientes con "!" en momentos distintos y 1 visitante). Con cada recuerdo recuperado viene más gente (`NEIGHBORHOOD_STAGES`).
   - La mañana termina al **girar el cartel** de la puerta (pregunta Sí/No).
2. **Tarde: el pueblo.** Desde la puerta se elige **salir al pueblo** o **abrir de noche**. En el pueblo se explora, se buscan pistas para los espíritus y se recogen objetos. Al volver a la puerta de la librería, pregunta si quieres entrar.
3. **Noche: los espíritus.** La librería se vuelve azul y morada con lámparas lavanda. Un espíritu translúcido entra, se acerca a la barra y muestra un "!".
   - **Ritual: escuchar → buscar → ofrecer.** El espíritu cuenta fragmentos de su recuerdo; el jugador busca la pista en el pueblo y le ofrece la bebida adecuada y el objeto.
   - Si **ya llevas el objeto** la primera noche, lo nota y se queda: la misión se puede completar el primer día.
   - Si te equivocas, te da otra pista con cariño. Si aciertas, recuerda quién era, cuenta su historia y se despide.
   - Recompensa: **+1 recuerdo**, más gente en la librería y, al salir al pueblo, la **niebla se retira** de una zona con una animación de cámara y se **enciende un farolillo** del camino del festival.
   - La noche termina al ir a **dormir** por la cortina del fondo.

**Diálogos:** bocadillos con el texto escribiéndose letra a letra; se avanza con un toque o clic y una flecha ▼. Frases cortas; lo emotivo se insinúa. Las elecciones son de tono y no cambian la trama.

**Recursos:** 🌙 recuerdos (la única forma de abrir zonas), 💴 yenes (para construir y decorar más adelante) y ❤️ amistad con los vecinos (más adelante).

## 6. El pueblo

Vista **cenital 3/4** (como Stardew Valley), con el norte arriba. Distribución en `src/data/townLayout.js`, según el boceto `gat/overview/mapa-boceto-v6.png`:

- El pueblo crece de forma **orgánica**, sin barrios por tipo: casas, tiendas, agua y cultivos mezclados, con unas 40 viviendas (algunas con jardín) para que se note que allí vive o vivía gente.
- **El río** baja de la montaña con una **cascada** y cruza el pueblo en diagonal, entre muros de piedra, con un **paseo en cada orilla**, casas y tiendas mirando al agua y **cinco puentes** (el **puente rojo** es el principal).
- **La calle antigua** sube del puente rojo hasta el **torii** y las escaleras del **santuario**, en la montaña, junto al **gran árbol dormido**. La **casa del farolero** está cerca, escondida tras una arboleda, por un sendero aparte.
- **El camino de los farolillos:** 7 farolillos, del puente rojo al santuario; se enciende uno por cada recuerdo.
- Al sur, **la estación**, frente a la vía del tren; detrás de la vía, el bosque y el final del mapa.
- **Zonas (en el orden en que se abren):** 0 la estación y tu librería (abierta al empezar, con algunas casas habitadas) · 1 el paseo del río y el taller de farolillos de Okiku · 2 la calle antigua (tofu, sake…) · 3 la charca con cerezos y la escuela (sentō, casa de té, fideos) · 4 el cementerio, pequeño y tranquilo entre casas al pie de la montaña · 5 los campos de cultivo, con granja y molino · 6 el santuario y el farolero.
- Botón de **mapa** para ver el pueblo entero de lejos.

## 7. Estilo visual

- **Pixel art suave:** contornos suaves o sin negro, paleta armónica poco saturada (verdes salvia y musgo, beiges cálidos, agua turquesa apagada, piedra gris cálida) y luz ambiental. Ambiente Ghibli; inspiración en Shirakawa-go, Narai-juku y Ginzan Onsen.
- **Toda la vista es cenital 3/4**, interiores y exteriores. Nada isométrico.
- **El color cuenta la historia:** gris y niebla = olvido; verdes vivos y cálidos = alma recuperada; ámbar de farolillo sobre azul noche = los espíritus.
- **Mañana** cálida y suave; **tarde** dorada (más suave en el exterior); **noche** azul y morada con luces lavanda.
- **Espíritus:** figuras translúcidas con un halo lavanda, que flotan.
- **Arte:** imágenes de ChatGPT o Leonardo que se limpian con `tools/clean_art.py` (edificios y objetos) y `tools/make_tile.py` (texturas de suelo que se repiten sin cortes). Lo que aún no tiene arte se dibuja con bloques de colores provisionales. La **calidad de imagen es importante**: no la reduzcas ni la emborrones.

## 8. Tecnología y controles

- **Phaser 3 + Vite**, juego web, **horizontal**, para **PC y móvil**. Publicado con GitHub Pages en https://marinansan.github.io/cozy-game/ (se publica solo al subir a `main`).
- Vista lógica de 640×360 con zoom adaptable para que se vea nítido (`src/config.js`). La interfaz (bocadillos, botones, menús) es HTML sobre el juego (`src/ui/`).
- **Móvil:** arrastrar el dedo para moverse (joystick flotante) y botones grandes para actuar. **PC:** clic para caminar hasta un punto, WASD o flechas, y E/espacio para actuar. M abre el mapa.
- Estado compartido en `src/systems/GameState.js`. Escenas: `LibraryScene` (interior) y `TownScene` (pueblo).
- Documentos: `gat/overview/game.md` (visión), `gat/overview/prototype-plan.md` (plan) y `gat/narrative/` (historia, mundo, personajes, misiones y diálogo).

## 9. Estado actual y siguientes pasos

- **Hecho (prototipo completo):** caminar por la librería, atender clientes, las fases del día, el pueblo con niebla por zonas, el primer espíritu (Okiku) y la niebla que se retira con su farolillo.
- **Ahora:** cambiar el aspecto del pueblo con arte definitivo, empezando por las texturas del suelo (ya están la hierba y el suelo de bosque) y siguiendo por los edificios de la zona 0 (la librería por fuera, la estación, ultramarinos y las casas).
- **Después:** el resto de espíritus y vecinos por estación, el huerto, el modo construcción, la amistad, el gato, el Libro del barrio, el guardado de la partida, la música y la animación de introducción.
- **Pendiente de decidir:** los nombres (el juego, el pueblo, la abuela, el farolero, el gato), qué le pasó al farolero, el texto de la carta y el secreto del gato.

## 10. Cómo trabajar conmigo

- Antes de cambios grandes (mapa, historia, estilo), **propón primero** (con un boceto si es visual) y espera mi visto bueno.
- Trabaja en **pasos pequeños** que pueda ver y probar en el navegador. Pruébalo tú antes (hay Playwright) y enséñame capturas.
- Explícame las cosas de forma sencilla y dime con claridad si algo no ha salido bien.
- Junta los cambios y súbelos a GitHub (`main`) al terminar cada bloque, no en cada pequeño ajuste.
- Respeta las decisiones ya tomadas (vista 3/4, sin colas, solo el "!", ritmo tranquilo, nada de fallos) salvo que yo diga lo contrario.
