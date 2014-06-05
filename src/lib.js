
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
			console.warn("Object send: unrecognized message '" + message + "' from object of type " + getTypeOf(this));
		}
	};

	var Lobby = IoObject({type: 'Lobby'});
	Lobby.isLobby = true;

	var IoRootObject = IoObject({
		type: 'Object',
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
			return IoNil;
		},
		updateSlot: function (slot, value) {
			if (this.slots[slot]) {
				this.slots[slot] = value;
			} else {
				throw new Error("Object updateSlot: slot '" + slot + "' doesn't exist; cannot update");
			}
		},
		toIoString: function () {
			return IoStringWrapper("#" + getTypeOf(this) + " " + this.send("slotNames"));
		},
		proto: function () {
			return this.proto;
		},
		writeln: function (thing) {
			console.log(unwrapIoValue(thing.send('toIoString')));
			return IoNil;
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

	var IoNil = IoObject({
		type: 'Nil',
		toIoString: function () {
			return IoStringWrapper("nil");
		}
	}, IoRootObject);

	var IoNumber = IoObject({
		type: 'Number',
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
	}, IoRootObject);

	function IoNumberWrapper (value) {
		return IoObject({value: value}, IoNumber);
	}

	var IoString = IoObject({
		type: 'String',
		charAt: function (n) {
			n = unwrapIoValue(n);
			return IoStringWrapper(unwrapIoValue(this).charAt(n));
		},
		toIoString: function () {
			return this;
		}
	}, IoRootObject);
	
	function IoStringWrapper (value) {
		return IoObject({value: value}, IoString);
	}

	var IoTrue = IoObject({
		type: 'Boolean',
		and: function (other) {
			if (other.equals(this)) return this;
			else return IoFalse;
		},
		toIoString: function () {
			return IoStringWrapper("true");
		}
	}, IoRootObject);

	var IoFalse = IoObject({
		type: 'Boolean',
		and: function (other) {
			return IoFalse;
		},
		toIoString: function () {
			return IoStringWrapper("false");
		}
	}, IoRootObject);

	function IoBooleanWrapper (bool) {
		return bool ? IoTrue : IoFalse;
	}

	function IoThunk (f) {
		return {f:f, eval: function() {return f.apply(null, Array.prototype.slice.call(arguments));}};
	}

	var IoMethod = IoObject({
		type: 'Block',
		activate: null // defined later
	}, IoRootObject);

	// A proxy object for hooking into the messages of another
	// object and forwarding them, redirecting them, etc.
	// For internal use only.

	function IoProxy (forObject, action) {
		var p = IoObject({type: 'Proxy'}, forObject);
		
		p.send = function (message) {
			var result = action.apply(this, arguments);
			if (result) {
				return result;
			} else {
				return IoObject.send.apply(p, arguments);
			}
		};
		return p;
	}

	Lobby.slots['nil'] = IoNil;
	Lobby.slots['true'] = IoTrue;
	Lobby.slots['false'] = IoFalse;
	Lobby.slots['Object'] = IoRootObject;
	Lobby.slots['Lobby'] = Lobby;
	Lobby.proto = IoRootObject;

	function getTypeOf (ioValue) {
		if (!ioValue) {
			throw new Error('unwrapIoValue: attempt to unwrap invalid Io value ' + ioValue);
		}

		var type = ioValue.send('type');

		if (!type) {
			throw new Error('unwrapIoValue: attempt to unwrap value with invalid type ' + ioValue);
		}

		return type;
	}

	function unwrapIoValue (ioValue) {

		var type = getTypeOf(ioValue);

		switch (type) {
		case 'Nil':
			return undefined;
		case 'Number':
		case 'String':
		case 'Boolean':
			return ioValue.slots.value;
		default:
			throw new Error('unwrapIoValue: attempt to unwrap value with invalid type ' + ioValue);
		}
	}

	function wrapJSValue (jsValue) {

		if (jsValue === undefined || jsValue === null) {
			return IoNil;
		}

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
				if (this.obj && this.obj[message]) {
					if (typeof this.obj[message] === 'function') {
						var args = Array.prototype.slice.call(arguments, 1);
						args = args.map(_io.unwrapIoValue);
						return wrapJSValue(this.obj[message].apply(this.obj, args));
					} else {
						return wrapJSValue(this.obj[message]);
					}
				}
				return false;
			});
			actualProxy.obj = obj;

			return actualProxy;
		}
	};
	
	return {
		IoObject: IoObject,
		IoNil: IoNil,
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
		getTypeOf: getTypeOf,
		unwrapIoValue: unwrapIoValue,
		wrapJSValue: wrapJSValue,
		Proxy: Proxy,
	}
})();

if (typeof module !== 'undefined' && module.exports) {
	module.exports = _io;
}
