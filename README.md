Turn your [Hyper](https://hyper.is/) terminal into nyan cat while typing. Audio included!

![Screen Capture](capture.gif?raw=true "Screen Capture")

To install, edit `~/.hyper.js` add add `hyper-cat` to `plugins`:

```
module.exports = {

  config: { /*... */ },

  plugins: [
    "hyper-cat"
  ]

};
```

You may then need to reload your terminal.
