import Params from './Params.js';
import Player from './Player.js';
import Meteor from './Meteor.js';
import Bonus from './Bonus.js';
import Decoration from './Decoration.js';
import Pond from './Pond.js';


const keys = {
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  left: ['ArrowLeft'],
  right: ['ArrowRight']
};
let activeGame;


export class Game {
  constructor() {
    this.id = Date.now();
    activeGame = this.id;

    this.players = [];
    this.bonuses = [];
    this.meteors = [];
    this.ponds = [];
    this.meteorCount = 0;

    this.score = 0;
    this.bestScore = Number(localStorage.getItem('boole-best-score')) || 0;
    
    this.moving = false;
    this.over = false;
  }


  /*****************************************
  ***** GAME PARAMETERS ********************
  ******************************************/

  // Time it takes for a player to move from a cell to its neighbour (ms)
  get playerMoveDuration() {
    return 100;
  }

  // Time to wait between spawning meteors (ms)
  get timeBetweenMeteors() {
    const jmax = 100;
    let i = 11;
    for (let j = 11; j < jmax; j = j + 5) {
      if (this.meteorCount < i) return 10000 / j;
      i = i + j;
    }
    return 10000 / jmax;
  }

  // Duration of a meteor fall (ms)
  get fallDuration() {
    const jmax = 100;
    let i = 4;
    for (let j = 4; j < jmax; j++) {
      if (this.meteorCount < i) return Math.max(5000 - 1000 * Math.floor((j - 3) / 3), 2000);
      i = i + j;
    }
    return 2000;
  }

  // Probability of a meteor to generate on a player (%)
  get aimAtPlayer() {
    const jmax = 100;
    let i = 4;
    for (let j = 4; j < jmax; j++) {
      if (this.meteorCount < i) return Math.max(70 - Math.floor((j - 11) / 2) * 5, 50);
      i = i + j;
    }
    return 50;
  }

  // Duration of a bonus on the map (ms)
  get bonusDuration() {
    return 10000;
  }

  // Probability of spawning a bonus (%)
  get bonusChance() {
    return 5;
  }

  // Duration of the tomb on the map after death (ms)
  get tombDuration() {
    return 5000;
  }


  /*****************************************
  ***** GAME METHODS ***********************
  ******************************************/

  // Start the game
  async start() {
    if (Params.log) console.log(`--- NEW GAME (${this.id}) ---`);
    document.querySelector('.title-screen').classList.add('off');

    // Remove elements from previous game
    Params.container.innerHTML = '';

    // Display score
    const scoreElements = document.querySelectorAll('.score');
    scoreElements.forEach(e => e.innerHTML = 0);

    // Detect key presses to move players
    window.addEventListener('gameover', this.gameOver.bind(this));
    window.addEventListener('keydown', this.detectKeys.bind(this));

    // Place decorations
    const decorationsNumber = 4;
    for (let i = 0; i < decorationsNumber; i++) {
      const decoration = new Decoration();
      decoration.spawn();
    }

    // Place ponds
    const pond = new Pond();
    this.ponds = [...this.ponds, ...pond.cells];
    console.log(this.ponds);
    pond.spawn();

    // Spawn the first player
    const cell = this.getEmptyCell();
    this.createPlayer({ position: { x: cell.x, y: cell.y }, lives: 1 });

    // Spawns meteors
    while (this.check('meteor spawn loop')) {
      let r = Math.round((this.alivePlayers.length - 1) * Math.random());
      const player = this.alivePlayers[r];

      r = Math.round(100 * Math.random());
      let rx, ry;
      if (r <= this.aimAtPlayer) {
        rx = Math.round(player?.position.x || 0);
        ry = Math.round(player?.position.y || 0);
      } else {
        rx = Math.round((Params.columns - 1) * Math.random()) + 1;
        ry = Math.round((Params.rows - 1) * Math.random()) + 1;
      }

      this.createMeteor({ position: { x: rx, y: ry } });
      await Params.wait(this.timeBetweenMeteors);
    }
  }

  // Create a new player
  createPlayer(options) {
    const player = new Player(options);
    this.players.push(player);
    player.spawn();
  }

  // Get alive players
  get alivePlayers() {
    return this.players.filter(p => p.lives > 0);
  }

  // Create a new meteor
  async createMeteor(options) {
    if (!this.check('createMeteor')) return;

    const meteor = new Meteor(options);
    this.meteorCount++;
    meteor.spawn();
    await meteor.fall(this.fallDuration);

    if (!this.check('meteor kill zone')) return;

    let gameOver = false;
    window.addEventListener('gameover', event => {
      if (event.detail.game == Game.current) {
        gameOver = true;
      }
    });

    // Kill the player crushed by the meteor
    const playersAlreadyThere = this.players.filter(p => p.position.x == meteor.position.x && p.position.y == meteor.position.y);
    for (const player of playersAlreadyThere) {
      if (!this.check('crush player')) return;
      player.loseLife(this.tombDuration);
      if (this.alivePlayers.length <= 0) window.dispatchEvent(new CustomEvent('gameover', { detail: { game: this.id }}));
    }

    // Kill players who enter the meteor cell during its kill duration
    const killPlayer = event => {
      if (!this.check('kill wandering player')) return;
      if (event.detail.position.x == meteor.position.x && event.detail.position.y == meteor.position.y) {
        event.detail.player.loseLife(this.tombDuration);
        if (this.alivePlayers.length <= 0) window.dispatchEvent(new CustomEvent('gameover', { detail: { game: this.id }}));
      }
    };
    window.addEventListener('moveto', killPlayer);
    await Params.wait(meteor.killDuration);

    // Remove the meteor after its kill duration
    window.removeEventListener('moveto', killPlayer);
    meteor.destroy();
    this.updateElements();

    // If all players are dead, game over
    if (gameOver) return;
    if (!this.check('everyone dead')) return;
    
    // Bump the score
    this.bumpScore();

    // Spawn a bonus in the meteor's place
    const r = Math.round(100 * Math.random());
    if (r <= this.bonusChance) this.createBonus(meteor);
  }

