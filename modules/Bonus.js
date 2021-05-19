import Params from './Params.js';

const bonusTypes = ['clone'];

export default class Bonus {
  constructor(options = {
    type: bonusTypes[Math.round((bonusTypes.length - 1) * Math.random())],
    position: {
      x: 1,
      y: 1
    }
  }) {
    this.type = bonusTypes[Math.round((bonusTypes.length - 1) * Math.random())];
    this.position = {
      x: options.position.x,
      y: options.position.y
    };
    this.used = false;
    this.destroyed = false;
  }

  spawn() {
    const element = document.createElement('div');
    element.classList.add('bonus', this.type);
    element.style.setProperty('--column', this.position.x);
    element.style.setProperty('--row', this.position.y);
    Params.container.appendChild(element);
    this.element = element;

    if (Params.log) console.log(`Bonus (${this.type}) created`);
  }

  destroy() {
    this.element?.remove();
    this.destroyed = true;
  }
}