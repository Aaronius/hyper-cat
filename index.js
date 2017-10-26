const e = require('electron')

const Color = require('color');
const path = require('path');
var css_path = path.join(__dirname, 'stars.jpg');

css_path = css_path.replace(/\\/g, "/");

const RAINBOW_ALPHA_DECAY = 0.95;
const RAINBOW_COLORS = [
  '#fe0000',
  '#ffa500',
  '#ffff00',
  '#00fb00',
  '#009eff',
  '#6531ff'
].map(color => Color(color).rgb());

// Cat colors
const BLACK = '#000000';
const BEIGE = '#f9d28f';
const PINK = '#fe91fe';
const DEEPPINK = '#f90297';
const GRAY = '#9d9d9d';
const SALMON = '#ff9593';

var stagger_height = 2;
var audio_enabled = true;
var orig_alpha = 1;

const ACTIVE_DURATION = 250;


// Share audio across terminal instances.
let audio;
let audioTimeout;
let audioEnabled;

const playAudio = () => {

  //terminal command
  if (!audioEnabled) {
    return;
  }
  //setting command, probably a better way to do this
  if (!audio_enabled){
    return;
  }


  clearTimeout(audioTimeout);
  audio.play();
  audioTimeout = setTimeout(audio.pause.bind(audio), ACTIVE_DURATION);
};

exports.decorateConfig = (config) => {
      //this doesn't work for some reason?
};

exports.middleware = (store) => (next) => (action) => {
  if ('SESSION_ADD_DATA' === action.type) {
    const { data } = action;
    if (/(hyper-cat-toggle-audio: command not found)|(command not found: hyper-cat-toggle-audio)/.test(data)) {
      audioEnabled = !audioEnabled;
      global.localStorage.setItem('hyperCatAudioEnabled', String(audioEnabled));
    } else {
      next(action);
    }
  } else {
    next(action);
  }
};

