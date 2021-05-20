import Params from './Params.js';


const decorationTypes = 2;

export default class Decoration {
  constructor(options = {
    position: {
      x: Math.round((Params.columns - 1) * Math.random()) + 1,
      y: Math.round((Params.rows - 1) * Math.random()) + 1
    }
  }) {
    this.position = {
      x: options.position.x,
      y: options.position.y
    };
    this.type = Math.round((decorationTypes - 1) * Math.random()) + 1;
  }

  // Place the decoration on the map
  spawn() {
    const element = document.createElement('div');
    element.classList.add('deco');
    element.classList.add(`deco${this.type}`);
    element.style.setProperty('--column', this.position.x);
    element.style.setProperty('--row',this.position.y);
    Params.container.appendChild(element);
  }
}