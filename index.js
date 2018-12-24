const electron = require('electron');
const Color = require('color');
const path = require('path');
const starsCssPath = path.join(__dirname, 'stars.jpg').replace(/\\/g, "/");

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

const ACTIVE_DURATION = 250;

var config = {
  staggerHeight: 2,
  rainbowMaxAlpha: 1,
  audioEnabled: false,
  alwaysActive: false
};

// Share audio across terminal instances.
let audio;
const playAudio = () => {
  if (!config.audioEnabled) {
    return;
  }

  audio.play();
};

const pauseAudio = () => {
  audio.pause();
};

exports.decorateTerm = (Term, { React, notify }) => {
  // There might be a better way to get this config. Nyan on.
  config = Object.assign(config, electron.remote.app.config.getConfig().hyperCat);

  return class extends React.Component {
    constructor (props, context) {
      super(props, context);
      this.state = {
        active: false
      };

      this.drawFrame = this.drawFrame.bind(this);
      this.resizeCanvas = this.resizeCanvas.bind(this);
      this.onDecorated = this.onDecorated.bind(this);
      this.onCursorMove = this.onCursorMove.bind(this);
      this._rainbows = [];
    }

    componentWillReceiveProps(nextProps) {
      if (!nextProps.isTermActive) {
        this.setActive(false);
      }
    }

    onDecorated (term) {
      if (this.props.onDecorated) {
        this.props.onDecorated(term);
      }

      this._termDiv = term ? term.termRef : null;

      if (this._termDiv) {
        this.initAudio();
        this.initOverlay();
      }
    }

    onCursorMove(cursorFrame) {
      if (this.props.onCursorMove) {
        this.props.onCursorMove(cursorFrame);
      }

      const overlayRect = this.getOverlayBoundingClientRect();
      const termRect = this._termDiv.getBoundingClientRect();

      const left = termRect.left + cursorFrame.x - overlayRect.left;
      const top = termRect.top + cursorFrame.y - overlayRect.top;
      const width = cursorFrame.width;
      const height = cursorFrame.height;

      if (this._prevCursorRect &&
        this._prevCursorRect.left === left &&
        this._prevCursorRect.top === top &&
        this._prevCursorRect.width === width &&
        this._prevCursorRect.height === height) {
        return;
      }

      this.setActive(true);

      this._isStaggeredUp = !this._isStaggeredUp;

      const staggerTop = top + (this._isStaggeredUp ? -config.staggerHeight : config.staggerHeight);

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
          left: left + width - (this._catHead.naturalWidth * scale) * .75 + 'px',
          // Bottom of the head should align with the bottom of the cursor.
          // There are basically 15 rows of blocks, 2 of which extend below the head.
          // These 2 rows of blocks contain the front legs.
          top: staggerTop + height - (this._catHead.naturalHeight * scale) * (13 / 15) + 'px'
        });

        Object.assign(this._catLegs.style, {
          display: 'block',
          width: this._catLegs.naturalWidth * scale + 'px',
          height: this._catLegs.naturalHeight * scale + 'px',
          left: left - (this._catLegs.naturalWidth * scale) * (2 / 10) + 'px',
          top: staggerTop + height - (this._catLegs.naturalHeight * scale) * (2 / 4) + 'px'
        });

        Object.assign(this._catTail.style, {
          display: 'block',
          width: this._catTail.naturalWidth * scale + 'px',
          height: this._catTail.naturalHeight * scale + 'px',
          left: left - (this._catTail.naturalWidth * scale) + 'px',
          top: staggerTop + height - (this._catTail.naturalHeight * scale) * (11 / 7) + 'px'
        });
      }

      if (this._prevCursorRect) {
        this.spawnRainbow(this._prevCursorRect);
      }

      this._prevCursorRect = {
        left,
        top,
        width,
        height
      };
    }

    initAudio() {
      if (audio) {
        return;
      }

      audio = document.createElement('audio');
      audio.id = 'audio-player';
      audio.src = path.join(__dirname, 'nyan.mp3');
      audio.type = 'audio/mpeg';
      audio.loop = true;
      document.body.appendChild(audio);
    }

    initOverlay() {
      this._overlay = document.createElement('div');
      this._overlay.classList.add('hypercat-overlay');
      this._termDiv.insertBefore(this._overlay, this._termDiv.firstChild);

      this._canvas = document.createElement('canvas');
      this._canvasContext = this._canvas.getContext('2d');
      this.resizeCanvas();

      this._overlay.appendChild(this._canvas);

      window.requestAnimationFrame(this.drawFrame);
      window.addEventListener('resize', this.resizeCanvas);

      this.initCatCursor();
      this.initCatAssets();
    }

    createCatAsset(filename) {
      const img = new Image();   // Create new img element
      img.src = path.join(__dirname, filename);
      img.classList.add('hypercat-asset');
      this._overlay.appendChild(img);
      return img;
    }

    initCatAssets() {
      this._catLegs = this.createCatAsset('legs.svg');
      this._catHead = this.createCatAsset('head.svg');
      this._catTail = this.createCatAsset('tail.svg');
    }

    initCatCursor() {
      const catCursor = document.createElement('div');
      catCursor.classList.add('hypercat-cursor');

      this._overlay.appendChild(catCursor);
      this._catCursor = catCursor;
    }

    resizeCanvas() {
      const overlayRect = this.getOverlayBoundingClientRect();
      this._canvas.width = overlayRect.width;
      this._canvas.height = overlayRect.height;
    }

    drawRainbow(ctx, rainbow, staggerUp) {
      const stripeHeight = rainbow.height / RAINBOW_COLORS.length;

      RAINBOW_COLORS.forEach((color, i) => {
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${rainbow.alpha})`;
        ctx.fillRect(
          rainbow.left,
          rainbow.top + stripeHeight * i + (staggerUp ? -config.staggerHeight : config.staggerHeight),
          rainbow.width,
          stripeHeight
        );
      });
    }

    drawFrame() {
      this._canvasContext.clearRect(0, 0, this._canvas.width, this._canvas.height);

      let staggerUp = !this._isStaggeredUp;

      for (var i = this._rainbows.length - 1; i >= 0; i--) {
        const rainbow = this._rainbows[i];
        this.drawRainbow(this._canvasContext, rainbow, staggerUp);

        rainbow.alpha *= RAINBOW_ALPHA_DECAY;

        if (rainbow.alpha < 0.1) {
          this._rainbows.splice(i, 1);
        }

        staggerUp = !staggerUp;
      }

      window.requestAnimationFrame(this.drawFrame);
    }

    spawnRainbow(rect) {
      // Make the rainbow a bit shorter than the cat for a proper nyan.
      this._rainbows.push(Object.assign({ alpha: config.rainbowMaxAlpha }, {
        left: rect.left,
        top: rect.top + rect.height * .1,
        width: rect.width,
        height: rect.height * .80
      }));
    }

    getOverlayBoundingClientRect() {
      // Getting the bounding client rect is futile unless it's visible. If it's not already visible, we'll
      // make it visible, take the measurement, then hide it.
      const overlayIsVisible = this._overlay.classList.contains('hypercat-active');

      if (!overlayIsVisible) {
        this._overlay.classList.add('hypercat-active');
      }

      const rect = this._overlay.getBoundingClientRect();

      if (!overlayIsVisible) {
        this._overlay.classList.remove('hypercat-active');
      }

      return rect;
    }

    setActive(active) {
      if (config.alwaysActive) {
        if (this.state.active) {
          return;
        }

        active = true;
      }

      this._overlay.classList.toggle('hypercat-active', active);
      this.setState({ active });

      if (active) {
        playAudio();
        clearTimeout(this._activeTimeout);
        this._activeTimeout = setTimeout(() => {
          this.setActive(false);
        }, ACTIVE_DURATION)
      } else {
        pauseAudio();
      }
    }

    render() {
      return [
        React.createElement(Term, Object.assign({}, this.props, {
          onDecorated: this.onDecorated,
          onCursorMove: this.onCursorMove,
          backgroundColor: this.state.active ? 'rgba(0, 0, 0, 0)' : this.props.backgroundColor,
          cursorColor: this.state.active ? 'rgba(0, 0, 0, 0)' : this.props.cursorColor,
          foregroundColor: this.state.active ? 'rgba(255, 255, 255, 1)' : this.props.foregroundColor
        })),
        React.createElement('style', {}, `
          @keyframes starscroll {
            from {background-position:0 0;}
            to {background-position:-1600px 0;}
          }
          
          .hypercat-overlay {
            display: none;
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
          }
          
          .hypercat-overlay.hypercat-active {
            display: block;
            background-image: url(file://${starsCssPath});
            background-repeat: repeat;
            -webkit-animation: starscroll 4s infinite linear
          }
          
          .hypercat-cursor {
            position: absolute;
            pointerEvents: none;
            background: radial-gradient(circle, ${DEEPPINK} 10%, transparent 10%),
              radial-gradient(circle, ${DEEPPINK} 10%, ${PINK} 10%) 3px 3px;
            backgroundSize: 6px 6px;
            borderWidth: 1px;
            borderColor: black;
            borderStyle: solid;
          }
          
          .hypercat-asset {
            position: absolute;
            pointerEvents: none;
          }
        `)
      ];
    }
  }
};
