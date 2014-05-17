function execute () {
	var obj = this;

	var localsProxy = new IoProxy(IoRootObject, function (message) {
		if (obj.hasOwnProperty(message)) {
			this.stopPrototypePropagation();
			var args = Array.prototype.slice.call(arguments, 1);
			return obj[message].apply(obj, args);
		}
	});

	var playerProxy = new IoProxy(IoRootObject, function (message) {
		if (message === 'chooseAction') {

			this.stopPrototypePropagation();

			var args = Array.prototype.slice.call(arguments, 1);
			var slot = this.findSlot(message);
			slot.activate.locals = localsProxy;

			// unwrap arguments
			args = args.map(function (arg) {
				if (arg.type === 'Block') {
					// IoMethod
					return function () {
						return arg.activate.apply(arg, arguments);
					};
				} else {
					// IoStringWrapper / IoNumberWrapper / IoBooleanWrapper
					return arg.slots.value;
				}
			});

			return slot.activate.apply(slot, [IoRootObject].concat(args));
		}
	});

	Lobby.slots['player'] = playerProxy;

