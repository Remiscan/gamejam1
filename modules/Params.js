class Params {
  constructor() {
    this.container = document.querySelector('.game');
    const containerStyles = getComputedStyle(this.container);
    this.cellSize = Number(containerStyles.getPropertyValue('--cell-size'));
    this.columns = Number(containerStyles.getPropertyValue('--columns'));
    this.rows = Number(containerStyles.getPropertyValue('--rows'));
    this.log = true;
    this.sounds = null;
    this.audioCtx = null;
    this.prepareSounds();
  }

  get mute() {
    const checkbox = document.querySelector('#mute');
    return checkbox.checked;
  }

  wait(time) {
    if (time instanceof Animation)
      return new Promise(resolve => time.addEventListener('finish', resolve));
    else if (typeof time === 'number')
      return new Promise(resolve => setTimeout(resolve, time));
  }

  async prepareSounds() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const sounds = ['bonus', 'ouch'];

    let responses = await Promise.all(sounds.map(sound => fetch(`./assets/${sound}.mp3`)));
    responses = await Promise.all(responses.map(r => r.arrayBuffer()));
    responses = await Promise.all(responses.map(r => audioCtx.decodeAudioData(r)));

    this.sounds = sounds.map((id, k) => { return { id: id, sound: responses[k] } });
    this.audioCtx = audioCtx;
    return;
  }

  async playSound(id) {
    if (this.audioCtx === null) return;
    if (this.mute) return;

    const sound = this.audioCtx.createBufferSource();
    const k = this.sounds.findIndex(s => s.id == id);
    if (k == -1) throw `Sound ${id} doesn't exist`;
    sound.buffer = this.sounds[k].sound;
    sound.connect(this.audioCtx.destination);
    sound.start();
    return;
  }
};

const p = new Params();
export default p;