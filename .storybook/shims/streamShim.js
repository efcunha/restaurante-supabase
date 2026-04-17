// Shim for Node.js 'stream' module
import EventEmitter from './eventsNodeShim.js';

export class Readable extends EventEmitter {
  constructor(options = {}) {
    super();
    this.readableLength = 0;
    this.readableFlowing = null;
  }

  read(size) {
    return null;
  }

  pause() {
    this.readableFlowing = false;
    return this;
  }

  resume() {
    this.readableFlowing = true;
    return this;
  }

  pipe(dest, options) {
    return dest;
  }

  unpipe(dest) {
    return this;
  }

  on(event, listener) {
    return super.on(event, listener);
  }

  once(event, listener) {
    return super.once(event, listener);
  }
}

export class Writable extends EventEmitter {
  constructor(options = {}) {
    super();
    this.writableLength = 0;
  }

  write(chunk, encoding, callback) {
    if (callback) callback();
    return true;
  }

  end(chunk, encoding, callback) {
    if (callback) callback();
    return this;
  }

  on(event, listener) {
    return super.on(event, listener);
  }

  once(event, listener) {
    return super.once(event, listener);
  }
}

export class Transform extends Writable {
  constructor(options = {}) {
    super(options);
  }

  _transform(chunk, encoding, callback) {
    callback(null, chunk);
  }
}

export class PassThrough extends Transform {
  constructor(options = {}) {
    super(options);
  }
}

export class Duplex extends Readable {
  constructor(options = {}) {
    super(options);
    this.writableLength = 0;
  }

  write(chunk, encoding, callback) {
    if (callback) callback();
    return true;
  }

  end(chunk, encoding, callback) {
    if (callback) callback();
    return this;
  }
}

export default {
  Readable,
  Writable,
  Transform,
  PassThrough,
  Duplex,
};
