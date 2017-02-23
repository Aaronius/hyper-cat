Turn your [Hyper](https://hyper.is/) terminal into nyan cat while typing. Audio included!

![Screen Capture](capture.gif?raw=true "Screen Capture")

To install, edit `~/.hyper.js` and add `hyper-cat` to `plugins`:

```
module.exports = {

  config: { /*... */ },

  plugins: [
    "hyper-cat"
  ]

};
```

You may then need to reload your terminal.

## Toggle Audio

Is the audio too much nyan for you? You can toggle it by running the command `hyper-cat-toggle-audio` in the terminal.
