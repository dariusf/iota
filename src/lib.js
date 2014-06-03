
var _io = (function () {

	function IoObject (slots, proto) {
		var self = {};
		self.slots = slots || {};
		self.proto = proto;

		self.identity = Math.random() + "";

		self.findSlot = IoObject.findSlot;
		self.send = IoObject.send;
		self.equals = IoObject.equals;

		return self;
	}

	IoObject.equals = function (other) {
		return this.identity === other.identity;
	};

	IoObject.findSlot = function (slot) {
		if (this.isRootObject || this.slots.hasOwnProperty(slot)) {
			return this.slots[slot];
		} else if (this.proto) {
			return this.proto.findSlot(slot);
		} else {
			return null;
		}
	};

	IoObject.send = function (message) {
		var args = Array.prototype.slice.call(arguments, 1);
		var slot = this.findSlot(message);

		if (slot) {
			if (typeof slot === 'function') {
				return slot.apply(this, args);
			} else {
				if (slot.activate) {
					return slot.activate.apply(slot, [this].concat(args));
				} else {
					return slot;
				}
			}
		} else {
			console.warn("Object send: unrecognized message '" + message + "'");
		}
	};

	var Lobby = IoObject();
	Lobby.isLobby = true;

	var IoRootObject = IoObject({
		type: "Object",
		clone: function (name, instance) {
			var slots = {};
			if (!instance) {
				slots.type = name;
			}
			return IoObject(slots, this);
		},
		slotNames: function () {
			return Object.keys(this.slots);
		},
		getSlot: function (slotName) {
			// TODO this method only works for user-defined methods for now,
			// which are IoObjects and can respond to messages.
			// At the moment all primitive methods are raw functions and won't work.
			slotName = unwrapIoValue(slotName);
			var slot = this.findSlot(slotName);
			return slot;
		},
		setSlot: function (slot, value) {
			slot = unwrapIoValue(slot);
			this.slots[slot] = value;
			return null; // IoNil
		},
		updateSlot: function (slot, value) {
			if (this.slots[slot]) {
				this.slots[slot] = value;
			} else {
				throw new Error("Object updateSlot: slot '" + slot + "' doesn't exist; cannot update");
			}
		},
		toIoString: function () {
			return IoStringWrapper("#" + this.type + " " + this.send("slotNames"));
		},
		proto: function () {
			return this.proto;
		},
		writeln: function (thing) {
			console.log(unwrapIoValue(thing.send('toIoString')));
		},
		method: function () {
			var args = Array.prototype.slice.call(arguments);
			var parameters = args.slice(0, args.length-1);
			var thunk = args[args.length-1];

			var method = IoMethod.send('clone');
			method.body = thunk;

			method.activate = function () {
				var self = arguments[0];
				var args = Array.prototype.slice.call(arguments, 1);

				var locals = IoObject({}, self);
				for (var i=0; i<args.length; i++) {
					locals.send('setSlot', IoStringWrapper(parameters[i]), args[i]);
					if (i > parameters) break; // over-application
				}
				locals.send('setSlot', IoStringWrapper('self'), self);

				return this.body.eval(locals);
			};

			return method;
		},
		if: function (condition, conseq, alt) {
			if (condition.equals(IoTrue)) {
				return conseq.eval();
			}
			else {
				return alt.eval();
			}
		},
		"==": function (other) {
			return IoBooleanWrapper(this.equals(other));
		}
	}, Lobby);
	IoRootObject.isRootObject = true;

	var IoNumber = IoObject({
		"+": function (other) {
			return IoNumberWrapper(unwrapIoValue(this) + unwrapIoValue(other));
		},
		"*": function (other) {
			return IoNumberWrapper(unwrapIoValue(this) * unwrapIoValue(other));
		},
		"-": function (other) {
			return IoNumberWrapper(unwrapIoValue(this) - unwrapIoValue(other));
		},
		"==": function (other) {
			return IoBooleanWrapper(unwrapIoValue(this) === unwrapIoValue(other));
		},
		toIoString: function () {
			return IoStringWrapper(unwrapIoValue(this));
		}
	}, IoObject);

	function IoNumberWrapper (value) {
		return IoObject({value: value}, IoNumber);
	}

	var IoString = IoObject({
		charAt: function (n) {
			n = unwrapIoValue(n);
			return IoStringWrapper(unwrapIoValue(this).charAt(n));
		},
		toIoString: function () {
			return this;
		}
	}, IoObject);
	
	function IoStringWrapper (value) {
		return IoObject({value: value}, IoString);
	}

	var IoTrue = IoObject({
		and: function (other) {
			if (other.equals(this)) return this;
			else return IoFalse;
		},
		toIoString: function () {
			return IoStringWrapper("true");
		}
	}, IoObject);

	var IoFalse = IoObject({
		and: function (other) {
			return IoFalse;
		},
		toIoString: function () {
			return IoStringWrapper("false");
		}
	}, IoObject);
	function IoBooleanWrapper (bool) {
		return bool ? IoTrue : IoFalse;
	}

	function IoThunk (f) {
		return {f:f, eval: function() {return f.apply(null, Array.prototype.slice.call(arguments));}};
	}

	var IoMethod = IoObject({
		type: "Block",
		activate: null // defined later
	}, IoRootObject);

	// A proxy object for hooking into the messages of another
	// object and forwarding them, redirecting them, etc.
	// For internal use only.

	function IoProxy (forObject, action) {
		var p = IoObject({type: "Proxy"}, forObject);
		
		p.stop = false;
		p.send = function (message) {
			var result = action.apply(this, arguments);
			if (this.stop) {
				return result;
			} else {
				return IoObject.send.apply(p, arguments);
			}
		};
		p.stopPrototypePropagation = function () {
			this.stop = true;
		};
		return p;
	}

	Lobby.slots['true'] = IoTrue;
	Lobby.slots['false'] = IoFalse;
	Lobby.slots['Object'] = IoRootObject;
	Lobby.slots['Lobby'] = Lobby;
	Lobby.proto = IoRootObject;

	function unwrapIoValue (ioValue) {
		if (ioValue.type === 'Block') {
			// IoMethod
			return function () {
				return ioValue.activate.apply(ioValue, arguments);
			};
		} else {
			// IoNumber, IoString, IoBoolean
			return ioValue.slots.value;
		}
	}

	function wrapJSValue (jsValue) {
		if (!jsValue) return null; // IoNil
		var type = typeof jsValue;
		switch (type) {
		case 'number':
			return IoNumberWrapper(jsValue);
		case 'string':
			return IoStringWrapper(jsValue);
		case 'boolean':
			return IoBooleanWrapper(jsValue);
		case 'function':
			throw new Error('wrapJSValue: wrapping functions is not yet implemented');
		default:
			throw new Error('wrapJSValue: invalid object type ' + type);
		}
	}

	var Proxy = {
		set: function(obj) {
			var actualProxy = IoProxy(Lobby, function(message) {
				if (this.obj && this.obj.hasOwnProperty(message)) {
					this.stopPrototypePropagation();
					var args = Array.prototype.slice.call(arguments, 1);
					args = args.map(_io.unwrapIoValue);
					return wrapJSValue(this.obj[message].apply(this.obj, args));
				}
			});
			actualProxy.obj = obj;

			return actualProxy;
		}
	};
	
	return {
		IoObject: IoObject,
		IoNumber: IoNumber,
		IoNumberWrapper: IoNumberWrapper,
		IoString: IoString,
		IoStringWrapper: IoStringWrapper,
		IoTrue: IoTrue,
		IoFalse: IoFalse,
		IoBooleanWrapper: IoBooleanWrapper,
		IoThunk: IoThunk,
		IoMethod: IoMethod,
		IoProxy: IoProxy,
		Lobby: Lobby,
		IoRootObject: IoRootObject,
		unwrapIoValue: unwrapIoValue,
		wrapJSValue: wrapJSValue,
		Proxy: Proxy,
	}
})();

if (typeof module !== 'undefined' && module.exports) {
	module.exports = _io;
}
