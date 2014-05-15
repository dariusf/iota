
function IoObject (slots, proto) {
	this.slots = slots || {};
	this.proto = proto;
}
IoObject.prototype.findSlot = function (slot) {
	if (this === IoRootObject || this.slots.hasOwnProperty(slot)) {
		return this.slots[slot];
	} else if (this.proto) {
		return this.proto.findSlot(slot);
	} else {
		return null;
	}
}
IoObject.prototype.send = function (message) {
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
		console.log("unrecognized message '" + message + "'");
	}
};

var Lobby = new IoObject();

var IoRootObject = new IoObject({
	type: "Object",
	clone: function (name, instance) {
		var slots = {};
		if (!instance) {
			slots.type = name;
		}
		return new IoObject(slots, this);
	},
	slotNames: function () {
		return Object.keys(this.slots);
	},
	getSlot: function (slotName) {
		// TODO this method only works for user-defined methods for now,
		// which are IoObjects and can respond to messages.
		// At the moment all primitive methods are raw functions and won't work.
		slotName = slotName.slots.value;
		var slot = this.findSlot(slotName);
		return slot;
	},
	setSlot: function (slot, value) {
		slot = slot.slots.value;
		this.slots[slot] = value;
		return null; // IoNil
	},
	updateSlot: function (slot, value) {
		if (this.slots[slot]) {
			this.slots[slot] = value;
		} else {
			throw "cannot update slot '" + slot + "' that doesn't exist";
		}
	},
	toIoString: function () {
		return IoStringWrapper("#" + this.type + " " + this.send("slotNames"));
	},
	proto: function () {
		return this.proto;
	},
	writeln: function (thing) {
		console.log(thing.send('toIoString').slots.value);
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

			var locals = method.activate.locals || new IoObject({}, self);
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
		if (condition === IoTrue) {
			return conseq.eval();
		}
		else {
			return alt.eval();
		}
	},
	"==": function (other) {
		return IoBooleanWrapper(this === other);
	}
}, Lobby);

var IoNumber = new IoObject({
	"+": function (other) {
		return IoNumberWrapper(this.slots.value + other.slots.value);
	},
	"*": function (other) {
		return IoNumberWrapper(this.slots.value * other.slots.value);
	},
	"-": function (other) {
		return IoNumberWrapper(this.slots.value - other.slots.value);
	},
	"==": function (other) {
		return IoBooleanWrapper(this.slots.value === other.slots.value);
	},
	toIoString: function () {
		return IoStringWrapper(this.slots.value);
	}
}, IoObject);
function IoNumberWrapper (value) {
	return new IoObject({value: value}, IoNumber);
}

var IoString = new IoObject({
	charAt: function (n) {
		n = n.slots.value;
		return IoStringWrapper(this.slots.value.charAt(n));
	},
	toIoString: function () {
		return this;
	}
}, IoObject);
function IoStringWrapper (value) {
	return new IoObject({value: value}, IoString);
}

var IoTrue = new IoObject({
	and: function (other) {
		if (other === this) return this;
		else return IoFalse;
	},
	toIoString: function () {
		return IoStringWrapper("true");
	}
}, IoObject);

var IoFalse = new IoObject({
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

var IoMethod = new IoObject({
	type: "Block",
	activate: null // defined later
}, IoRootObject);

// A proxy object for hooking into the messages of another
// object and forwarding them, redirecting them, etc.
// For internal use only.

function IoProxy (forObject, action) {
	var p = new IoObject({type: "Proxy"}, forObject);
	var stop = false;

	p.send = function (message) {
		var result = action.apply(this, arguments);
		if (stop) {
			return result;
		} else {
			return IoObject.prototype.send.apply(p, arguments);
		}
	};
	p.stopPrototypePropagation = function () {
		stop = true;
	};
	return p;
}

Lobby.slots['true'] = IoTrue;
Lobby.slots['false'] = IoFalse;
Lobby.slots['Object'] = IoRootObject;
Lobby.slots['Lobby'] = Lobby;
Lobby.proto = IoRootObject;