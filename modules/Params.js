class Params {
  constructor() {
    this.container = document.querySelector('.game');
    const containerStyles = getComputedStyle(this.container);
    this.cellSize = Number(containerStyles.getPropertyValue('--cell-size'));
    this.columns = Number(containerStyles.getPropertyValue('--columns'));
    this.rows = Number(containerStyles.getPropertyValue('--rows'));
    this.log = true;
  }

  wait(time) {
    if (time instanceof Animation)
      return new Promise(resolve => time.addEventListener('finish', resolve));
    else if (typeof time === 'number')
      return new Promise(resolve => setTimeout(resolve, time));
  }
};

const p = new Params();
export default p;