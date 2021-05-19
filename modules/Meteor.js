export class Meteor {
  constructor(game, player) {
    this.game = game;
    const r = Math.round(100 * Math.random());
    if (r <= this.game.aimAtPlayer) {
      this.position = {
        x: Math.round(player.position.x),
        y: Math.round(player.position.y)
      };
    } else {
      this.position = {
        x: Math.round((this.game.columns - 1) * Math.random()) + 1,
        y: Math.round((this.game.rows - 1) * Math.random()) + 1
      };
    }
    this.killDuration = 500;
  }

  spawn() {
    const element = document.createElement('div');
    element.classList.add('meteor');
    element.style.setProperty('--column', this.position.x);
    element.style.setProperty('--row', this.position.y);
    element.innerHTML = '<div class="body"></div>';
    this.game.container.appendChild(element);
    this.element = element;
    this.game.meteorCount++;
  }

  async fall() {
    const fallAnimation = this.element.querySelector('.body').animate([
      { transform: `translateY(calc(-1 * ${this.game.columns} * 100%)) rotate(0deg)`, opacity: '0' },
      { transform: `translateY(0) rotate(360deg)`, opacity: '.5' }
    ], {
      duration: this.game.fallDuration,
      fill: 'backwards',
      easing: 'linear'
    });
    setTimeout(() => this.element.classList.add('bigger'), 5 * this.game.fallDuration / 8);
    setTimeout(() => this.element.classList.add('biggest'), 7 * this.game.fallDuration / 8);
    return new Promise(resolve => fallAnimation.onfinish = resolve);
  }

  destroy() {
    this.element?.remove();
  }
}