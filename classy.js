var Class = new (function() {
	"use strict";
	
	// Private vars
	// Our class constructor
	var Class;
	
	function createClassMethod(name, fn) {
		var classMethod = function() {
			var args = arguments,
			ret;
	
			this._super = function() {
				if (typeof Class.prototype[name] !== "function")
					throw new TypeError("There is no super function for " + name);
				if (arguments[0] === this._context)
					Class.prototype[name].apply(Class.prototype, args);
				else
					Class.prototype[name].apply(Class.prototype, arguments);
			}
			this._context = { execute_in_context: true }; // Use an arbitrary object for our token
	
			ret = classMethod.fn.apply(this, args);
			delete this._super; delete this._context;
			return ret;
		};
		classMethod.fn = fn;
		
		return classMethod;
	}
	
	// Needs to have its scope specified. Call like makeProperty.call(this, args, go, here) or makeProperty.apply(this, [args, go, here])
	function makeProperty(sourceObj, property) {
		if (typeof sourceObj[property] === "function") {
				// Create wrapper function for function calls
				this[property] = createClassMethod(property, sourceObj[property]);
			} else
				this[property] = sourceObj[property];
	}
	
	// Public properties
	this.noNew = function() {
		if (arguments[0] != null)
			noNew = arguments[0];
		return noNew;
	};
	var noNew = false;
	
	this.create = function(objOrConstructor, prototype, statics) {
		
		var noInit = { noInit: true };
		// Make our constructor fn
		Class = function() {
			var obj, _this;
			
			if (noNew)
				_this = {};
			else
				_this = this;
			
			if (this === window && !noNew)
				throw "Must use new when instantiating a class.";
			
			if (typeof objOrConstructor === "function")
				obj = new objOrConstructor();
			else
				obj = objOrConstructor;
		
			for (var i in obj) {
				if (obj.hasOwnProperty(i)) {
					makeProperty.call(_this, obj, i);
				}
			}
			
			// Make static properties
			Class.statics(statics);
			
			// Give some properties for free
			this._implement = function(objOrConstructorOrPropName, value) {
				var type = typeof objOrConstructorOrPropName;
				if (type === "string") {
					obj = {};
					obj[objOrConstructorOrPropName] = value;
				} else if (type === "function")
					obj = new objOrConstructorOrPropName();
				else
					obj = objOrConstructorOrPropName;
				
				for (var i in obj) {
					if (obj.hasOwnProperty(i)) {
						if (typeof obj[i] === "function") {
							if (typeof _this[i] === "function")
								_this[i].fn = obj[i];
							else
								_this[i] = createClassMethod.call(_this, i, obj[i]);
						} else
							_this[i] = obj[i];
					}
				}
			};
			
			// Initialize our function
			if (typeof _this._init === "function" && arguments[0] !== noInit)
				_this._init.apply(_this, arguments);
			
			if (noNew)
				return _this;
		};
	
		// Classes methods
		Class.extend = function(objOrConstructor, statics) {
			return window.Class.create(objOrConstructor, this, statics);
		};
		
		Class.statics = function(objOrConstructor) {
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
				Class[i] = statics[i];
			}
			
			return Class;
		};
		
		Class._new = function() {
			var ret = new this(noInit);
			if (typeof ret._init === "function")
				ret._init.apply(this, arguments);
			return ret;
		}
		
		Class.New = Class._new;
	
		// Finish up with the prototype stuff
		if (typeof prototype === "function")
			prototype = new prototype(noInit); // Will not initialize
		Class.prototype = prototype || {};
		Class.prototype.constructor = Class;
		return Class;
	}
});
