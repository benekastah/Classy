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
	
	priv.createClassMethod = function(name, fn, prototype) {
		var prototype = prototype || Class.prototype;
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
					prototype[name].apply(prototype, args);
				} else
					prototype[name].apply(Class.prototype, arguments);
			}
			this._context = { use_context: true }; // Use an arbitrary object for our token
	
			ret = classMethod.fn.apply(this, args);
			delete this._super; delete this._context;
			return ret;
		};
		classMethod.fn = fn;
		
		return classMethod;
	};
	
	priv.createProperty = function(toObj, sourceObj, property, prototype) {
		if (typeof sourceObj[property] === "function") {
			// Create wrapper function for function calls
			toObj[property] = priv.createClassMethod(property, sourceObj[property], prototype);
		} else
			toObj[property] = sourceObj[property];
		return toObj;
	};
	
	priv.createClassConstructor = function(objOrConstructor) {
		Class = function() {
			var _this = this;
			//var _this = {};
			
			priv.buildPropertiesFromObj(_this, objOrConstructor);
			
			// Give some properties for free
			priv.buildFreeProperties(_this);
			
			// Initialize our function
			if (typeof _this._init === "function" && arguments[0] !== this.noInit)
				_this._init.apply(_this, arguments);
			
			//return _this;
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
							_this[i] = createClassMethod.call(_this, i, obj[i]);
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
	}
	
	// Public properties
	this.noInit = { noInit: true };
	
	this.config = function(configObjOrProperty, valueOrNull) {
		var config = determineObject(configObjOrProperty, valueOrNull);
		
		for (var i in config) {
			if (config.hasOwnProperty(i))
				scope[i] = config[i];
		}
	}
	
	this.simple = function(obj, prototype) {
		var simpleClass = function(_this) {
			for (var i in _this) {
				if (_this.hasOwnProperty(i))
					this[i] = _this[i];
			}
		}
		simpleClass.prototype = prototype;
		simpleClass.prototype.constructor = simpleClass;
		
		var ret = new simpleClass(obj);
		
		// Make sure arrays work right
		if (prototype instanceof Array) {
			var all = obj.length;
			for (var i=0; i < all; i++)
				ret.push(obj[i]);
		}
		
		return ret;
	}
	
	this.create = function(objOrConstructor, prototype, statics) {
		
		var statics,
		protoConstructor,
		proto;
		
		if (typeof prototype === "function") {
			protoConstructor = prototype;
			proto = new prototype(this.noInit);
		} else {
			protoConstructor = null;
			proto = prototype;
		}
		
		// Make our constructor fn
		Class = priv.createClassConstructor(objOrConstructor || {});
		
		// Build prototype of Class
		//var proto = priv.determineObject(prototype, this.noInit);
		Class.prototype = proto || {};
		Class.prototype.constructor = Class;
	
		// Class's methods
		Class.extend = function(objOrConstructor, statics) {
			return window.Class.create(objOrConstructor, this, statics);
		};
		
		// The class itself has the methods and properties created here
		Class.statics = function(objOrConstructor) {
			if (!statics) {
				var staticsConstructor = function(_this, objOrConstructor, prototype) {
					var obj = priv.determineObject(objOrConstructor);
					priv.buildPropertiesFromObj(_this, obj, null, prototype);
					return _this;
				}
				if (typeof prototype === "function")
					staticsConstructor.prototype = prototype;
				else
					staticsConstructor.prototype = function() {};
				staticsConstructor.prototype.constructor = staticsConstructor;
				
				statics = new staticsConstructor(Class, objOrConstructor, prototype);
			} else
				priv.buildPropertiesFromObj(Class, objOrConstructor);
			return Class;
		};
		
		Class.shared = function(objOrConstructorOrProperty, valueOrNull) {
			var protosPrototype = (protoConstructor || {}).prototype || proto.constructor.prototype;
			priv.buildPropertiesFromObj(proto, objOrConstructorOrProperty, valueOrNull, protosPrototype);
			return Class;
		};
		
		Class.privates;
		
		Class.locals;
		
		Class._new = function() {
			var ret = new this(this.noInit);
			if (typeof ret._init === "function")
				ret._init.apply(this, arguments);
			return ret;
		}
		
		Class.New = Class._new;
		
		// This line returns Class and also makes sure it inherits its parent's classOnly functions
		return Class.statics({});
	}
});
