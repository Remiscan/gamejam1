const players = [];

export default class Player {
  constructor(game) {
    this.game = game;
    this.position = {
      x: 0,
      y: 0
    };
    this.lives = 1;
  }

  spawn(column = Math.round(this.game.columns / 2), row = Math.round(this.game.rows / 2)) {
    this.id = Date.now();
    const element = document.createElement('div');
    element.classList.add('player');
    element.style.setProperty('--column', column);
    this.position.x = column;
    element.style.setProperty('--row', row);
    this.position.y = row;
    this.game.container.appendChild(element);
    this.element = element;
    players.push(this);
  }

  async moveTo(column, row) {
    if (this.lives <= 0) return;
    const newColumn = Math.max(1, Math.min(Math.round(column), this.game.columns));
    const newRow = Math.max(1, Math.min(Math.round(row), this.game.rows));
    this.element.style.setProperty('--column', newColumn);
    this.position.x = newColumn;
    this.element.style.setProperty('--row', newRow);
    this.position.y = newRow;
    window.dispatchEvent(new CustomEvent('moveto', { detail: {
      position: { x: newColumn, y: newRow },
      player: this
    } }));
    await new Promise(resolve => setTimeout(resolve, this.game.playerMoveDuration));
    return;
  }

  loseLife(id) {
    this.lives--;
    if (this.lives <= 0) this.die(id);
  }

  async die(id) {
    console.log(`Player ${this.id} dead`);
    this.element.classList.add('dead');

    if (id == this.game.id && players.filter(p => p.lives <= 0).length == players.length) {
      window.dispatchEvent(new Event('gameover'));
    }

    await new Promise(resolve => setTimeout(resolve, this.game.tombDuration));

    this.element?.remove();
    if (id != this.game.id) return;
    const k = players.findIndex(p => p.id == this.id);
    players.splice(k, 1);
  }

  static get all() {
    return players;
  }

  static resetAll() {
    return players.length = 0;
  }
}