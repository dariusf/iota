
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
			throw new Error("Object send: unrecognized message '" + message + "'");
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
			method.slots.type = IoMethod.slots.type; // TODO get rid of this once clone properly sets the type field
			method.body = thunk;
			method.parameters = parameters;
			method.self = this;

			method.activate = function () {
				var self = arguments[0];
				var args = Array.prototype.slice.call(arguments, 1);

				var locals = IoObject({}, self);
				for (var i=0; i<args.length; i++) {
					locals.send('setSlot', IoStringWrapper(this.parameters[i]), args[i]);
					if (i > this.parameters) break; // over-application
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

	function isJSPrimitive (value) {
		var type = typeof value;
		switch (type) {
		case 'number':
		case 'string':
		case 'boolean':
		case 'function':
			return true;
		case 'object':
			// Is there a less duck-typed way to do this?
			return value.slots === undefined;
		default:
			throw new Error('isJSPrimitive: invalid value ' + value + ' of type ' + type);
		}
	}

	function getTypeOf (ioValue) {
		if (!ioValue) {
			throw new Error('getTypeOf: attempt to get type of invalid Io value ' + ioValue);
		}

		if (typeof ioValue === 'function') {
			// Assuming this isn't a bug... the value is either a
			// native method or a wrapped external method
			return 'Block';
		}

		var type = ioValue.send('type');

		if (!type) {
			throw new Error('getTypeOf: invalid type ' + ioValue);
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
			return ioValue.slots.value;
		case 'Boolean':
			return ioValue.equals(IoTrue);
		case 'Block':
			// To wrap a block, we wrap it in a function which
			// activates the original Io method when applied.
			// The appropriate Io context is kept.

			return function () {
				var args = Array.prototype.slice.call(arguments).map(_io.wrapJSValue);
				if (ioValue.activate) {
					return unwrapIoValue(ioValue.activate.apply(ioValue, [ioValue.self].concat(args)));
				} else {
					throw new Error('unwrapIoValue: Io method has type \'Block\' but does not have an activation method');
				}
			};
		default:
			var obj = {};
			Object.keys(ioValue.slots).forEach(function (slotKey) {

				var value = ioValue.slots[slotKey];
				
				// This has to be done because Io object slots might
				// contain JS primitives (the type of an IoString can't
				// be an IoString, for example - infinite loop).

				// For now it's assumed that if an Io object slot contains
				// a primitive value (and if it's not a bug), the value is a
				// library primitive and shouldn't be copied out.
				// This rule might not always hold.

				if (!isJSPrimitive(value)) {
					obj[slotKey] = unwrapIoValue(value);
				}
			});
			return obj;
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
		case 'object':
			var obj = IoObject({type: 'JSObject'}, IoRootObject);
			Object.keys(jsValue).forEach(function (key) {
				obj.slots[key] = wrapJSValue(jsValue[key]);
			});
			return obj;
		case 'function':
			
			// We use the fact that most library methods are vanilla
			// functions to simply return a vanilla function.
			// Additional type safety would probably be a good idea
			// here... eventually

			return jsValue;
		default:
			throw new Error('wrapJSValue: invalid object type ' + type);
		}
	}

	// A special proxy for JavaScript interop

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
	};
})();

if (typeof module !== 'undefined' && module.exports) {
	module.exports = _io;
}