  // Create a bonus
  async createBonus(meteor) {
    if (!this.check('createBonus')) return;

    // Don't create a bonus if the boulder fell in a pond or on another bonus
    const cellAreadyOccupied =  ([...this.bonuses, ...this.ponds]
                                .filter(b => b.position.x == meteor.position.x && b.position.y == meteor.position.y &&!b.destroyed)
                                .length) > 0;
    if (cellAreadyOccupied) return;

    const bonus = new Bonus({ position: { x: meteor.position.x, y: meteor.position.y } });
    bonus.spawn();

    const buffPlayers = event => {
      if (bonus.used) return;
      if (event.detail.position.x != bonus.position.x || event.detail.position.y != bonus.position.y) return;

      bonus.used = true;
      Params.playSound('bonus');
      bonus.destroy();
      this.updateElements();

      if (bonus.type == 'clone') {
        const cell = this.getEmptyCell();
        this.createPlayer({ position: { x: cell.x, y: cell.y }, lives: event.detail.player.lives });
      }
    }
    window.addEventListener('moveto', buffPlayers);
    await new Promise(resolve => setTimeout(resolve, this.bonusDuration));

    // Remove bonus after its on-map duration
    window.removeEventListener('moveto', buffPlayers);
    bonus.destroy();
    this.updateElements();
  }

  // Get empty cells
  get emptyCells() {
    const emptyCells = [];

    const currentElements = [
      ...this.players.filter(p => !p.destroyed),
      ...this.bonuses.filter(b => !b.destroyed),
      ...this.meteors.filter(m => !m.destroyed),
      ...this.ponds
    ];

    for (let column = 1; column < Params.columns; column++) {
      for (let row = 1; row < Params.rows; row++) {
        if (currentElements.filter(e => e.position.x == column && e.position.y == row).length > 0) {
          continue;
        } else {
          emptyCells.push({ x: column, y: row });
        }
      }
    }

    return emptyCells;
  }

  // Get a random empty cell
  getEmptyCell() {
    const emptyCells = this.emptyCells;
    const r = Math.round((emptyCells.length - 1) * Math.random());
    return emptyCells[r];
  }

  // Update the list of game elements
  updateElements() {
    this.players = this.players.filter(p => !p.destroyed);
    this.bonuses = this.bonuses.filter(b => !b.destroyed);
    this.meteors = this.meteors.filter(m => !m.destroyed);
  }

  // Bump the score
  bumpScore() {
    this.score++;
    const scoreElements = document.querySelectorAll('.score');
    scoreElements.forEach(e => e.innerHTML = this.score);
    this.updateBestScore();
  }

  // Update best score {
  updateBestScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('boole-best-score', this.bestScore);
      const bestScoreElements = document.querySelectorAll('.best-score');
      bestScoreElements.forEach(e => e.innerHTML = this.bestScore);
    }
  }

  // End the game
  gameOver(event) {
    if (event.detail.game != Game.current) return;

    Params.container.innerHTML = '';
    this.over = true;
    if (Params.log) console.log(`Game ${this.id} over`);

    const element = document.querySelector('.title-screen');
    element.classList.add('game-over');
    element.classList.remove('off');
    element.querySelector('.try-again').focus();

    window.removeEventListener('gameover', this.gameOver);
    window.removeEventListener('keydown', this.detectKeys);
  }

  // Detects key presses
  async detectKeys(event) {
    if (![...keys.up, ...keys.down, ...keys.left, ...keys.right].includes(event.code)) return;
    if (this.moving) return;
    this.moving = true;

    let directionX = 0, directionY = 0;
    if (keys.up.includes(event.code)) directionY--;
    if (keys.down.includes(event.code)) directionY++;
    if (keys.left.includes(event.code)) directionX--;
    if (keys.right.includes(event.code)) directionX++;

    await Promise.all(this.alivePlayers.map(player => {
      // Switch sprite orientation based on the movement direction
      if (directionX > 0) player.element.classList.add('facing-right');
      else if (directionX < 0) player.element.classList.remove('facing-right');

      // If a player or a pond is already on the destination tile, don't move
      const playersAlreadyThere = [...this.players, ...this.ponds].filter(p => (p.position.x == player.position.x + directionX && p.position.y == player.position.y + directionY && !p.destroyed));
      if (playersAlreadyThere.length == 0)
        return player.moveTo(player.position.x + directionX, player.position.y + directionY, this.playerMoveDuration);
      else return;
    }));
    this.moving = false;
    return;
  }

  // Check if this game is still playing
  check(action) {
    let valid = true, message;
    if (this.over)              valid = false, message = 'game is over';
    if (this.id != activeGame)  valid = false, message = `a more recent game ${activeGame} exists`;
    if (Params.log && !valid) console.log(`Action [${action}] stopped in game ${this.id} because ${message}`);
    return valid;
  }

  static get current() {
    return activeGame;
  }
}