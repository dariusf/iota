
// Utility

Object.prototype.getName = function() { 
   var funcNameRegex = /function (.{1,})\(/;
   var results = (funcNameRegex).exec((this).constructor.toString());
   return (results && results.length > 1) ? results[1] : "";
};

// System code

function IoObject (slots, proto) {
	this.slots = slots || {};
	this.proto = proto;
}
IoObject.prototype.findSlot = function (slot) {
	if (this === IoRootObject || this.slots[slot]) { // use hasOwnProperty
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
				return slot.activate.apply(slot, args);
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
	setSlot: function (slot, value) {
		slot = slot.slots.value;
		this.slots[slot] = value;
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
			var args = Array.prototype.slice.call(arguments);

			var locals = new IoObject({}, Lobby);
			for (var i=0; i<args.length; i++) {
				locals.send('setSlot', IoStringWrapper(parameters[i]), args[i]);
				if (i > parameters) break;
			}

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
		return this.slots.value === other.slots.value ? IoTrue : IoFalse;
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

function IoThunk (f) {
	return {f:f, eval: function() {return f.apply(null, Array.prototype.slice.call(arguments));}};
}

var IoMethod = new IoObject({
	type: "Block",
	activate: null // defined later
}, IoRootObject);

Lobby.slots['true'] = IoTrue;
Lobby.slots['false'] = IoFalse;
Lobby.slots['IoRootObject'] = IoRootObject;
Lobby.slots['Lobby'] = Lobby;
Lobby.proto = IoRootObject;

// module.exports = {
	// IoObject: IoObject,
	// Lobby: Lobby,
	// IoRootObject: IoRootObject,
	// IoNumber: IoNumber,
	// IoNumberWrapper: IoNumberWrapper,
	// IoString: IoString,
	// IoStringWrapper: IoStringWrapper,
	// IoThunk: IoThunk,
	// IoMethod: IoMethod
// };

// Generated code

// runTests();

function runTests () {
	var Person = IoRootObject.send('clone', 'Person', false);
	Person.send('setSlot', 'legs', 2);
	var boy = Person.send('clone', 'Person', true);
	console.log(2 === boy.send('legs')); // true

	var Vehicle = IoRootObject.send('clone', 'Vehicle', false);
	Vehicle.send('setSlot', 'desc', 'Something to take you places');
	console.log(Vehicle.send('slotNames'));
	console.log(Vehicle.send('type'));
	console.log(Vehicle.send('desc'));

	var Car = Vehicle.send('clone', 'Car', false);
	console.log(Car.send('slotNames'));
	console.log(Car.send('type'));
	console.log(Car.send('desc'));

	var ferrari = Car.send('clone', 'Car', true);
	console.log(ferrari.send('slotNames'));
	console.log(ferrari.send('type'));
	console.log(ferrari.send('desc'));

	var a = IoNumberWrapper(1);
	var b = IoNumberWrapper(2);
	var c = a.send('plus', b);
	console.log(c.send('value'));

	var printSomething = IoMethod.send('clone');
	printSomething.body = IoThunk(function(locals) {
		var a = locals.send('a');
		var b = locals.send('b');
		console.log(a.send('plus', b));
	});
	printSomething.send('activate', printSomething, 'a', a, 'b', b);
}