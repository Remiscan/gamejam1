import { Game } from './modules/Game.js';


let game;

const playButtons = document.querySelectorAll('.play-button');
playButtons.forEach(button => {
  button.addEventListener('click', () => {
    if (!game) game = new Game();
    game.start();
  });
});