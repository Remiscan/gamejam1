import Game from './modules/Game.js';
import Params from './modules/Params.js';


const strings = {
  "fr": {
    "title": "Boole and the Boulders",
    "description": "C'est la fin du monde. Des rochers tombent du ciel et Boole la grenouille veut survivre.",
    "game-over": "Game Over",
    "game-over-description": "R.I.P. Boole",
    "instruction-1": "Évite les rochers qui tombent",
    "instruction-2": "Déplace Boole avec les flèches",
    "instruction-3": "Ramasse les bonus pour que Boole utilise ses pouvoirs de reproduction",
    "click-start": "Clique ici pour jouer",
    "click-dead": "Clique ici pour réessayer",
    "score": "Score :",
    "best-score": "Record :",
    "mute": "Muet"
  },
  "en": {
    "title": "Boole and the Boulders",
    "description": "This is the end of the world. Boulders are falling from the sky and Boole the frog wants to live.",
    "game-over": "Game Over",
    "game-over-description": "R.I.P. Boole",
    "instruction-1": "Avoid the falling boulders",
    "instruction-2": "Move Boole with the arrow keys",
    "instruction-3": "Pick up the bonuses to activate Boole's reproductive powers",
    "click-start": "Click here to play",
    "click-dead": "Click here to try again",
    "score": "Score:",
    "best-score": "Best score:",
    "mute": "Mute"
  }
};


let game;

window.addEventListener('DOMContentLoaded', () => {
  // Translate game
  const requestedLang = (new URLSearchParams(window.location.search)).get('lang') ?? '';
  let lang = 'en';
  switch (requestedLang) {
    case 'fr': lang = 'fr'; break;
  }
  document.querySelectorAll('[data-string]').forEach(e => e.innerText = strings[lang][e.getAttribute('data-string')]) ?? 'undefined string';
  document.body.setAttribute('data-translated', 'true');

  // Display best score
  const bestScoreElements = document.querySelectorAll('.best-score');
  bestScoreElements.forEach(e => e.innerHTML = Number(localStorage.getItem(Params.savePath)) || 0);

  // Enable play buttons
  const playButtons = document.querySelectorAll('.play-button');
  playButtons.forEach(button => {
    button.addEventListener('click', () => {
      game = new Game();
      game.start();
    });
  });

  // Focus title screen play button
  document.querySelector('.first-start').focus();
});