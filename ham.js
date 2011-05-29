(function() {
	"use strict";
	
	window.Class = {
		create: function(objOrConstructor, prototype, statics) {
	
			var constructor = function() {
				var _this;
				if (typeof objOrConstructor === "function")
					_this = new objOrConstructor();
				else
					_this = objOrConstructor;
			
				for (var i in _this) {
					if (_this.hasOwnProperty(i)) {
						
						// Do special stuff when calling functions
						// Use closure to ensure i will retain it's value independant of the loop
						(function(prop) {
							if (typeof _this[prop] === "function") {
								// Create wrapper function for function calls
								this[prop] = function() {
									var args = arguments,
									ret;
									
									this._super = function() {
										if (typeof constructor.prototype[prop] !== "function")
											throw new TypeError("There is no super function for " + prop);
										if (arguments[0] === this._context)
											constructor.prototype[prop].apply(constructor.prototype, args);
										else
											constructor.prototype[prop].apply(constructor.prototype, arguments);
									}
									this._context = { execute_in_context: true }; // Use an arbitrary object for our token
									
									ret = _this[prop].apply(this, args);
									delete this._super; delete this._context;
									return ret;
								};
							} else 
								this[prop] = _this[prop];
						}).call(this, i);
					}
				}
				
				constructor.statics(statics);
			
				if (typeof this._init === "function")
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
				prototype = new prototype();
			constructor.prototype = prototype || {};
			constructor.prototype.constructor = constructor;
			return constructor;
		}
	}
	
})();
