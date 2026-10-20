// Espíritus de los recuerdos olvidados del barrio.
// Llegan de noche a la librería. El ritual: escuchar → buscar (por la tarde) → ofrecer.
//
// - nombre: cómo se le llama mientras no recuerda quién es
// - nombreReal: el nombre que recuerda al final
// - primeraVisita: lo que cuenta la primera noche (después se desvanece)
// - regreso: lo que dice las noches siguientes, antes de que le ofrezcas algo
// - pide.bebida: ingredientes que debe llevar y los que no le gustan
// - pide.objeto: id del objeto que hay que encontrar en el barrio (ver CLUES en townLayout.js)
// - pistaBebida / pistaObjeto: lo que dice si no aciertas, para ayudarte
// - despedida: lo que cuenta cuando por fin recuerda
// Cada frase de una lista es una página del bocadillo.

export const SPIRITS = [
  {
    id: 'okiku',
    nombre: 'Espíritu',
    nombreReal: 'Señora Okiku',
    colores: { cuerpo: 0xb9a6e8, pelo: 0xe8e2f5, piel: 0xf2ecff },
    primeraVisita: [
      '…¿Dónde estoy?',
      'Aquí hay luz… como antes.',
      'Recuerdo unas manos llenas de papel… y un olor a lavanda.',
      'Tenía algo… algo pequeño que daba luz. Lo he perdido.',
      'Y al terminar el trabajo siempre tomaba algo caliente… y dulce.',
      'Quizá… si lo encuentras… pueda recordar quién soy.',
    ],
    regreso: ['Has vuelto a abrir…', '¿Has encontrado algo que me ayude a recordar?'],
    pide: {
      bebida: { quiere: ['te', 'miel'], evita: ['cafe', 'hielo'] },
      objeto: 'farolillo',
    },
    pistaBebida: ['Qué amable… pero no es el sabor que recuerdo.', 'Era un té… con algo dulce, como la miel.'],
    pistaObjeto: ['Mmm… no, no era esto.', 'Era de papel… y daba luz. Quizá esté en el barrio, cerca de la niebla.'],
    despedida: [
      'Este farolillo… ¡lo hice yo!',
      'Me llamo Okiku. Hacía los farolillos de papel para el festival del barrio.',
      'Cada verano los encendíamos para que el gran árbol no se durmiera…',
      'Pero aquella noche… el primer farolillo no se encendió. Y todo se llenó de niebla.',
      'Gracias por ayudarme a recordar. Ya puedo descansar.',
    ],
  },
];
