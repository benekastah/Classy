var Mixer = function(objOrConstructor) {
	var mixer;
	if (typeof objOrConstructor !== "function")
		mixer = function() {
			var obj = objOrConstructor;
			for (var key in obj) {
				if (obj.hasOwnProperty(key))
					this[key] = obj[key];
			}
		};
	else
		mixer = objOrConstructor;
	
	mixer.mixto = function(obj, config) {
		this.call(obj, config);
		return this;
	};
	
	mixer.make = function(config) {
		var ret = {};
		this.mixto(ret, config);
		return ret;
	};
	
	return mixer;
};

var Singleton = function(objOrConstructor, prototype) {
	var Singleton = Class.create(objOrConstructor, prototype);
	var ret = new Singleton(Class.noInit);
	ret.extend = Singleton.extend;
	ret.singleton = Singleton.singleton;
	
	if (!Class.noInit)
		ret.initialize();
	return ret;
};

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
	
	priv.createClassMethod = function(name, fn, prototype, privates, shared, statics) {
		prototype = prototype || Class.prototype;
		var classMethod = function() {
			var args = arguments,
			ret;
			
			mountSpecialProperties.call(this, prototype, privates, shared, statics);
			
			this._supr = function() {
				if (typeof prototype[name] !== "function")
					throw new TypeError("There is no super function for " + name);
				else
					return prototype[name].apply(Class.prototype, arguments);
			};
	
			ret = classMethod.fn.apply(this, args);

			unmountSpecialProperties.call(this, prototype, privates, shared, statics);

			// Return result of function
			return ret;
		};
		classMethod.fn = fn;
		// Account for properties and methods added to class methods
		for (var item in fn) {
			if (fn.hasOwnProperty(item))
				classMethod[item] = fn[item];
		}
		
		return classMethod;
		
		function mountSpecialProperties(prototype, privates, shared, statics) {
		   mountPrivateProperties.call(this, privates);
		   mountSharedProperties.call(this, shared, prototype);
		   mountStaticProperties.call(this, statics);
		}
		
		function unmountSpecialProperties(prototype, privates, shared, statics) {
		   // Order matters
		   unmountPrivateProperties.call(this, privates);
		   unmountStaticProperties.call(this, statics);
		   unmountSharedProperties.call(this, shared, prototype);
		}
		
		function mountPrivateProperties(privates) {
		   for (var i in privates) {
		      if (this.hasOwnProperty(i)) {
		         if (this["_" + i] == undefined)
		            this["_" + i] = privates[i];
		      }
		   }
		}
		
		function unmountPrivateProperties(privates) {
		   for (var i in this) {
		      if (this.hasOwnProperty(i)) {
		         var new_i;
		         if ((new_i = i.replace(/^_/, '')) !== i) {
		            privates[new_i] = this[i];
		            delete this[i];
		         }
		      }
		   }
		}
		
		function mountSharedProperties(shared, prototype) {
		   for (var i in prototype) {
		      if (prototype.hasOwnProperty(i)) {
		         if (this['$' + i] == undefined)
		            this["$" + i] = prototype[i];
		      }
		   }
		}
		
		function unmountSharedProperties(shared, prototype) {
		   for (var i in this) {
		      if (this.hasOwnProperty(i)) {
		         var new_i;
		         if ((new_i = i.replace(/^\$/, '')) !== i) {
		            prototype[new_i] = this[i];
		            delete this[i];
		         }
		      }
		   }
		}
		
		function mountStaticProperties(statics) {
		   for (var i in statics) {
		      if (this.constructor.hasOwnProperty(i)) {
		         if (this["$$" + i] == undefined)
		            this["$$" + i] = this.constructor[i];
		      }
		   }
		}
		
		function unmountStaticProperties(statics) {
		   for (var i in this) {
		      if (this.hasOwnProperty(i)) {
		         var new_i;
		         if ((new_i = i.replace(/^\$\$/, '')) !== i) {
		            this.constructor[new_i] = this[i];
		            delete this[i];
		         }
		      }
		   }
		}
		
	};
	
	priv.createProperty = function(toObj, sourceObj, property, prototype) {
	   var dontAdd = ['_', '$', '$$'];
	   if (dontAdd.has(property)) return toObj;
	   
	   if (typeof sourceObj[property] === "function") {
			// Create wrapper function for function calls
		   toObj[property] = priv.createClassMethod(property, sourceObj[property], prototype, sourceObj._, sourceObj.$, sourceObj.$$);
		} else
		   toObj[property] = sourceObj[property];
		
		return toObj;
	};
	
	priv.createClassConstructor = function(locals) {
	   // Removing these for now, as I can't figure out a good way to use them in methods yet.
	   //delete locals['$'];
	   //delete locals['$$'];
	   
		Class = function() {
			// Give some properties for free
			priv.buildFreeProperties(this);
			
			priv.buildPropertiesFromObj(this, locals);
			
			// Initialize our function
			if (typeof this.initialize === "function" && arguments[0] !== scope.noInit)
				this.initialize.apply(this, arguments);
		};
		return Class;
	};
	
	priv.buildFreeProperties = function(_this) {
		_this.implement = function(objOrConstructorOrPropName, valueOrNull) {
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
		
		_this.shared = function(prop, value) {
		   // If we have more than 1 argument, value came in, and we should set
			if (arguments.length > 1)
				return _this.set(prop, value);
			else
				return _this.get(prop);
		};
		
		_this.shared.get = function(prop) {
			return _this.constructor.prototype[prop]
		};
		
		_this.shared.set = function(prop, value) {
			_this.constructor.shared(prop, value);
			return _this;
		}
		
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
	
	priv.getPseudoObject = function(obj, prefix) {
	   var plainPrefix = prefix.replace(/\\/g, ''), // Strip away escape chars
	   new_i,
	   prefixRe = new RegExp("^" + prefix),
	   ret = obj[plainPrefix] || {};
	   
	   for (var i in obj) {
	      if (obj.hasOwnProperty(i)) {
	         if ((new_i = i.replace(prefixRe, '')) !== i) {
	            ret[new_i] = obj[i];
   	         delete obj[i];
	         }
	      }
	   }
	   
	   return ret;
	};
	
	// Public properties
	this.noInit = { noInit: true };
	
	/*
	this.config = function(configObjOrProperty, valueOrNull) {
		var config = priv.determineObject(configObjOrProperty, valueOrNull);
		
		for (var i in config) {
			if (config.hasOwnProperty(i))
				scope[i] = config[i];
		}
	};
	*/
	
	this.simple = function(objOrFn, prototype) {
		var SimpleClass, obj;
		if (typeof objOrFn === "function")
			SimpleClass = objOrFn;
		else {
			SimpleClass = function(_this) {
				for (var i in _this) {
					if (_this.hasOwnProperty(i))
						this[i] = _this[i];
				}
			};
			obj = objOrFn;
		}
		SimpleClass.prototype = prototype;
		SimpleClass.prototype.constructor = SimpleClass;
		
		return new SimpleClass(obj);
	};
	
	this.create = function(objOrConstructor, prototype) {
		
		var statics,
		privates,
		shared,
		protoConstructor,
		proto;
		
		if (typeof prototype === "function") {
			protoConstructor = prototype;
			proto = new prototype(scope.noInit);
		} else {
			protoConstructor = null;
			proto = prototype || {};
		}
		
		var obj = priv.determineObject(objOrConstructor);
		privates = priv.getPseudoObject(obj, "_");
		// It's important to put statics before shared so we get all the double dollar signs out first
		statics = priv.getPseudoObject(obj, "\\$\\$");
		shared = priv.getPseudoObject(obj, "\\$");
		
		// Making this assignment after all the priv.getPseudoObject() calls above keeps a lot of confusion away.
		obj._ = privates;
		obj.$ = shared;
		obj.$$ = statics;
		
		// Make our constructor fn
		if (objOrConstructor)
			Class = priv.createClassConstructor(obj);
		else
			Class = {};
		
		// Build prototype of Class
		Class.prototype = proto || {};
		Class.prototype.constructor = Class;
	
		// Class's methods
		Class.extend = function(objOrConstructor) {
			return scope.create(objOrConstructor, this);
		};
		
		Class.mixin = function(mixer, config) {
			mixer.mixto(this.prototype, config);
			return this;
		};
		
		Class.singleton = function(objOrConstructor) {
			return Singleton(objOrConstructor, this);
		};
		
		// The class itself has the methods and properties created here
		Class.statics = function(objOrConstructor) {
			priv.buildPropertiesFromObj(Class, objOrConstructor, null, 
				(protoConstructor || proto.constructor || function() {}) ); // The last arg is the prototype
			return Class;
		};
		
		Class.shared = function(objOrConstructorOrProperty, valueOrNull) {
			priv.buildPropertiesFromObj(proto, objOrConstructorOrProperty, valueOrNull, Class.prototype);
			return Class;
		};
		
		var privates = {};
		Class.privates = function(objOrConstructorOrProperty, valueOrNull) {
			privates = priv.determineObject(objOrConstructorOrProperty, valueOrNull);
			return Class;
		};
		
		Class.locals = function(objOrConstructorOrProperty, valueOrNull) {
			var locals = priv.determineObject(objOrConstructorOrProperty, valueOrNull);
			locals._ = privates;
			Class = scope.create(locals, prototype);
			return Class;
		};
		
		Class._new = function() {
			var ret = new this(scope.noInit);
			if (typeof ret.initialize === "function")
				ret.initialize.apply(this, arguments);
			return ret;
		};
		
		Class.New = Class._new;
		
		Class.shared(shared);
		Class.statics(statics);
		
		return Class;
	};
})();

(function() {
	try {
		module.exports = Class;
	} catch (e) {}
})();
