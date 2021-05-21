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


export default class Game {
  constructor() {
    this.id = Date.now();
    activeGame = this.id;

    this.players = [];
    this.bonuses = [];
    this.meteors = [];
    this.ponds = [];
    this.meteorCount = 0;

    this.score = 0;
    this.bestScore = Number(localStorage.getItem(Params.savePath)) || 0;
    
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
    const lastValue = 1500;
    let i = 4;
    for (let j = 4; j < jmax; j++) {
      if (this.meteorCount < i) return Math.max(5000 - 500 * Math.floor((j - 3) / 3), lastValue);
      i = i + j;
    }
    return lastValue;
  }

  // Probability of a meteor to generate on a player (%)
  get aimAtPlayer() {
    const jmax = 100;
    const lastValue = 30;
    let i = 4;
    for (let j = 4; j < jmax; j++) {
      if (this.meteorCount < i) return Math.max(70 - Math.floor((j - 11) / 2) * 5, lastValue);
      i = i + j;
    }
    return lastValue;
  }

  // Duration of a bonus on the map (ms)
  get bonusDuration() {
    return 10000;
  }

  // Probability of spawning a bonus (%)
  get bonusChance() {
    if (this.meteorCount < 100) return 5;
    return 2.5;
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
    const decorationsNumber = 6;
    for (let i = 0; i < decorationsNumber; i++) {
      const decoration = new Decoration();
      decoration.spawn();
    }

    // Place ponds
    const numberofPonds = 2/* + Math.round(Math.random())*/;
    const ponds = [];
    switch (numberofPonds) {
      case 1:
        const pond = new Pond();
        ponds.push(pond);
        break;
      case 2:
        const pond1 = new Pond({
          position: {
            x: 3 + Math.round(1 * Math.random()),
            y: 3 + Math.round(3 * Math.random())
          }, size: {
            width: 2,
            height: 2
          }
        });
        ponds.push(pond1);
        const pond2 = new Pond({
          position: {
            x: 9 + Math.round(1 * Math.random()),
            y: 3 + Math.round(3 * Math.random())
          }, size: {
            width: 2,
            height: 2
          }
        });
        ponds.push(pond2);
        break;
    }
    for (const pond of ponds) {
      this.ponds = [...this.ponds, ...pond.cells];
      pond.spawn();
    }

    // Spawn the first player
    const cell = this.getEmptyCell();
    if (numberofPonds == 1)
      this.createPlayer({ position: { x: cell.x, y: cell.y }, lives: 1 });
    else
      this.createPlayer({ position: { x: Math.round(Params.columns / 2), y: Math.round(Params.rows / 2) }, lives: 1 });

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

    // Don't create a bonus if there's already one on screen
    if (this.bonuses.filter(b => !b.used && !b.destroyed).length > 0) return;

    const bonus = new Bonus({ position: { x: meteor.position.x, y: meteor.position.y } });
    bonus.spawn();
    this.bonuses.push(bonus);

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
      localStorage.setItem(Params.savePath, this.bestScore);
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
    if (![...keys.up, ...keys.down, ...keys.left, ...keys.right].includes(event.key)) return;
    if (this.moving) return;
    event.preventDefault();
    this.moving = true;

    let directionX = 0, directionY = 0;
    if (keys.up.includes(event.key)) directionY--;
    if (keys.down.includes(event.key)) directionY++;
    if (keys.left.includes(event.key)) directionX--;
    if (keys.right.includes(event.key)) directionX++;

    const orderedPlayers = this.alivePlayers
    .sort((p1, p2) => {
      if (directionX != 0)
        return Math.sign(p2.position.x - p1.position.x) * Math.sign(directionX);
      else if (directionY != 0)
        return Math.sign(p2.position.y - p1.position.y) * Math.sign(directionY);
      else
        return 0;
    });

    // Calculate which players can move and which can't
    for (const player of orderedPlayers) {
      // Switch sprite orientation based on the movement direction
      if (directionX > 0) player.element.classList.add('facing-right');
      else if (directionX < 0) player.element.classList.remove('facing-right');

      // If the player is moving towards the edge of the map, don't move
      if (
        (directionX > 0 && player.position.x == Params.columns)
        || (directionX < 0 && player.position.x == 1)
        || (directionY > 0 && player.position.y == Params.rows)
        || (directionY < 0 && player.position.y == 1)
      ) {
        player.canMove = false;
        if (Params.log) console.log(`Player (x: ${player.position.x}, y: ${player.position.y}) can't move to (x: ${player.position.x + directionX}, y: ${player.position.y + directionY}) because: EDGE`);
        continue;
      }

      // If the player is moving towards a lava pond or a tomb, don't move
      const obstacleThere = [...this.players.filter(p => p.lives <= 0 && !p.destroyed), ...this.ponds].filter(o => o.position.x == player.position.x + directionX && o.position.y == player.position.y + directionY);
      if (obstacleThere.length > 0) {
        player.canMove = false;
        if (Params.log) console.log(`Player (x: ${player.position.x}, y: ${player.position.y}) can't move to (x: ${player.position.x + directionX}, y: ${player.position.y + directionY}) because: LAVA OR TOMB`);
        continue;
      }

      // If the player is moving towards another alive player, only move if the other player can move too
      const playerThere = [...this.alivePlayers.filter(p => p.lives > 0 && !p.destroyed && p.position.x == player.position.x + directionX && p.position.y == player.position.y + directionY)];
      if (playerThere.length == 0) {
        player.canMove = true;
        if (Params.log) console.log(`Player (x: ${player.position.x}, y: ${player.position.y}) CAN move to (x: ${player.position.x + directionX}, y: ${player.position.y + directionY}) because: NO ONE THERE`);
        continue;
      }
      else if (playerThere.length > 0) {
        if (playerThere.reduce((sum, p) => sum + p.canMove, 0) == playerThere.length) {
          player.canMove = true;
          if (Params.log) console.log(`Player (x: ${player.position.x}, y: ${player.position.y}) CAN move to (x: ${player.position.x + directionX}, y: ${player.position.y + directionY}) because: PLAYER THERE CAN MOVE TOO`);
          continue
        }
        else {
          player.canMove = false;
          if (Params.log) console.log(`Player (x: ${player.position.x}, y: ${player.position.y}) can't move to (x: ${player.position.x + directionX}, y: ${player.position.y + directionY}) because: PLAYER THERE CAN'T MOVE`);
          continue;
        }
      }
    }

    // Actually move the players who can
    await Promise.all(orderedPlayers.map(player => {
      if (player.canMove)
        return player.moveTo(player.position.x + directionX, player.position.y + directionY, this.playerMoveDuration);
      else
        return;
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