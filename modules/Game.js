import Player from './Player.js';
import { Meteor } from './Meteor.js';
import Bonus from './Bonus.js';


const keys = {
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  left: ['ArrowLeft'],
  right: ['ArrowRight']
};
let keysActive = false;


export class Game {
  constructor() {
    this.container = document.querySelector('.container');
    const containerStyles = getComputedStyle(this.container);
    this.cellSize = containerStyles.getPropertyValue('--cell-size');
    this.columns = containerStyles.getPropertyValue('--columns');
    this.rows = containerStyles.getPropertyValue('--rows');
    this.playerMoveDuration = containerStyles.getPropertyValue('--player-move-duration');
    this.score = 0;
    this.bestScore = Number(localStorage.getItem('boole-best-score')) || 0;
    this.meteorCount = 0;
  }

  // Start the game
  async start() {
    const id = Date.now();
    this.id = id;

    document.querySelector('.title-screen').classList.add('off');
    document.querySelector('.game-over').classList.remove('on');
    document.querySelector('.score-container').classList.add('on');

    const scoreElements = document.querySelectorAll('.score');
    scoreElements.forEach(e => e.innerHTML = 0);
    const bestScoreElements = document.querySelectorAll('.best-score');
    bestScoreElements.forEach(e => e.innerHTML = this.bestScore);

    // Detects key presses to move players
    if (!keysActive) {
      window.addEventListener('gameover', () => {
        console.log('game over');
        this.gameOver();
      });
    }
    if (!keysActive) this.detectKeys();

    // Spawns the first player
    const player = new Player(this);
    player.spawn();

    // Spawns meteors
    while (id == this.id) {
      const r = Math.round((Player.all.length - 1) * Math.random());
      this.spawnMeteors(id, Player.all[r]);
      await new Promise(resolve => setTimeout(resolve, this.timeBetweenMeteors));
    }
  }

  // Spawn meteors
  async spawnMeteors(id, player) {
    if (id != this.id) return;
    console.log(this, Player.all, Bonus.all);
    const meteor = new Meteor(this, player);
    meteor.spawn();
    await meteor.fall();

    // Kill the player crushed by the meteor
    const playersAlreadyThere = Player.all.filter(p => (p.position.x == meteor.position.x && p.position.y == meteor.position.y));
    playersAlreadyThere.forEach(p => p.loseLife(id));

    // Kill the players who walk into the meteor during a short interval after it crashes
    const killPlayers = event => {
      if (id != this.id) return;
      if (event.detail.position.x != meteor.position.x || event.detail.position.y != meteor.position.y) return;
      event.detail.player.loseLife(id);
    };
    window.addEventListener('moveto', killPlayers);
    await new Promise(resolve => setTimeout(resolve, meteor.killDuration));
    window.removeEventListener('moveto', killPlayers);

    // Remove the meteor after its crash
    meteor.destroy();

    if (id != this.id) return;

    // Spawn a bonus in its place
    const r = Math.round(100 * Math.random());
    if (r <= this.bonusChance) this.spawnBonus(id);

    // If all players are dead, game over.
    // If not, bump the score.
    if (Player.all.length <= 0)  this.gameOver();
    else                      this.bumpScore();
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

  // Spawn bonus
  async spawnBonus(id) {
    if (id != this.id) return;

    const bonus = new Bonus(this);
    this.checkSpawn(bonus, [...Bonus.all, ...Player.all], id);

    const buffPlayers = event => {
      if (id != this.id) return;
      if (bonus.used) return;
      if (event.detail.position.x != bonus.position.x || event.detail.position.y != bonus.position.y) return;
      bonus.used = true;
      bonus.destroy();
      if (bonus.type == 'clone') {
        const player = new Player(this);
        player.lives = event.detail.player.lives;
        this.checkSpawn(player, [...Bonus.all, ...Player.all], id);
      }
    }

    window.addEventListener('moveto', buffPlayers);
    await new Promise(resolve => setTimeout(resolve, this.bonusDuration));
    window.removeEventListener('moveto', buffPlayers);
    bonus.destroy();
  }

  // Duration of a bonus on the map (ms)
  get bonusDuration() {
    return 10000;
  }

  // Probability of spawning a bonus (%)
  get bonusChance() {
    return 5;
  }

  // Duration of the tomb after death
  get tombDuration() {
    return 5000;
  }

  // Checks if it's safe to spawn something at a random place
  checkSpawn(thing, thingList, id) {
    if (id != this.id) return;
    const rx = Math.round((this.columns - 1) * Math.random()) + 1;
    const ry = Math.round((this.rows - 1) * Math.random()) + 1;
    const alreadyThere = thingList.filter(p => (p.position.x == rx && p.position.y == ry));
    if (alreadyThere.length == 0) return thing.spawn(rx, ry);
    else                          return this.checkSpawn(thing, thingList, id);
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
  gameOver() {
    const allMeteors = document.querySelectorAll('.meteor');
    allMeteors.forEach(m => m.remove());
    const allBonuses = document.querySelectorAll('.bonus');
    allBonuses.forEach(b => b.remove());
    Bonus.resetAll();
    const allPlayers = document.querySelectorAll('.player');
    allPlayers.forEach(p => p.remove());
    Player.resetAll();

    const element = document.querySelector('.game-over');
    element.classList.add('on');
    element.querySelector('button').focus();
    
    this.score = 0;
    this.id = 0;
    this.meteorCount = 0;
  }

  // Detects key presses
  detectKeys() {
    keysActive = true;

    let moving = false;
    window.addEventListener('keydown', async event => {
      if (![...keys.up, ...keys.down, ...keys.left, ...keys.right].includes(event.code)) return;
      if (moving) return;
      moving = true;

      let directionX = 0, directionY = 0;
      if (keys.up.includes(event.code)) directionY--;
      if (keys.down.includes(event.code)) directionY++;
      if (keys.left.includes(event.code)) directionX--;
      if (keys.right.includes(event.code)) directionX++;

      await Promise.all(Player.all.map(player => {
        // If a player is already on the destination tile, don't move there
        const playersAlreadyThere = Player.all.filter(p => (p.position.x == player.position.x + directionX && p.position.y == player.position.y + directionY));
        if (playersAlreadyThere.length == 0)
          player.moveTo(player.position.x + directionX, player.position.y + directionY);

        if (player.lives <= 0) return;

        // Switch sprite orientation based on the movement direction
        if (directionX > 0) player.element.classList.add('facing-right');
        else if (directionX < 0) player.element.classList.remove('facing-right');
      }));
      moving = false;
      return;
    });
  }
}