const bonusTypes = ['clone'];
const bonuses = [];

class Bonus {
  constructor(game) {
    this.game = game;
    const r = Math.round((bonusTypes.length - 1) * Math.random());
    this.type = bonusTypes[r];
    this.position = {
      x: 0,
      y: 0
    };
  }

  spawn(column, row) {
    this.id = bonuses.length;
    const element = document.createElement('div');
    element.classList.add('bonus', this.type);
    element.style.setProperty('--column', column);
    this.position.x = column;
    element.style.setProperty('--row', row);
    this.position.y = row;
    this.game.container.appendChild(element);
    this.element = element;
    bonuses.push(this);
  }

  destroy() {
    this.element?.remove();
    bonuses.splice(this.id, 1);
  }
}

export { bonuses, Bonus };