import Params from './Params.js';

export default class Pond {
  constructor(options = {
    position: {
      x: 6,
      y: 4
    },
    size: {
      width: 3,
      height: 3
    }
  }) {
    this.position = {
      x: options.position.x,
      y: options.position.y
    };
    this.size = {
      width: options.size.width,
      height: options.size.height
    };
    this.cells = [];

    for (let column = this.position.x; column < this.position.x + this.size.width; column++) {
      for (let row = this.position.y; row < this.position.y + this.size.height; row++) {
        this.cells.push({ position: { x: column, y: row }, destroyed: false });
      }
    }
  }

  // Place the pond on the map
  spawn() {
    for (const cell of this.cells) {
      const tile = document.createElement('div');
      tile.classList.add('lava');
      tile.style.setProperty('--column', cell.position.x);
      tile.style.setProperty('--row', cell.position.y);

      if (cell.position.x == this.position.x)                             tile.classList.add('left');
      else if (cell.position.x == this.position.x + this.size.width - 1)  tile.classList.add('right');
      if (cell.position.y == this.position.y)                             tile.classList.add('top');
      else if (cell.position.y == this.position.y + this.size.height - 1) tile.classList.add('bottom');
      Params.container.appendChild(tile);
    }
  }
}