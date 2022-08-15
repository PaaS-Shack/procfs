var Measured = require('measured');

var Aggregator = function (metricCallback) {
	this.metrics = {};
	this.lastMetrics = {};
	this.lastValues = {};
	this.metricCallback = metricCallback;
	this.lastUpdate = Date.now();
};

Aggregator.prototype.update = function (timestamp, name, value, calcDiff) {
	this.lastUpdate = Date.now();
	if (isNaN(value)) {
		return;
	}
	if (this.metrics[name] === undefined) {
		this.metrics[name] = new Measured.Histogram();
	}
	this.metrics[name].value = value
	if (!this.lastValues[name]) {
		this.lastValues[name] = {
			value: value,
			ts: timestamp
		};
	}
	if (calcDiff === true) {
		var diff = value - this.lastValues[name].value;
		this.metrics[name].update(diff, timestamp);
		this.lastValues[name] = {
			value: value,
			ts: timestamp
		};
	} else {
		this.metrics[name].update(value, timestamp);
	}
};

Aggregator.prototype.get = function (name) {
	if (this.metrics[name] !== undefined) {
		var rv = this.metrics[name].toJSON();
		rv.name = name;
		rv.value = this.metrics[name].value;
		//this.metrics[name].reset();
		return rv;
	} else {
		return {
			count: 0,
			sum: 0,
			mean: 0,
			err: 'no metrics object for ' + name
		};
	}
};

Aggregator.prototype.reset = function () {
	this.lastMetrics = { ...this.metrics };
	//console.log(this.metrics)
	this.metrics = null;
	this.metrics = {};
};

module.exports = Aggregator;