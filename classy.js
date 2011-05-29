function Class() {
	"use strict";
	
	function classMethod(constructor, name, fn) {
		var args = arguments,
		ret;
	
		this._super = function() {
			if (typeof constructor.prototype[name] !== "function")
				throw new TypeError("There is no super function for " + name);
			if (arguments[0] === this._context)
				constructor.prototype[name].apply(constructor.prototype, args);
			else
				constructor.prototype[name].apply(constructor.prototype, arguments);
		}
		this._context = { execute_in_context: true }; // Use an arbitrary object for our token
	
		ret = fn.apply(this, args);
		delete this._super; delete this._context;
		return ret;
	}
	
	this.create: function(objOrConstructor, prototype, statics) {
		
		var noInit = { noInit: true };
		// Make our constructor fn
		var constructor = function() {
			var _this;
			
			if (!(this instanceof constructor))
				throw "Must use new when instantiating constructor.";
			
			if (typeof objOrConstructor === "function")
				_this = new objOrConstructor();
			else
				_this = objOrConstructor;
		
			for (var i in _this) {
				if (_this.hasOwnProperty(i)) {
					if (typeof _this[i] === "function") {
						// Create wrapper function for function calls
						this[i] = classMethod(constructor, i, _this[i]);
					} else 
						this[i] = _this[i];
				}
			}
			
			// Make static properties
			constructor.statics(statics);
			
			// Initialize our function
			if (typeof this._init === "function" && arguments[0] !== noInit)
				this._init.apply(this, arguments);
		};
	
		// Classes methods
		constructor.extend = function(objOrConstructor, statics) {
			return Class.create(objOrConstructor, this, statics);
		};
		
		constructor.statics = function(objOrConstructor) {
			var all = arguments.length,
			args = [];
			for (var i=0; i < all; i++) {
				args.push(arguments[i]);
			}
			
			if (typeof objOrConstructor === "function")
				var statics = new objOrConstructor();
			else
				var statics = objOrConstructor;
				
			for (i in statics) {
				constructor[i] = statics[i];
			}
			
			return constructor;
		};
	
		// Finish up with the prototype stuff
		if (typeof prototype === "function")
			prototype = new prototype(noInit); // Will not initialize
		constructor.prototype = prototype || {};
		constructor.prototype.constructor = constructor;
		return constructor;
	}
	
})();
