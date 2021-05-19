import Params from './Params.js';

export default class Meteor {
  constructor(options = {
    position: {
      x: Math.round((Params.columns - 1) * Math.random()) + 1,
      y: Math.round((Params.rows - 1) * Math.random()) + 1
    }
  }) {
    this.position = {
      x: options.position.x,
      y: options.position.y
    }

    // Duration of the mortal effect of meteors after crashing
    this.killDuration = 500;
    this.destroyed = false;
  }

  spawn() {
    const element = document.createElement('div');
    element.classList.add('meteor');
    element.style.setProperty('--column', this.position.x);
    element.style.setProperty('--row', this.position.y);
    element.innerHTML = '<div class="body"></div>';
    Params.container.appendChild(element);
    this.element = element;

    //if (Params.log) console.log(`Meteor falling towards (x: ${this.position.x}, y: ${this.position.y})`);
  }

  fall(duration) {
    const fallAnimation = this.element.querySelector('.body').animate([
      { transform: `translateY(calc(-1 * ${Params.rows} * 100%)) rotate(0deg)`, opacity: '.5' },
      { transform: `translateY(0) rotate(360deg)`, opacity: '.5' }
    ], {
      duration: duration,
      fill: 'backwards',
      easing: 'linear'
    });
    setTimeout(() => this.element.classList.add('bigger'), 4 * duration / 8);
    setTimeout(() => this.element.classList.add('biggest'), 6 * duration / 8);
    return Params.wait(fallAnimation);
  }

  destroy() {
    this.element?.remove();
    this.destroyed = true;
  }
}