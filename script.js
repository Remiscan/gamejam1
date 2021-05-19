import { Game } from './modules/Game.js';


let game;

window.addEventListener('DOMContentLoaded', () => {
  // Display best score
  const bestScoreElements = document.querySelectorAll('.best-score');
  bestScoreElements.forEach(e => e.innerHTML = Number(localStorage.getItem('boole-best-score')) || 0);

  // Enable play buttons
  const playButtons = document.querySelectorAll('.play-button');
  playButtons.forEach(button => {
    button.addEventListener('click', () => {
      game = new Game();
      game.start();
    });
  });

  // Focus title screen play button
  document.querySelector('.title-screen button').focus();
});