var Class = new (function() {
	"use strict";
	
	// Private vars
	// Our class constructor
	var Class,
	scope = this,
	priv = {};
	
	priv.determineObject = function(objOrConstructorOrProperty, valueOrNoInitOrNull) {
		var type = typeof objOrConstructorOrProperty,
		ret;
		if (type === "string") {
			ret = {};
			ret[objOrConstructorOrProperty] = valueOrNoInitOrNull;
		} else if (type === "function")
			ret = new objOrConstructorOrProperty(valueOrNoInitOrNull);
		else
			ret = objOrConstructorOrProperty;
		return ret;
	};
	
	priv.createClassMethod = function(name, fn, prototype, privates) {
		prototype = prototype || Class.prototype;
		var classMethod = function() {
			var args = arguments,
			ret;
	
			this._super = function() {
				if (typeof prototype[name] !== "function")
					throw new TypeError("There is no super function for " + name);
				if (arguments[0] === this._context) {
					var arr = [], // We will need this only to use its methods on arguments
					all, i;
					
					// Get arguments after this._context and push them to args
					all = arguments.length;
					for (i=1; i < all; i++)
						arr.push.call(args, arguments[i]);
					
					// Use args instead of arguments so that we use createClassMethod's arguments
					return prototype[name].apply(prototype, args);
				} else
					return prototype[name].apply(Class.prototype, arguments);
			};
			
			this._context = { use_context: true }; // Use an arbitrary object for our token
			this._private = privates;
	
			ret = classMethod.fn.apply(this, args);

			// Delete the properties we created for the method being called.
			delete this._super;
			delete this._context;
			delete this._private;

			// Return result of function
			return ret;
		};
		classMethod.fn = fn;
		
		return classMethod;
	};
	
	priv.createProperty = function(toObj, sourceObj, property, prototype) {
		if (typeof sourceObj[property] === "function") {
			// Create wrapper function for function calls
			toObj[property] = priv.createClassMethod(property, sourceObj[property], prototype, sourceObj.privates);
		} else if (property !== 'privates')
			toObj[property] = sourceObj[property];
		return toObj;
	};
	
	priv.createClassConstructor = function(locals) {
		Class = function() {
			var _this = this;
			
			priv.buildPropertiesFromObj(_this, locals);
			
			// Give some properties for free
			priv.buildFreeProperties(_this);
			
			// Initialize our function
			if (typeof _this._init === "function" && arguments[0] !== this.noInit)
				_this._init.apply(_this, arguments);
		};
		return Class;
	};
	
	priv.buildFreeProperties = function(_this) {
		_this._implement = function(objOrConstructorOrPropName, valueOrNull) {
			var obj = priv.determineObject(objOrConstructorOrPropName, valueOrNull);
			
			for (var i in obj) {
				if (obj.hasOwnProperty(i)) {
					if (typeof obj[i] === "function") {
						if (typeof _this[i] === "function")
							_this[i].fn = obj[i];
						else
							_this[i] = priv.createClassMethod.call(_this, i, obj[i]);
					} else
						_this[i] = obj[i];
				}
			}
			
			return _this;
		};
		
		return _this;
	};
	
	priv.buildPropertiesFromObj = function(_this, objOrConstructorOrProperty, valueOrNull, prototypeOrNull) {
		var obj = priv.determineObject(objOrConstructorOrProperty, valueOrNull);
		for (var i in obj) {
			if (obj.hasOwnProperty(i)) {
				priv.createProperty(_this, obj, i, prototypeOrNull);
			}
		}
	};
	
	// Public properties
	this.noInit = { noInit: true };
	
	this.config = function(configObjOrProperty, valueOrNull) {
		var config = priv.determineObject(configObjOrProperty, valueOrNull);
		
		for (var i in config) {
			if (config.hasOwnProperty(i))
				scope[i] = config[i];
		}
	};
	
	this.simple = function(obj, prototype) {
		var SimpleClass = function(_this) {
			for (var i in _this) {
				if (_this.hasOwnProperty(i))
					this[i] = _this[i];
			}
		};
		SimpleClass.prototype = prototype;
		SimpleClass.prototype.constructor = SimpleClass;
		
		var ret = new SimpleClass(obj);
		
		// Make sure arrays work right
		if (prototype instanceof Array) {
			var all = obj.length;
			for (var i=0; i < all; i++)
				ret.push(obj[i]);
		}
		
		return ret;
	};
	
	this.create = function(objOrConstructor, prototype) {
		
		var statics,
		protoConstructor,
		proto;
		
		if (typeof prototype === "function") {
			protoConstructor = prototype;
			proto = new prototype(this.noInit);
		} else {
			protoConstructor = null;
			proto = prototype || {};
		}
		
		// Make our constructor fn
		if (objOrConstructor)
			Class = priv.createClassConstructor(objOrConstructor);
		else
			Class = {};
		
		// Build prototype of Class
		Class.prototype = proto || {};
		Class.prototype.constructor = Class;
	
		// Class's methods
		Class.extend = function(objOrConstructor, statics) {
			return scope.create(objOrConstructor, this, statics);
		};
		
		// The class itself has the methods and properties created here
		Class.statics = function(objOrConstructor) {
			priv.buildPropertiesFromObj(Class, objOrConstructor, null, 
				(protoConstructor || proto.constructor || function() {}) ); // The last arg is the prototype
			return Class;
		};
		
		Class.shared = function(objOrConstructorOrProperty, valueOrNull) {
			var protosPrototype = (protoConstructor) ? protoConstructor.prototype : proto.constructor.prototype;
			priv.buildPropertiesFromObj(proto, objOrConstructorOrProperty, valueOrNull, protosPrototype);
			return Class;
		};
		
		var privates = {};
		Class.privates = function(objOrConstructorOrProperty, valueOrNull) {
			privates = priv.determineObject(objOrConstructorOrProperty, valueOrNull);
			return Class;
		};
		
		Class.locals = function(objOrConstructorOrProperty, valueOrNull) {
			var locals = priv.determineObject(objOrConstructorOrProperty, valueOrNull);
			locals.privates = privates;
			Class = scope.create(locals, prototype);
			return Class;
		};
		
		Class._new = function() {
			var ret = new this(scope.noInit);
			if (typeof ret._init === "function")
				ret._init.apply(this, arguments);
			return ret;
		};
		
		Class.New = Class._new;
		
		// This line returns Class and also makes sure it inherits its parent's class only functions
		return Class;//.statics({});
	};
})();

(function() {
	try {
		for (var i in Class) {
			if (Class.hasOwnProperty(i))
				exports[i] = Class[i];
		}
	} catch (e) {}
})();
