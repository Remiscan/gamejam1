import Params from './Params.js';


export default class Player {
  constructor(options = {
    position: {
      x: Math.round((Params.columns - 1) * Math.random()) + 1,
      y: Math.round((Params.rows - 1) * Math.random()) + 1
    },
    lives: 1
  }) {
    this.id = Date.now();
    this.position = {
      x: options.position.x,
      y: options.position.y
    };
    this.lives = options.lives;
    this.element = null;
    this.canMove = false;
    this.destroyed = false;
  }

  // Update the player's position
  updatePosition(column, row) {
    this.element?.style.setProperty('--column', column);
    this.position.x = column;
    this.element?.style.setProperty('--row', row);
    this.position.y = row;
  }

  // Place the player on the map
  spawn() {
    const element = document.createElement('div');
    element.classList.add('player');
    this.element = element;
    
    this.updatePosition(this.position.x, this.position.y);
    Params.container.appendChild(element);

    if (Params.log) console.log(`Player ${this.id} spawned`);
  }

  // Move the player to one of its neighbour cells
  async moveTo(column, row, duration) {
    if (this.lives <= 0) return;

    const newColumn = Math.max(1, Math.min(Math.round(column), Params.columns));
    const newRow = Math.max(1, Math.min(Math.round(row), Params.rows));

    //if (Params.log) console.log(`Player ${this.id} moved (column ${this.position.x} => ${newColumn}, row ${this.position.y} => ${newRow})`);

    this.updatePosition(newColumn, newRow);

    window.dispatchEvent(new CustomEvent('moveto', { detail: {
      position: { x: newColumn, y: newRow },
      player: this
    } }));

    await Params.wait(duration);
    this.canMove = false;
    return;
  }

  // Remove a life from the player
  loseLife(tombDuration) {
    this.lives--;
    if (Params.log) console.log(`Player ${this.id} lost a life (${this.lives} remaining)`);
    if (this.lives == 0) this.die(tombDuration);
  }

  // Kill the player
  async die(tombDuration) {
    if (Params.log) console.log(`Player ${this.id} died`);
    this.element.classList.add('dead');
    Params.playSound('ouch');

    await new Promise(resolve => setTimeout(resolve, tombDuration));
    
    this.element?.remove();
    this.destroyed = true;
    return;
  }
}