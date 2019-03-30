Turn your [Hyper](https://hyper.is/) terminal into nyan cat while typing. Audio included!

![Screen Capture](capture.gif?raw=true "Screen Capture")

To install, edit `~/.hyper.js` and add `hyper-cat` to `plugins`:

```js
module.exports = {
  ...
  plugins: [
    "hyper-cat"
  ]
  ...
};
```

You may then need to reload your terminal.

## Configuration

Configuration can by applied by editing `~/.hyper.js` as follows:

```js
module.exports = {
  config: {
    ...
    hyperCat: {
      // The number of pixels the cat and rainbow should jump up and down.
      staggerHeight: 2, 
      // The max opacity of the rainbow.
      rainbowMaxAlpha: 1, 
      // When nyan audio shall be enabled:
      //   true will always play nyan audio
      //   false will never play nyan audio
      //   "whileTyping" will play nyan audio while typing
      audioEnabled: "whileTyping", 
      // When nyan video shall be enabled:
      //   true will always play nyan video
      //   false will never play nyan video
      //   "whileTyping" will play nyan video while typing
      videoEnabled: "whileTyping"
    }
    ...
  }
}
```