// code based on
// https://atom.io/packages/power-mode
// https://github.com/itszero/rage-power/blob/master/index.jsx
exports.decorateTerm = (Term, { React, notify }) => {

  let myconfig = e.remote.app.config.getConfig();

  const catConfig = Object.assign({
    audio_enabled: audio_enabled,
    stagger_height: stagger_height,
    orig_alpha: orig_alpha
  }, myconfig.catCursor);


  stagger_height = catConfig.stagger_height;
  audio_enabled = catConfig.audio_enabled;
  orig_alpha = catConfig.orig_alpha;


  // localStorage isn't immediately available when hyper starts up. That is why this statement
  // is in here. It's not a very appropriate place for it I would guess, but YOLO. Nyan on.
  audioEnabled = global.localStorage.getItem('hyperCatAudioEnabled') !== 'false';

  return class extends React.Component {
    constructor (props, context) {
      super(props, context);
      this._drawFrame = this._drawFrame.bind(this);
      this._resizeCanvas = this._resizeCanvas.bind(this);
      this._onTerminal = this._onTerminal.bind(this);
      this._onCursorChange = this._onCursorChange.bind(this);
      this._rainbows = [];
    }

    _onTerminal (term) {
      if (this.props.onTerminal) this.props.onTerminal(term);
      this._termDiv = term.div_;
      this._termCursor = term.cursorNode_;
      this._termWindow = term.document_.defaultView;
      this._termScreen = term.document_.querySelector('x-screen');
      this._observer = new MutationObserver(this._onCursorChange);
      this._observer.observe(this._termCursor, {
        attributes: true,
        childList: false,
        characterData: false
      });

      this._initAudio();
      this._initOverlay();
    }

    _initAudio() {
      if (audio) {
        return;
      }

      audio = document.createElement('audio');
      audio.id = 'audio-player';
      audio.src = path.join(__dirname, 'nyan.mp3');
      audio.type = 'audio/mpeg';
      document.body.appendChild(audio);
    }

    _initOverlay() {
      this._overlay = document.createElement('div');
      this._overlay.classList.add('hypercat-overlay');
      document.body.appendChild(this._overlay);

      this._canvas = document.createElement('canvas');
      this._canvasContext = this._canvas.getContext('2d');
      this._canvas.width = window.innerWidth;
      this._canvas.height = window.innerHeight;
      this._overlay.appendChild(this._canvas);

      this._termWindow.requestAnimationFrame(this._drawFrame);
      this._termWindow.addEventListener('resize', this._resizeCanvas);

      this._initCatCursor();
      this._initCatAssets();
    }

    _createCatAsset(filename) {
      const img = new Image();   // Create new img element
      img.src = path.join(__dirname, filename);
      img.classList.add('hypercat-asset');
      this._overlay.appendChild(img);
      return img;
    }

    _initCatAssets() {
      this._catLegs = this._createCatAsset('legs.svg');
      this._catHead = this._createCatAsset('head.svg');
      this._catTail = this._createCatAsset('tail.svg');
    }

    _initCatCursor() {
      const catCursor = document.createElement('div');
      catCursor.classList.add('hypercat-cursor');

      this._overlay.appendChild(catCursor);
      this._catCursor = catCursor;
    }

    _resizeCanvas() {
      this._canvas.width = window.innerWidth;
      this._canvas.height = window.innerHeight;
    }

    _drawRainbow(ctx, rainbow, staggerUp) {
      const stripeHeight = rainbow.height / RAINBOW_COLORS.length;

      RAINBOW_COLORS.forEach((color, i) => {
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${rainbow.alpha})`;
        ctx.fillRect(
          rainbow.left,
          rainbow.top + stripeHeight * i + (staggerUp ? -stagger_height : stagger_height),
          rainbow.width,
          stripeHeight
        );
      });
    }

    _drawFrame() {
      this._canvasContext.clearRect(0, 0, this._canvas.width, this._canvas.height);

      let staggerUp = !this._isStaggeredUp;

      for (var i = this._rainbows.length - 1; i >= 0; i--) {
        const rainbow = this._rainbows[i];
        this._drawRainbow(this._canvasContext, rainbow, staggerUp);

        rainbow.alpha *= RAINBOW_ALPHA_DECAY;

        if (rainbow.alpha < 0.1) {
          this._rainbows.splice(i, 1);
        }

        staggerUp = !staggerUp;
      }

      this._termWindow.requestAnimationFrame(this._drawFrame);
    }

    _spawnRainbow(rect) {
      // Make the rainbow a bit shorter than the cat for a proper nyan.
      this._rainbows.push(Object.assign({ alpha: orig_alpha }, {
        left: rect.left,
        top: rect.top + rect.height * .1,
        width: rect.width,
        height: rect.height * .80
      }));
    }

    _onCursorChange() {
      const origin = this._termDiv.getBoundingClientRect();
      const cursorRect = this._termCursor.getBoundingClientRect();

      const left = origin.left + cursorRect.left;
      const top = origin.top + cursorRect.top;
      const width = cursorRect.width;
      const height = cursorRect.height;

      if (this._prevCursorRect &&
        this._prevCursorRect.left === left &&
        this._prevCursorRect.top === top &&
        this._prevCursorRect.width === width &&
        this._prevCursorRect.height === height) {
        return;
      }

      this.setActive(true);

      this._isStaggeredUp = !this._isStaggeredUp;

      const staggerTop = top + (this._isStaggeredUp ? -stagger_height : stagger_height);

      Object.assign(this._catCursor.style, {
        left: left + 'px',
        top: staggerTop + 'px',
        width: width + 'px',
        height: height + 'px'
      });

      if (this._catHead.complete && this._catLegs.complete && this._catTail.complete) {
        const scale = width / this._catHead.naturalWidth;

        Object.assign(this._catHead.style, {
          display: 'block',
          width: this._catHead.naturalWidth * scale + 'px',
          height: this._catHead.naturalHeight * scale + 'px',
          left: left + width - this._catHead.width * .75 + 'px',
          // Bottom of the head should align with the bottom of the cursor.
          // There are basically 15 rows of blocks, 2 of which extend below the head.
          // These 2 rows of blocks contain the front legs.
          top: staggerTop + height - this._catHead.height * (13 / 15) + 'px'
        });

        Object.assign(this._catLegs.style, {
          display: 'block',
          width: this._catLegs.naturalWidth * scale + 'px',
          height: this._catLegs.naturalHeight * scale + 'px',
          left: left - this._catLegs.width * (2 / 10) + 'px',
          top: staggerTop + height - this._catLegs.height * (2 / 4) + 'px'
        });

        Object.assign(this._catTail.style, {
          display: 'block',
          width: this._catTail.naturalWidth * scale + 'px',
          height: this._catTail.naturalHeight * scale + 'px',
          left: left - this._catTail.width + 'px',
          top: staggerTop + height - this._catTail.height * (11 / 7) + 'px'
        });
      }

      if (this._prevCursorRect) {
        this._spawnRainbow(this._prevCursorRect);
      }

      this._prevCursorRect = {
        left,
        top,
        width,
        height
      };
    }

    setActive(active) {
      this._overlay.classList.toggle('hypercat-active', active);
      this._termCursor.classList.toggle('hypercat-active', active);

      if (active) {
        this._termScreen.style.color = 'white';
        playAudio();

        clearTimeout(this._activeTimeout);
        this._activeTimeout = setTimeout(() => {
          this.setActive(false);
        }, ACTIVE_DURATION)
      } else {
        this._termScreen.style.color = this.props.term.foregroundColor_;
      }
    }

    componentWillReceiveProps(nextProps) {
      if (!nextProps.isTermActive) {
        this.setActive(false);
      }
    }

    render() {
      return React.createElement(Term, Object.assign({}, this.props, {
        onTerminal: this._onTerminal
      }));
    }

    componentWillUnmount() {
      document.body.removeChild(this._overlay);

      if (this._observer) {
        this._observer.disconnect();
      }
    }
  }
};
